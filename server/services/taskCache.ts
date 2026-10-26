import type { BacklogMdTask } from '../../scripts/backlogMdParser.ts';

export interface TaskCacheEntry {
  mtimeMs: number;
  size: number;
  parsed: BacklogMdTask;
  canonical: any;
}

export interface TaskCacheStats {
  size: number;
  hits: number;
  misses: number;
}

const taskCache = new Map<string, TaskCacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;

export function getTaskCacheEntry(filePath: string): TaskCacheEntry | undefined {
  return taskCache.get(filePath);
}

export function setTaskCacheEntry(filePath: string, entry: TaskCacheEntry): void {
  taskCache.set(filePath, entry);
}

export function recordCacheHit(): void {
  cacheHits++;
}

export function recordCacheMiss(): void {
  cacheMisses++;
}

export function invalidateTaskCache(filePath?: string): void {
  if (filePath) {
    taskCache.delete(filePath);
  } else {
    taskCache.clear();
  }
}

export function clearTaskCache(): void {
  taskCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

export function getTaskCacheStats(): TaskCacheStats {
  return {
    size: taskCache.size,
    hits: cacheHits,
    misses: cacheMisses
  };
}

/**
 * Prunes cached entries for files that were deleted from disk in a specific tasks directory.
 */
export function pruneStaleCacheEntries(tasksDir: string, activeFilePaths: Set<string>): void {
  for (const cachedPath of taskCache.keys()) {
    if (cachedPath.startsWith(tasksDir) && !activeFilePaths.has(cachedPath)) {
      taskCache.delete(cachedPath);
    }
  }
}
