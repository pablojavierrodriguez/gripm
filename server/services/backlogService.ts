import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ProjectMeta, ProjectBacklog } from '../types.ts';
import {
  parseBacklogMd,
  serializeBacklogMd,
  normalizeStatus,
  normalizePriority,
  normalizeType,
  generateTaskFilename,
  generateMonolithicBacklogMd,
  formatPriorityForMd,
  type BacklogMdTask
} from '../../scripts/backlogMdParser.ts';
import {
  isBacklogMdProject,
  PKG_ROOT
} from './registry.ts';
import { atomicWriteFileSync } from './atomicWrite.ts';
import { withFileLockSync } from '../utils/fs-lock.ts';
import {
  getTaskCacheEntry,
  setTaskCacheEntry,
  recordCacheHit,
  recordCacheMiss,
  invalidateTaskCache,
  clearTaskCache,
  getTaskCacheStats,
  pruneStaleCacheEntries
} from './taskCache.ts';

export {
  getTaskCacheStats,
  clearTaskCache,
  invalidateTaskCache
} from './taskCache.ts';

// ---------------------------------------------------------------------------
// Types and Interfaces
// ---------------------------------------------------------------------------

export interface TaskFilterOptions {
  openOnly?: boolean;
  status?: string;
  priority?: string;
  sprint?: string;
  milestone?: string;
  prefix?: string;
  taskIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

export interface TaskMutationOptions {
  force?: boolean;
  verifyCommand?: string;
  expectedMtime?: number;
  repoPath?: string;
}

export interface GatekeeperAudit {
  bypassedGatekeeper: boolean;
  timestamp: string;
}

export interface VerifyCommandValidation {
  valid: boolean;
  reason?: string;
  command?: string;
}

export class ConflictError extends Error {
  public readonly conflict = true;
  public readonly currentMtime: number;
  public readonly currentItem: any;

  constructor(message: string, currentMtime: number, currentItem: any) {
    super(message);
    this.name = 'ConflictError';
    this.currentMtime = currentMtime;
    this.currentItem = currentItem;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export interface NormalizedTaskUpdates {
  status?: string;
  rawStatus?: string;
  title?: string;
  description?: string;
  priority?: string;
  type?: string;
  implementationPlan?: string;
  implementationNotes?: string;
  milestone?: string;
  release?: string;
  targetRelease?: string;
  releases?: string[];
  sprint?: string;
  targetSprint?: string;
  sprints?: string[];
  clearSprint?: boolean;
  estimate?: string | number | null;
  labels?: string[];
  assignees?: string[];
  parentId?: string;
  blocks?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  dismissedReason?: string;
  relatedTo?: string[];
  dependencies?: string[];
  module?: string;
  epic?: string;
  category?: string;
  impactedFile?: string;
  risk?: string;
  checkAllAcs?: boolean;
  toggleAcIndex?: number;
  usedUpdatesObject: boolean;
}

export interface BacklogStats {
  total: number;
  open: number;
  done: number;
  completionRate: string;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byPrefix: Record<string, { total: number; open: number; done: number }>;
}

export interface SyncBacklogResult {
  ok: boolean;
  autoFix: boolean;
  fixedCount: number;
  errorsFound: number;
  errors: string[];
  warnings: string[];
  taskCount: number;
  backlogPath: string | null;
  changesWritten: boolean;
}
const DEMO_FILE = fs.existsSync(path.resolve(PKG_ROOT, 'data/demo-backlog.json'))
  ? path.resolve(PKG_ROOT, 'data/demo-backlog.json')
  : path.resolve(PKG_ROOT, 'src/data/demo-backlog.json');

// ---------------------------------------------------------------------------
// Path and Identity Helpers
// ---------------------------------------------------------------------------

export function resolveJsonBacklogPath(project: ProjectMeta): string {
  if (project.isDemo) return DEMO_FILE;
  if (project.repoPath) {
    return path.join(project.repoPath, '.gripm/backlog.json');
  }
  return path.join(PKG_ROOT, `data/${project.id}-backlog.json`);
}

export function getProjectTasksDir(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'tasks');
}

export function getProjectSprintsPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'sprints.json');
}

export function getProjectReleasesPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'releases.json');
}

export function getProjectRetrospectivesPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'retrospectives.json');
}

export function getProjectTaskAllocationLockPath(project: ProjectMeta): string {
  if (project.repoPath) {
    const baseDir = path.join(project.repoPath, project.backlogDir || 'backlog');
    return path.join(baseDir, '.task-allocation.lock');
  }
  return path.join(PKG_ROOT, `data/.${project.id}-task-allocation.lock`);
}

// ---------------------------------------------------------------------------
// Gatekeeper and Verification Command Security (SEC-01 / DEV-224 / DEV-244)
// ---------------------------------------------------------------------------

export function validateVerifyCommand(cmd: string, repoPath: string): VerifyCommandValidation {
  if (!cmd || typeof cmd !== 'string') {
    return { valid: false, reason: 'El comando de verificación debe ser un texto no vacío.' };
  }

  const trimmed = cmd.trim();
  if (!trimmed) {
    return { valid: false, reason: 'El comando de verificación no puede estar vacío.' };
  }

  // 1. Prohibir metacaracteres shell, subshells, comillas, tuberías y redirecciones
  const forbiddenChars = /[|&;`$()<>\n\r'"]/;
  if (forbiddenChars.test(trimmed)) {
    return {
      valid: false,
      reason: "Contiene metacaracteres o secuencias de encadenamiento de shell no permitidas ('|', '&', ';', '`', '$()', '<', '>', comillas)."
    };
  }

  // 2. Tokenizar argumentos respetando espacios simples
  const tokens = trimmed.split(/\s+/);
  const runner = tokens[0].toLowerCase();

  // Validar tokens individuales contra inyecciones
  const tokenPattern = /^[a-zA-Z0-9_\-.:/\\=]+$/;
  for (const token of tokens) {
    if (!tokenPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' contiene caracteres no permitidos. Solo se permiten caracteres alfanuméricos y separadores estándar (- _ . : / \\ =).`
      };
    }
  }

  // 2.5 Rechazar flags de evasión, secuencias relativas '..' y rutas absolutas (DEV-302 AC #2)
  const forbiddenFlagPattern = /^(--prefix|--config|-c|--script-shell|--eval|-e|--import|--loader)(?:=.*)?$/i;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (forbiddenFlagPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (flags de configuración/evasión prohibidas).`
      };
    }
    if (token.includes('..')) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (secuencias relativas '..' prohibidas).`
      };
    }
    if (token.startsWith('/') || token.startsWith('\\') || /^[a-zA-Z]:[/\\]/.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (rutas absolutas prohibidas).`
      };
    }
  }

  // Leer package.json del repositorio
  let pkgScripts: Record<string, string> = {};
  let pkgDeps: Set<string> = new Set();
  try {
    const pkgPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        pkgScripts = pkg.scripts;
      }
      if (pkg.dependencies && typeof pkg.dependencies === 'object') {
        Object.keys(pkg.dependencies).forEach(d => pkgDeps.add(d));
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === 'object') {
        Object.keys(pkg.devDependencies).forEach(d => pkgDeps.add(d));
      }
    }
  } catch {}

  // 3. Evaluar runner permitido
  if (['npm', 'pnpm', 'yarn'].includes(runner)) {
    const subCmd = tokens[1];
    if (!subCmd) {
      return {
        valid: false,
        reason: `Debe especificar un subcomando para ${runner} (ej: '${runner} test' o '${runner} run <script>').`
      };
    }

    if (subCmd === 'test' || subCmd === 't') {
      if (!pkgScripts['test']) {
        return {
          valid: false,
          reason: `El script 'test' no está definido en el package.json de '${repoPath}'.`
        };
      }
      return { valid: true, command: trimmed };
    }

    if (subCmd === 'run') {
      const scriptName = tokens[2];
      if (!scriptName) {
        return {
          valid: false,
          reason: `Debe especificar el nombre del script a ejecutar (ej: '${runner} run <script>').`
        };
      }
      if (!pkgScripts[scriptName]) {
        return {
          valid: false,
          reason: `El script '${scriptName}' no está definido en los scripts de package.json.`
        };
      }
      return { valid: true, command: trimmed };
    }

    if ((runner === 'yarn' || runner === 'pnpm') && pkgScripts[subCmd]) {
      return { valid: true, command: trimmed };
    }

    return {
      valid: false,
      reason: `Subcomando '${subCmd}' no autorizado para ${runner}. Solo se permiten '${runner} test' o '${runner} run <script>'.`
    };
  }

  if (runner === 'npx') {
    const tool = tokens[1];
    if (!tool) {
      return {
        valid: false,
        reason: "Debe especificar la herramienta a ejecutar con npx (ej: 'npx tsc --noEmit')."
      };
    }
    const safeToolsAllowlist = new Set([
      'tsc', 'eslint', 'vitest', 'jest', 'playwright', 'prettier', 'biome'
    ]);
    if (!safeToolsAllowlist.has(tool) && !pkgDeps.has(tool)) {
      return {
        valid: false,
        reason: `La herramienta '${tool}' no está permitida para ejecución con npx. Solo se permiten herramientas del stack de calidad (${Array.from(safeToolsAllowlist).join(', ')}) o dependencias declaradas en package.json.`
      };
    }
    return { valid: true, command: trimmed };
  }

  return {
    valid: false,
    reason: `El ejecutable '${runner}' no está permitido en verifyCommand. Solo se permiten scripts de package.json ('npm test', 'npm run <script>') o herramientas de verificación ('npx <herramienta>').`
  };
}

export function validateGatekeeperTransition(
  task: any,
  targetStatus: string,
  options?: TaskMutationOptions,
  repoPath?: string
): void {
  const normTarget = normalizeStatus(targetStatus);
  const isTransitionToTerminal = normTarget === 'ready' || normTarget === 'done';

  if (!options?.force && isTransitionToTerminal) {
    const acs = task.acceptanceCriteriaList || task.acceptanceCriteria || [];
    const unchecked = acs.filter((ac: any) => !ac.checked);
    if (unchecked.length > 0) {
      const taskId = task.code || task.id || 'unknown';
      const uncheckedList = unchecked.map((ac: any) => ` - [ ] #${ac.index} ${ac.text}`).join('\n');
      throw new Error(
        `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because it has ${unchecked.length} uncompleted acceptance criteria:\n` +
        `${uncheckedList}\n\n` +
        `Corrective action: Complete the implementation of each pending criterion and mark it as completed (- [x]) before certifying the task as '${normTarget}'.`
      );
    }

    const verifyCmd = options?.verifyCommand;
    if (verifyCmd && typeof verifyCmd === 'string') {
      const execCwd = repoPath || process.cwd();
      const validation = validateVerifyCommand(verifyCmd, execCwd);
      if (!validation.valid) {
        throw new Error(
          `[MCP Gatekeeper Security] Transition rejected: Verification command '${verifyCmd}' is not permitted when attempting to move '${task.code || task.id}' to '${normTarget}':\n` +
          `${validation.reason}\n\n` +
          `Corrective action: Use only scripts defined in package.json (e.g. 'npm test', 'npm run <script>') or authorized tools ('npx tsc --noEmit').`
        );
      }

      try {
        execSync(validation.command || verifyCmd, {
          cwd: execCwd,
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 15000
        });
      } catch (execErr: any) {
        const outMsg = (execErr.stderr || execErr.stdout || execErr.message || '').toString().trim();
        throw new Error(
          `[MCP Gatekeeper] Transition rejected: Verification command '${verifyCmd}' failed when attempting to move '${task.code || task.id}' to '${normTarget}':\n` +
          `${outMsg}\n\n` +
          `Corrective action: Check the verification script errors, fix the issues, and retry certifying the task.`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sprint Canonical Resolution
// ---------------------------------------------------------------------------

export function resolveLegibleSprint(project: ProjectMeta, val: string | undefined | null): string | undefined {
  if (!val) return undefined;
  const clean = String(val).trim();
  if (!clean) return undefined;
  const lower = clean.toLowerCase();
  if (lower === 'backlog-futuro' || lower === 'backlog' || lower === 'sin sprint' || lower === 'sin-sprint' || lower === 'none' || lower === 'null') {
    return undefined;
  }
  if (!project.repoPath) return clean;

  const sprintsPath = getProjectSprintsPath(project);
  if (fs.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
      if (Array.isArray(registeredSprints) && registeredSprints.length > 0) {
        const matched = registeredSprints.find((s: any) =>
          (s.id && s.id.toLowerCase() === lower) ||
          (s.name && s.name.trim().toLowerCase() === lower)
        );
        if (matched) {
          return matched.name || clean;
        }
      }
    } catch {}
  }

  if (lower.startsWith('sprint-') || lower.includes('backlog-futuro')) {
    return undefined;
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Release Notes Parser (Read-only, no disk mutations)
// ---------------------------------------------------------------------------

export function parseReleaseNotesMd(repoPath: string, projectPrefix?: string, knownItems: any[] = []): any[] {
  if (!repoPath) return [];
  const possiblePaths = [
    path.join(repoPath, 'docs/RELEASE_NOTES.md'),
    path.join(repoPath, 'docs/releasenotes.md'),
    path.join(repoPath, 'RELEASE_NOTES.md'),
    path.join(repoPath, 'releasenotes.md'),
    path.join(repoPath, 'docs/CHANGELOG.md'),
    path.join(repoPath, 'CHANGELOG.md'),
    path.join(repoPath, 'changelog.md')
  ];

  let notesContent = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        notesContent = fs.readFileSync(p, 'utf8');
        break;
      } catch {}
    }
  }

  if (!notesContent.trim()) return [];

  const knownCodeSet = new Set(knownItems.map(it => (it.code || it.id || '').toUpperCase()).filter(Boolean));
  const prefixUpper = (projectPrefix || '').toUpperCase().trim();

  const sections = notesContent.split(/(?=^##\s+)/m);
  const releases: any[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith('##')) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
    const bodyContent = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1) : '';

    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\] - - -]+)?)\]?/);
    if (!vMatch) continue;

    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, '');

    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : '';

    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, '').trim();
    if (date) {
      title = title.replace(date, '').trim();
    }
    title = title.replace(/^[-:\u2014\u2013🚀 ]+/, '').trim();
    if (!title) title = `Release ${version}`;

    let summary = '';
    const summaryMatch = bodyContent.match(/###\s*(?:🎯\s*)?Resumen\s*\n+([^\n#]+)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].replace(/^\*+|\*+$/g, '').trim();
    }

    const itemCodesSet = new Set<string>();
    const codeCandidates = trimmed.match(/\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\b/g) || [];
    for (const code of codeCandidates) {
      const upper = code.toUpperCase();
      if (knownCodeSet.has(upper)) {
        itemCodesSet.add(upper);
      } else if (prefixUpper && upper.startsWith(`${prefixUpper}-`)) {
        itemCodesSet.add(upper);
      }
    }

    for (const it of knownItems) {
      const m = (it.milestone || it.targetSprint || '').replace(/^v/i, '');
      if (m && m === version) {
        itemCodesSet.add(it.code || it.id);
      }
    }

    releases.push({
      id: `rel-${version.replace(/\./g, '-')}`,
      version,
      date,
      title,
      summary,
      status: 'released',
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed
    });
  }

  return releases;
}

// ---------------------------------------------------------------------------
// File Resolution and Extraction Helpers
// ---------------------------------------------------------------------------

export function findTaskFile(project: ProjectMeta, id: string): { filePath: string; filename: string; task: any } | null {
  if (!project.repoPath) return null;
  const tasksDir = getProjectTasksDir(project);
  if (!fs.existsSync(tasksDir)) return null;

  const cleanId = id.toLowerCase();
  const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.md'));

  // 1. Coincidencia por convención de nombre de archivo (case-insensitive)
  let found = files.find((f: string) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });

  // 2. Reconciliación por frontmatter si fue renombrado manualmente (DEV-019)
  if (!found) {
    for (const f of files) {
      try {
        const fullPath = path.join(tasksDir, f);
        const stat = fs.statSync(fullPath);
        const cached = getTaskCacheEntry(fullPath);
        let parsed: BacklogMdTask;
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
          recordCacheHit();
          parsed = cached.parsed;
        } else {
          recordCacheMiss();
          const raw = fs.readFileSync(fullPath, 'utf8');
          const fallbackId = f.split('-')[0] || f.replace(/\.md$/, '');
          parsed = parseBacklogMd(raw, fallbackId);
          const canonical = mapMarkdownTaskToCanonical(parsed, project, f, stat);
          setTaskCacheEntry(fullPath, {
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            parsed,
            canonical: { ...canonical }
          });
        }
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          found = f;
          break;
        }
      } catch {}
    }
  }

  if (!found) return null;
  const filePath = path.join(tasksDir, found);
  try {
    const stat = fs.statSync(filePath);
    const cached = getTaskCacheEntry(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      recordCacheHit();
      return { filePath, filename: found, task: structuredClone(cached.parsed) };
    }
    recordCacheMiss();
    const raw = fs.readFileSync(filePath, 'utf8');
    const fallbackId = found.split('-')[0] || found.replace(/\.md$/, '');
    const task = parseBacklogMd(raw, fallbackId);
    const canonical = mapMarkdownTaskToCanonical(task, project, found, stat);
    setTaskCacheEntry(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      parsed: structuredClone(task),
      canonical: { ...canonical }
    });
    return { filePath, filename: found, task };
  } catch {
    return { filePath, filename: found, task: {} };
  }
}

function mapMarkdownTaskToCanonical(
  task: BacklogMdTask,
  project: ProjectMeta,
  filename: string,
  fileStat?: fs.Stats
): any {
  const rawFm = task.rawExtraFrontmatter || {};
  const isDeletedRaw = task.isDeleted !== undefined ? task.isDeleted : (rawFm.isdeleted !== undefined ? rawFm.isdeleted : rawFm.isDeleted);
  const isDeletedVal = isDeletedRaw === true || isDeletedRaw === 'true';
  const deletedAtVal = task.deletedAt || rawFm.deletedat || rawFm.deletedAt || undefined;
  const previousStatusVal = task.previousStatus || rawFm.previousstatus || rawFm.previousStatus || undefined;

  const sprintVal = task.sprint || task.targetSprint || rawFm.sprint || rawFm.targetSprint || undefined;
  const releaseVal = task.milestone || rawFm.release || rawFm.targetRelease || rawFm.releases || undefined;

  const id = task.id || filename.split('-')[0] || filename.replace(/\.md$/, '');
  const mtime = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();

  const canonical: any = {
    id,
    code: id,
    projectId: project.id,
    title: task.title || 'Sin título',
    description: task.description || '',
    type: normalizeType(task.type || rawFm.type) || 'feature',
    priority: normalizePriority(task.priority || rawFm.priority) || 'p2',
    status: normalizeStatus(task.status),
    sprint: sprintVal,
    release: releaseVal,
    targetSprint: sprintVal,
    targetRelease: releaseVal,
    milestone: releaseVal,
    parentId: task.parentId || rawFm.parent || rawFm.parentId || undefined,
    blocks: task.blocks || (rawFm.blocks ? (Array.isArray(rawFm.blocks) ? rawFm.blocks : [rawFm.blocks]) : []),
    blockedBy: task.blockedBy || (rawFm.blocked_by ? (Array.isArray(rawFm.blocked_by) ? rawFm.blocked_by : [rawFm.blocked_by]) : []),
    blockedReason: task.blockedReason || rawFm.blocked_reason || rawFm.blockedReason || undefined,
    dismissedReason: task.dismissedReason || rawFm.dismissed_reason || rawFm.dismissedReason || undefined,
    relatedTo: task.relatedTo || (rawFm.related_to ? (Array.isArray(rawFm.related_to) ? rawFm.related_to : [rawFm.related_to]) : []),
    dependencies: task.dependencies || [],
    sprints: task.sprints && task.sprints.length > 0 ? task.sprints : (sprintVal ? [sprintVal] : []),
    releases: task.releases && task.releases.length > 0 ? task.releases.filter((r: string) => !r.toLowerCase().includes('sprint')) : (releaseVal ? [releaseVal] : []),
    module: task.module || rawFm.module || undefined,
    epic: task.epic || rawFm.epic || undefined,
    category: task.category || rawFm.category || undefined,
    impactedFile: task.impactedFile || rawFm.impactedfile || rawFm.impactedFile || undefined,
    risk: task.risk || rawFm.risk || undefined,
    fix: task.fix || rawFm.fix || undefined,
    acceptanceCriteriaList: task.acceptanceCriteria || [],
    acceptanceCriteria: task.acceptanceCriteria || [],
    implementationPlan: task.implementationPlan || '',
    notes: task.implementationNotes || task.fix || undefined,
    implementationNotes: task.implementationNotes || task.fix || undefined,
    finalSummary: task.finalSummary || rawFm.finalsummary || rawFm.finalSummary || undefined,
    assignees: task.assignees || [],
    labels: task.labels || [],
    estimate: task.estimate !== undefined ? task.estimate : rawFm.estimate,
    startDate: task.startDate || rawFm.start_date || rawFm.startDate || undefined,
    dueDate: task.dueDate || rawFm.due_date || rawFm.dueDate || rawFm.target_date || rawFm.targetDate || undefined,
    order: rawFm.order !== undefined ? Number(rawFm.order) : 0,
    isDeleted: isDeletedVal ? true : undefined,
    deletedAt: deletedAtVal,
    previousStatus: previousStatusVal,
    createdAt: task.createdDate ? (task.createdDate.includes('T') ? task.createdDate : `${task.createdDate}T00:00:00.000Z`) : new Date().toISOString(),
    updatedAt: task.updatedDate ? (task.updatedDate.includes('T') ? task.updatedDate : `${task.updatedDate}T00:00:00.000Z`) : new Date().toISOString(),
    mtime,
    _file: filename,
    _raw: task
  };

  return canonical;
}

/**
 * Pure helper function to extract and normalize task updates from input payloads.
 * Shared between Markdown and JSON storage engines (DEV-311 AC #4).
 */
export function normalizeTaskUpdates(project: ProjectMeta, updates: any): NormalizedTaskUpdates {
  const u = updates || {};
  const inner = u.updates && typeof u.updates === 'object' ? u.updates : null;
  const usedUpdatesObject = Boolean(inner && !u.status && inner.status);

  // Status
  const rawStatus = u.status || inner?.status;
  const status = rawStatus ? normalizeStatus(rawStatus) : undefined;

  // Title & description
  const title = u.title !== undefined ? u.title : inner?.title;
  const description = u.description !== undefined ? u.description : inner?.description;

  // Priority & type
  const rawPriority = u.priority || inner?.priority;
  const priority = rawPriority ? normalizePriority(rawPriority) : undefined;
  const rawType = u.type || inner?.type;
  const type = rawType ? normalizeType(rawType) : undefined;

  // Implementation plan & notes
  const implementationPlan = u.implementationPlan !== undefined ? u.implementationPlan : inner?.implementationPlan;
  const implementationNotes = u.implementationNotes !== undefined
    ? u.implementationNotes
    : (u.notes !== undefined
      ? u.notes
      : (u.fix !== undefined ? u.fix : inner?.implementationNotes));

  // Sprints
  let sprint: string | undefined;
  let targetSprint: string | undefined;
  let sprints: string[] | undefined;
  let clearSprint = false;

  const rawSprint = u.sprint !== undefined ? u.sprint : (u.targetSprint !== undefined ? u.targetSprint : inner?.sprint);
  if (rawSprint !== undefined) {
    const legSprint = resolveLegibleSprint(project, rawSprint);
    if (legSprint) {
      sprint = legSprint;
      targetSprint = legSprint;
      sprints = [legSprint];
    } else {
      clearSprint = true;
      sprint = undefined;
      targetSprint = undefined;
      sprints = [];
    }
  } else if (u.sprints !== undefined || inner?.sprints !== undefined) {
    const explicitSprints = Array.isArray(u.sprints) ? u.sprints : (Array.isArray(inner?.sprints) ? inner.sprints : []);
    sprints = explicitSprints;
    sprint = explicitSprints.length > 0 ? explicitSprints[0] : undefined;
    targetSprint = sprint;
  }

  // Releases & Milestone
  let release: string | undefined;
  let targetRelease: string | undefined;
  let milestone: string | undefined;
  let releases: string[] | undefined;

  if (u.release !== undefined || u.targetRelease !== undefined || u.milestone !== undefined || u.releases !== undefined ||
      inner?.release !== undefined || inner?.targetRelease !== undefined || inner?.milestone !== undefined || inner?.releases !== undefined) {
    const rawRel = (
      u.release || u.targetRelease || u.milestone ||
      inner?.release || inner?.targetRelease || inner?.milestone ||
      (Array.isArray(u.releases) && u.releases.length > 0 ? u.releases[0] : '') ||
      (Array.isArray(inner?.releases) && inner.releases.length > 0 ? inner.releases[0] : '') ||
      ''
    ).trim();

    const rawRelArr = Array.isArray(u.releases)
      ? u.releases
      : (Array.isArray(inner?.releases)
        ? inner.releases
        : (rawRel ? [rawRel] : []));

    releases = rawRelArr.filter(Boolean).filter((r: string) => !r.toLowerCase().includes('sprint'));
    release = rawRel || undefined;
    targetRelease = rawRel || undefined;
    milestone = rawRel || undefined;
  }

  // Estimate
  let estimate: string | number | null | undefined;
  const rawEstimate = u.estimate !== undefined ? u.estimate : inner?.estimate;
  if (rawEstimate !== undefined) {
    if (rawEstimate === '' || rawEstimate === null) {
      estimate = null;
    } else {
      const num = Number(rawEstimate);
      estimate = (!isNaN(num) && typeof rawEstimate !== 'boolean' && !String(rawEstimate).includes(' '))
        ? num
        : rawEstimate;
    }
  }

  // Labels & Assignees
  const labels = Array.isArray(u.labels) ? u.labels : (Array.isArray(inner?.labels) ? inner.labels : undefined);
  const assignees = Array.isArray(u.assignees) ? u.assignees : (Array.isArray(inner?.assignees) ? inner.assignees : undefined);

  // Relationships & Graph
  const parentId = u.parentId !== undefined ? u.parentId : inner?.parentId;
  const blocks = Array.isArray(u.blocks) ? u.blocks : (Array.isArray(inner?.blocks) ? inner.blocks : undefined);
  const blockedBy = Array.isArray(u.blockedBy) ? u.blockedBy : (Array.isArray(inner?.blockedBy) ? inner.blockedBy : undefined);
  const blockedReason = u.blockedReason !== undefined ? u.blockedReason : inner?.blockedReason;
  const dismissedReason = u.dismissedReason !== undefined ? u.dismissedReason : inner?.dismissedReason;
  const relatedTo = Array.isArray(u.relatedTo) ? u.relatedTo : (Array.isArray(inner?.relatedTo) ? inner.relatedTo : undefined);
  const dependencies = Array.isArray(u.dependencies) ? u.dependencies : (Array.isArray(inner?.dependencies) ? inner.dependencies : undefined);

  // Metadata
  const module = u.module !== undefined ? u.module : inner?.module;
  const epic = u.epic !== undefined ? u.epic : inner?.epic;
  const category = u.category !== undefined ? u.category : inner?.category;
  const impactedFile = u.impactedFile !== undefined ? u.impactedFile : inner?.impactedFile;
  const risk = u.risk !== undefined ? u.risk : inner?.risk;

  // ACs
  const checkAllAcs = u.checkAllAcs !== undefined ? u.checkAllAcs : inner?.checkAllAcs;
  const toggleAcIndex = u.toggleAcIndex !== undefined ? u.toggleAcIndex : inner?.toggleAcIndex;

  return {
    status,
    rawStatus,
    title,
    description,
    priority,
    type,
    implementationPlan,
    implementationNotes,
    milestone,
    release,
    targetRelease,
    releases,
    sprint,
    targetSprint,
    sprints,
    clearSprint,
    estimate,
    labels,
    assignees,
    parentId,
    blocks,
    blockedBy,
    blockedReason,
    dismissedReason,
    relatedTo,
    dependencies,
    module,
    epic,
    category,
    impactedFile,
    risk,
    checkAllAcs,
    toggleAcIndex,
    usedUpdatesObject
  };
}

// ---------------------------------------------------------------------------
// Core Domain Operations
// ---------------------------------------------------------------------------

export class BacklogService {
  /**
   * Reads all tasks for a project with optional filters.
   * By default, soft-deleted tasks (isDeleted: true) are EXCLUDED (AC 6).
   */
  static listTasks(project: ProjectMeta, options?: TaskFilterOptions): any[] {
    let items: any[] = [];

    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
        files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const activePaths = new Set<string>();
        let orderIdx = 1;
        for (const file of files) {
          try {
            const fullPath = path.join(tasksDir, file);
            activePaths.add(fullPath);
            const stat = fs.statSync(fullPath);
            const cached = getTaskCacheEntry(fullPath);

            let canonical: any;
            if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
              recordCacheHit();
              canonical = { ...cached.canonical };
            } else {
              recordCacheMiss();
              const raw = fs.readFileSync(fullPath, 'utf8');
              const fallbackId = file.split('-')[0] || file.replace(/\.md$/, '');
              const parsed = parseBacklogMd(raw, fallbackId);
              canonical = mapMarkdownTaskToCanonical(parsed, project, file, stat);
              setTaskCacheEntry(fullPath, {
                mtimeMs: stat.mtimeMs,
                size: stat.size,
                parsed,
                canonical: { ...canonical }
              });
            }

            if (canonical.order === 0) canonical.order = orderIdx++;
            items.push(canonical);
          } catch {}
        }

        pruneStaleCacheEntries(tasksDir, activePaths);
      }
    } else {
      const jsonPath = resolveJsonBacklogPath(project);
      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, 'utf8');
          const data = JSON.parse(raw);
          const jsonStat = fs.statSync(jsonPath);
          const jsonMtime = Math.round(jsonStat.mtimeMs);
          items = (data.items || []).map((it: any) => ({
            ...it,
            code: it.code || it.id,
            projectId: it.projectId || project.id,
            status: normalizeStatus(it.status),
            priority: normalizePriority(it.priority),
            acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
            acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
            sprint: it.sprint || it.targetSprint,
            targetSprint: it.targetSprint || it.sprint,
            mtime: it.mtime || jsonMtime
          }));
        } catch {}
      }
    }

    // AC 6: Exclude isDeleted: true by default
    const includeDeleted = options?.includeDeleted === true;
    if (!includeDeleted) {
      items = items.filter(it => !it.isDeleted && it.isDeleted !== 'true');
    }

    // Apply filters
    if (options?.openOnly) {
      const closed = ['done', 'dismissed', 'cancelled', 'released'];
      items = items.filter(t => !closed.includes(normalizeStatus(t.status)));
    }
    if (options?.status) {
      const sNorm = normalizeStatus(options.status);
      items = items.filter(t => normalizeStatus(t.status) === sNorm);
    }
    if (options?.priority) {
      const pNorm = normalizePriority(options.priority);
      items = items.filter(t => normalizePriority(t.priority) === pNorm);
    }
    if (options?.sprint) {
      const sp = String(options.sprint).toLowerCase();
      items = items.filter(t =>
        (t.sprint && String(t.sprint).toLowerCase() === sp) ||
        (t.targetSprint && String(t.targetSprint).toLowerCase() === sp) ||
        (Array.isArray(t.sprints) && t.sprints.some((s: string) => String(s).toLowerCase() === sp))
      );
    }
    if (options?.milestone) {
      const mLower = String(options.milestone).toLowerCase();
      items = items.filter(t =>
        (t.milestone && String(t.milestone).toLowerCase() === mLower) ||
        (t.targetSprint && String(t.targetSprint).toLowerCase() === mLower) ||
        (t.release && String(t.release).toLowerCase() === mLower) ||
        (t.targetRelease && String(t.targetRelease).toLowerCase() === mLower)
      );
    }
    if (options?.prefix) {
      const pfx = String(options.prefix).toLowerCase();
      items = items.filter(t =>
        (t.id && t.id.toLowerCase().startsWith(pfx)) ||
        (t.code && t.code.toLowerCase().startsWith(pfx))
      );
    }
    if (Array.isArray(options?.taskIds) && options.taskIds.length > 0) {
      const idsSet = new Set(options.taskIds.map(id => String(id).toLowerCase()));
      items = items.filter(t =>
        (t.id && idsSet.has(t.id.toLowerCase())) ||
        (t.code && idsSet.has(t.code.toLowerCase()))
      );
    }
    if (options?.search) {
      const q = String(options.search).toLowerCase();
      items = items.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.labels && Array.isArray(t.labels) && t.labels.some((l: string) => l.toLowerCase().includes(q)))
      );
    }

    const offset = options?.offset !== undefined ? options.offset : 0;
    if (options?.limit !== undefined) {
      items = items.slice(offset, offset + options.limit);
    } else if (offset > 0) {
      items = items.slice(offset);
    }

    return items;
  }

  /**
   * Retrieves single task by ID.
   */
  static getTask(
    project: ProjectMeta | undefined,
    taskId: string,
    options?: { includeDeleted?: boolean }
  ): { found: boolean; project: any; task: any } {
    if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
      throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }

    const cleanId = taskId.toLowerCase();
    const includeDeleted = options?.includeDeleted !== false; // Single item lookup includes deleted by default unless specified

    if (project) {
      const tasks = BacklogService.listTasks(project, { includeDeleted: true });
      const match = tasks.find(t =>
        (t.id && t.id.toLowerCase() === cleanId) ||
        (t.code && t.code.toLowerCase() === cleanId)
      );
      if (match && (includeDeleted || !match.isDeleted)) {
        return {
          found: true,
          project: { id: project.id, name: project.name, storageType: project.storageType },
          task: match
        };
      }
    }

    throw new Error(`Task ${taskId} not found.`);
  }

  /**
   * Calculates dashboard / metrics statistics over active tasks (excluding isDeleted).
   */
  static getStats(project: ProjectMeta): BacklogStats {
    const tasks = BacklogService.listTasks(project, { includeDeleted: false });
    const total = tasks.length;
    const closedStatuses = ['done', 'dismissed', 'cancelled', 'released'];
    let openCount = 0;
    let doneCount = 0;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byPrefix: Record<string, { total: number; open: number; done: number }> = {};

    for (const t of tasks) {
      const s = normalizeStatus(t.status);
      const p = normalizePriority(t.priority);
      const isClosed = closedStatuses.includes(s);
      if (isClosed) doneCount++; else openCount++;

      byStatus[s] = (byStatus[s] || 0) + 1;
      byPriority[p] = (byPriority[p] || 0) + 1;

      const code = String(t.code || t.id || '');
      const parts = code.split('-');
      const prefix = parts.length > 2 ? `${parts[0]}-${parts[1]}` : (parts[0] || 'OTHER');

      if (!byPrefix[prefix]) {
        byPrefix[prefix] = { total: 0, open: 0, done: 0 };
      }
      byPrefix[prefix].total++;
      if (isClosed) byPrefix[prefix].done++; else byPrefix[prefix].open++;
    }

    const completionRate = `${total > 0 ? Math.round((doneCount / total) * 100) : 0}%`;

    return {
      total,
      open: openCount,
      done: doneCount,
      completionRate,
      byStatus,
      byPriority,
      byPrefix
    };
  }

  /**
   * Inspects existing tasks in memory and on disk to compute the next correlative task ID.
   */
  static getNextTaskId(project: ProjectMeta, options?: { withoutLock?: boolean }): string {
    if (options?.withoutLock) {
      return BacklogService.computeNextTaskId(project);
    }
    const lockPath = getProjectTaskAllocationLockPath(project);
    return withFileLockSync(lockPath, () => {
      return BacklogService.computeNextTaskId(project);
    });
  }

  static computeNextTaskId(project: ProjectMeta): string {
    const cleanPrefix = (project.codePrefix || 'DEV').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DEV';
    const allTasks = BacklogService.listTasks(project, { includeDeleted: true });

    let maxNum = 0;
    const regex = new RegExp(`^${cleanPrefix}-(\\d+)`, 'i');
    for (const t of allTasks) {
      const m = (t.code || t.id || '').match(regex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs.existsSync(tasksDir)) {
        const diskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
        for (const f of diskFiles) {
          const m = f.match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
    }

    const nextNum = maxNum > 0 ? maxNum + 1 : (allTasks.length > 0 ? allTasks.length + 1 : 1);
    return `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Creates a new task in the project with correlative code generation under atomic lock.
   */
  static createTask(project: ProjectMeta, data: any): { ok: boolean; task: any; savedFile?: string } {
    const lockPath = getProjectTaskAllocationLockPath(project);
    return withFileLockSync(lockPath, () => {
      const allTasks = BacklogService.listTasks(project, { includeDeleted: true });
      const code = (typeof data.code === 'string' && data.code.trim())
        ? data.code.trim()
        : BacklogService.computeNextTaskId(project);
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

    let acList: Array<{ index: number; text: string; checked: boolean }> = [];
    if (Array.isArray(data.acceptanceCriteria)) {
      acList = data.acceptanceCriteria.map((item: any, i: number) => {
        if (typeof item === 'string') {
          return { index: i + 1, text: item, checked: false };
        }
        return { index: item.index || i + 1, text: item.text || '', checked: Boolean(item.checked) };
      });
    } else if (Array.isArray(data.acceptanceCriteriaList)) {
      acList = data.acceptanceCriteriaList.map((item: any, i: number) => ({
        index: item.index || i + 1,
        text: item.text || '',
        checked: Boolean(item.checked)
      }));
    }

    let initialEstimate: string | number | undefined;
    if (data.estimate !== undefined && data.estimate !== null && data.estimate !== '') {
      const num = Number(data.estimate);
      initialEstimate = (!isNaN(num) && typeof data.estimate !== 'boolean' && !String(data.estimate).includes(' ')) ? num : data.estimate;
    }

    const rawSprint = data.sprint || data.targetSprint;
    const legSprint = rawSprint ? resolveLegibleSprint(project, rawSprint) : undefined;

    const rawRel = (
      data.release || data.targetRelease || data.milestone ||
      (Array.isArray(data.releases) && data.releases.length > 0 ? data.releases[0] : '') ||
      ''
    ).trim();
    const relArr = Array.isArray(data.releases)
      ? data.releases.filter(Boolean).filter((r: string) => !r.toLowerCase().includes('sprint'))
      : (rawRel ? [rawRel] : []);

    const normalizedSt = normalizeStatus(data.status || 'draft');
    const taskData: BacklogMdTask = {
      id: code,
      title: data.title || 'Sin título',
      status: normalizedSt,
      priority: normalizePriority(data.priority || 'medium'),
      type: data.type || 'feature',
      createdDate: today,
      updatedDate: today,
      startDate: data.startDate || data.start_date || undefined,
      dueDate: data.dueDate || data.due_date || data.targetDate || data.target_date || undefined,
      milestone: rawRel || undefined,
      sprint: legSprint || undefined,
      targetSprint: legSprint || undefined,
      sprints: legSprint ? [legSprint] : (Array.isArray(data.sprints) ? data.sprints : []),
      releases: relArr,
      estimate: initialEstimate,
      description: data.description || '',
      acceptanceCriteria: acList,
      implementationPlan: data.implementationPlan || '',
      implementationNotes: data.implementationNotes || data.notes || data.fix,
      assignees: Array.isArray(data.assignees) ? data.assignees : [],
      labels: Array.isArray(data.labels) ? data.labels : [],
      dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
      parentId: data.parentId || undefined,
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
      blockedReason: data.blockedReason || undefined,
      dismissedReason: data.dismissedReason || undefined,
      relatedTo: Array.isArray(data.relatedTo) ? data.relatedTo : [],
      module: data.module || undefined,
      impactedFile: data.impactedFile || undefined,
      risk: data.risk || undefined,
      epic: data.epic || undefined,
      category: data.category || undefined,
      fix: data.fix || undefined
    };

    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
      const filename = generateTaskFilename(code, taskData.title);
      const filepath = path.join(tasksDir, filename);

      const serialized = serializeBacklogMd(taskData);
      atomicWriteFileSync(filepath, serialized, 'utf8');
      invalidateTaskCache(filepath);

      const fileStat = fs.existsSync(filepath) ? fs.statSync(filepath) : undefined;
      const canonical = mapMarkdownTaskToCanonical(taskData, project, filename, fileStat);
      return { ok: true, task: canonical, savedFile: filepath };
    }

    // JSON fallback
    const jsonPath = resolveJsonBacklogPath(project);
    const newItem = {
      ...taskData,
      code,
      projectId: project.id,
      acceptanceCriteriaList: acList,
      order: typeof data.order === 'number' ? data.order : allTasks.length + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: normalizedSt === 'done' ? now : undefined
    };

    let existingData: any = { project: { ...project, storageType: 'json' }, items: [], releases: [], sprints: [] };
    if (fs.existsSync(jsonPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch {}
    }
    if (!Array.isArray(existingData.items)) existingData.items = [];
    existingData.items.push(newItem);
    existingData.lastUpdated = now;

    atomicWriteFileSync(jsonPath, JSON.stringify(existingData, null, 2), 'utf8');
    const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
    (newItem as any).mtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    return { ok: true, task: newItem, savedFile: jsonPath };
  });
}

  /**
   * Updates an existing task by ID with Gatekeeper validation.
   */
  static updateTask(
    project: ProjectMeta,
    taskId: string,
    updates: any,
    options?: TaskMutationOptions
  ): { ok: boolean; updatedTask: any; filePath?: string; warning?: string; audit?: GatekeeperAudit } {
    if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
      throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const norm = normalizeTaskUpdates(project, updates);

    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) {
        throw new Error(`Task ${taskId} not found to update.`);
      }

      const { filePath, filename, task: current } = fileInfo;
      const fileStat = fs.existsSync(filePath) ? fs.statSync(filePath) : undefined;
      const currentMtime = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();

      // DEV-017 & DEV-301: Optimistic Concurrency Check (expectedMtime / ETag)
      if (!options?.force && typeof options?.expectedMtime === 'number') {
        if (currentMtime > options.expectedMtime) {
          const canonicalCurrent = mapMarkdownTaskToCanonical(current, project, filename, fileStat);
          throw new ConflictError(
            `Task "${current.id}" was modified on disk by another process or agent.`,
            currentMtime,
            canonicalCurrent
          );
        }
      }

      // Apply normalized updates
      if (norm.status) current.status = norm.status as any;
      if (norm.title !== undefined) current.title = norm.title;
      if (norm.description !== undefined) current.description = norm.description;
      if (norm.priority) current.priority = norm.priority;
      if (norm.type) current.type = norm.type;
      if (norm.implementationPlan !== undefined) current.implementationPlan = norm.implementationPlan;
      if (norm.implementationNotes !== undefined) {
        current.implementationNotes = norm.implementationNotes;
        if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
        current.rawExtraFrontmatter.fix = norm.implementationNotes;
      }
      if (norm.milestone !== undefined) current.milestone = norm.milestone;
      if (norm.labels !== undefined) current.labels = norm.labels;
      if (norm.assignees !== undefined) current.assignees = norm.assignees;
      if (norm.parentId !== undefined) current.parentId = norm.parentId || undefined;
      if (norm.blocks !== undefined) current.blocks = norm.blocks;
      if (norm.blockedBy !== undefined) current.blockedBy = norm.blockedBy;
      if (norm.blockedReason !== undefined) current.blockedReason = norm.blockedReason || undefined;
      if (norm.dismissedReason !== undefined) current.dismissedReason = norm.dismissedReason || undefined;
      if (norm.relatedTo !== undefined) current.relatedTo = norm.relatedTo;
      if (norm.dependencies !== undefined) current.dependencies = norm.dependencies;
      if (norm.module !== undefined) current.module = norm.module || undefined;
      if (norm.epic !== undefined) current.epic = norm.epic || undefined;
      if (norm.category !== undefined) current.category = norm.category || undefined;
      if (norm.impactedFile !== undefined) current.impactedFile = norm.impactedFile || undefined;
      if (norm.risk !== undefined) current.risk = norm.risk || undefined;

      if (norm.clearSprint) {
        current.sprint = undefined;
        current.targetSprint = undefined;
        current.sprints = [];
        if (current.rawExtraFrontmatter) {
          delete current.rawExtraFrontmatter.sprint;
          delete current.rawExtraFrontmatter.targetSprint;
        }
      } else if (norm.sprint !== undefined) {
        current.sprint = norm.sprint;
        current.targetSprint = norm.sprint;
        current.sprints = norm.sprints || [norm.sprint];
        if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
        current.rawExtraFrontmatter.sprint = norm.sprint;
        current.rawExtraFrontmatter.targetSprint = norm.sprint;
      } else if (norm.sprints !== undefined) {
        current.sprints = norm.sprints;
      }

      if (norm.estimate !== undefined) {
        if (norm.estimate === null) {
          current.estimate = undefined;
          if (current.rawExtraFrontmatter) delete current.rawExtraFrontmatter.estimate;
        } else {
          current.estimate = norm.estimate;
          if (current.rawExtraFrontmatter) current.rawExtraFrontmatter.estimate = String(norm.estimate);
        }
      }

      current.updatedDate = today;

      // Handle ACs
      if (norm.checkAllAcs !== undefined && current.acceptanceCriteria) {
        current.acceptanceCriteria = current.acceptanceCriteria.map((ac: any) => ({
          ...ac,
          checked: Boolean(norm.checkAllAcs)
        }));
      } else if (norm.toggleAcIndex !== undefined) {
        if (typeof norm.toggleAcIndex !== 'number' || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
          throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
        }
        const acList = current.acceptanceCriteria || [];
        const foundAc = acList.find((ac: any) => ac.index === norm.toggleAcIndex);
        if (!foundAc) {
          throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id}'.`);
        }
        current.acceptanceCriteria = acList.map((ac: any) =>
          ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
        );
      }

      // Gatekeeper validation (DEV-224 / DEV-244 / SEC-01)
      const targetStatus = norm.status || current.status;
      validateGatekeeperTransition(current, targetStatus, options, project.repoPath);

      // SEC-01: Eradicate persistence of verifyCommand in Markdown frontmatter
      if (current.rawExtraFrontmatter) {
        delete current.rawExtraFrontmatter.verifyCommand;
        delete current.rawExtraFrontmatter.verify_command;
        delete current.rawExtraFrontmatter.verifyCmd;
      }

      const serialized = serializeBacklogMd(current);
      atomicWriteFileSync(filePath, serialized, 'utf8');
      invalidateTaskCache(filePath);

      const freshStat = fs.existsSync(filePath) ? fs.statSync(filePath) : undefined;
      const canonical = mapMarkdownTaskToCanonical(current, project, filename, freshStat);
      const resp: any = { ok: true, updatedTask: canonical, filePath };

      if (norm.usedUpdatesObject) {
        resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
      }
      if (options?.force) {
        const forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id}', bypassing Gatekeeper validations.`;
        resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
        resp.audit = {
          bypassedGatekeeper: true,
          timestamp: now
        };
      }
      return resp;
    }

    // JSON Storage
    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON backlog file not found at ${jsonPath}.`);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const cleanId = String(taskId).toLowerCase();
    const idx = (data.items || []).findIndex((i: any) =>
      (i.id && String(i.id).toLowerCase() === cleanId) ||
      (i.code && String(i.code).toLowerCase() === cleanId)
    );

    if (idx < 0) {
      throw new Error(`Task ${taskId} not found to update.`);
    }

    const current = data.items[idx];
    const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
    const currentMtime = typeof current.mtime === 'number'
      ? current.mtime
      : (jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now());

    // DEV-017 & DEV-301: Optimistic Concurrency Check (expectedMtime / ETag)
    if (!options?.force && typeof options?.expectedMtime === 'number') {
      if (currentMtime > options.expectedMtime) {
        throw new ConflictError(
          `Task "${current.code || current.id}" was modified on disk by another process or agent.`,
          currentMtime,
          current
        );
      }
    }

    const wasDone = current.status === 'done';
    if (norm.status) current.status = norm.status;
    const isNowDone = current.status === 'done';

    if (norm.title !== undefined) current.title = norm.title;
    if (norm.description !== undefined) current.description = norm.description;
    if (norm.priority) current.priority = norm.priority;
    if (norm.type) current.type = norm.type;
    if (norm.implementationPlan !== undefined) current.implementationPlan = norm.implementationPlan;
    if (norm.implementationNotes !== undefined) {
      current.implementationNotes = norm.implementationNotes;
      current.fix = norm.implementationNotes;
    }
    if (norm.milestone !== undefined) {
      current.milestone = norm.milestone;
      current.release = norm.release;
      current.targetRelease = norm.targetRelease;
      current.releases = norm.releases;
    }
    if (norm.labels !== undefined) current.labels = norm.labels;
    if (norm.assignees !== undefined) current.assignees = norm.assignees;
    if (norm.parentId !== undefined) current.parentId = norm.parentId || undefined;
    if (norm.blocks !== undefined) current.blocks = norm.blocks;
    if (norm.blockedBy !== undefined) current.blockedBy = norm.blockedBy;
    if (norm.blockedReason !== undefined) current.blockedReason = norm.blockedReason || undefined;
    if (norm.dismissedReason !== undefined) current.dismissedReason = norm.dismissedReason || undefined;
    if (norm.relatedTo !== undefined) current.relatedTo = norm.relatedTo;
    if (norm.dependencies !== undefined) current.dependencies = norm.dependencies;
    if (norm.module !== undefined) current.module = norm.module || undefined;
    if (norm.epic !== undefined) current.epic = norm.epic || undefined;
    if (norm.category !== undefined) current.category = norm.category || undefined;
    if (norm.impactedFile !== undefined) current.impactedFile = norm.impactedFile || undefined;
    if (norm.risk !== undefined) current.risk = norm.risk || undefined;

    if (norm.clearSprint) {
      current.sprint = undefined;
      current.targetSprint = undefined;
      current.sprints = [];
    } else if (norm.sprint !== undefined) {
      current.sprint = norm.sprint;
      current.targetSprint = norm.sprint;
      current.sprints = norm.sprints || [norm.sprint];
    } else if (norm.sprints !== undefined) {
      current.sprints = norm.sprints;
    }

    if (norm.estimate !== undefined) {
      current.estimate = norm.estimate === null ? undefined : norm.estimate;
    }

    current.updatedAt = now;
    if (isNowDone && !wasDone) {
      current.completedAt = now;
    } else if (!isNowDone) {
      current.completedAt = undefined;
    }

    if (norm.checkAllAcs !== undefined && current.acceptanceCriteriaList) {
      current.acceptanceCriteriaList = current.acceptanceCriteriaList.map((ac: any) => ({
        ...ac,
        checked: Boolean(norm.checkAllAcs)
      }));
    } else if (norm.toggleAcIndex !== undefined) {
      if (typeof norm.toggleAcIndex !== 'number' || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
        throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
      }
      const acList = current.acceptanceCriteriaList || [];
      const foundAc = acList.find((ac: any) => ac.index === norm.toggleAcIndex);
      if (!foundAc) {
        throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id || current.code}'.`);
      }
      current.acceptanceCriteriaList = acList.map((ac: any) =>
        ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
      );
    }

    // Gatekeeper validation
    const targetStatus = norm.status || current.status;
    validateGatekeeperTransition(current, targetStatus, options, project.repoPath);

    // SEC-01: Eradicate persistence of verifyCommand
    delete current.verifyCommand;

    data.items[idx] = current;
    data.lastUpdated = now;
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

    const freshJsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
    current.mtime = freshJsonStat ? Math.round(freshJsonStat.mtimeMs) : Date.now();

    const resp: any = { ok: true, updatedTask: current, filePath: jsonPath };
    if (norm.usedUpdatesObject) {
      resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
    }
    if (options?.force) {
      const forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id || current.code}', bypassing Gatekeeper validations.`;
      resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: now
      };
    }
    return resp;
  }

  /**
   * Bulk updates tasks with Gatekeeper validation applied to ALL matching tasks (AC 3).
   */
  static bulkUpdateTasks(
    project: ProjectMeta,
    targetFilter: { taskIds?: string[]; filterPrefix?: string; filterStatus?: string; items?: any[] },
    updates: any,
    options?: TaskMutationOptions
  ): {
    ok: boolean;
    projectId: string;
    storageType: string;
    updatedCount: number;
    updatedIds: string[];
    failedUpdates?: any[];
    error?: string;
    warning?: string;
    audit?: GatekeeperAudit;
  } {
    if (Array.isArray(targetFilter.items)) {
      const updatedIds: string[] = [];
      const failedUpdates: any[] = [];
      let updatedCount = 0;

      for (const patch of targetFilter.items) {
        if (!patch || (!patch.id && !patch.code)) continue;
        const targetId = patch.code || patch.id;
        try {
          const res = BacklogService.updateTask(project, targetId, patch, options);
          if (res.ok) {
            updatedCount++;
            updatedIds.push(targetId);
          }
        } catch (err: any) {
          failedUpdates.push({ id: targetId, error: err.message });
        }
      }

      const resp: any = {
        ok: failedUpdates.length === 0,
        projectId: project.id,
        storageType: project.storageType || 'markdown',
        updatedCount,
        updatedIds,
        ...(failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {})
      };

      if (options?.force) {
        resp.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
        resp.audit = {
          bypassedGatekeeper: true,
          timestamp: new Date().toISOString()
        };
      }

      return resp;
    }

    const cleanIds = Array.isArray(targetFilter.taskIds)
      ? new Set(targetFilter.taskIds.map(id => String(id).toLowerCase()))
      : null;
    const pfxFilter = targetFilter.filterPrefix ? String(targetFilter.filterPrefix).toLowerCase() : null;
    const statusFilter = targetFilter.filterStatus ? normalizeStatus(targetFilter.filterStatus) : null;

    // Load active tasks (excluding isDeleted by default)
    const allTasks = BacklogService.listTasks(project, { includeDeleted: false });
    const matchedTasks = allTasks.filter(t => {
      const taskId = String(t.id || t.code || '').toLowerCase();
      if (cleanIds && !cleanIds.has(taskId)) return false;
      if (pfxFilter && !taskId.startsWith(pfxFilter)) return false;
      if (statusFilter && normalizeStatus(t.status) !== statusFilter) return false;
      return true;
    });

    if (matchedTasks.length === 0) {
      return {
        ok: true,
        projectId: project.id,
        storageType: project.storageType || 'markdown',
        updatedCount: 0,
        updatedIds: []
      };
    }

    // Gatekeeper pre-validation on ALL matched tasks (AC 3)
    const norm = normalizeTaskUpdates(project, updates);
    if (norm.status) {
      for (const t of matchedTasks) {
        validateGatekeeperTransition(t, norm.status, options, project.repoPath);
      }
    }

    const updatedIds: string[] = [];
    const failedUpdates: any[] = [];
    let updatedCount = 0;

    for (const t of matchedTasks) {
      try {
        const res = BacklogService.updateTask(project, t.id || t.code, updates, options);
        if (res.ok) {
          updatedCount++;
          updatedIds.push(t.code || t.id);
        }
      } catch (err: any) {
        failedUpdates.push({ id: t.id || t.code, error: err.message });
      }
    }

    const resp: any = {
      ok: failedUpdates.length === 0,
      projectId: project.id,
      storageType: project.storageType || 'markdown',
      updatedCount,
      updatedIds,
      ...(failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {})
    };

    if (options?.force) {
      resp.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: new Date().toISOString()
      };
    }

    return resp;
  }

  /**
   * Soft deletes or purges a task. Protected done tasks cannot be soft-deleted.
   */
  static deleteTask(
    project: ProjectMeta,
    taskId: string,
    options?: { purge?: boolean }
  ): { ok: boolean; id: string; softDeleted?: boolean; purged?: boolean } {
    const isPurge = options?.purge === true;

    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) return { ok: false, id: taskId };

      const { filePath, filename, task } = fileInfo;
      const currentStatus = (task.status || '').toLowerCase();

      if (!isPurge && currentStatus === 'done') {
        throw new Error('Cannot soft-delete a done item. Done items are protected historical records.');
      }

      if (isPurge) {
        const archiveDir = path.join(project.repoPath, project.backlogDir || 'backlog', 'archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        fs.renameSync(filePath, path.join(archiveDir, filename));
        invalidateTaskCache(filePath);
        return { ok: true, id: taskId, purged: true };
      }

      // Soft delete
      const previousStatus = task.status || 'draft';
      const raw = fs.readFileSync(filePath, 'utf8');
      let updated = raw;

      updated = updated.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
      updated = updated.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
      updated = updated.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');

      const nowIso = new Date().toISOString();
      if (/^status:.*$/m.test(updated)) {
        updated = updated.replace(/^(status:.*$)/m, `$1\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"`);
      } else {
        updated = updated.replace(/^---\r?\n/, `---\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"\n`);
      }

      atomicWriteFileSync(filePath, updated, 'utf8');
      invalidateTaskCache(filePath);
      return { ok: true, id: taskId, softDeleted: true };
    }

    // JSON storage
    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs.existsSync(jsonPath)) return { ok: false, id: taskId };

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const cleanId = taskId.toLowerCase();
    const idx = (data.items || []).findIndex((i: any) =>
      (i.id && String(i.id).toLowerCase() === cleanId) ||
      (i.code && String(i.code).toLowerCase() === cleanId)
    );

    if (idx < 0) return { ok: false, id: taskId };

    const item = data.items[idx];
    if (!isPurge && item.status === 'done') {
      throw new Error('Cannot soft-delete a done item.');
    }

    if (isPurge) {
      data.items.splice(idx, 1);
    } else {
      item.previousStatus = item.status;
      item.isDeleted = true;
      item.deletedAt = new Date().toISOString();
      data.items[idx] = item;
    }

    data.lastUpdated = new Date().toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, id: taskId, softDeleted: !isPurge, purged: isPurge };
  }

  /**
   * Restores a soft-deleted task to active state.
   */
  static restoreTask(project: ProjectMeta, taskId: string): boolean {
    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) return false;

      const { filePath } = fileInfo;
      let raw = fs.readFileSync(filePath, 'utf8');
      const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
      const restoreStatus = prevMatch ? prevMatch[1].trim() : 'draft';

      if (/^status:.*$/m.test(raw)) {
        raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus}`);
      }
      raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
      raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
      raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');

      atomicWriteFileSync(filePath, raw, 'utf8');
      invalidateTaskCache(filePath);
      return true;
    }

    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs.existsSync(jsonPath)) return false;

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const cleanId = taskId.toLowerCase();
    const item = (data.items || []).find((i: any) =>
      (i.id && String(i.id).toLowerCase() === cleanId) ||
      (i.code && String(i.code).toLowerCase() === cleanId)
    );

    if (!item) return false;

    const restoreStatus = item.previousStatus || 'draft';
    item.status = restoreStatus;
    delete item.isDeleted;
    delete item.deletedAt;
    delete item.previousStatus;

    data.lastUpdated = new Date().toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  }

  /**
   * Exports monolithic BACKLOG.md excluding soft-deleted items (AC 6).
   */
  static exportBacklogMd(
    project: ProjectMeta,
    options?: { save?: boolean }
  ): { ok: boolean; content: string; savedPath?: string; taskCount: number } {
    // Only non-deleted tasks are exported
    const tasks = BacklogService.listTasks(project, { includeDeleted: false });
    const mdTasks: BacklogMdTask[] = tasks.map(t => ({
      id: t.code || t.id,
      title: t.title,
      status: normalizeStatus(t.status),
      type: t.type,
      priority: formatPriorityForMd(t.priority),
      milestone: t.milestone || t.targetSprint,
      description: t.description || '',
      acceptanceCriteria: t.acceptanceCriteriaList || t.acceptanceCriteria || []
    }));

    const content = generateMonolithicBacklogMd(project.name, mdTasks);
    let savedPath: string | undefined;

    if (options?.save !== false && project.repoPath) {
      savedPath = path.join(project.repoPath, 'BACKLOG.md');
      atomicWriteFileSync(savedPath, content, 'utf8');
    }

    return {
      ok: true,
      content,
      savedPath,
      taskCount: tasks.length
    };
  }

  /**
   * Synchronizes backlog tasks and BACKLOG.md.
   * DEV-293 / AC 4: Does NOT auto-promote tasks to ready! Only emits quality warnings,
   * and writes BACKLOG.md strictly when real changes exist or autoFix is true.
   */
  static syncBacklog(project: ProjectMeta, options?: { autoFix?: boolean }): SyncBacklogResult {
    let fixedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const autoFix = options?.autoFix === true;

    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const filePath = path.join(tasksDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (!fmMatch) continue;

          const fm = fmMatch[1];
          const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const rawStatus = (statusMatch ? statusMatch[1] : '').toLowerCase();
          const taskId = idMatch ? idMatch[1] : file.split('-')[0];

          const acBlockMatch = content.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
          if (!acBlockMatch) continue;

          const acBlock = acBlockMatch[1];
          const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
          const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];
          const totalAcs = allAcs.length;
          const totalChecked = checkedAcs.length;

          // DEV-293 & AC 4: All ACs complete on draft/doing -> NEVER auto-promote to ready!
          // Only QA role can move to ready. Emit a quality warning.
          if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === 'draft' || rawStatus === 'doing')) {
            warnings.push(
              `${taskId}: Todos los AC completados (${totalChecked}/${totalAcs}) pero status es '${rawStatus}' (aviso de calidad: requiere certificación de QA para pasar a ready)`
            );
          }

          // Rule 2 (SEC-02): Status is 'done' with pending ACs
          if (rawStatus === 'done' && totalAcs > 0 && totalChecked < totalAcs) {
            errors.push(`${taskId}: Status es 'done' pero solo tiene ${totalChecked}/${totalAcs} ACs marcados`);
          }
        }
      }
    }

    // Generate BACKLOG.md from active tasks (excluding isDeleted)
    const exportRes = BacklogService.exportBacklogMd(project, { save: false });
    const content = exportRes.content;
    let backlogPath: string | null = null;
    let changesWritten = false;

    if (project.repoPath) {
      backlogPath = path.join(project.repoPath, 'BACKLOG.md');
      let existingContent = '';
      if (fs.existsSync(backlogPath)) {
        try {
          existingContent = fs.readFileSync(backlogPath, 'utf8');
        } catch {}
      }

      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
      const stripDate = (s: string) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, '');

      const isDifferent = stripDate(normalize(existingContent)) !== stripDate(normalize(content));

      // AC 4: Write BACKLOG.md ONLY when there are real changes OR autoFix is true
      if (isDifferent || autoFix) {
        atomicWriteFileSync(backlogPath, content, 'utf8');
        changesWritten = true;
      }
    }

    return {
      ok: errors.length === 0,
      autoFix,
      fixedCount,
      errorsFound: errors.length,
      errors,
      warnings,
      taskCount: exportRes.taskCount,
      backlogPath,
      changesWritten
    };
  }

  /**
   * Reads full project backlog (items, releases, sprints) with ZERO disk mutations (AC 5).
   * Does NOT auto-close sprints, does NOT auto-write releases.json or sprints.json.
   */
  static readProjectBacklog(project: ProjectMeta): ProjectBacklog {
    if (isBacklogMdProject(project)) {
      const tasksDir = getProjectTasksDir(project);
      try {
        if (!fs.existsSync(tasksDir)) {
          return {
            project: { ...project, storageType: 'markdown' },
            items: [],
            releases: [],
            sprints: [],
            lastUpdated: new Date().toISOString()
          };
        }

        // 1. Read items
        const items = BacklogService.listTasks(project, { includeDeleted: true });

        // 2. Read releases
        let releases: any[] = [];
        const releasesPath = getProjectReleasesPath(project);
        if (fs.existsSync(releasesPath)) {
          try {
            releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
          } catch {}
        }

        // Fallback: parse docs/RELEASE_NOTES.md in-memory WITHOUT writing to disk (AC 5)
        if (releases.length === 0 && project.repoPath) {
          const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, items);
          if (parsed.length > 0) {
            releases = parsed;
          }
        }

        // Bi-directional link calculation in-memory
        if (releases.length > 0) {
          for (const rel of releases) {
            const vClean = (rel.version || '').replace(/^v/i, '');
            const existingCodes = new Set<string>((rel.itemCodes || []).map((c: string) => c.toUpperCase()));
            for (const it of items) {
              const itRel = (it.release || it.targetRelease || '').replace(/^v/i, '');
              const inReleases = (it.releases || []).some((r: string) => r.replace(/^v/i, '') === vClean);
              if (itRel === vClean || inReleases) {
                const codeUpper = (it.code || it.id).toUpperCase();
                if (!existingCodes.has(codeUpper)) {
                  existingCodes.add(codeUpper);
                  if (!rel.itemCodes) rel.itemCodes = [];
                  rel.itemCodes.push(it.code || it.id);
                }
              }
            }
          }

          const releaseByCode = new Map<string, { version: string; date: string; isReleased: boolean }>();
          for (const rel of releases) {
            const isReleased = rel.status === 'released';
            for (const code of rel.itemCodes || []) {
              const key = code.toUpperCase();
              if (!releaseByCode.has(key) || (!releaseByCode.get(key)!.isReleased && isReleased)) {
                releaseByCode.set(key, { version: rel.version, date: rel.date, isReleased });
              }
            }
          }
          for (const it of items) {
            const key = (it.code || it.id).toUpperCase();
            if (releaseByCode.has(key)) {
              const rInfo = releaseByCode.get(key)!;
              it.targetRelease = it.targetRelease || rInfo.version;
              it.release = it.release || rInfo.version;
              if (rInfo.isReleased) {
                it.releasedAt = it.releasedAt || (rInfo.date ? new Date(rInfo.date).toISOString() : undefined);
              }
            }
          }
        }

        // 3. Read sprints WITHOUT disk mutation and WITHOUT auto-closing sprints (AC 5)
        let sprints: any[] = [];
        const sprintsPath = getProjectSprintsPath(project);
        if (fs.existsSync(sprintsPath)) {
          try {
            sprints = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
          } catch {}
        }

        sprints = (sprints || []).map((s: any) => ({
          ...s,
          projectId: project.id
        }));

        // In-memory detection for unregistered sprints
        if (project.repoPath) {
          const detectedSprintNames = new Set<string>();
          for (const it of items) {
            const sp = it.sprint || it.targetSprint;
            if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '-') {
              detectedSprintNames.add(sp.trim());
            }
          }

          if (detectedSprintNames.size > 0) {
            const existingNames = new Set(sprints.map((s: any) => s.name?.toLowerCase().trim()));
            for (const name of detectedSprintNames) {
              if (!existingNames.has(name.toLowerCase())) {
                const sprintItems = items.filter(it => (it.sprint || it.targetSprint || '').trim().toLowerCase() === name.toLowerCase());
                const allDone = sprintItems.length > 0 && sprintItems.every(it => it.status === 'done' || it.status === 'ready' || it.status === 'finish');
                const hasDoing = sprintItems.some(it => it.status === 'doing' || it.status === 'review');

                sprints.push({
                  id: `sprint-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
                  projectId: project.id,
                  name,
                  goal: '',
                  status: allDone ? 'completed' : (hasDoing ? 'active' : 'planned'),
                  createdAt: new Date().toISOString(),
                  completedAt: allDone ? new Date().toISOString() : undefined
                });
              }
            }
          }
        }

        return {
          project: { ...project, storageType: 'markdown' },
          items,
          releases,
          sprints,
          lastUpdated: new Date().toISOString()
        };
      } catch (err: any) {
        console.warn(`[gripm BacklogService] Error reading Backlog.md tasks for ${project.id}:`, err.message);
        return {
          project: { ...project, storageType: 'markdown', error: err.message },
          items: [],
          releases: [],
          sprints: [],
          lastUpdated: new Date().toISOString()
        };
      }
    }

    // Classic JSON mode: Operates directly on the project repository
    const filePath = resolveJsonBacklogPath(project);
    try {
      if (!fs.existsSync(filePath)) {
        const initial: ProjectBacklog = {
          project: { ...project, storageType: 'json' },
          items: [],
          releases: [],
          sprints: [],
          lastUpdated: new Date().toISOString()
        };
        try {
          atomicWriteFileSync(filePath, JSON.stringify(initial, null, 2), 'utf8');
        } catch (writeErr: any) {
          console.error(`[gripm BacklogService] Cannot initialize backlog at ${filePath}:`, writeErr.message);
        }
        return initial;
      }

      const jsonStat = fs.statSync(filePath);
      const jsonMtime = Math.round(jsonStat.mtimeMs);
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      let items = Array.isArray(parsed.items) ? parsed.items : [];
      items = items.map((it: any) => ({
        ...it,
        code: it.code || it.id,
        projectId: it.projectId || project.id,
        status: normalizeStatus(it.status),
        acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
        acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
        mtime: it.mtime || jsonMtime
      }));

      return {
        project: { ...project, storageType: 'json' },
        items,
        releases: Array.isArray(parsed.releases) ? parsed.releases : [],
        sprints: Array.isArray(parsed.sprints) ? parsed.sprints : [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    } catch (err: any) {
      console.error(`[gripm BacklogService] Error reading backlog for project ${project.id}:`, err.message);
      return {
        project: { ...project, storageType: 'json', error: err.message },
        items: [],
        releases: [],
        sprints: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Reads releases from disk guarded by atomic file lock.
   */
  static readReleases(project: ProjectMeta): any[] {
    const filePath = getProjectReleasesPath(project);
    if (!filePath || !fs.existsSync(filePath)) return [];
    return withFileLockSync(filePath, () => {
      try {
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });
  }

  /**
   * Mutates releases on disk guarded by atomic file lock.
   */
  static mutateReleases(project: ProjectMeta, mutator: (current: any[]) => any[] | void): any[] {
    const filePath = getProjectReleasesPath(project);
    if (!filePath) return [];
    return withFileLockSync(filePath, () => {
      let current: any[] = [];
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) current = parsed;
        } catch {}
      }
      const result = mutator(current);
      const toWrite = Array.isArray(result) ? result : current;
      atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
      return toWrite;
    });
  }

  /**
   * Reads retrospectives from disk guarded by atomic file lock.
   */
  static readRetrospectives(project: ProjectMeta): any[] {
    const filePath = getProjectRetrospectivesPath(project);
    if (!filePath || !fs.existsSync(filePath)) return [];
    return withFileLockSync(filePath, () => {
      try {
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });
  }

  /**
   * Mutates retrospectives on disk guarded by atomic file lock.
   */
  static mutateRetrospectives(project: ProjectMeta, mutator: (current: any[]) => any[] | void): any[] {
    const filePath = getProjectRetrospectivesPath(project);
    if (!filePath) return [];
    return withFileLockSync(filePath, () => {
      let current: any[] = [];
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) current = parsed;
        } catch {}
      }
      const result = mutator(current);
      const toWrite = Array.isArray(result) ? result : current;
      atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
      return toWrite;
    });
  }

  /**
   * Writes releases and sprints to disk atomically (markdown) or updates backlog.json (JSON).
   */
  static writeProjectBacklog(project: ProjectMeta, data: ProjectBacklog): void {
    if (isBacklogMdProject(project)) {
      if (project.repoPath) {
        try {
          const dir = path.join(project.repoPath, project.backlogDir || 'backlog');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const releasesPath = path.join(dir, 'releases.json');
          withFileLockSync(releasesPath, () => {
            let releasesToWrite = data.releases || [];
            if (fs.existsSync(releasesPath)) {
              try {
                const diskReleases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
                if (Array.isArray(diskReleases)) {
                  releasesToWrite = releasesToWrite.map((rel: any) => {
                    const diskMatch = diskReleases.find((dr: any) => dr.id === rel.id || dr.version === rel.version);
                    if (diskMatch && Array.isArray(diskMatch.itemCodes) && diskMatch.itemCodes.length > 0) {
                      if (!rel.itemCodes || rel.itemCodes.length === 0) {
                        return { ...rel, itemCodes: diskMatch.itemCodes };
                      }
                    }
                    return rel;
                  });
                }
              } catch {}
            }
            atomicWriteFileSync(releasesPath, JSON.stringify(releasesToWrite, null, 2), 'utf8');
          });
          if (data.sprints !== undefined) {
            atomicWriteFileSync(path.join(dir, 'sprints.json'), JSON.stringify(data.sprints || [], null, 2), 'utf8');
          }
        } catch (err: any) {
          console.warn(`[gripm BacklogService] Warning writing releases/sprints: ${err.message}`);
        }
      }
      return;
    }

    const filePath = resolveJsonBacklogPath(project);
    data.lastUpdated = new Date().toISOString();

    try {
      atomicWriteFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err: any) {
      console.error(`[gripm BacklogService] Error writing project backlog to ${filePath}:`, err.message);
    }
  }

  /**
   * Saves or creates a single task item (used by legacy and HTTP adapters).
   */
  static saveTask(project: ProjectMeta, item: any): void {
    if (!project.repoPath && isBacklogMdProject(project)) return;

    if (isBacklogMdProject(project)) {
      const tasksDir = getProjectTasksDir(project);
      if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

      const fileInfo = findTaskFile(project, item.code || item.id);
      let existingFile = fileInfo?.filename;
      let existingTask: Partial<BacklogMdTask> = fileInfo?.task || {};

      const taskData: BacklogMdTask = {
        id: item.code || item.id,
        title: item.title || existingTask.title || 'Sin título',
        status: normalizeStatus(item.status),
        type: normalizeType(item.type || existingTask.type) || 'feature',
        priority: item.priority || existingTask.priority || 'p2',
        assignees: item.assignees !== undefined ? item.assignees : (existingTask.assignees || []),
        labels: item.labels !== undefined ? item.labels : (existingTask.labels || []),
        dependencies: item.dependencies || existingTask.dependencies || [],
        parentId: item.parentId !== undefined ? item.parentId : existingTask.parentId,
        blocks: item.blocks !== undefined ? item.blocks : existingTask.blocks,
        blockedBy: item.blockedBy !== undefined ? item.blockedBy : existingTask.blockedBy,
        blockedReason: item.blockedReason !== undefined ? item.blockedReason : existingTask.blockedReason,
        dismissedReason: item.dismissedReason !== undefined ? item.dismissedReason : existingTask.dismissedReason,
        relatedTo: item.relatedTo !== undefined ? item.relatedTo : existingTask.relatedTo,
        sprints: item.sprints !== undefined ? item.sprints : existingTask.sprints,
        releases: (item.release !== undefined || item.targetRelease !== undefined || item.milestone !== undefined || item.releases !== undefined)
          ? (Array.isArray(item.releases) ? item.releases.filter(Boolean) : (item.release ? [item.release] : [])).filter((r: string) => !r.toLowerCase().includes('sprint'))
          : (existingTask.releases || []).filter((r: string) => !r.toLowerCase().includes('sprint')),
        milestone: (item.release !== undefined || item.targetRelease !== undefined || item.milestone !== undefined)
          ? ((item.release || item.targetRelease || item.milestone || '').toLowerCase().includes('sprint') ? undefined : (item.release || item.targetRelease || item.milestone || undefined))
          : (existingTask.milestone && !existingTask.milestone.toLowerCase().includes('sprint') ? existingTask.milestone : undefined),
        createdDate: item.createdAt || existingTask.createdDate,
        updatedDate: item.updatedAt || new Date().toISOString(),
        description: item.description !== undefined ? item.description : (existingTask.description || ''),
        acceptanceCriteria: item.acceptanceCriteriaList || existingTask.acceptanceCriteria || [],
        implementationPlan: item.implementationPlan !== undefined ? item.implementationPlan : (existingTask.implementationPlan || ''),
        implementationNotes: item.fix || item.implementationNotes || existingTask.implementationNotes,
        finalSummary: item.finalSummary || existingTask.finalSummary,
        estimate: item.estimate !== undefined ? (item.estimate === '' ? undefined : item.estimate) : existingTask.estimate,
        startDate: item.startDate !== undefined ? item.startDate : existingTask.startDate,
        dueDate: item.dueDate !== undefined ? item.dueDate : existingTask.dueDate,
        rawExtraFrontmatter: {
          ...(existingTask.rawExtraFrontmatter || {})
        }
      };

      if (item.isDeleted) {
        taskData.isDeleted = true;
        taskData.deletedAt = item.deletedAt || new Date().toISOString();
        taskData.previousStatus = item.previousStatus || existingTask.previousStatus || existingTask.status || 'draft';
        if (taskData.rawExtraFrontmatter) {
          taskData.rawExtraFrontmatter.isDeleted = 'true';
          if (taskData.deletedAt) taskData.rawExtraFrontmatter.deletedAt = taskData.deletedAt;
          if (taskData.previousStatus) taskData.rawExtraFrontmatter.previousStatus = taskData.previousStatus;
        }
      } else {
        taskData.isDeleted = undefined;
        taskData.deletedAt = undefined;
        taskData.previousStatus = undefined;
        if (taskData.rawExtraFrontmatter) {
          delete taskData.rawExtraFrontmatter.isdeleted;
          delete taskData.rawExtraFrontmatter.isDeleted;
          delete taskData.rawExtraFrontmatter.deletedat;
          delete taskData.rawExtraFrontmatter.deletedAt;
          delete taskData.rawExtraFrontmatter.previousstatus;
          delete taskData.rawExtraFrontmatter.previousStatus;
        }
      }

      if (item.estimate !== undefined) {
        if (item.estimate === '' || item.estimate === null) {
          taskData.estimate = undefined;
          if (taskData.rawExtraFrontmatter) delete taskData.rawExtraFrontmatter.estimate;
        } else {
          taskData.estimate = item.estimate;
          if (taskData.rawExtraFrontmatter) taskData.rawExtraFrontmatter.estimate = String(item.estimate);
        }
      }

      if (item.impactedFile !== undefined) taskData.rawExtraFrontmatter!.impactedFile = item.impactedFile;
      if (item.risk !== undefined) taskData.rawExtraFrontmatter!.risk = item.risk;
      if (item.fix !== undefined) taskData.rawExtraFrontmatter!.fix = item.fix;
      if (item.module !== undefined) taskData.rawExtraFrontmatter!.module = item.module;
      if (item.epic !== undefined) taskData.rawExtraFrontmatter!.epic = item.epic;
      if (item.category !== undefined) taskData.rawExtraFrontmatter!.category = item.category;

      const isSprintProvided = item.sprint !== undefined || item.targetSprint !== undefined || item.sprints !== undefined;
      const rawSVal = isSprintProvided
        ? (item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : '') || '')
        : (existingTask.sprint || existingTask.targetSprint || (existingTask.sprints && existingTask.sprints.length > 0 ? existingTask.sprints[existingTask.sprints.length - 1] : '') || '');

      const resolvedSprint = resolveLegibleSprint(project, rawSVal);
      if (resolvedSprint) {
        taskData.sprint = resolvedSprint;
        taskData.targetSprint = resolvedSprint;
        taskData.sprints = [resolvedSprint];
        taskData.rawExtraFrontmatter!.sprint = resolvedSprint;
        taskData.rawExtraFrontmatter!.targetSprint = resolvedSprint;
      } else {
        taskData.sprint = undefined;
        taskData.targetSprint = undefined;
        taskData.sprints = [];
        delete taskData.rawExtraFrontmatter!.sprint;
        delete taskData.rawExtraFrontmatter!.targetSprint;
      }

      // Releases sync
      const isReleaseProvided = item.release !== undefined || item.targetRelease !== undefined || item.milestone !== undefined || item.releases !== undefined;
      if (isReleaseProvided) {
        const rawRVal = (item.release || item.targetRelease || item.milestone || (item.releases && item.releases.length > 0 ? item.releases[0] : '') || '').trim();
        const rVal = rawRVal.toLowerCase().includes('sprint') ? '' : rawRVal;
        const relArray = (Array.isArray(item.releases) ? item.releases.filter(Boolean) : (rVal ? [rVal] : [])).filter((r: string) => !r.toLowerCase().includes('sprint'));

        if (rVal || relArray.length > 0) {
          taskData.rawExtraFrontmatter!.release = rVal || relArray[0];
          taskData.rawExtraFrontmatter!.targetRelease = rVal || relArray[0];
          taskData.milestone = rVal || relArray[0];
          taskData.releases = relArray;
        } else {
          delete taskData.rawExtraFrontmatter!.release;
          delete taskData.rawExtraFrontmatter!.targetRelease;
          delete taskData.rawExtraFrontmatter!.releases;
          taskData.milestone = undefined;
          taskData.releases = [];
        }

        if (project.repoPath) {
          const releasesPath = getProjectReleasesPath(project);
          if (releasesPath) {
            withFileLockSync(releasesPath, () => {
              if (fs.existsSync(releasesPath)) {
                try {
                  const relsData = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
                  const taskCode = (taskData.id || '').toUpperCase();
                  let changed = false;
                  const targetVersion = (rVal || (relArray[0] || '')).replace(/^v/i, '');

                  let versionFound = false;
                  for (const rel of relsData) {
                    const vClean = (rel.version || '').replace(/^v/i, '');
                    if (!rel.itemCodes) rel.itemCodes = [];
                    const idx = rel.itemCodes.findIndex((c: string) => c.toUpperCase() === taskCode);

                    if (targetVersion && vClean === targetVersion) {
                      versionFound = true;
                      if (idx < 0) {
                        rel.itemCodes.push(taskData.id);
                        changed = true;
                      }
                    } else if (idx >= 0 && !relArray.some((rv: string) => rv.replace(/^v/i, '') === vClean)) {
                      rel.itemCodes.splice(idx, 1);
                      changed = true;
                    }
                  }

                  if (targetVersion && !versionFound) {
                    const now = new Date();
                    const todayStr = now.toISOString().slice(0, 10);
                    const targetDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                    relsData.unshift({
                      id: `rel-${targetVersion.replace(/\./g, '-')}`,
                      projectId: project.id,
                      version: targetVersion,
                      date: todayStr,
                      targetDate: targetDate,
                      status: 'unreleased',
                      title: `v${targetVersion}`,
                      summary: `Versión ${targetVersion} creada para planificación.`,
                      itemCodes: [taskData.id],
                      markdownContent: `## [${targetVersion}] - Unreleased\n\n### 🎯 Resumen\n*Versión ${targetVersion} en planificación.*`,
                      createdAt: now.toISOString()
                    });
                    changed = true;
                  }

                  if (changed) {
                    atomicWriteFileSync(releasesPath, JSON.stringify(relsData, null, 2), 'utf8');
                  }
                } catch (syncErr: any) {
                  console.warn('[gripm BacklogService] Error syncing releases.json when saving task:', syncErr.message);
                }
              }
            });
          }
        }
      }

      if (item.order !== undefined) taskData.rawExtraFrontmatter!.order = item.order;

      const content = serializeBacklogMd(taskData);
      const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
      const targetFilePath = path.join(tasksDir, targetFilename);

      atomicWriteFileSync(targetFilePath, content, 'utf8');
      invalidateTaskCache(targetFilePath);
      return;
    }

    // JSON storage
    const jsonPath = resolveJsonBacklogPath(project);
    let currentBacklog: any = { project, items: [] };
    if (fs.existsSync(jsonPath)) {
      try {
        currentBacklog = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch {}
    }
    const cleanId = String(item.code || item.id).toLowerCase();
    const idx = (currentBacklog.items || []).findIndex((i: any) =>
      (i.id && String(i.id).toLowerCase() === cleanId) ||
      (i.code && String(i.code).toLowerCase() === cleanId)
    );

    if (idx >= 0) {
      currentBacklog.items[idx] = { ...currentBacklog.items[idx], ...item, updatedAt: new Date().toISOString() };
    } else {
      currentBacklog.items.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    currentBacklog.lastUpdated = new Date().toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(currentBacklog, null, 2), 'utf8');
  }

  static getTaskCacheStats = getTaskCacheStats;
  static clearTaskCache = clearTaskCache;
  static invalidateTaskCache = invalidateTaskCache;
  static loadProjectBacklog = BacklogService.readProjectBacklog;
}

export function getNextTaskId(project: ProjectMeta, options?: { withoutLock?: boolean }): string {
  return BacklogService.getNextTaskId(project, options);
}

