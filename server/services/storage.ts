import type { ProjectMeta, ProjectBacklog } from '../types.ts';
import {
  BacklogService,
  findTaskFile
} from './backlogService.ts';

export {
  parseReleaseNotesMd,
  getTaskCacheStats,
  clearTaskCache,
  invalidateTaskCache
} from './backlogService.ts';

/**
 * Reads full project backlog (items, releases, sprints) with ZERO disk mutations.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function readProjectBacklog(project: ProjectMeta): ProjectBacklog {
  return BacklogService.readProjectBacklog(project);
}

/**
 * Alias for readProjectBacklog for backwards compatibility (DEV-283).
 */
export const loadProjectBacklog = readProjectBacklog;

/**
 * Atomically writes releases and sprints to disk (markdown) or updates backlog.json (JSON).
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function writeProjectBacklog(project: ProjectMeta, data: ProjectBacklog): void {
  BacklogService.writeProjectBacklog(project, data);
}

/**
 * Saves or updates a single task item.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function saveBacklogMdItem(project: ProjectMeta, item: any): void {
  BacklogService.saveTask(project, item);
}

/**
 * Finds a task's Markdown file in backlog/tasks/.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function findBacklogMdFile(project: ProjectMeta, id: string): { filePath: string; filename: string; task: any } | null {
  return findTaskFile(project, id);
}

/**
 * Soft deletes a task. Protected done tasks cannot be soft-deleted.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function softDeleteBacklogMdItem(project: ProjectMeta, id: string): boolean {
  return BacklogService.deleteTask(project, id, { purge: false }).softDeleted === true;
}

/**
 * Restores a soft-deleted task.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function restoreBacklogMdItem(project: ProjectMeta, id: string): boolean {
  return BacklogService.restoreTask(project, id);
}

/**
 * Physically purges a task file to backlog/archive/.
 * Delegates 100% of domain logic to BacklogService (DEV-299).
 */
export function purgeBacklogMdItem(project: ProjectMeta, id: string): boolean {
  return BacklogService.deleteTask(project, id, { purge: true }).purged === true;
}

/**
 * Lists tasks for a project. Delegates to BacklogService.
 */
export function listTasks(project: ProjectMeta, options?: any): any[] {
  return BacklogService.listTasks(project, options);
}

/**
 * Gets a task by ID. Delegates to BacklogService.
 */
export function getTask(project: ProjectMeta, taskId: string): any | null {
  return BacklogService.getTask(project, taskId);
}

/**
 * Creates a task. Delegates to BacklogService.
 */
export function createTask(project: ProjectMeta, data: any): any {
  return BacklogService.createTask(project, data);
}

/**
 * Updates a task. Delegates to BacklogService.
 */
export function updateTask(project: ProjectMeta, taskId: string, updates: any, options?: any): any {
  return BacklogService.updateTask(project, taskId, updates, options);
}

/**
 * Bulk updates tasks. Delegates to BacklogService.
 */
export function bulkUpdateTasks(project: ProjectMeta, targetFilter: any, updates: any, options?: any): any {
  return BacklogService.bulkUpdateTasks(project, targetFilter, updates, options);
}

/**
 * Computes backlog stats. Delegates to BacklogService.
 */
export function getStats(project: ProjectMeta, _options?: any): any {
  return BacklogService.getStats(project);
}

/**
 * Exports tasks to monolithic Markdown. Delegates to BacklogService.
 */
export function exportBacklogMd(project: ProjectMeta): string {
  return BacklogService.exportBacklogMd(project).content;
}

/**
 * Synchronizes tasks with BACKLOG.md. Delegates to BacklogService.
 */
export function syncBacklog(project: ProjectMeta, options?: any): any {
  return BacklogService.syncBacklog(project, options);
}

