import type { PluginOption } from 'vite';
import { setupProjectWatchers, closeWatchers, handleSseRoute } from './sse/sseManager.ts';
import { validateSecurity, applySecurityHeaders } from './middleware/security.ts';
import { handleApiRequest } from './routes/api.ts';

/** DEV-190: the plugin exposes `closeWatchers` so callers can release the
 *  `fs.watch` handles, which cannot be unref'd. */
export type GripmPlugin = PluginOption & { closeWatchers?: () => void };

export function gripmApi(): GripmPlugin {
  const apiMiddleware = (req: any, res: any, next: any) => {
    // DEV-243: Security headers (CSP, Anti-Clickjacking, MIME sniffing, Referrer)
    applySecurityHeaders(res);

    const url = req.url || '';
    const pathname = url.split('?')[0];
    if (!pathname.startsWith('/api/')) {
      return next();
    }

    const sec = validateSecurity(req, res);
    if (!sec) {
      // Security check failed or OPTIONS preflight handled
      return;
    }

    const method = (req.method || 'GET').toUpperCase();

    // GET /api/events (SSE endpoint for real-time live sync DEV-014)
    if (method === 'GET' && pathname === '/api/events') {
      const originHeader = req.headers.origin;
      return handleSseRoute(req, res, originHeader, sec.isAllowedOrigin);
    }

    handleApiRequest(req, res);
  };

  return {
    name: 'vite-plugin-gripm-api',
    // DEV-190: exposed so tests (and embedders) can release the filesystem
    // watchers without waiting for a server close event. `fs.watch()` handles
    // cannot be unref'd, so an explicit release is the only way out.
    closeWatchers,
    configureServer(server: any) {
      setupProjectWatchers();
      server.middlewares.use(apiMiddleware);

      // DEV-190: release watchers when the dev server shuts down, otherwise they
      // survive the process and leak inotify watches across restarts.
      const httpServer = server.httpServer;
      if (httpServer && typeof httpServer.once === 'function') {
        httpServer.once('close', () => closeWatchers());
      }

      // DEV-177: Present user-friendly localhost in console output and CLI shortcuts
      if (typeof server.listen === 'function') {
        const origListen = server.listen.bind(server);
        server.listen = async (...args: any[]) => {
          const res = await origListen(...args);
          if (server.resolvedUrls?.local) {
            server.resolvedUrls.local = server.resolvedUrls.local.map((u: string) =>
              u.replace('127.0.0.1', 'localhost')
            );
          }
          return res;
        };
      }
    },
    configurePreviewServer(server: any) {
      setupProjectWatchers();
      server.middlewares.use(apiMiddleware);

      // DEV-177: Present user-friendly localhost in console output and CLI shortcuts
      if (typeof server.listen === 'function') {
        const origListen = server.listen.bind(server);
        server.listen = async (...args: any[]) => {
          const res = await origListen(...args);
          if (server.resolvedUrls?.local) {
            server.resolvedUrls.local = server.resolvedUrls.local.map((u: string) =>
              u.replace('127.0.0.1', 'localhost')
            );
          }
          return res;
        };
      }
    }
  };
}
