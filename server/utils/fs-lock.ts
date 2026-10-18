import fs from 'node:fs';
import path from 'node:path';

export interface LockOptions {
  /** Timeout in milliseconds to wait before failing to acquire the lock. Default: 10000ms */
  timeoutMs?: number;
  /** Initial delay before retrying lock acquisition in ms. Default: 25ms */
  minRetryDelayMs?: number;
  /** Maximum delay between retries in ms. Default: 250ms */
  maxRetryDelayMs?: number;
  /** Grace period in ms after which an untouched lockfile is considered stale. Default: 5000ms */
  staleTimeoutMs?: number;
  /** Custom metadata to embed in lockfile payload */
  metadata?: Record<string, unknown>;
}

export interface LockHandle {
  lockPath: string;
  targetPath: string;
  acquiredAt: number;
  release: () => void;
}

export interface LockPayload {
  pid: number;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export function getLockFilePath(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  return resolved.endsWith('.lock') ? resolved : `${resolved}.lock`;
}

function sleepSync(ms: number): void {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // Fallback spin wait if SharedArrayBuffer is unavailable
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function calculateNextDelay(currentDelay: number, maxDelay: number): number {
  const jitter = 0.8 + Math.random() * 0.4;
  const next = Math.min(Math.round(currentDelay * 1.5 * jitter), maxDelay);
  return Math.max(10, next);
}

function checkAndCleanStaleLock(lockFilePath: string, staleTimeoutMs: number): boolean {
  try {
    const stat = fs.statSync(lockFilePath);
    const age = Date.now() - stat.mtimeMs;
    let isStale = age > staleTimeoutMs;

    if (!isStale) {
      try {
        const content = fs.readFileSync(lockFilePath, 'utf8');
        const payload: LockPayload = JSON.parse(content);
        if (typeof payload.expiresAt === 'number' && Date.now() > payload.expiresAt) {
          isStale = true;
        }
      } catch {
        // If file content is unreadable but age is near threshold, keep waiting
      }
    }

    if (isStale) {
      try {
        fs.unlinkSync(lockFilePath);
        return true;
      } catch {}
    }
  } catch (statErr: unknown) {
    const err = statErr as NodeJS.ErrnoException;
    if (err && err.code === 'ENOENT') {
      return true;
    }
  }
  return false;
}

export function acquireLockSync(targetPath: string, options?: LockOptions): LockHandle {
  const lockFilePath = getLockFilePath(targetPath);
  const timeoutMs = options?.timeoutMs ?? 10000;
  const minDelay = options?.minRetryDelayMs ?? 25;
  const maxDelay = options?.maxRetryDelayMs ?? 250;
  const staleTimeoutMs = options?.staleTimeoutMs ?? 5000;

  const dir = path.dirname(lockFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const startTime = Date.now();
  let currentDelay = minDelay;

  while (true) {
    try {
      const fd = fs.openSync(lockFilePath, 'wx');
      const payload: LockPayload = {
        pid: process.pid,
        createdAt: Date.now(),
        expiresAt: Date.now() + staleTimeoutMs,
        metadata: options?.metadata
      };
      try {
        fs.writeFileSync(fd, JSON.stringify(payload), 'utf8');
      } finally {
        try {
          fs.closeSync(fd);
        } catch {}
      }

      return {
        lockPath: lockFilePath,
        targetPath: path.resolve(targetPath),
        acquiredAt: Date.now(),
        release: () => releaseLockSync(lockFilePath)
      };
    } catch (openErr: unknown) {
      const err = openErr as NodeJS.ErrnoException;
      if (err && err.code === 'EEXIST') {
        const cleaned = checkAndCleanStaleLock(lockFilePath, staleTimeoutMs);
        if (cleaned) {
          continue;
        }

        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(`[fs-lock] Excedido timeout de ${timeoutMs}ms intentando adquirir lock: ${lockFilePath}`);
        }

        sleepSync(currentDelay);
        currentDelay = calculateNextDelay(currentDelay, maxDelay);
        continue;
      }
      throw openErr;
    }
  }
}

export async function acquireLock(targetPath: string, options?: LockOptions): Promise<LockHandle> {
  const lockFilePath = getLockFilePath(targetPath);
  const timeoutMs = options?.timeoutMs ?? 10000;
  const minDelay = options?.minRetryDelayMs ?? 25;
  const maxDelay = options?.maxRetryDelayMs ?? 250;
  const staleTimeoutMs = options?.staleTimeoutMs ?? 5000;

  const dir = path.dirname(lockFilePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  const startTime = Date.now();
  let currentDelay = minDelay;

  while (true) {
    try {
      const fd = fs.openSync(lockFilePath, 'wx');
      const payload: LockPayload = {
        pid: process.pid,
        createdAt: Date.now(),
        expiresAt: Date.now() + staleTimeoutMs,
        metadata: options?.metadata
      };
      try {
        fs.writeFileSync(fd, JSON.stringify(payload), 'utf8');
      } finally {
        try {
          fs.closeSync(fd);
        } catch {}
      }

      return {
        lockPath: lockFilePath,
        targetPath: path.resolve(targetPath),
        acquiredAt: Date.now(),
        release: () => releaseLockSync(lockFilePath)
      };
    } catch (openErr: unknown) {
      const err = openErr as NodeJS.ErrnoException;
      if (err && err.code === 'EEXIST') {
        const cleaned = checkAndCleanStaleLock(lockFilePath, staleTimeoutMs);
        if (cleaned) {
          continue;
        }

        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(`[fs-lock] Excedido timeout de ${timeoutMs}ms intentando adquirir lock: ${lockFilePath}`);
        }

        await sleep(currentDelay);
        currentDelay = calculateNextDelay(currentDelay, maxDelay);
        continue;
      }
      throw openErr;
    }
  }
}

export function releaseLockSync(targetPath: string): void {
  const lockFilePath = getLockFilePath(targetPath);
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch (unlinkErr: unknown) {
    const err = unlinkErr as NodeJS.ErrnoException;
    if (err && err.code !== 'ENOENT') {
      // Invalidation or access issue handled silently
    }
  }
}

export async function releaseLock(targetPath: string): Promise<void> {
  releaseLockSync(targetPath);
}

export function isLockActive(targetPath: string): boolean {
  const lockFilePath = getLockFilePath(targetPath);
  return fs.existsSync(lockFilePath);
}

export function isLockStale(targetPath: string, staleTimeoutMs = 5000): boolean {
  const lockFilePath = getLockFilePath(targetPath);
  try {
    const stat = fs.statSync(lockFilePath);
    const age = Date.now() - stat.mtimeMs;
    if (age > staleTimeoutMs) return true;
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const payload: LockPayload = JSON.parse(content);
      if (typeof payload.expiresAt === 'number' && Date.now() > payload.expiresAt) {
        return true;
      }
    } catch {}
  } catch {
    return false;
  }
  return false;
}

export function withFileLockSync<T>(
  targetPath: string,
  fn: () => T,
  options?: LockOptions
): T {
  const handle = acquireLockSync(targetPath, options);
  try {
    return fn();
  } finally {
    handle.release();
  }
}

export async function withFileLock<T>(
  targetPath: string,
  fn: () => Promise<T> | T,
  options?: LockOptions
): Promise<T> {
  const handle = await acquireLock(targetPath, options);
  try {
    return await fn();
  } finally {
    handle.release();
  }
}

