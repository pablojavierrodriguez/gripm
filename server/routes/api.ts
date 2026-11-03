import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../types.ts';
import {
  getRegistry,
  readProjectConfig,
  writeProjectConfig,
  getProjectDocsPath,
  PKG_ROOT
} from '../services/registry.ts';
import {
  readProjectBacklog
} from '../services/storage.ts';
import { BacklogService, ConflictError } from '../services/backlogService.ts';
import { broadcastSse } from '../sse/sseManager.ts';
import { getBody, sendJson } from '../middleware/security.ts';
import { resolveProjectIdentity } from '../../scripts/registryConfig.js';
import { getCachedUpdateInfo, checkForUpdates } from '../../scripts/updateChecker.js';
import { handleAuditRoutes, clearAuditCache } from './audit.ts';
import { handleProjectsRoutes, getVisibleProjects } from './projectsRoutes.ts';
import { handleCyclesRoutes } from './cyclesRoutes.ts';

export { getVisibleProjects };

let appVersion = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(PKG_ROOT, 'package.json'), 'utf8'));
  if (pkg.version) appVersion = pkg.version;
} catch {}

export async function handleApiRequest(req: any, res: any): Promise<void> {
  const url = req.url || '';
  const urlObj = new URL(url, 'http://localhost');
  const pathname = decodeURIComponent(urlObj.pathname);
  const searchParams = urlObj.searchParams;

  try {
    const registry = getRegistry();
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;

    // In single-project mode: resolve strictly the targeted repo; in multi-project mode: honor registry.activeProjectId
    const targetRepo = targetRepoEnv ? path.resolve(targetRepoEnv) : path.resolve(process.cwd());
    const targetProject = registry.projects.find(p => p.repoPath && path.resolve(p.repoPath) === targetRepo);
    const projectConfig = (targetProject || registry.projects[0]) ? readProjectConfig(targetProject || registry.projects[0]) : null;
    const envMode = process.env.GRIPM_MODE;
    const configuredMode = envMode || projectConfig?.mode;
    const isMultiMode = configuredMode === 'multi';
    const isSingleMode = configuredMode === 'single'
      ? true
      : (isMultiMode ? false : registry.projects.length <= 1);

    let activeProject = isSingleMode
      ? (targetProject || registry.projects.find(p => p.id === registry.activeProjectId) || registry.projects[0])
      : (registry.projects.find(p => p.id === registry.activeProjectId) || targetProject || registry.projects[0]);

    if (activeProject && activeProject.repoPath) {
      const identity = resolveProjectIdentity(activeProject.repoPath);
      activeProject = {
        ...activeProject,
        id: identity.id || activeProject.id,
        name: identity.name || activeProject.name,
        codePrefix: identity.codePrefix || activeProject.codePrefix
      };
    }

    if (!activeProject && targetRepo) {
      const identity = resolveProjectIdentity(targetRepo);
      activeProject = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: targetRepo,
        storageType: 'markdown',
        backlogDir: 'backlog',
        createdAt: new Date().toISOString()
      };
    }

    // DEV-355: REST API routes for Codebase Health Audit & TODOs Import
    if (pathname.startsWith('/api/audit')) {
      const handled = await handleAuditRoutes(req, res, pathname, activeProject, registry);
      if (handled) return;
    }

    // GET /api/settings (DEV-006)
    if (req.method === 'GET' && pathname === '/api/settings') {
      const urlObj = new URL(`http://localhost${url}`);
      const projectId = urlObj.searchParams.get('projectId');
      const project = (isSingleMode && activeProject)
        ? activeProject
        : (registry.projects.find(p => p.id === (projectId || registry.activeProjectId)) || registry.projects[0]);
      const config = readProjectConfig(project);
      return sendJson(res, 200, { ok: true, config, projectId: project?.id });
    }

    // POST /api/settings (DEV-006 & DEV-009)
    if (req.method === 'POST' && pathname === '/api/settings') {
      const body = await getBody(req, res);
      const projectId = body.projectId || registry.activeProjectId;
      const project = (isSingleMode && activeProject)
        ? activeProject
        : (registry.projects.find(p => p.id === projectId) || registry.projects[0]);
      const configToSave = body.config || body;
      if (configToSave.mode === 'multi' || configToSave.mode === 'single') {
        process.env.GRIPM_MODE = configToSave.mode;
      }
      const savedPath = writeProjectConfig(configToSave, project);
      clearAuditCache(project?.repoPath);

      broadcastSse('settings_changed', {
        projectId: project?.id,
        config: configToSave,
        timestamp: Date.now()
      });

      return sendJson(res, 200, {
        ok: true,
        config: readProjectConfig(project),
        savedPath
      });
    }

    // GET /api/data
    if (req.method === 'GET' && (pathname === '/api/data' || url === '/api/data')) {
      const allItems: any[] = [];
      const allReleases: any[] = [];
      const allSprints: any[] = [];
      const resolvedProjects: ProjectMeta[] = [];

      const projectsToProcess = (isSingleMode && activeProject)
        ? [activeProject]
        : getVisibleProjects(registry.projects, activeProject);

      for (const p of projectsToProcess) {
        const backlog = readProjectBacklog(p);
        const proj = backlog.project || p;
        const docsPath = getProjectDocsPath(proj);
        resolvedProjects.push({
          ...proj,
          docsPath: docsPath || undefined,
          hasDocs: Boolean(docsPath)
        });
        allItems.push(...(backlog.items || []));
        allReleases.push(...(backlog.releases || []));
        allSprints.push(...(backlog.sprints || []));
      }

      const resolvedActiveId = activeProject?.id || registry.activeProjectId || resolvedProjects[0]?.id || '';
      const updateInfo = getCachedUpdateInfo(appVersion);
      // Trigger non-blocking background update check
      checkForUpdates(appVersion).catch(() => {});

      return sendJson(res, 200, {
        projects: resolvedProjects,
        activeProjectId: resolvedActiveId,
        singleProject: isSingleMode,
        items: allItems,
        releases: allReleases,
        sprints: allSprints,
        updateAvailable: updateInfo || null,
        lastUpdated: new Date().toISOString()
      });
    }

    // GET /api/updates
    if (req.method === 'GET' && pathname === '/api/updates') {
      const cached = getCachedUpdateInfo(appVersion);
      return sendJson(res, 200, {
        currentVersion: appVersion,
        update: cached || null
      });
    }

    // POST /api/items
    if (req.method === 'POST' && pathname === '/api/items') {
      const body = await getBody(req, res);
      const project = registry.projects.find(p => p.id === (body.projectId || registry.projects[0]?.id)) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'No active project found' });

      try {
        const result = BacklogService.createTask(project, body);
        return sendJson(res, 201, {
          ok: true,
          item: result.task,
          task: result.task,
          savedFile: result.savedFile
        });
      } catch (err: any) {
        return sendJson(res, 400, { error: err.message || 'Failed to create task' });
      }
    }

    // POST /api/items/bulk (DEV-301 & DEV-311: Atomic batch updates delegated to BacklogService)
    if (req.method === 'POST' && pathname === '/api/items/bulk') {
      const body = await getBody(req, res);
      const explicitProjectId = body.projectId || searchParams.get('projectId');
      const targetProject = explicitProjectId
        ? registry.projects.find(p => p.id === explicitProjectId)
        : (registry.projects.find(p => p.id === registry.activeProjectId) || registry.projects[0]);

      if (!targetProject) {
        return sendJson(res, 400, { error: 'No active project found for bulk update' });
      }

      const targetFilter = {
        taskIds: body.taskIds,
        filterPrefix: body.filterPrefix,
        filterStatus: body.filterStatus,
        items: body.items
      };
      const updates = body.updates || body;
      const result = BacklogService.bulkUpdateTasks(targetProject, targetFilter, updates, { force: body.force });

      broadcastSse('backlog_changed', {
        projectId: targetProject.id,
        action: 'bulk_updated',
        count: result.updatedCount,
        timestamp: Date.now()
      });

      return sendJson(res, 200, {
        ok: result.ok,
        updatedCount: result.updatedCount,
        count: result.updatedCount,
        updatedIds: result.updatedIds,
        failedUpdates: result.failedUpdates
      });
    }

    // PUT /api/items/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/items/')) {
      const id = decodeURIComponent(pathname.replace('/api/items/', ''));
      const body = await getBody(req, res);

      const explicitProjectId = body?.projectId || searchParams.get('projectId');
      const candidateProjects = explicitProjectId
        ? registry.projects.filter(p => p.id === explicitProjectId)
        : [
            registry.projects.find(p => p.id === registry.activeProjectId),
            ...registry.projects.filter(p => p.id !== registry.activeProjectId)
          ].filter(Boolean) as ProjectMeta[];

      for (const p of candidateProjects) {
        try {
          const result = BacklogService.updateTask(p, id, body, {
            force: body?.force,
            expectedMtime: body?.expectedMtime
          });
          if (result.ok) {
            return sendJson(res, 200, {
              ok: true,
              item: result.updatedTask,
              updatedTask: result.updatedTask,
              warning: result.warning,
              audit: result.audit
            });
          }
        } catch (err: any) {
          if (err instanceof ConflictError || err?.conflict || err?.name === 'ConflictError') {
            return sendJson(res, 409, {
              error: 'conflict',
              message: err.message,
              currentMtime: err.currentMtime,
              currentItem: err.currentItem
            });
          }
          if (err?.message && (err.message.includes('Gatekeeper') || err.message.includes('[Validation]'))) {
            return sendJson(res, 400, { error: err.message });
          }
          if (err?.message && (err.message.includes('not found') || err.message.includes('no encontrada'))) {
            continue;
          }
          return sendJson(res, 400, { error: err.message });
        }
      }

      return sendJson(res, 404, { error: 'Item not found in any registered project' });
    }

    // PATCH /api/items/:id/restore (DEV-049: Restore soft-deleted item)
    if (req.method === 'PATCH' && /^\/api\/items\/[^/]+\/restore$/.test(pathname)) {
      const id = decodeURIComponent(pathname.replace('/api/items/', '').replace('/restore', ''));
      const explicitProjectId = searchParams.get('projectId');
      const candidateProjects = explicitProjectId
        ? registry.projects.filter(p => p.id === explicitProjectId)
        : [
            registry.projects.find(p => p.id === registry.activeProjectId),
            ...registry.projects.filter(p => p.id !== registry.activeProjectId)
          ].filter(Boolean) as ProjectMeta[];

      for (const p of candidateProjects) {
        const restored = BacklogService.restoreTask(p, id);
        if (restored) {
          broadcastSse('change', { type: 'item_restored', id });
          return sendJson(res, 200, { ok: true, id });
        }
      }
      return sendJson(res, 404, { error: 'Item not found' });
    }

    // DELETE /api/items/:id (DEV-049: soft-delete by default, ?purge=true for physical removal)
    if (req.method === 'DELETE' && pathname.startsWith('/api/items/')) {
      const isPurge = searchParams.get('purge') === 'true';
      const id = decodeURIComponent(pathname.replace('/api/items/', ''));
      const explicitProjectId = searchParams.get('projectId');
      const candidateProjects = explicitProjectId
        ? registry.projects.filter(p => p.id === explicitProjectId)
        : [
            registry.projects.find(p => p.id === registry.activeProjectId),
            ...registry.projects.filter(p => p.id !== registry.activeProjectId)
          ].filter(Boolean) as ProjectMeta[];

      for (const p of candidateProjects) {
        try {
          const resDel = BacklogService.deleteTask(p, id, { purge: isPurge });
          if (resDel.ok) {
            broadcastSse('change', {
              type: isPurge ? 'item_purged' : 'item_soft_deleted',
              id
            });
            return sendJson(res, 200, {
              ok: true,
              id,
              purged: isPurge ? true : undefined,
              softDeleted: !isPurge ? true : undefined
            });
          }
        } catch (err: any) {
          return sendJson(res, 400, { error: err.message });
        }
      }
      return sendJson(res, 404, { error: 'Item not found in any registered project' });
    }

    // Delegate to Projects Routes (projects, fs, importers)
    const handledProjects = await handleProjectsRoutes(req, res, pathname, url, searchParams, activeProject, registry, isSingleMode);
    if (handledProjects) return;

    // Delegate to Cycles Routes (releases, sprints, retros)
    const handledCycles = await handleCyclesRoutes(req, res, pathname, searchParams, registry);
    if (handledCycles) return;

    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (err: any) {
    if (err?.statusCode === 413) {
      return;
    }
    console.error('[gripm API Error]', err);
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
}
