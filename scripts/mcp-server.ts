#!/usr/bin/env node
/**
 * gripm MCP Server (Model Context Protocol)
 * stdio-based JSON-RPC 2.0 server for AI Agents (Cursor, Claude Code, Antigravity, etc.)
 * Provides tools to read and mutate the gripm backlog without friction.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadRegistryFile, resolveProjectIdentity } from './registryConfig.js';
import { formatUpdateBanner, checkForUpdates, getCachedUpdateInfo, semverGreaterThan } from './updateChecker.js';
import { atomicWriteFileSync } from '../server/services/atomicWrite.ts';
import { BacklogService } from '../server/services/backlogService.ts';
import { isAllowedBrowsePath, isSystemRootDir } from '../server/services/fsExplorer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let currentVersion = '0.5.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  if (pkg.version) currentVersion = pkg.version;
} catch {}

const cliArgs = process.argv.slice(2);
const isHelp = cliArgs.some(a => ['--help', '-h', '--h', '-help'].includes(a)) || cliArgs[0] === 'help';
if (isHelp) {
  console.log(`
  🚀 gripm-mcp - Servidor Model Context Protocol (MCP) para agentes de IA

  Uso:
    gripm mcp [opciones]
    gripm-mcp [opciones]

  Descripción:
    Inicia el servidor MCP de Gripm sobre stdio (JSON-RPC 2.0).
    Permite a agentes de IA (Cursor, Antigravity, Claude Code) consultar,
    crear, actualizar y sincronizar tareas del backlog.

  Opciones:
    --repo, -r <ruta>     Ruta al repositorio del proyecto (por defecto: directorio actual)
    --version, -v         Muestra la versión instalada
    --help, -h            Muestra esta ayuda
`);
  process.exit(0);
}

if (cliArgs.includes('--version') || cliArgs.includes('-v')) {
  console.log(currentVersion);
  process.exit(0);
}

// Non-blocking update check for MCP server (outputs to stderr to keep stdout JSON-RPC clean)
try {
  const cached = getCachedUpdateInfo(currentVersion);
  if (cached && cached.hasUpdate) {
    process.stderr.write('\n' + formatUpdateBanner(currentVersion, cached.latestVersion) + '\n\n');
  }
  checkForUpdates(currentVersion).then((res) => {
    const isNewerThanCached = cached?.latestVersion && semverGreaterThan(res.latestVersion, cached.latestVersion);
    if (res.hasUpdate && (!cached?.hasUpdate || isNewerThanCached)) {
      process.stderr.write('\n' + formatUpdateBanner(currentVersion, res.latestVersion) + '\n\n');
    }
  }).catch(() => {});
} catch {}

interface ProjectMeta {
  id: string;
  name: string;
  codePrefix: string;
  repoPath?: string;
  description?: string;
  isDemo?: boolean;
  storageType?: 'json' | 'markdown';
  backlogDir?: string;
  createdAt: string;
  error?: string;
}



function getRegistry(): { activeProjectId: string; projects: ProjectMeta[] } {
  let reg: { activeProjectId: string; projects: ProjectMeta[] } = loadRegistryFile(ROOT_DIR);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: '', projects: [] };
  }

  // CLI arg support: --repo <dir>, -r <dir> or -p <dir>
  const args = process.argv.slice(2);
  let cliRepo: string | null = null;
  const repoIdx = args.findIndex(a => a === '--repo' || a === '-r' || a === '-p');
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    cliRepo = path.resolve(args[repoIdx + 1]);
    // SEC-03: Validate containment and existence of --repo
    if (!fs.existsSync(cliRepo) || !fs.statSync(cliRepo).isDirectory()) {
      throw new Error(`[MCP Security] Error: La ruta provista en --repo '${cliRepo}' no existe o no es un directorio.`);
    }
    if (isSystemRootDir(cliRepo)) {
      throw new Error(`[MCP Security] Error: La ruta provista en --repo '${cliRepo}' es una raíz o directorio protegido del sistema.`);
    }
    const knownRoots = (reg.projects || []).map(p => p.repoPath || '').filter(Boolean);
    if (!isAllowedBrowsePath(cliRepo, knownRoots)) {
      throw new Error(`[MCP Security] Error: La ruta provista en --repo '${cliRepo}' está fuera de las rutas autorizadas de contención.`);
    }
  }

  const targetRepo = cliRepo || process.cwd();
  const hasMdBacklog = fs.existsSync(path.join(targetRepo, 'backlog/tasks'));
  const hasJsonBacklog = fs.existsSync(path.join(targetRepo, '.gripm/backlog.json'));

  if (hasMdBacklog || hasJsonBacklog || cliRepo) {
    const existing = reg.projects.find(p => p.repoPath && path.resolve(p.repoPath) === targetRepo);
    const identity = resolveProjectIdentity(targetRepo);
    if (existing) {
      if (identity.id && identity.id !== existing.id) {
        existing.id = identity.id;
      }
      existing.name = identity.name || existing.name;
      existing.codePrefix = identity.codePrefix || existing.codePrefix;
      reg.activeProjectId = existing.id;
    } else {
      const synthProject: ProjectMeta = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: targetRepo,
        storageType: hasMdBacklog ? 'markdown' : 'json',
        backlogDir: 'backlog',
        createdAt: new Date().toISOString()
      };
      reg.projects.unshift(synthProject);
      reg.activeProjectId = identity.id;
    }
  }

  return reg;
}

function readTasksForProject(project: ProjectMeta): any[] {
  return BacklogService.listTasks(project as any, { includeDeleted: true });
}

// Tool definitions for MCP tools/list
const CANONICAL_TOOLS = [
  {
    name: 'gripm_list_projects',
    description: 'Lists registered projects in the gripm cockpit, their repository paths and storage engine (Markdown vs JSON).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'gripm_list_tasks',
    description: 'Lists backlog tasks with optional filters (openOnly, search, limit, compact format for minimal token usage).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        status: { 
          type: 'string', 
          description: 'Filter by status: "draft", "doing", "review", "ready", "done", "dismissed", "cancelled".' 
        },
        openOnly: {
          type: 'boolean',
          description: 'If true, excludes closed/done/dismissed tasks, returning only active or backlog tasks.'
        },
        priority: { type: 'string', description: 'Filter by priority: "urgent", "high", "medium", "low".' },
        sprint: { type: 'string', description: 'Filter by assigned sprint (e.g. "Sprint 8").' },
        milestone: { type: 'string', description: 'Filter by milestone or release version.' },
        search: { type: 'string', description: 'Search term to match against task title, code, or labels.' },
        prefix: { type: 'string', description: 'Filter by task code prefix (e.g. "DEV-", "FEAT-").' },
        taskIds: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Explicit list of task IDs to query (e.g. ["DEV-001", "DEV-002"]).' 
        },
        limit: { type: 'number', description: 'Maximum number of tasks to return (recommended to prevent token saturation).' },
        offset: { type: 'number', description: 'Pagination offset (defaults to 0).' },
        format: { 
          type: 'string', 
          enum: ['detailed', 'compact'], 
          description: 'Output format. "compact" returns a 1-line summary per task (saves ~90% tokens).' 
        }
      }
    }
  },
  {
    name: 'gripm_get_stats',
    description: 'Calculates aggregate backlog metrics: total tasks, open, closed, completion percentage, status/priority breakdown, and code prefix breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, analyzes active project.' }
      }
    }
  },
  {
    name: 'gripm_bulk_update_tasks',
    description: 'Performs atomic batch updates across multiple tasks simultaneously (by taskIds list or prefix/status filter).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        taskIds: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Explicit list of task IDs to update (e.g. ["DEV-001", "DEV-002"]).' 
        },
        filterPrefix: { 
          type: 'string', 
          description: 'Code prefix to match for bulk update (e.g. "FEAT-", "BUG-").' 
        },
        filterStatus: {
          type: 'string',
          description: 'Filter by current status before applying update (e.g. "draft").'
        },
        updates: {
          type: 'object',
          description: 'Fields to update across all matching tasks.',
          properties: {
            status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'] },
            priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
            milestone: { type: 'string' },
            sprint: { type: 'string', description: 'Sprint to assign to matching tasks.' },
            implementationNotes: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            estimate: { description: 'Estimation value (story points number or T-shirt size string).' }
          }
        }
      },
      required: ['updates']
    }
  },
  {
    name: 'gripm_get_task',
    description: 'Retrieves complete details of a task including Acceptance Criteria (AC), Implementation Plan, and Notes.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID or code (e.g. "DEV-001").' },
        projectId: { type: 'string', description: 'Project ID (optional if task code is unique).' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'gripm_create_task',
    description: 'Creates a new task in the backlog, generating an individual Markdown file in backlog/tasks/.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        title: { type: 'string', description: 'Descriptive title for the task.' },
        description: { type: 'string', description: 'Technical description or detailed requirements.' },
        type: { type: 'string', enum: ['feature', 'bug', 'tech_debt', 'ux'], description: 'Item type.' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'], description: 'Priority level.' },
        status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'], description: 'Initial status.' },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Plain-text list of acceptance criteria.'
        },
        implementationPlan: { type: 'string', description: 'Step-by-step technical implementation plan.' },
        milestone: { type: 'string', description: 'Assigned sprint or milestone.' },
        estimate: { description: 'Estimation value (story points number or T-shirt size string).' }
      },
      required: ['title']
    }
  },
  {
    name: 'gripm_update_task',
    description: 'Updates task status (draft, doing, review, ready, done), acceptance criteria checkboxes, priority, or implementation plan.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID or code to update.' },
        projectId: { type: 'string', description: 'Project ID.' },
        status: { 
          type: 'string', 
          enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'],
          description: 'Task status (canonical top-level field).'
        },
        updates: {
          type: 'object',
          description: 'Optional update object (supports status, title, description, priority, etc.).',
          properties: {
            status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'] },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
            implementationPlan: { type: 'string' },
            milestone: { type: 'string' },
            sprint: { type: 'string' },
            estimate: { description: 'Estimation value (story points number or T-shirt size string).' },
            checkAllAcs: { type: 'boolean' }
          }
        },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        implementationPlan: { type: 'string', description: 'Technical plan update.' },
        sprint: { type: 'string', description: 'Sprint name to assign (e.g. "Sprint 8").' },
        estimate: { description: 'Estimation value (story points number or T-shirt size string).' },
        toggleAcIndex: { type: 'number', description: 'AC index (1-indexed) to toggle checked/unchecked.' },
        checkAllAcs: { type: 'boolean', description: 'If true, checks all ACs. If false, unchecks all ACs.' },
        verifyCommand: { type: 'string', description: 'Verification command to execute before certifying transition to ready/done.' },
        force: { type: 'boolean', description: 'Force transition bypassing Gatekeeper checks (requires explicit authorization).' },
        milestone: { type: 'string' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'gripm_export_backlog',
    description: 'Generates or updates the consolidated BACKLOG.md document at the repository root.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID to consolidate.' }
      }
    }
  },
  {
    name: 'gripm_list_releases',
    description: 'Lists all project releases, versions, changelog notes, and linked tasks (both released and in preparation).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        version: { type: 'string', description: 'Specific version to query (e.g. "v1.0.0"). If omitted, returns all.' }
      }
    }
  },
  {
    name: 'gripm_sync_backlog',
    description: 'Audits and automatically reconciles tasks with acceptance criteria and regenerates BACKLOG.md without shell commands.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        autoFix: { type: 'boolean', description: 'If true, auto-promotes completed tasks to Done and reconciles ACs.' }
      }
    }
  },
  {
    name: 'gripm_create_retro',
    description: 'Records and persists a structured sprint retrospective in Markdown inside backlog/retros/sprint-N-retro.md.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        sprintId: { type: 'string', description: 'Sprint ID or number (e.g. "sprint-8").' },
        sprintName: { type: 'string', description: 'Human-readable sprint name (e.g. "Sprint 8").' },
        whatWentWell: { type: 'string', description: 'Strengths: What worked well and should be repeated?' },
        whatWentWrong: { type: 'string', description: 'Issues: What failed or took longer than expected?' },
        whatToImprove: { type: 'string', description: 'Efficiency: What could be improved for next iterations?' },
        actions: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Concrete action items for subsequent sprints.' 
        }
      },
      required: ['sprintId']
    }
  },
  {
    name: 'gripm_list_retros',
    description: 'Lists saved sprint retrospectives in backlog/retros/ with summaries and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' }
      }
    }
  }
];

// Canonical tools are the official public MCP catalog
const TOOLS = CANONICAL_TOOLS;

// Tool execution handler
async function handleToolCall(rawName: string, args: any): Promise<any> {
  const registry = getRegistry();
  const name = rawName;

  if (name === 'gripm_list_projects') {
    return {
      activeProjectId: registry.activeProjectId,
      projects: registry.projects.map(p => ({
        id: p.id,
        name: p.name,
        codePrefix: p.codePrefix,
        repoPath: p.repoPath,
        storageType: p.storageType || 'json'
      }))
    };
  }

  if (name === 'gripm_list_tasks') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];

    if (!targetProject) throw new Error('No hay proyectos registrados en gripm.');

    if (args.limit !== undefined) {
      if (typeof args.limit !== 'number' || !Number.isInteger(args.limit) || args.limit <= 0) {
        throw new Error(`[MCP Validation] Invalid parameter 'limit': must be a positive integer, received '${args.limit}'.`);
      }
    }
    if (args.offset !== undefined) {
      if (typeof args.offset !== 'number' || !Number.isInteger(args.offset) || args.offset < 0) {
        throw new Error(`[MCP Validation] Invalid parameter 'offset': must be a non-negative integer, received '${args.offset}'.`);
      }
    }

    const allFiltered = BacklogService.listTasks(targetProject as any, {
      openOnly: args.openOnly,
      status: args.status,
      priority: args.priority,
      sprint: args.sprint,
      milestone: args.milestone,
      prefix: args.prefix,
      taskIds: args.taskIds,
      search: args.search,
      includeDeleted: false
    });

    const totalFiltered = allFiltered.length;
    const offset = args.offset !== undefined ? args.offset : 0;
    let tasks = allFiltered;
    if (args.limit !== undefined) {
      tasks = tasks.slice(offset, offset + args.limit);
    } else if (offset > 0) {
      tasks = tasks.slice(offset);
    }

    if (args.format === 'compact') {
      return {
        projectId: targetProject.id,
        projectName: targetProject.name,
        storageType: targetProject.storageType,
        total: totalFiltered,
        showing: tasks.length,
        offset,
        items: tasks.map(t => {
          const acList = t.acceptanceCriteriaList || t.acceptanceCriteria || [];
          const acInfo = acList.length > 0 
            ? `${acList.filter((ac: any) => ac.checked).length}/${acList.length} AC` 
            : '0/0 AC';
          const m = t.milestone || t.targetSprint ? ` [${t.milestone || t.targetSprint}]` : '';
          return `[${t.code || t.id}] (${t.status}/${t.priority}) ${t.title}${m} (${acInfo})`;
        })
      };
    }

    return {
      projectId: targetProject.id,
      projectName: targetProject.name,
      storageType: targetProject.storageType,
      total: totalFiltered,
      showing: tasks.length,
      offset,
      tasks: tasks.map(t => {
        const acList = t.acceptanceCriteriaList || t.acceptanceCriteria || [];
        return {
          id: t.code || t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          type: t.type,
          milestone: t.milestone || t.targetSprint,
          acProgress: acList.length > 0 
            ? `${acList.filter((ac: any) => ac.checked).length}/${acList.length} AC` 
            : '0/0 AC'
        };
      })
    };
  }

  if (name === 'gripm_get_stats') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];

    if (!targetProject) throw new Error('No hay proyectos registrados en gripm.');

    const stats = BacklogService.getStats(targetProject as any);
    return {
      projectId: targetProject.id,
      projectName: targetProject.name,
      storageType: targetProject.storageType,
      summary: {
        total: stats.total,
        open: stats.open,
        done: stats.done,
        completionRate: stats.completionRate
      },
      ...stats
    };
  }

  if (name === 'gripm_bulk_update_tasks') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];

    if (!targetProject) throw new Error('No hay proyectos registrados en gripm.');

    const updates = args.updates || {};
    return BacklogService.bulkUpdateTasks(
      targetProject as any,
      {
        taskIds: args.taskIds,
        filterPrefix: args.filterPrefix,
        filterStatus: args.filterStatus
      },
      updates,
      { force: args.force, verifyCommand: args.verifyCommand }
    );
  }

  if (name === 'gripm_get_task') {
    if (!args.taskId || typeof args.taskId !== 'string' || !args.taskId.trim()) {
      throw new Error(`[MCP Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }
    const cleanId = String(args.taskId).toLowerCase();
    const candidateProjects = args.projectId
      ? registry.projects.filter(p => p.id === args.projectId)
      : [
          registry.projects.find(p => p.id === registry.activeProjectId),
          ...registry.projects.filter(p => p.id !== registry.activeProjectId)
        ].filter(Boolean) as ProjectMeta[];

    for (const p of candidateProjects) {
      try {
        const res = BacklogService.getTask(p as any, cleanId);
        if (res.found) return res;
      } catch {}
    }
    throw new Error(`Task ${args.taskId} not found.`);
  }

  if (name === 'gripm_create_task') {
    const project = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];
    if (!project) throw new Error('Project not found.');

    return BacklogService.createTask(project as any, args);
  }

  if (name === 'gripm_update_task') {
    if (!args.taskId || typeof args.taskId !== 'string' || !args.taskId.trim()) {
      throw new Error(`[MCP Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }
    if (args.toggleAcIndex !== undefined) {
      if (typeof args.toggleAcIndex !== 'number' || !Number.isInteger(args.toggleAcIndex) || args.toggleAcIndex < 1) {
        throw new Error(`[MCP Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${args.toggleAcIndex}'.`);
      }
    }

    const candidateProjects = args.projectId
      ? registry.projects.filter(p => p.id === args.projectId)
      : [
          registry.projects.find(p => p.id === registry.activeProjectId),
          ...registry.projects.filter(p => p.id !== registry.activeProjectId)
        ].filter(Boolean) as ProjectMeta[];

    for (const project of candidateProjects) {
      try {
        const res = BacklogService.updateTask(project as any, args.taskId, args, {
          force: args.force,
          verifyCommand: args.verifyCommand
        });
        if (res.ok) return res;
      } catch (err: any) {
        if (err.message && err.message.includes('[MCP Gatekeeper')) {
          throw err;
        }
        if (err.message && (err.message.includes('not found') || err.message.includes('no encontrada'))) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Task ${args.taskId} not found to update.`);
  }

  if (name === 'gripm_export_backlog') {
    const project = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];
    if (!project) throw new Error('Proyecto no encontrado.');

    const res = BacklogService.exportBacklogMd(project as any, { save: true });
    return {
      ok: true,
      savedPath: res.savedPath || null,
      taskCount: res.taskCount
    };
  }

  if (name === 'gripm_sync_backlog') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];
    if (!targetProject) throw new Error('Proyecto no encontrado.');

    const res = BacklogService.syncBacklog(targetProject as any, { autoFix: args.autoFix });
    return {
      ok: res.ok,
      autoFix: res.autoFix,
      fixedCount: res.fixedCount,
      errorsFound: res.errorsFound,
      errors: res.errors,
      warnings: res.warnings,
      taskCount: res.taskCount,
      backlogPath: res.backlogPath
    };
  }

  if (name === 'gripm_list_releases') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];

    if (!targetProject) throw new Error('No hay proyectos registrados en gripm.');

    let releases: any[] = [];
    const repoPath = targetProject.repoPath || ROOT_DIR;
    const releasesJsonPath = path.join(repoPath, targetProject.backlogDir || 'backlog', 'releases.json');
    const gripmReleasesPath = path.join(repoPath, '.gripm/releases.json');
    const dataReleasesPath = path.join(ROOT_DIR, 'data/releases.json');

    if (fs.existsSync(releasesJsonPath)) {
      try { releases = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8')); } catch {}
    } else if (fs.existsSync(gripmReleasesPath)) {
      try { releases = JSON.parse(fs.readFileSync(gripmReleasesPath, 'utf8')); } catch {}
    } else if (fs.existsSync(dataReleasesPath)) {
      try { releases = JSON.parse(fs.readFileSync(dataReleasesPath, 'utf8')); } catch {}
    }

    const allTasks = readTasksForProject(targetProject);
    const knownCodes = new Set(allTasks.map(t => (t.code || t.id || '').toUpperCase()).filter(Boolean));
    const codePrefix = (targetProject.codePrefix || '').toUpperCase().trim();

    // Fallback: parse docs/RELEASE_NOTES.md or RELEASE_NOTES.md
    if (releases.length === 0) {
      const notesPaths = [
        path.join(repoPath, 'docs/RELEASE_NOTES.md'),
        path.join(repoPath, 'docs/releasenotes.md'),
        path.join(repoPath, 'RELEASE_NOTES.md'),
        path.join(repoPath, 'releasenotes.md'),
        path.join(repoPath, 'CHANGELOG.md')
      ];
      for (const np of notesPaths) {
        if (fs.existsSync(np)) {
          try {
            const content = fs.readFileSync(np, 'utf8');
            const sections = content.split(/(?=^##\s+)/m);
            for (const section of sections) {
              const trimmed = section.trim();
              if (!trimmed.startsWith('##')) continue;
              const firstLineEnd = trimmed.indexOf('\n');
              const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
              const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\] - - -]+)?)\]?/);
              if (!vMatch) continue;

              const rawVersion = vMatch[1].trim();
              const version = rawVersion.replace(/^v(?=\d)/i, '');
              const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
              const date = dateMatch ? dateMatch[1] : '';

              let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, '').trim();
              if (date) title = title.replace(date, '').trim();
              title = title.replace(/^[-:\u2014\u2013🚀 ]+/, '').trim();

              const itemCodesSet = new Set<string>();
              const candidates = trimmed.match(/\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\b/g) || [];
              for (const c of candidates) {
                const upper = c.toUpperCase();
                if (knownCodes.has(upper) || (codePrefix && upper.startsWith(`${codePrefix}-`))) {
                  itemCodesSet.add(upper);
                }
              }
              for (const t of allTasks) {
                const m = (t.milestone || t.targetSprint || '').replace(/^v/i, '');
                if (m && m === version) itemCodesSet.add(t.code || t.id);
              }

              releases.push({
                version,
                date: date || '',
                title: title || `Release ${version}`,
                itemCodes: Array.from(itemCodesSet),
                itemCount: itemCodesSet.size
              });
            }
          } catch {}
          if (releases.length > 0) break;
        }
      }
    }

    if (args.version) {
      const vClean = String(args.version).trim().toLowerCase().replace(/^v/, '');
      const foundRelease = releases.find(r => String(r.version).toLowerCase().replace(/^v/, '') === vClean);
      if (!foundRelease) {
        return {
          project: targetProject.id,
          version: args.version,
          found: false,
          message: `No se encontró el release para la versión "${args.version}".`,
          availableVersions: releases.map(r => r.version)
        };
      }

      const relatedCodes = new Set((foundRelease.itemCodes || []).map((c: string) => c.toLowerCase()));
      const relatedTasks = allTasks.filter(t => {
        const idLower = String(t.id || t.code || '').toLowerCase();
        if (relatedCodes.has(idLower)) return true;
        const mLower = String(t.milestone || t.targetSprint || '').toLowerCase().replace(/^v/, '');
        return mLower === vClean;
      });

      return {
        project: targetProject.id,
        release: foundRelease,
        taskCount: relatedTasks.length,
        tasks: relatedTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          type: t.type
        }))
      };
    }

    return {
      project: targetProject.id,
      totalReleases: releases.length,
      releases: releases.map(r => ({
        version: r.version,
        status: r.status || (r.version === '0.2.0' ? 'released' : 'unreleased'),
        date: r.date,
        title: r.title,
        itemCount: Array.isArray(r.itemCodes) ? r.itemCodes.length : 0,
        itemCodes: r.itemCodes || []
      }))
    };
  }

  if (name === 'gripm_create_retro') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];
    if (!targetProject) throw new Error('Proyecto no encontrado.');

    const sprintKey = String(args.sprintId || args.sprintName || 'sprint').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const retrosDir = path.join(targetProject.repoPath || ROOT_DIR, targetProject.backlogDir || 'backlog', 'retros');
    if (!fs.existsSync(retrosDir)) {
      fs.mkdirSync(retrosDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const sprintTitle = args.sprintName || args.sprintId;
    const filePath = path.join(retrosDir, `${sprintKey}-retro.md`);

    const mdContent = `# Retrospectiva - ${sprintTitle}

**Fecha:** ${today}  
**Sprint:** ${sprintTitle}  
**Proyecto:** ${targetProject.name}

---

## 🟢 Fortalezas (¿Qué funcionó bien y debe repetirse?)
${args.whatWentWell ? args.whatWentWell.trim() : 'No se registraron comentarios específicos.'}

## 🔴 Problemas (¿Qué falló, se rompió o tomó más tiempo del esperado?)
${args.whatWentWrong ? args.whatWentWrong.trim() : 'No se registraron incidentes críticos.'}

## 🟡 Eficiencia (¿Qué podría haberse hecho en menos pasos o con menos tokens?)
${args.whatToImprove ? args.whatToImprove.trim() : 'Flujo eficiente y directo.'}

## 📌 Acciones Concretas (Compromisos y Mejoras)
${Array.isArray(args.actions) && args.actions.length > 0 
  ? args.actions.map((act: string) => `- [ ] ${act}`).join('\n') 
  : '- [ ] Continuar aplicando las buenas prácticas establecidas.'}
`;

    atomicWriteFileSync(filePath, mdContent, 'utf8');
    return {
      ok: true,
      sprint: sprintTitle,
      savedFile: filePath,
      actionsCount: Array.isArray(args.actions) ? args.actions.length : 0
    };
  }

  if (name === 'gripm_list_retros') {
    const targetProject = registry.projects.find(p => p.id === args.projectId) 
      || registry.projects.find(p => p.id === registry.activeProjectId) 
      || registry.projects[0];
    if (!targetProject) throw new Error('Proyecto no encontrado.');

    const retrosDir = path.join(targetProject.repoPath || ROOT_DIR, targetProject.backlogDir || 'backlog', 'retros');
    if (!fs.existsSync(retrosDir)) {
      return { ok: true, retros: [] };
    }

    const files = fs.readdirSync(retrosDir).filter(f => f.endsWith('.md'));
    const retros: any[] = [];

    for (const f of files) {
      try {
        const full = path.join(retrosDir, f);
        const raw = fs.readFileSync(full, 'utf8');
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const dateMatch = raw.match(/\*\*Fecha:\*\*\s*([^\n]+)/);
        retros.push({
          file: f,
          path: full,
          title: titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, ''),
          date: dateMatch ? dateMatch[1].trim() : ''
        });
      } catch {}
    }

    return {
      ok: true,
      total: retros.length,
      retros
    };
  }

  throw new Error(`Herramienta desconocida: ${name}`);
}

// SEC-03: Validate CLI flags and registry containment at startup
try {
  getRegistry();
} catch (startupErr: any) {
  console.error(startupErr.message);
  process.exit(1);
}

// JSON-RPC stdio event loop (AC #3: omit output: process.stdout to prevent escape sequences / terminal echo polluting JSON-RPC channel)
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

// AC #1: Clean termination handlers on stdin close/end, SIGINT, and SIGTERM to prevent zombie processes
const handleExit = () => {
  try { rl.close(); } catch {}
  process.exit(0);
};
process.stdin.on('close', handleExit);
process.stdin.on('end', handleExit);
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

function sendJsonRpc(response: any) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    if (method === 'initialize') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'gripm-mcp',
            version: '1.0.0'
          }
        }
      });
      return;
    }

    if (method === 'notifications/initialized') {
      // No response required for notifications
      return;
    }

    if (method === 'tools/list') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      } catch (toolErr: any) {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error ejecutando ${toolName}: ${toolErr.message}`
              }
            ]
          }
        });
      }
      return;
    }

    // Unknown method
    if (id !== undefined) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Método desconocido: ${method}`
        }
      });
    }
  } catch (parseErr: any) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: invalid JSON'
      }
    });
  }
});
