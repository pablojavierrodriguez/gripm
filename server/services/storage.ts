import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta, ProjectBacklog } from '../types.ts';
import {
  parseBacklogMd,
  serializeBacklogMd,
  normalizeStatus,
  normalizePriority,
  normalizeType,
  generateTaskFilename,
  type BacklogMdTask
} from '../../scripts/backlogMdParser.ts';
import { resolveProjectIdentity } from '../../scripts/registryConfig.js';
import {
  isBacklogMdProject,
  getBacklogTasksDir,
  getProjectBacklogPath
} from './registry.ts';

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

  // Split into version sections based on ## headers
  const sections = notesContent.split(/(?=^##\s+)/m);
  const releases: any[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith('##')) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
    const bodyContent = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1) : '';

    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\]—–-]+)?)\]?/);
    if (!vMatch) continue;

    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, '');

    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : '';

    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, '').trim();
    if (date) {
      title = title.replace(date, '').trim();
    }
    title = title.replace(/^[-—–:🚀 ]+/, '').trim();
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
      date: date || new Date().toISOString().split('T')[0],
      title,
      summary,
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed,
      createdAt: date ? `${date}T00:00:00.000Z` : new Date().toISOString()
    });
  }

  return releases;
}

export function readProjectBacklog(project: ProjectMeta): ProjectBacklog {
  if (project.repoPath) {
    const identity = resolveProjectIdentity(project.repoPath);
    project = {
      ...project,
      id: identity.id || project.id,
      name: identity.name || project.name,
      codePrefix: identity.codePrefix || project.codePrefix
    };
  }

  if (isBacklogMdProject(project) && project.repoPath) {
    const tasksDir = getBacklogTasksDir(project);
    try {
      const items: any[] = [];
      const files = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir).filter(f => f.endsWith('.md')) : [];
      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      let order = 1;
      for (const filename of files) {
        const fullPath = path.join(tasksDir, filename);
        try {
          const fileStat = fs.statSync(fullPath);
          const raw = fs.readFileSync(fullPath, 'utf8');
          const fallbackId = filename.split(' - ')[0] || filename.replace(/\.md$/, '');
          const task = parseBacklogMd(raw, fallbackId);
          const rawFm = task.rawExtraFrontmatter || {};
          // Resolve sprint & release strictly orthogonally
          const sprintVal = task.sprint || task.targetSprint || rawFm.sprint || rawFm.targetSprint || (task.sprints && task.sprints.length > 0 ? task.sprints[task.sprints.length - 1] : undefined);
          const rawReleaseCandidate = rawFm.release || rawFm.targetRelease || (task.releases && task.releases.length > 0 ? task.releases[task.releases.length - 1] : undefined) || (task.milestone && !task.milestone.toLowerCase().includes('sprint') ? task.milestone : undefined);
          const releaseVal = rawReleaseCandidate && !rawReleaseCandidate.toLowerCase().includes('sprint') ? rawReleaseCandidate : undefined;
          const isDeletedRaw = task.isDeleted !== undefined ? task.isDeleted : (rawFm.isdeleted !== undefined ? rawFm.isdeleted : rawFm.isDeleted);
          const isDeletedVal = isDeletedRaw === true || isDeletedRaw === 'true';
          const deletedAtVal = task.deletedAt || rawFm.deletedat || rawFm.deletedAt || undefined;
          const previousStatusVal = task.previousStatus || rawFm.previousstatus || rawFm.previousStatus || undefined;

          items.push({
            id: task.id || fallbackId,
            code: task.id || fallbackId,
            projectId: project.id,
            title: task.title,
            description: task.description || '',
            type: normalizeType(task.type) || 'feature',
            priority: normalizePriority(task.priority),
            status: task.status, // normalized: draft, doing, review, ready, done, dismissed
            sprint: sprintVal,
            release: releaseVal,
            targetSprint: sprintVal,
            targetRelease: releaseVal,
            milestone: releaseVal,
            parentId: task.parentId || rawFm.parent || rawFm.parentId || undefined,
            blocks: task.blocks || (rawFm.blocks ? (Array.isArray(rawFm.blocks) ? rawFm.blocks : [rawFm.blocks]) : []),
            blockedBy: task.blockedBy || (rawFm.blocked_by ? (Array.isArray(rawFm.blocked_by) ? rawFm.blocked_by : [rawFm.blocked_by]) : []),
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
            implementationPlan: task.implementationPlan || '',
            assignees: task.assignees || [],
            labels: task.labels || [],
            estimate: task.estimate !== undefined ? task.estimate : rawFm.estimate,
            order: rawFm.order !== undefined ? Number(rawFm.order) : order++,
            isDeleted: isDeletedVal ? true : undefined,
            deletedAt: deletedAtVal,
            previousStatus: previousStatusVal,
            createdAt: task.createdDate || new Date().toISOString(),
            updatedAt: task.updatedDate || new Date().toISOString(),
            mtime: Math.round(fileStat.mtimeMs)
          });
        } catch (err) {
          console.warn(`[gripm Backlog.md] Error reading ${filename}:`, err);
        }
      }

      // Read releases
      let releases: any[] = [];
      const releasesPath = path.join(project.repoPath, project.backlogDir || 'backlog', 'releases.json');
      if (fs.existsSync(releasesPath)) {
        try {
          releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
        } catch {}
      }

      // Retrocompatibilidad: Si no hay releases registrados pero existe RELEASE_NOTES.md / CHANGELOG.md, auto-sincronizar
      if (releases.length === 0 && project.repoPath) {
        const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, items);
        if (parsed.length > 0) {
          releases = parsed;
          try {
            if (!fs.existsSync(path.dirname(releasesPath))) {
              fs.mkdirSync(path.dirname(releasesPath), { recursive: true });
            }
            fs.writeFileSync(releasesPath, JSON.stringify(releases, null, 2), 'utf8');
          } catch (writeErr: any) {
            console.warn(`[gripm API] Error persisting auto-synced releases:`, writeErr.message);
          }
        }
      }

      // Sincronización bidireccional estricta: rel.itemCodes <-> tareas con release/targetRelease
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

      // Read sprints
      let sprints: any[] = [];
      const sprintsPath = path.join(project.repoPath, project.backlogDir || 'backlog', 'sprints.json');
      if (fs.existsSync(sprintsPath)) {
        try {
          sprints = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
        } catch {}
      }

      // Asegurar que cada sprint tenga explícitamente su projectId asignado al proyecto actual
      sprints = (sprints || []).map((s: any) => ({
        ...s,
        projectId: project.id
      }));

      // Auto-inicializar o enriquecer sprints desde tareas del backlog
      if (project.repoPath) {
        const detectedSprintNames = new Set<string>();
        for (const it of items) {
          const sp = it.sprint || it.targetSprint;
          if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '—') {
            detectedSprintNames.add(sp.trim());
          }
        }

        if (detectedSprintNames.size > 0) {
          const existingNames = new Set(sprints.map((s: any) => s.name?.toLowerCase().trim()));
          let hasMutations = false;

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
              hasMutations = true;
            }
          }

          // Si existen sprints con el 100% de tareas completadas, auto-reconciliar status a 'completed'
          sprints.forEach((sp: any) => {
            const sprintItems = items.filter(it => (it.sprint || it.targetSprint || '').trim().toLowerCase() === sp.name?.toLowerCase().trim());
            const allDone = sprintItems.length > 0 && sprintItems.every(it => it.status === 'done' || it.status === 'ready' || it.status === 'finish');
            if (allDone && sp.status !== 'completed') {
              sp.status = 'completed';
              sp.completedAt = sp.completedAt || new Date().toISOString();
              hasMutations = true;
            }
          });

          if (hasMutations) {
            try {
              if (!fs.existsSync(path.dirname(sprintsPath))) {
                fs.mkdirSync(path.dirname(sprintsPath), { recursive: true });
              }
              fs.writeFileSync(sprintsPath, JSON.stringify(sprints, null, 2), 'utf8');
            } catch {}
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
      console.warn(`[gripm API] Error reading Backlog.md tasks for ${project.id} at ${tasksDir}:`, err.message);
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
  const filePath = getProjectBacklogPath(project);
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
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf8');
      } catch (writeErr: any) {
        console.error(`[gripm API] Cannot initialize backlog at ${filePath}:`, writeErr.message);
      }
      return initial;
    }

    const jsonStat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    const jsonMtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    let items = Array.isArray(parsed.items) ? parsed.items : [];
    items = items.map((it: any) => ({
      ...it,
      projectId: it.projectId || project.id,
      status: normalizeStatus(it.status),
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
    console.error(`[gripm API] Error reading backlog for project ${project.id} from ${filePath}:`, err.message);
    return { project: { ...project, storageType: 'json', error: err.message }, items: [], releases: [], sprints: [], lastUpdated: new Date().toISOString() };
  }
}

export function saveBacklogMdItem(project: ProjectMeta, item: any) {
  if (!project.repoPath) return;
  const tasksDir = getBacklogTasksDir(project);
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  const cleanId = (item.code || item.id).toLowerCase();
  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  
  // 1. Coincidencia por prefijo de archivo
  let existingFile = files.find(f => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });

  // 2. Reconciliación por frontmatter si fue renombrado manualmente (DEV-019)
  if (!existingFile) {
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(tasksDir, f), 'utf8');
        const fallbackId = f.split(' - ')[0] || f.replace(/\.md$/, '');
        const parsed = parseBacklogMd(raw, fallbackId);
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          existingFile = f;
          break;
        }
      } catch {}
    }
  }

  let existingTask: Partial<BacklogMdTask> = {};
  if (existingFile) {
    try {
      const raw = fs.readFileSync(path.join(tasksDir, existingFile), 'utf8');
      existingTask = parseBacklogMd(raw, item.code || item.id);
    } catch {}
  }

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
      delete taskData.rawExtraFrontmatter.isdeleted;
      delete taskData.rawExtraFrontmatter.deletedat;
      delete taskData.rawExtraFrontmatter.previousstatus;
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

  // Cargar sprints registrados para mapear exclusivamente al nombre canónico
  let registeredSprints: any[] = [];
  if (project.repoPath) {
    const sprintsPath = path.join(project.repoPath, project.backlogDir || 'backlog', 'sprints.json');
    if (fs.existsSync(sprintsPath)) {
      try {
        registeredSprints = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
      } catch {}
    }
  }

  const resolveLegibleSprint = (val: string | undefined | null): string | undefined => {
    if (!val) return undefined;
    const clean = String(val).trim();
    if (!clean) return undefined;
    const lower = clean.toLowerCase();
    if (lower === 'backlog-futuro' || lower === 'backlog' || lower === 'sin sprint' || lower === 'sin-sprint' || lower === 'none' || lower === 'null') {
      return undefined;
    }
    if (registeredSprints.length > 0) {
      const matched = registeredSprints.find((s: any) =>
        (s.id && s.id.toLowerCase() === lower) ||
        (s.name && s.name.trim().toLowerCase() === lower)
      );
      if (matched) {
        return matched.name;
      }
    }
    if (lower.startsWith('sprint-') || lower.includes('backlog-futuro')) {
      return undefined;
    }
    return clean;
  };

  const isSprintProvided = item.sprint !== undefined || item.targetSprint !== undefined || item.sprints !== undefined;
  const rawSVal = isSprintProvided
    ? (item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : '') || '')
    : (existingTask.sprint || existingTask.targetSprint || (existingTask.sprints && existingTask.sprints.length > 0 ? existingTask.sprints[existingTask.sprints.length - 1] : '') || '');

  const resolvedSprint = resolveLegibleSprint(rawSVal);

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
    if (taskData.milestone && taskData.milestone.toLowerCase().includes('sprint')) {
      taskData.milestone = undefined;
    }
  }

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

    // Sincronización bidireccional inmediata en releases.json
    if (project.repoPath) {
      const releasesPath = path.join(project.repoPath, project.backlogDir || 'backlog', 'releases.json');
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

          // Si el usuario asignó una versión nueva que aún no existía en releases.json, darla de alta como unreleased
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
              markdownContent: `## [${targetVersion}] — Unreleased\n\n### 🎯 Resumen\n*Versión ${targetVersion} en planificación.*`,
              createdAt: now.toISOString()
            });
            changed = true;
          }

          if (changed) {
            fs.writeFileSync(releasesPath, JSON.stringify(relsData, null, 2), 'utf8');
          }
        } catch (syncErr: any) {
          console.warn('[gripm API] Error sincronizando releases.json al guardar tarea:', syncErr.message);
        }
      }
    }
  }
  if (item.order !== undefined) taskData.rawExtraFrontmatter!.order = item.order;

  const content = serializeBacklogMd(taskData);
  // Si ya existe un archivo en backlog/tasks/ que empieza con ${task.id} - ,
  // se debe sobrescribir ESE archivo existente en lugar de generar un nombre nuevo con slug y borrar el anterior.
  const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
  const targetFilePath = path.join(tasksDir, targetFilename);

  fs.writeFileSync(targetFilePath, content, 'utf8');
}

export function findBacklogMdFile(project: ProjectMeta, id: string): { filePath: string; filename: string; task: any } | null {
  if (!project.repoPath) return null;
  const tasksDir = getBacklogTasksDir(project);
  if (!fs.existsSync(tasksDir)) return null;

  const cleanId = id.toLowerCase();
  const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.md'));
  let found = files.find((f: string) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });

  if (!found) {
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(tasksDir, f), 'utf8');
        const fallbackId = f.split(' - ')[0] || f.replace(/\.md$/, '');
        const parsed = parseBacklogMd(raw, fallbackId);
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
    const raw = fs.readFileSync(filePath, 'utf8');
    const fallbackId = found.split(' - ')[0] || found.replace(/\.md$/, '');
    const task = parseBacklogMd(raw, fallbackId);
    return { filePath, filename: found, task };
  } catch {
    return { filePath, filename: found, task: {} };
  }
}

export function softDeleteBacklogMdItem(project: ProjectMeta, id: string): boolean {
  const found = findBacklogMdFile(project, id);
  if (!found) return false;
  const { filePath, task } = found;

  // Protect done items from deletion
  const currentStatus = (task.status || '').toLowerCase();
  if (currentStatus === 'done') return false;

  const previousStatus = task.status || 'draft';
  const raw = fs.readFileSync(filePath, 'utf8');
  let updated = raw;

  // Remove existing soft delete fields case-insensitively
  updated = updated.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
  updated = updated.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
  updated = updated.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');

  const nowIso = new Date().toISOString();
  // Insert clean soft delete fields after status line or first frontmatter delimiter
  if (/^status:.*$/m.test(updated)) {
    updated = updated.replace(/^(status:.*$)/m, `$1\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"`);
  } else {
    updated = updated.replace(/^---\r?\n/, `---\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"\n`);
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

export function restoreBacklogMdItem(project: ProjectMeta, id: string): boolean {
  const found = findBacklogMdFile(project, id);
  if (!found) return false;
  const { filePath } = found;

  let raw = fs.readFileSync(filePath, 'utf8');
  // Extract previousStatus case-insensitively
  const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
  const restoreStatus = prevMatch ? prevMatch[1].trim() : 'draft';

  if (/^status:.*$/m.test(raw)) {
    raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus}`);
  }
  raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
  raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
  raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');
  fs.writeFileSync(filePath, raw, 'utf8');
  return true;
}

export function purgeBacklogMdItem(project: ProjectMeta, id: string): boolean {
  if (!project.repoPath) return false;
  const found = findBacklogMdFile(project, id);
  if (!found) return false;

  const archiveDir = path.join(project.repoPath, project.backlogDir || 'backlog', 'archive');
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  fs.renameSync(found.filePath, path.join(archiveDir, found.filename));
  return true;
}

export function writeProjectBacklog(project: ProjectMeta, data: ProjectBacklog) {
  if (isBacklogMdProject(project)) {
    // In backlog-md mode, save releases into backlog/releases.json and sprints into backlog/sprints.json
    if (project.repoPath) {
      try {
        const dir = path.join(project.repoPath, project.backlogDir || 'backlog');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const releasesPath = path.join(dir, 'releases.json');
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
        fs.writeFileSync(releasesPath, JSON.stringify(releasesToWrite, null, 2), 'utf8');
        if (data.sprints !== undefined) {
          fs.writeFileSync(path.join(dir, 'sprints.json'), JSON.stringify(data.sprints || [], null, 2), 'utf8');
        }
      } catch (err: any) {
        console.warn(`[gripm API] Warning writing releases/sprints: ${err.message}`);
      }
    }
    return;
  }

  const filePath = getProjectBacklogPath(project);
  data.lastUpdated = new Date().toISOString();

  try {
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err: any) {
    console.error(`[gripm API] Error writing project backlog to ${filePath}:`, err.message);
  }
}
