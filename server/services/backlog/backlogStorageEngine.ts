/**
 * server/services/backlog/backlogStorageEngine.ts
 *
 * Persistence operations: markdown task file resolution, reading full project backlogs,
 * writing updates, and saving individual tasks.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta, ProjectBacklog } from '../../types.ts';
import {
  parseBacklogMd,
  serializeBacklogMd,
  normalizeStatus,
  normalizePriority,
  normalizeType,
  generateTaskFilename,
  type BacklogMdTask
} from '../../../scripts/backlogMdParser.ts';
import { isBacklogMdProject } from '../registry.ts';
import { atomicWriteFileSync } from '../atomicWrite.ts';
import { withFileLockSync } from '../../utils/fs-lock.ts';
import {
  getTaskCacheEntry,
  setTaskCacheEntry,
  recordCacheHit,
  recordCacheMiss,
  invalidateTaskCache
} from '../taskCache.ts';
import {
  getProjectTasksDir,
  getProjectReleasesPath,
  getProjectSprintsPath,
  resolveJsonBacklogPath,
  resolveLegibleSprint,
  parseReleaseNotesMd
} from './backlogCycles.ts';

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

export function mapMarkdownTaskToCanonical(
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

export function readProjectBacklog(
  project: ProjectMeta,
  listTasksFn: (project: ProjectMeta, options?: any) => any[]
): ProjectBacklog {
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
      const items = listTasksFn(project, { includeDeleted: true });

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

export function writeProjectBacklog(project: ProjectMeta, data: ProjectBacklog): void {
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

export function saveTask(project: ProjectMeta, item: any): void {
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
