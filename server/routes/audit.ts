/**
 * server/routes/audit.ts
 *
 * REST API routes for Codebase Health Audit and TODOs Import (DEV-355).
 * Endpoints:
 *  - GET  /api/audit: Returns codebase health report (cached for 30s)
 *  - POST /api/audit/refresh: Invalidates cache, performs fresh scan and returns report
 *  - POST /api/audit/import-todos: Validates payload and imports TODOs as draft tasks
 */

import path from 'node:path';
import { scanCodebase, type RepoHealthReport } from '../services/auditService.ts';
import { sendJson, getBody } from '../middleware/security.ts';
import { BacklogService } from '../services/backlogService.ts';
import { broadcastSse } from '../sse/sseManager.ts';
import { isAllowedBrowsePath } from '../services/fsExplorer.ts';
import { readProjectConfig } from '../services/registry.ts';
import type { ProjectMeta } from '../types.ts';

export interface CachedAudit {
  report: RepoHealthReport;
  timestamp: number;
}

const auditCache = new Map<string, CachedAudit>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidates the in-memory audit cache for a specific repo or all repos.
 */
export function clearAuditCache(repoPath?: string): void {
  if (repoPath) {
    auditCache.delete(path.resolve(repoPath));
  } else {
    auditCache.clear();
  }
}

/**
 * Returns cached report if valid (TTL < 30s), or null.
 */
export function getCachedAudit(repoPath: string): RepoHealthReport | null {
  const key = path.resolve(repoPath);
  const entry = auditCache.get(key);
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
    return entry.report;
  }
  return null;
}

/**
 * Stores report in the in-memory cache with current timestamp.
 */
export function setCachedAudit(repoPath: string, report: RepoHealthReport): void {
  const key = path.resolve(repoPath);
  auditCache.set(key, {
    report,
    timestamp: Date.now()
  });
}

/**
 * Resolves project meta and target repository path safely.
 */
export function resolveAuditProject(
  req: any,
  activeProject: ProjectMeta | null,
  registry: any,
  body?: any
): { project: ProjectMeta; repoPath: string } | { error: string; statusCode: number } {
  const urlObj = new URL(req.url || '', 'http://localhost');
  const projectId = urlObj.searchParams.get('projectId') || body?.projectId;
  const customPath = urlObj.searchParams.get('path') || body?.path || body?.targetPath;

  let project = activeProject;
  if (projectId && registry?.projects) {
    const found = registry.projects.find((p: any) => p.id === projectId);
    if (found) project = found;
  }

  let repoPath: string;
  if (customPath && typeof customPath === 'string') {
    if (!isAllowedBrowsePath(customPath)) {
      return { error: 'Target path is outside allowed repository paths', statusCode: 400 };
    }
    repoPath = path.resolve(customPath);
    if (!project || (project.repoPath && path.resolve(project.repoPath) !== repoPath)) {
      project = {
        id: projectId || 'custom-audit-project',
        name: 'Custom Audit Project',
        repoPath,
        storageType: 'markdown',
        backlogDir: 'backlog',
        codePrefix: 'DEV',
        createdAt: new Date().toISOString()
      };
    }
  } else {
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;
    repoPath = project?.repoPath || (targetRepoEnv ? path.resolve(targetRepoEnv) : path.resolve(process.cwd()));
    repoPath = path.resolve(repoPath);
  }

  const finalProject: ProjectMeta = project || {
    id: 'default',
    name: 'Default Project',
    repoPath,
    storageType: 'markdown',
    backlogDir: 'backlog',
    codePrefix: 'DEV',
    createdAt: new Date().toISOString()
  };

  return { project: finalProject, repoPath };
}

/**
 * REST router for /api/audit endpoints.
 */
export async function handleAuditRoutes(
  req: any,
  res: any,
  pathname: string,
  activeProject: ProjectMeta | null,
  registry: any
): Promise<boolean> {
  const method = (req.method || 'GET').toUpperCase();

  // 1. GET /api/audit
  if (pathname === '/api/audit') {
    if (method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return true;
    }

    try {
      const resolved = resolveAuditProject(req, activeProject, registry);
      if ('error' in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }

      const { repoPath } = resolved;
      const cached = getCachedAudit(repoPath);
      if (cached) {
        sendJson(res, 200, { ok: true, data: cached, cached: true });
        return true;
      }

      const report = await scanCodebase(repoPath);
      setCachedAudit(repoPath, report);
      sendJson(res, 200, { ok: true, data: report, cached: false });
      return true;
    } catch (err: any) {
      console.error('[gripm Audit API] Error in GET /api/audit:', err);
      sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
      return true;
    }
  }

  // 2. POST /api/audit/refresh
  if (pathname === '/api/audit/refresh') {
    if (method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return true;
    }

    try {
      let body: any = {};
      try {
        body = await getBody(req, res);
      } catch (bodyErr: any) {
        if (bodyErr?.statusCode === 413) return true;
        // Body is optional for refresh
      }

      const resolved = resolveAuditProject(req, activeProject, registry, body);
      if ('error' in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }

      const { repoPath } = resolved;
      clearAuditCache(repoPath);

      const report = await scanCodebase(repoPath);
      setCachedAudit(repoPath, report);
      sendJson(res, 200, { ok: true, data: report });
      return true;
    } catch (err: any) {
      console.error('[gripm Audit API] Error in POST /api/audit/refresh:', err);
      sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
      return true;
    }
  }

  // 3. POST /api/audit/import-todos
  if (pathname === '/api/audit/import-todos') {
    if (method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return true;
    }

    try {
      let body: any;
      try {
        body = await getBody(req, res);
      } catch (bodyErr: any) {
        if (bodyErr?.statusCode === 413) return true;
        sendJson(res, 400, { ok: false, error: 'Invalid JSON payload: ' + (bodyErr?.message || 'Malformed body') });
        return true;
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(res, 400, { ok: false, error: 'Invalid payload: body must be a JSON object' });
        return true;
      }

      if (body.all !== true && !Array.isArray(body.items)) {
        sendJson(res, 400, { ok: false, error: 'Invalid payload: expected "items" array or "all: true"' });
        return true;
      }

      const resolved = resolveAuditProject(req, activeProject, registry, body);
      if ('error' in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }

      const { project, repoPath } = resolved;

      let itemsToImport: Array<{ file: string; line?: number; type?: string; text: string; snippet?: string }> = [];

      if (body.all === true) {
        const report = await scanCodebase(repoPath);
        itemsToImport = (report.todos || []).map((t) => ({
          file: t.file,
          line: t.line,
          type: t.type,
          text: t.text,
          snippet: t.snippet
        }));
      } else {
        itemsToImport = body.items;
      }

      // Validate each item
      for (let i = 0; i < itemsToImport.length; i++) {
        const item = itemsToImport[i];
        if (!item || typeof item !== 'object') {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: must be an object` });
          return true;
        }
        if (typeof item.text !== 'string' || !item.text.trim()) {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: "text" must be a non-empty string` });
          return true;
        }
        if (typeof item.file !== 'string' || !item.file.trim()) {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: "file" must be a non-empty string` });
          return true;
        }
      }

      if (itemsToImport.length === 0) {
        sendJson(res, 200, { ok: true, importedCount: 0, taskIds: [] });
        return true;
      }

      const projectConfig = readProjectConfig(project);
      const isSpanish = (projectConfig?.language || '').toLowerCase().startsWith('es');

      // Deduplication: look up existing tasks in the project
      const existingTasks = BacklogService.listTasks(project, { includeDeleted: false });
      const existingTitles = new Set(existingTasks.map(t => (t.title || '').trim().toLowerCase()));
      const existingLocRefs = new Set<string>();
      for (const t of existingTasks) {
        if (Array.isArray(t.acceptanceCriteria)) {
          for (const ac of t.acceptanceCriteria) {
            if (ac.text) {
              const m = ac.text.match(/([a-zA-Z0-9_\-\.\/]+):(\d+)/);
              if (m) existingLocRefs.add(`${m[1]}:${m[2]}`);
            }
          }
        }
        if (t.description) {
          const m = t.description.match(/`([a-zA-Z0-9_\-\.\/]+)`[\s\S]*?(?:Línea|Line):\s*(\d+)/i);
          if (m) existingLocRefs.add(`${m[1]}:${m[2]}`);
        }
      }

      const taskIds: string[] = [];

      for (const item of itemsToImport) {
        const cleanType = (item.type || 'TODO').trim().toUpperCase();
        let cleanText = (item.text || '').trim();
        if (cleanText.toUpperCase().startsWith(`${cleanType}:`)) {
          cleanText = cleanText.substring(cleanType.length + 1).trim();
        }
        const title = `${cleanType}: ${cleanText}`;
        const fileLocKey = `${item.file}:${item.line || 1}`;

        // Deduplication check: skip if matching title or file:line reference exists
        if (existingTitles.has(title.toLowerCase()) || existingLocRefs.has(fileLocKey)) {
          continue;
        }

        const descLines = isSpanish
          ? [
              `Deuda técnica identificada automáticamente por el motor de auditoría estática.`,
              ``,
              `- **Archivo de origen:** \`${item.file}\``,
              `- **Línea:** ${item.line || 1}`,
              `- **Tipo:** \`${cleanType}\``
            ]
          : [
              `Technical debt automatically identified by the static audit engine.`,
              ``,
              `- **Source file:** \`${item.file}\``,
              `- **Line:** ${item.line || 1}`,
              `- **Type:** \`${cleanType}\``
            ];

        if (item.snippet && typeof item.snippet === 'string' && item.snippet.trim()) {
          descLines.push(``, isSpanish ? `### Fragmento de Código:` : `### Code Snippet:`, '```', item.snippet.trim(), '```');
        }
        const description = descLines.join('\n');

        const acText = isSpanish
          ? `Resolver ${cleanType} en ${item.file}:${item.line || 1}`
          : `Resolve ${cleanType} in ${item.file}:${item.line || 1}`;

        const taskData = {
          title,
          status: 'draft',
          type: 'tech_debt',
          labels: ['todo-import', 'tech_debt'],
          priority: 'medium',
          description,
          acceptanceCriteria: [
            { index: 1, text: acText, checked: false }
          ]
        };

        const createRes = BacklogService.createTask(project, taskData);
        if (!createRes.ok || !createRes.task) {
          throw new Error(`Failed to create task for TODO: "${title}"`);
        }
        const newId = createRes.task.code || createRes.task.id;
        taskIds.push(newId);
        existingTitles.add(title.toLowerCase());
        existingLocRefs.add(fileLocKey);
      }

      if (taskIds.length > 0) {
        // Sincronización inmediata de BACKLOG.md
        BacklogService.syncBacklog(project, { autoFix: false });

        // Emisión de evento en tiempo real
        broadcastSse('backlog_changed', {
          projectId: project.id,
          action: 'todos_imported',
          count: taskIds.length,
          taskIds,
          timestamp: Date.now()
        });

        // Invalidar cache de auditoría
        clearAuditCache(repoPath);
      }

      sendJson(res, 200, {
        ok: true,
        importedCount: taskIds.length,
        taskIds
      });
      return true;
    } catch (err: any) {
      console.error('[gripm Audit API] Error in POST /api/audit/import-todos:', err);
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to import todos' });
      return true;
    }
  }

  return false;
}
