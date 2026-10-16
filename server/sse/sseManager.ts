import fs from 'node:fs';
import path from 'node:path';
import { getRegistry, PKG_ROOT } from '../services/registry.ts';

// SSE clients connection pool for real-time live sync (DEV-014)
export const sseClients = new Set<any>();

export function broadcastSse(event: string, data: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      if (client.destroyed || client.writableEnded) {
        sseClients.delete(client);
        continue;
      }
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}

let activeWatchers: fs.FSWatcher[] = [];

/**
 * Releases every filesystem watcher opened by setupProjectWatchers().
 *
 * `fs.watch()` returns an FSWatcher, which has no `unref()` method, so these
 * handles stay referenced and keep the event loop alive. That is why the suite
 * printed its final success line and then never exited on Linux.
 *
 * It also matters at runtime: Linux caps inotify watches per user, so leaking
 * them across dev-server restarts eventually breaks the watcher outright.
 */
export function closeWatchers() {
  for (const w of activeWatchers) {
    try { w.close(); } catch {}
  }
  activeWatchers = [];
}

export function setupProjectWatchers() {
  closeWatchers();

  const registry = getRegistry();
  const dirsToWatch = new Set<string>();

  const dataDir = path.resolve(PKG_ROOT, 'data');
  if (fs.existsSync(dataDir)) dirsToWatch.add(dataDir);

  for (const p of registry.projects) {
    try {
      if (p.repoPath && fs.existsSync(p.repoPath)) {
        const backlogDir = path.join(p.repoPath, p.backlogDir || 'backlog');
        if (fs.existsSync(backlogDir)) dirsToWatch.add(backlogDir);
        const gripmDir = path.join(p.repoPath, '.gripm');
        if (fs.existsSync(gripmDir)) dirsToWatch.add(gripmDir);
      }
    } catch (err: any) {
      console.warn(`[gripm Watcher] Error checking repoPath for ${p.id}:`, err.message);
    }
  }

  let debounceTimer: any = null;
  const notifyChange = (eventDir: string, filename: string | null) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      broadcastSse('backlog_changed', {
        dir: eventDir,
        file: filename,
        timestamp: Date.now()
      });
    }, 250);
  };

  for (const dir of dirsToWatch) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_eventType, filename) => {
        if (filename && (filename.endsWith('.log') || filename.endsWith('.tmp') || filename.includes('.git') || (filename.startsWith('.') && !filename.includes('gripm') && !filename.includes('backlog')))) {
          return;
        }
        notifyChange(dir, filename);
      });
      // DEV-302 AC #7: Register error listener on watcher to prevent unhandled error crashes
      watcher.on('error', (err: any) => {
        console.warn(`[gripm Watcher] Error on ${dir}:`, err?.message || err);
      });
      // DEV-190: no `unref()` call here on purpose. FSWatcher has no such
      // method, so the previous `typeof watcher.unref === 'function'` guard
      // was silently dead code. Cleanup goes through closeWatchers().
      activeWatchers.push(watcher);
    } catch (err: any) {
      console.warn(`[gripm Watcher] Could not watch ${dir}:`, err.message);
    }
  }
}

export function handleSseRoute(req: any, res: any, originHeader?: string, isAllowedOrigin?: boolean) {
  const sseHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };
  if (originHeader && isAllowedOrigin) {
    sseHeaders['Access-Control-Allow-Origin'] = originHeader;
    sseHeaders['Vary'] = 'Origin';
  }
  res.writeHead(200, sseHeaders);
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients: sseClients.size + 1 })}\n\n`);
  sseClients.add(res);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(pingInterval);
    sseClients.delete(res);
  };

  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, 25000);
  if (typeof pingInterval.unref === 'function') pingInterval.unref();

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}
