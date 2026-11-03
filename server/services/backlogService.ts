/**
 * server/services/backlogService.ts
 *
 * Core agile Backlog domain service.
 * Manages task queries and coordinates with specialized submodules:
 *  - ./backlog/gatekeeperSecurity.ts
 *  - ./backlog/backlogCycles.ts
 *  - ./backlog/backlogStats.ts
 *  - ./backlog/taskNormalizer.ts
 *  - ./backlog/backlogSyncEngine.ts
 *  - ./backlog/backlogStorageEngine.ts
 *  - ./backlog/taskMutations.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta, ProjectBacklog } from '../types.ts';
import {
  parseBacklogMd,
  normalizeStatus,
  normalizePriority
} from '../../scripts/backlogMdParser.ts';
import { isBacklogMdProject } from './registry.ts';
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

// Re-export cache helpers
export {
  getTaskCacheStats,
  clearTaskCache,
  invalidateTaskCache
} from './taskCache.ts';

// Re-export gatekeeper security
export {
  validateVerifyCommand,
  getModifiedFiles,
  validateGatekeeperTransition,
  type TaskMutationOptions,
  type GatekeeperAudit,
  type VerifyCommandValidation,
  type GatekeeperTransitionResult
} from './backlog/gatekeeperSecurity.ts';

// Re-export cycles & path helpers
export {
  DEMO_FILE,
  resolveJsonBacklogPath,
  getProjectTasksDir,
  getProjectSprintsPath,
  getProjectReleasesPath,
  getProjectRetrospectivesPath,
  getProjectTaskAllocationLockPath,
  resolveLegibleSprint,
  parseReleaseNotesMd,
  readReleases,
  mutateReleases,
  readRetrospectives,
  mutateRetrospectives
} from './backlog/backlogCycles.ts';

// Re-export stats
export {
  computeBacklogStats,
  type BacklogStats
} from './backlog/backlogStats.ts';

// Re-export task normalizer & errors
export {
  ConflictError,
  normalizeTaskUpdates,
  type TaskFilterOptions,
  type NormalizedTaskUpdates
} from './backlog/taskNormalizer.ts';

// Re-export sync engine
export {
  exportBacklogMd,
  syncBacklog,
  type SyncBacklogResult
} from './backlog/backlogSyncEngine.ts';

// Re-export storage engine
export {
  findTaskFile,
  mapMarkdownTaskToCanonical,
  readProjectBacklog,
  writeProjectBacklog,
  saveTask
} from './backlog/backlogStorageEngine.ts';

// Re-export mutations
export {
  createTask,
  updateTask,
  bulkUpdateTasks,
  deleteTask,
  restoreTask
} from './backlog/taskMutations.ts';

import {
  getProjectTasksDir,
  getProjectTaskAllocationLockPath,
  resolveJsonBacklogPath,
  readReleases,
  mutateReleases,
  readRetrospectives,
  mutateRetrospectives
} from './backlog/backlogCycles.ts';
import {
  computeBacklogStats,
  type BacklogStats
} from './backlog/backlogStats.ts';
import {
  type TaskFilterOptions
} from './backlog/taskNormalizer.ts';
import {
  exportBacklogMd,
  syncBacklog,
  type SyncBacklogResult
} from './backlog/backlogSyncEngine.ts';
import {
  mapMarkdownTaskToCanonical,
  readProjectBacklog,
  writeProjectBacklog,
  saveTask
} from './backlog/backlogStorageEngine.ts';
import {
  createTask,
  updateTask,
  bulkUpdateTasks,
  deleteTask,
  restoreTask
} from './backlog/taskMutations.ts';

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
      const idsSet = new Set(options.taskIds.map((id: any) => String(id).toLowerCase()));
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
    const includeDeleted = options?.includeDeleted !== false;

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
    return computeBacklogStats(tasks);
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
  static createTask = (project: ProjectMeta, data: any) =>
    createTask(project, data, BacklogService.listTasks, BacklogService.computeNextTaskId);

  /**
   * Updates an existing task by ID with Gatekeeper validation.
   */
  static updateTask = updateTask;

  /**
   * Bulk updates tasks with Gatekeeper validation applied to ALL matching tasks (AC 3).
   */
  static bulkUpdateTasks = (
    project: ProjectMeta,
    targetFilter: any,
    updates: any,
    options?: any
  ) => bulkUpdateTasks(project, targetFilter, updates, options, BacklogService.listTasks);

  /**
   * Soft deletes or purges a task. Protected done tasks cannot be soft-deleted.
   */
  static deleteTask = deleteTask;

  /**
   * Restores a soft-deleted task to active state.
   */
  static restoreTask = restoreTask;

  /**
   * Exports monolithic BACKLOG.md excluding soft-deleted items (AC 6).
   */
  static exportBacklogMd = (
    project: ProjectMeta,
    options?: { save?: boolean }
  ) => {
    const tasks = BacklogService.listTasks(project, { includeDeleted: false });
    return exportBacklogMd(project, tasks, options);
  };

  /**
   * Synchronizes backlog tasks and BACKLOG.md.
   * DEV-293 / AC 4: Does NOT auto-promote tasks to ready! Only emits quality warnings,
   * and writes BACKLOG.md strictly when real changes exist or autoFix is true.
   */
  static syncBacklog = (
    project: ProjectMeta,
    options?: { autoFix?: boolean }
  ): SyncBacklogResult => {
    const tasks = BacklogService.listTasks(project, { includeDeleted: false });
    return syncBacklog(project, tasks, options);
  };

  /**
   * Reads full project backlog (items, releases, sprints) with ZERO disk mutations (AC 5).
   * Does NOT auto-close sprints, does NOT auto-write releases.json or sprints.json.
   */
  static readProjectBacklog = (project: ProjectMeta): ProjectBacklog => {
    return readProjectBacklog(project, BacklogService.listTasks);
  };

  /**
   * Reads releases from disk guarded by atomic file lock.
   */
  static readReleases = readReleases;

  /**
   * Mutates releases on disk guarded by atomic file lock.
   */
  static mutateReleases = mutateReleases;

  /**
   * Reads retrospectives from disk guarded by atomic file lock.
   */
  static readRetrospectives = readRetrospectives;

  /**
   * Mutates retrospectives on disk guarded by atomic file lock.
   */
  static mutateRetrospectives = mutateRetrospectives;

  /**
   * Writes releases and sprints to disk atomically (markdown) or updates backlog.json (JSON).
   */
  static writeProjectBacklog = writeProjectBacklog;

  /**
   * Saves or creates a single task item (used by legacy and HTTP adapters).
   */
  static saveTask = saveTask;

  static getTaskCacheStats = getTaskCacheStats;
  static clearTaskCache = clearTaskCache;
  static invalidateTaskCache = invalidateTaskCache;
  static loadProjectBacklog = (project: ProjectMeta) => BacklogService.readProjectBacklog(project);
}

export function getNextTaskId(project: ProjectMeta, options?: { withoutLock?: boolean }): string {
  return BacklogService.getNextTaskId(project, options);
}
