import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../types.ts';
import {
  getRegistry,
  saveRegistry,
  readProjectConfig,
  writeProjectConfig,
  getProjectDocsPath,
  detectProjectStorage,
  isBacklogMdProject,
  getBacklogTasksDir,
  PKG_ROOT
} from '../services/registry.ts';
import {
  readProjectBacklog,
  writeProjectBacklog,
  saveBacklogMdItem,
  findBacklogMdFile,
  softDeleteBacklogMdItem,
  restoreBacklogMdItem,
  purgeBacklogMdItem,
  parseReleaseNotesMd
} from '../services/storage.ts';
import { isAllowedBrowsePath, getSafeInitialBrowseDir } from '../services/fsExplorer.ts';
import { atomicWriteFileSync } from '../services/atomicWrite.ts';
import { broadcastSse } from '../sse/sseManager.ts';
import { getBody, sendJson } from '../middleware/security.ts';
import { runMigration } from '../../scripts/import-docs.js';
import {
  generateMonolithicBacklogMd,
  normalizeStatus,
  normalizePriority,
  type BacklogMdTask
} from '../../scripts/backlogMdParser.ts';
import { parseLegacyMarkdown, type ParsedLegacyItem } from '../../src/utils/legacyParser.ts';
import { resolveProjectIdentity } from '../../scripts/registryConfig.js';
import { getCachedUpdateInfo, checkForUpdates } from '../../scripts/updateChecker.js';

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

      const projectsToProcess = (isSingleMode && activeProject) ? [activeProject] : registry.projects;

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
      const now = new Date().toISOString();

      const project = registry.projects.find(p => p.id === (body.projectId || registry.projects[0]?.id)) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'No active project found' });

      const backlog = readProjectBacklog(project);
      const cleanPrefix = (project.codePrefix || 'ITEM').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'ITEM';

      let code = body.code;
      if (!code) {
        let maxNum = 0;
        const regex = new RegExp(`^${cleanPrefix}[-_]+(\\d+)`, 'i');
        for (const t of backlog.items) {
          const m = (t.code || t.id || '').match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        if (isBacklogMdProject(project)) {
          const tasksDir = getBacklogTasksDir(project);
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
        const nextNum = maxNum > 0 ? maxNum + 1 : backlog.items.length + 1;
        code = `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
      }

      const normalizedSt = normalizeStatus(body.status || 'draft');
      const newItem = {
        id: isBacklogMdProject(project)
          ? code
          : (body.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        code,
        projectId: project.id,
        title: body.title || 'Sin título',
        description: body.description || '',
        type: body.type || 'feature',
        priority: normalizePriority(body.priority),
        status: normalizedSt,
        module: body.module || undefined,
        impactedFile: body.impactedFile || undefined,
        risk: body.risk || undefined,
        sprint: body.sprint || body.targetSprint || undefined,
        release: body.release || body.targetRelease || undefined,
        targetSprint: body.sprint || body.targetSprint || undefined,
        targetRelease: body.release || body.targetRelease || undefined,
        milestone: body.release || body.targetRelease || body.milestone || undefined,
        parentId: body.parentId || undefined,
        blocks: Array.isArray(body.blocks) ? body.blocks : [],
        blockedBy: Array.isArray(body.blockedBy) ? body.blockedBy : [],
        relatedTo: Array.isArray(body.relatedTo) ? body.relatedTo : [],
        acceptanceCriteriaList: body.acceptanceCriteriaList || [],
        implementationPlan: body.implementationPlan || '',
        assignees: body.assignees || [],
        labels: body.labels || [],
        estimate: body.estimate !== undefined && body.estimate !== '' ? body.estimate : undefined,
        sourceDoc: body.sourceDoc || undefined,
        order: body.order ?? backlog.items.length + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: normalizedSt === 'done' ? now : undefined,
        releasedAt: body.releasedAt || undefined
      };

      if (isBacklogMdProject(project)) {
        saveBacklogMdItem(project, newItem);
      } else {
        backlog.items.push(newItem);
        writeProjectBacklog(project, backlog);
      }

      return sendJson(res, 201, { ok: true, item: newItem });
    }

    // POST /api/items/bulk (DEV-301: Atomic batch updates for bulk operations, sprint completion, reordering)
    if (req.method === 'POST' && pathname === '/api/items/bulk') {
      const body = await getBody(req, res);
      const itemsToUpdate = Array.isArray(body.items) ? body.items : [];
      const explicitProjectId = body.projectId || searchParams.get('projectId');
      const targetProject = explicitProjectId
        ? registry.projects.find(p => p.id === explicitProjectId)
        : (registry.projects.find(p => p.id === registry.activeProjectId) || registry.projects[0]);

      if (!targetProject) {
        return sendJson(res, 400, { error: 'No active project found for bulk update' });
      }

      let updatedCount = 0;
      const now = new Date().toISOString();
      const backlog = readProjectBacklog(targetProject);

      for (const patch of itemsToUpdate) {
        if (!patch || (!patch.id && !patch.code)) continue;
        const targetId = patch.code || patch.id;
        const idx = backlog.items.findIndex(it => it.id === targetId || it.code === targetId);
        if (idx !== -1) {
          const existing = backlog.items[idx];
          const newNormalizedStatus = patch.status ? normalizeStatus(patch.status) : existing.status;
          const wasDone = existing.status === 'done';
          const isNowDone = newNormalizedStatus === 'done';

          const updatedItem = {
            ...existing,
            ...patch,
            id: existing.id,
            code: existing.code,
            status: newNormalizedStatus,
            priority: patch.priority ? normalizePriority(patch.priority) : existing.priority,
            updatedAt: now,
            completedAt: isNowDone && !wasDone ? now : (isNowDone ? existing.completedAt : undefined)
          };

          if (patch.sprint !== undefined) {
            updatedItem.sprint = patch.sprint || undefined;
            updatedItem.targetSprint = patch.sprint || undefined;
            if (!patch.sprint && updatedItem.milestone && updatedItem.milestone.toLowerCase().includes('sprint')) {
              updatedItem.milestone = undefined;
            }
            if (patch.sprint) {
              updatedItem.sprints = Array.from(new Set([...(updatedItem.sprints || []), patch.sprint]));
            } else {
              updatedItem.sprints = [];
            }
          }
          if (patch.sprints !== undefined) {
            updatedItem.sprints = patch.sprints;
          }
          if (patch.release !== undefined || patch.targetRelease !== undefined || patch.milestone !== undefined || patch.releases !== undefined) {
            const rVal = (patch.release || patch.targetRelease || patch.milestone || (patch.releases && patch.releases.length > 0 ? patch.releases[0] : '') || '').trim();
            const relArr = Array.isArray(patch.releases) ? patch.releases.filter(Boolean) : (rVal ? [rVal] : []);
            updatedItem.release = rVal || undefined;
            updatedItem.targetRelease = rVal || undefined;
            updatedItem.milestone = rVal || undefined;
            updatedItem.releases = relArr;
          }
          if (patch.estimate !== undefined) {
            updatedItem.estimate = (patch.estimate === '' || patch.estimate === null) ? undefined : patch.estimate;
          }

          if (isBacklogMdProject(targetProject)) {
            saveBacklogMdItem(targetProject, updatedItem);
          } else {
            backlog.items[idx] = updatedItem;
          }
          updatedCount++;
        }
      }

      if (!isBacklogMdProject(targetProject)) {
        writeProjectBacklog(targetProject, backlog);
      }

      broadcastSse('backlog_changed', {
        projectId: targetProject.id,
        action: 'bulk_updated',
        count: updatedCount,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { ok: true, updatedCount });
    }

    // PUT /api/items/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/items/')) {
      const id = decodeURIComponent(pathname.replace('/api/items/', ''));
      const body = await getBody(req, res);
      const now = new Date().toISOString();

      const explicitProjectId = body?.projectId || searchParams.get('projectId');
      const candidateProjects = explicitProjectId
        ? registry.projects.filter(p => p.id === explicitProjectId)
        : [
            registry.projects.find(p => p.id === registry.activeProjectId),
            ...registry.projects.filter(p => p.id !== registry.activeProjectId)
          ].filter(Boolean) as ProjectMeta[];

      for (const p of candidateProjects) {
        const backlog = readProjectBacklog(p);
        const index = backlog.items.findIndex(i => i.id === id || i.code === id);
        if (index !== -1) {
          const existing = backlog.items[index];

          // DEV-017 & DEV-301: Optimistic Concurrency Check (ETag / Mtime)
          if (!body.force && typeof body.expectedMtime === 'number' && typeof existing.mtime === 'number') {
            if (existing.mtime > body.expectedMtime) {
              return sendJson(res, 409, {
                error: 'conflict',
                message: `La tarea "${existing.code}" fue modificada en disco por otro proceso o agente.`,
                currentMtime: existing.mtime,
                currentItem: existing
              });
            }
          }

          const newNormalizedStatus = body.status ? normalizeStatus(body.status) : existing.status;
          const wasDone = existing.status === 'done';
          const isNowDone = newNormalizedStatus === 'done';

          const updatedItem = {
            ...existing,
            ...body,
            id: existing.id,
            code: existing.code,
            status: newNormalizedStatus,
            priority: body.priority ? normalizePriority(body.priority) : existing.priority,
            updatedAt: now,
            completedAt: isNowDone && !wasDone ? now : (isNowDone ? existing.completedAt : undefined)
          };

          if (body.sprint !== undefined) {
            updatedItem.sprint = body.sprint || undefined;
            updatedItem.targetSprint = body.sprint || undefined;
            if (!body.sprint && updatedItem.milestone && updatedItem.milestone.toLowerCase().includes('sprint')) {
              updatedItem.milestone = undefined;
            }
            if (body.sprint) {
              updatedItem.sprints = Array.from(new Set([...(updatedItem.sprints || []), body.sprint]));
            } else {
              updatedItem.sprints = [];
            }
          }
          if (body.sprints !== undefined) {
            updatedItem.sprints = body.sprints;
          }
          if (body.release !== undefined || body.targetRelease !== undefined || body.milestone !== undefined || body.releases !== undefined) {
            const rVal = (body.release || body.targetRelease || body.milestone || (body.releases && body.releases.length > 0 ? body.releases[0] : '') || '').trim();
            const relArr = Array.isArray(body.releases) ? body.releases.filter(Boolean) : (rVal ? [rVal] : []);
            updatedItem.release = rVal || undefined;
            updatedItem.targetRelease = rVal || undefined;
            updatedItem.milestone = rVal || undefined;
            updatedItem.releases = relArr;
          }
          if (body.estimate !== undefined) {
            updatedItem.estimate = (body.estimate === '' || body.estimate === null) ? undefined : body.estimate;
          }

          if (isBacklogMdProject(p)) {
            saveBacklogMdItem(p, updatedItem);
            const fileInfo = findBacklogMdFile(p, updatedItem.code || updatedItem.id);
            updatedItem.mtime = fileInfo?.filePath && fs.existsSync(fileInfo.filePath)
              ? Math.round(fs.statSync(fileInfo.filePath).mtimeMs)
              : Date.now();
          } else {
            backlog.items[index] = updatedItem;
            writeProjectBacklog(p, backlog);
            const jsonPath = p.repoPath
              ? path.join(p.repoPath, '.gripm/backlog.json')
              : (fs.existsSync(path.resolve(PKG_ROOT, 'src/data/demo-backlog.json'))
                  ? path.resolve(PKG_ROOT, 'src/data/demo-backlog.json')
                  : path.resolve(PKG_ROOT, 'data/demo-backlog.json'));
            updatedItem.mtime = fs.existsSync(jsonPath)
              ? Math.round(fs.statSync(jsonPath).mtimeMs)
              : Date.now();
          }

          return sendJson(res, 200, { ok: true, item: updatedItem });
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
        if (isBacklogMdProject(p)) {
          const restored = restoreBacklogMdItem(p, id);
          if (restored) {
            broadcastSse('change', { type: 'item_restored', id });
            return sendJson(res, 200, { ok: true, id });
          }
        } else {
          const backlog = readProjectBacklog(p);
          const item = backlog.items.find((i: any) => i.id === id || i.code === id);
          if (item) {
            const restoreStatus = (item as any).previousStatus || 'draft';
            item.status = restoreStatus;
            delete (item as any).isDeleted;
            delete (item as any).deletedAt;
            delete (item as any).previousStatus;
            writeProjectBacklog(p, backlog);
            broadcastSse('change', { type: 'item_restored', id });
            return sendJson(res, 200, { ok: true, id, item });
          }
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
        if (isBacklogMdProject(p)) {
          if (isPurge) {
            const purged = purgeBacklogMdItem(p, id);
            if (purged) {
              broadcastSse('change', { type: 'item_purged', id });
              return sendJson(res, 200, { ok: true, id, purged: true });
            }
          } else {
            // Check done protection
            const found = findBacklogMdFile(p, id);
            if (found && (found.task.status || '').toLowerCase() === 'done') {
              return sendJson(res, 403, { error: 'Cannot soft-delete a done item. Done items are protected historical records.' });
            }
            const deleted = softDeleteBacklogMdItem(p, id);
            if (deleted) {
              broadcastSse('change', { type: 'item_soft_deleted', id });
              return sendJson(res, 200, { ok: true, id, softDeleted: true });
            }
          }
        } else {
          const backlog = readProjectBacklog(p);
          const idx = backlog.items.findIndex((i: any) => i.id === id || i.code === id);
          if (idx !== -1) {
            const item = backlog.items[idx] as any;
            if (!isPurge) {
              // Protect done items
              if (item.status === 'done') {
                return sendJson(res, 403, { error: 'Cannot soft-delete a done item.' });
              }
              item.previousStatus = item.status;
              item.isDeleted = true;
              item.deletedAt = new Date().toISOString();
            } else {
              backlog.items.splice(idx, 1);
            }
            writeProjectBacklog(p, backlog);
            broadcastSse('change', { type: isPurge ? 'item_purged' : 'item_soft_deleted', id });
            return sendJson(res, 200, { ok: true, id, softDeleted: !isPurge, purged: isPurge });
          }
        }
      }

      return sendJson(res, 404, { error: 'Item not found' });
    }

    // POST /api/import/legacy-md (DEV-018)
    if (req.method === 'POST' && pathname === '/api/import/legacy-md') {
      const body = await getBody(req, res);
      const projectId = body.projectId || registry.projects[0]?.id;
      const project = registry.projects.find(p => p.id === projectId);
      if (!project) return sendJson(res, 404, { error: 'Proyecto no encontrado' });

      let itemsToImport: ParsedLegacyItem[] = [];
      if (Array.isArray(body.items) && body.items.length > 0) {
        itemsToImport = body.items.filter((it: any) => it.selected !== false);
      } else if (body.content) {
        itemsToImport = parseLegacyMarkdown(body.content, body.defaultMilestone);
      }

      if (itemsToImport.length === 0) {
        return sendJson(res, 400, { error: 'No se encontraron tareas seleccionadas para importar' });
      }

      const currentBacklog = readProjectBacklog(project);
      const prefix = (project.codePrefix || 'ITEM').toUpperCase();

      // Calculate starting code number
      let maxNum = 0;
      for (const item of currentBacklog.items) {
        const code = String(item.code || item.id || '');
        const match = code.match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }

      const now = new Date().toISOString();
      const createdItems: any[] = [];
      let order = currentBacklog.items.length + 1;

      for (const it of itemsToImport) {
        maxNum++;
        const itemCode = `${prefix}-${String(maxNum).padStart(3, '0')}`;
        const newItem = {
          id: itemCode,
          code: itemCode,
          projectId: project.id,
          title: it.title || 'Sin título',
          description: it.description || '',
          status: it.status || 'draft',
          type: it.type || 'feature',
          priority: normalizePriority(it.priority || 'p2'),
          module: it.module || undefined,
          sprint: it.sprint || it.targetSprint || (it.milestone?.toLowerCase().includes('sprint') ? it.milestone : undefined),
          release: it.release || it.targetRelease || (it.milestone && !it.milestone.toLowerCase().includes('sprint') ? it.milestone : undefined),
          targetSprint: it.sprint || it.targetSprint || it.milestone || undefined,
          targetRelease: it.release || it.targetRelease || undefined,
          milestone: it.milestone || undefined,
          order: order++,
          createdAt: now,
          updatedAt: now,
          completedAt: it.status === 'done' ? now : undefined
        };

        if (isBacklogMdProject(project)) {
          saveBacklogMdItem(project, newItem);
        } else {
          currentBacklog.items.push(newItem);
        }
        createdItems.push(newItem);
      }

      if (!isBacklogMdProject(project)) {
        writeProjectBacklog(project, currentBacklog);
      }

      broadcastSse('backlog_changed', {
        projectId: project.id,
        action: 'imported',
        count: createdItems.length,
        timestamp: Date.now()
      });

      return sendJson(res, 200, {
        ok: true,
        importedCount: createdItems.length,
        items: createdItems
      });
    }

    // POST /api/projects
    if (req.method === 'POST' && pathname === '/api/projects') {
      const body = await getBody(req, res);
      const now = new Date().toISOString();

      const id = (body.id || body.codePrefix || body.name || `proj-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      let storageType = body.storageType;
      let backlogDir = body.backlogDir || 'backlog';

      if (body.backlogDir) {
        const normBacklog = path.normalize(body.backlogDir);
        if (path.isAbsolute(normBacklog) || normBacklog.startsWith('..') || normBacklog.includes(`..${path.sep}`)) {
          return sendJson(res, 400, { ok: false, error: 'Invalid backlogDir: must be a relative directory inside the repository' });
        }
      }

      const normalizedRepoPath = body.repoPath ? path.normalize(body.repoPath.trim()) : undefined;
      if (normalizedRepoPath && !isAllowedBrowsePath(normalizedRepoPath)) {
        return sendJson(res, 403, { error: 'Forbidden: repoPath is outside allowed roots' });
      }
      if (!storageType && normalizedRepoPath) {
        const detected = detectProjectStorage(normalizedRepoPath);
        storageType = detected.storageType;
        backlogDir = detected.backlogDir;
      }

      const newProject: ProjectMeta = {
        id,
        name: body.name || 'Nuevo Proyecto',
        codePrefix: (body.codePrefix || 'PRJ').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRJ',
        repoPath: normalizedRepoPath,
        ...(body.isDemo ? { isDemo: true } : {}),
        storageType: storageType || 'json',
        backlogDir,
        createdAt: now
      };

      registry.projects.push(newProject);
      saveRegistry(registry);

      if (newProject.repoPath) {
        readProjectBacklog(newProject);
      }

      return sendJson(res, 201, { ok: true, project: newProject });
    }

    // POST /api/projects/restore-demo
    if (req.method === 'POST' && pathname === '/api/projects/restore-demo') {
      const hasDemo = registry.projects.some(p => p.id === 'demo');
      if (!hasDemo) {
        registry.projects.push({
          id: 'demo',
          name: 'Proyecto Demo (Tour)',
          codePrefix: 'DEMO',
          description: 'Proyecto de demostración de gripm. Puedes explorarlo o eliminarlo en cualquier momento.',
          isDemo: true,
          storageType: 'json',
          createdAt: new Date().toISOString()
        });
      }
      registry.activeProjectId = 'demo';
      saveRegistry(registry);
      return sendJson(res, 200, { ok: true, projects: registry.projects, activeProjectId: 'demo' });
    }

    // POST /api/projects/detect-path
    if (req.method === 'POST' && pathname === '/api/projects/detect-path') {
      const body = await getBody(req, res);
      const inputPath = body.repoPath ? path.normalize(body.repoPath.trim()) : '';
      if (!inputPath) {
        return sendJson(res, 400, { error: 'repoPath required' });
      }
      if (!isAllowedBrowsePath(inputPath)) {
        return sendJson(res, 403, { error: 'Forbidden: repoPath is outside allowed roots' });
      }
      const exists = fs.existsSync(inputPath);
      const isGit = exists && fs.existsSync(path.join(inputPath, '.git'));
      const detection = detectProjectStorage(inputPath);
      return sendJson(res, 200, {
        ok: true,
        exists,
        isGit,
        normalizedPath: inputPath,
        ...detection
      });
    }

    // DELETE /api/projects/:id (Unlink project from gripm)
    if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
      const id = decodeURIComponent(pathname.replace('/api/projects/', ''));
      const initialLen = registry.projects.length;
      registry.projects = registry.projects.filter(p => p.id !== id);

      if (registry.projects.length === initialLen) {
        return sendJson(res, 404, { error: 'Project not found in registry' });
      }

      if (registry.activeProjectId === id) {
        registry.activeProjectId = registry.projects[0]?.id || '';
      }

      saveRegistry(registry);
      return sendJson(res, 200, { ok: true, id, remainingProjects: registry.projects });
    }

    // POST /api/projects/active
    if (req.method === 'POST' && pathname === '/api/projects/active') {
      const body = await getBody(req, res);
      const { projectId } = body || {};
      if (isSingleMode) {
        // In single-project mode, active project is strictly bound to the target repository
        return sendJson(res, 200, { ok: true, activeProjectId: activeProject?.id, singleProject: true });
      }
      if (projectId && registry.projects.some(p => p.id === projectId)) {
        registry.activeProjectId = projectId;
        saveRegistry(registry);
        return sendJson(res, 200, { ok: true, activeProjectId: projectId });
      }
      return sendJson(res, 400, { error: 'Invalid or missing projectId' });
    }

    // GET /api/fs/browse?dir=...
    if (req.method === 'GET' && (pathname === '/api/fs/browse' || pathname.startsWith('/api/fs/browse'))) {
      let rawDir = searchParams.get('dir') || '';
      let targetDir = rawDir.trim();

      if (!targetDir) {
        targetDir = getSafeInitialBrowseDir();
      } else {
        targetDir = path.resolve(path.normalize(targetDir));
        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: 'Forbidden: Path is outside allowed roots' });
        }
      }

      try {
        if (!fs.existsSync(targetDir)) {
          targetDir = getSafeInitialBrowseDir();
        }

        const stat = fs.statSync(targetDir);
        if (!stat.isDirectory()) {
          targetDir = path.dirname(targetDir);
        }

        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: 'Forbidden: Path is outside allowed roots' });
        }

        const parent = path.dirname(targetDir);
        const parentPath = (parent !== targetDir && isAllowedBrowsePath(parent)) ? parent : null;

        let entries: fs.Dirent[] = [];
        let dirWarning: string | undefined = undefined;

        try {
          entries = fs.readdirSync(targetDir, { withFileTypes: true });
        } catch (readErr: any) {
          console.warn(`[gripm FS] Cannot scan ${targetDir}: ${readErr.message}`);
          dirWarning = readErr.code === 'EPERM' || readErr.code === 'EACCES'
            ? `Permiso restringido por el sistema al explorar esta carpeta (${readErr.message}). Puedes escribir o pegar la ruta exacta manualmente.`
            : `No se pudieron leer subcarpetas: ${readErr.message}`;
        }

        const folders: Array<{ name: string; path: string; isGit: boolean; hasBacklog: boolean }> = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          // Skip noisy/hidden directories
          if (entry.name.startsWith('.') && entry.name !== '.backlog') continue;
          if (['node_modules', 'dist', 'build', '.git', '$RECYCLE.BIN', 'System Volume Information'].includes(entry.name)) continue;

          const fullPath = path.join(targetDir, entry.name);
          let isGit = false;
          let hasBacklog = false;
          try {
            isGit = fs.existsSync(path.join(fullPath, '.git'));
            hasBacklog = fs.existsSync(path.join(fullPath, 'backlog')) || fs.existsSync(path.join(fullPath, '.backlog'));
          } catch {}

          folders.push({
            name: entry.name,
            path: fullPath,
            isGit,
            hasBacklog
          });
        }

        folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        let isCurrentGit = false;
        let hasCurrentBacklog = false;
        let hasCurrentGripm = false;
        try {
          isCurrentGit = fs.existsSync(path.join(targetDir, '.git'));
          hasCurrentBacklog = fs.existsSync(path.join(targetDir, 'backlog')) || fs.existsSync(path.join(targetDir, '.backlog'));
          hasCurrentGripm = fs.existsSync(path.join(targetDir, '.gripm'));
        } catch {}

        return sendJson(res, 200, {
          ok: true,
          currentPath: targetDir,
          parentPath,
          folders,
          isGit: isCurrentGit,
          hasBacklog: hasCurrentBacklog,
          hasGripm: hasCurrentGripm,
          warning: dirWarning
        });
      } catch (browseErr: any) {
        const safeDir = getSafeInitialBrowseDir();
        const parent = path.dirname(safeDir);
        const parentPath = (parent !== safeDir && isAllowedBrowsePath(parent)) ? parent : null;
        return sendJson(res, 200, {
          ok: true,
          currentPath: safeDir,
          parentPath,
          folders: [],
          warning: `No se pudo acceder a la ruta solicitada (${browseErr.message}). Se cargó una ruta segura.`
        });
      }
    }

    // POST /api/projects/:id/detect-storage
    if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/detect-storage$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/detect-storage$/)![1]);
      const p = registry.projects.find(proj => proj.id === id);
      if (!p) return sendJson(res, 404, { error: 'Project not found' });
      const detection = detectProjectStorage(p.repoPath);
      return sendJson(res, 200, { ok: true, ...detection });
    }

    // POST /api/projects/:id/convert-to-md
    if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/convert-to-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-md$/)![1]);
      const project = registry.projects.find(proj => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: 'Project not found or lacks repoPath' });
      }

      // Read current JSON items
      const currentBacklog = readProjectBacklog(project);
      const tasksDir = path.join(project.repoPath, 'backlog/tasks');
      if (!fs.existsSync(tasksDir)) {
        fs.mkdirSync(tasksDir, { recursive: true });
      }

      let converted = 0;
      for (const item of currentBacklog.items) {
        saveBacklogMdItem({ ...project, storageType: 'markdown', backlogDir: 'backlog' }, item);
        converted++;
      }

      project.storageType = 'markdown';
      project.backlogDir = 'backlog';
      saveRegistry(registry);

      return sendJson(res, 200, {
        ok: true,
        message: `Convertidos ${converted} items a Backlog.md en ${tasksDir}`,
        convertedCount: converted,
        tasksDir
      });
    }

    // POST /api/projects/:id/convert-to-json
    if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/convert-to-json$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-json$/)![1]);
      const project = registry.projects.find(proj => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: 'Project not found or lacks repoPath' });
      }

      const currentBacklog = readProjectBacklog(project);
      const jsonPath = path.join(project.repoPath, '.gripm/backlog.json');
      const gripmDir = path.dirname(jsonPath);
      if (!fs.existsSync(gripmDir)) {
        fs.mkdirSync(gripmDir, { recursive: true });
      }

      atomicWriteFileSync(jsonPath, JSON.stringify(currentBacklog, null, 2), 'utf8');

      project.storageType = 'json';
      saveRegistry(registry);

      return sendJson(res, 200, {
        ok: true,
        message: `Unificadas ${currentBacklog.items.length} tareas en ${jsonPath}`,
        savedPath: jsonPath
      });
    }

    // GET /api/projects/:id/export-json
    if (req.method === 'GET' && /^\/api\/projects\/[^/]+\/export-json$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-json$/)![1]);
      const project = registry.projects.find(proj => proj.id === id);
      if (!project) return sendJson(res, 404, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, {
        ok: true,
        project,
        data: backlog
      });
    }

    // GET /api/projects/:id/export-monolithic-md (Read-only, no disk mutations DEV-292)
    if (req.method === 'GET' && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)![1]);
      const project = registry.projects.find(proj => proj.id === id);
      if (!project) return sendJson(res, 404, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      const tasks: BacklogMdTask[] = backlog.items.filter((it: any) => !it.isDeleted).map((it: any) => ({
        id: it.code || it.id,
        title: it.title,
        status: normalizeStatus(it.status),
        type: it.type,
        priority: it.priority,
        milestone: it.targetSprint || it.milestone,
        description: it.description,
        acceptanceCriteria: it.acceptanceCriteriaList || []
      }));

      const markdownContent = generateMonolithicBacklogMd(project.name, tasks);

      return sendJson(res, 200, {
        ok: true,
        content: markdownContent
      });
    }

    // POST /api/projects/:id/export-monolithic-md (Saves BACKLOG.md to disk atomically DEV-292)
    if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)![1]);
      const project = registry.projects.find(proj => proj.id === id);
      if (!project) return sendJson(res, 404, { error: 'Project not found' });
      if (!project.repoPath) return sendJson(res, 400, { error: 'Project lacks repoPath' });

      await getBody(req, res).catch(() => ({}));

      const backlog = readProjectBacklog(project);
      const tasks: BacklogMdTask[] = backlog.items.filter((it: any) => !it.isDeleted).map((it: any) => ({
        id: it.code || it.id,
        title: it.title,
        status: normalizeStatus(it.status),
        type: it.type,
        priority: it.priority,
        milestone: it.targetSprint || it.milestone,
        description: it.description,
        acceptanceCriteria: it.acceptanceCriteriaList || []
      }));

      const markdownContent = generateMonolithicBacklogMd(project.name, tasks);
      const savedPath = path.join(project.repoPath, 'BACKLOG.md');
      atomicWriteFileSync(savedPath, markdownContent, 'utf8');

      return sendJson(res, 200, {
        ok: true,
        content: markdownContent,
        savedPath
      });
    }

    // POST /api/releases
    if (req.method === 'POST' && pathname === '/api/releases') {
      const body = await getBody(req, res);
      const now = new Date().toISOString();

      const project = registry.projects.find(p => p.id === body.projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      const requestedStatus = body.status === 'released' ? 'released' : 'unreleased';
      const isReleased = requestedStatus === 'released';
      const isUnreleased = requestedStatus === 'unreleased';

      const existingIdx = backlog.releases.findIndex((r: any) =>
        (body.id && r.id === body.id) ||
        (body.version && (r.version === body.version || r.version?.replace(/^v/i, '') === body.version?.replace(/^v/i, '')))
      );
      const existingRel = existingIdx >= 0 ? backlog.releases[existingIdx] : null;

      let resolvedItemCodes = body.itemCodes;
      if (resolvedItemCodes === undefined || (Array.isArray(resolvedItemCodes) && resolvedItemCodes.length === 0 && existingRel && Array.isArray(existingRel.itemCodes) && existingRel.itemCodes.length > 0 && body.clearItemCodes !== true)) {
        resolvedItemCodes = existingRel ? existingRel.itemCodes : [];
      }

      const release = {
        id: body.id || (existingRel ? existingRel.id : `rel-${(body.version || '1.0.0').replace(/\./g, '-')}-${Date.now()}`),
        projectId: project.id,
        version: body.version || (existingRel ? existingRel.version : '1.0.0'),
        date: body.date || (existingRel ? existingRel.date : now.split('T')[0]),
        title: body.title || (existingRel ? existingRel.title : (isUnreleased ? `En Preparación: v${body.version}` : `Release v${body.version}`)),
        summary: body.summary !== undefined ? body.summary : (existingRel ? existingRel.summary : ''),
        itemCodes: resolvedItemCodes || [],
        markdownContent: body.markdownContent !== undefined ? body.markdownContent : (existingRel ? existingRel.markdownContent : ''),
        createdAt: body.createdAt || (existingRel ? existingRel.createdAt : now),
        status: requestedStatus,
        targetDate: body.targetDate !== undefined ? body.targetDate : (existingRel ? existingRel.targetDate : undefined),
        scopeNotes: body.scopeNotes !== undefined ? body.scopeNotes : (existingRel ? existingRel.scopeNotes : undefined)
      };

      const itemCodeSet = new Set((release.itemCodes || []).map((c: string) => c.toUpperCase()));
      const relVCLean = (release.version || '').replace(/^v/i, '');

      backlog.items = backlog.items.map((it: any) => {
        const codeUpper = (it.code || it.id || '').toUpperCase();
        const isItemInRelease = itemCodeSet.has(codeUpper);
        const prevRel = (it.targetRelease || it.release || '').replace(/^v/i, '');

        if (isReleased) {
          // When officially publishing/releasing to production: mark releasedAt and complete ready/finish tasks
          if (isItemInRelease) {
            const updated = {
              ...it,
              targetRelease: release.version,
              release: release.version,
              releasedAt: now,
              status: it.status === 'ready' || it.status === 'finish' ? 'done' : it.status,
              completedAt: it.completedAt || now,
              updatedAt: now
            };
            if (isBacklogMdProject(project)) {
              saveBacklogMdItem(project, updated);
            }
            return updated;
          }
        } else {
          // When unreleased (dev) or planning: associate targetRelease/release
          if (isItemInRelease) {
            if (it.targetRelease !== release.version || it.release !== release.version) {
              const updated = {
                ...it,
                targetRelease: release.version,
                release: release.version,
                milestone: it.milestone || release.version,
                updatedAt: now
              };
              if (isBacklogMdProject(project)) {
                saveBacklogMdItem(project, updated);
              }
              return updated;
            }
          } else if (prevRel === relVCLean) {
            // Item was unlinked from this release! Clear release associations
            const updated = {
              ...it,
              targetRelease: undefined,
              release: undefined,
              milestone: it.milestone && it.milestone.replace(/^v/i, '') === relVCLean ? undefined : it.milestone,
              updatedAt: now
            };
            if (isBacklogMdProject(project)) {
              saveBacklogMdItem(project, updated);
            }
            return updated;
          }
        }
        return it;
      });

      const targetIdx = backlog.releases.findIndex((r: any) => r.id === release.id || r.version === release.version);
      if (targetIdx >= 0) {
        backlog.releases[targetIdx] = { ...backlog.releases[targetIdx], ...release };
      } else {
        backlog.releases.unshift(release);
      }

      writeProjectBacklog(project, backlog);
      return sendJson(res, 201, { ok: true, release });
    }

    // DELETE /api/releases/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/releases/')) {
      const releaseId = decodeURIComponent(pathname.replace('/api/releases/', ''));
      const project = registry.projects.find(p => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });
      const backlog = readProjectBacklog(project);
      const initialCount = backlog.releases.length;
      backlog.releases = (backlog.releases || []).filter((r: any) => r.id !== releaseId && r.version !== releaseId);
      writeProjectBacklog(project, backlog);
      return sendJson(res, 200, { ok: true, deleted: initialCount > backlog.releases.length });
    }

    // POST /api/releases/sync-legacy
    if (req.method === 'POST' && pathname === '/api/releases/sync-legacy') {
      const body = await getBody(req, res);
      const project = registry.projects.find(p => p.id === body.projectId)
        || registry.projects.find(p => p.id === registry.activeProjectId)
        || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      if (project.repoPath) {
        const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, backlog.items);
        if (parsed.length > 0) {
          backlog.releases = parsed;
          const releasesPath = path.join(project.repoPath, project.backlogDir || 'backlog', 'releases.json');
          try {
            if (!fs.existsSync(path.dirname(releasesPath))) fs.mkdirSync(path.dirname(releasesPath), { recursive: true });
            atomicWriteFileSync(releasesPath, JSON.stringify(backlog.releases, null, 2), 'utf8');
          } catch (err: any) {
            console.warn(`[gripm API] Error saving synced releases:`, err.message);
          }
          broadcastSse('backlog_changed', { projectId: project.id, action: 'releases_synced', timestamp: Date.now() });
        }
      }

      return sendJson(res, 200, {
        ok: true,
        releases: backlog.releases,
        count: backlog.releases.length
      });
    }

    // GET /api/sprints
    if (req.method === 'GET' && (pathname === '/api/sprints' || pathname.startsWith('/api/sprints'))) {
      const projectId = searchParams.get('projectId') || registry.activeProjectId || registry.projects[0]?.id;
      const project = registry.projects.find(p => p.id === projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });
      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, { ok: true, sprints: backlog.sprints || [] });
    }

    // POST /api/sprints
    if (req.method === 'POST' && pathname === '/api/sprints') {
      const body = await getBody(req, res);
      const now = new Date().toISOString();
      const project = registry.projects.find(p => p.id === body.projectId)
        || registry.projects.find(p => p.id === registry.activeProjectId)
        || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];

      const requestedStatus = body.status === 'active' ? 'active' : (body.status === 'completed' ? 'completed' : 'planned');

      // Si se crea como activo, desmarcar cualquier otro sprint activo
      if (requestedStatus === 'active') {
        backlog.sprints = backlog.sprints.map((s: any) => s.status === 'active' ? { ...s, status: 'planned' } : s);
      }

      // DEV-192: Generar ID secuencial canónico sprint-<n>
      let sprintId = body.id ? String(body.id).trim() : '';
      while (sprintId.startsWith('sprint-sprint-')) {
        sprintId = sprintId.replace(/^sprint-/, '');
      }
      if (!sprintId || /^sprint-\d{10,}$/.test(sprintId)) {
        const nameMatch = (body.name || '').match(/sprint\s*(\d+)/i);
        if (nameMatch) {
          sprintId = `sprint-${nameMatch[1]}`;
        } else {
          let maxNum = -1;
          for (const s of backlog.sprints) {
            const m = (s.id || '').match(/^sprint-(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
          sprintId = `sprint-${maxNum >= 0 ? maxNum + 1 : backlog.sprints.length}`;
        }
      }

      const newSprint = {
        id: sprintId,
        projectId: project.id,
        name: (body.name || `Sprint ${backlog.sprints.length + 1}`).trim(),
        goal: body.goal || '',
        startDate: body.startDate || undefined,
        endDate: body.endDate || undefined,
        durationWeeks: body.durationWeeks || undefined,
        status: requestedStatus,
        createdAt: now
      };

      backlog.sprints.push(newSprint);
      writeProjectBacklog(project, backlog);
      broadcastSse('backlog_changed', { projectId: project.id, action: 'sprint_created', sprintId: newSprint.id, timestamp: Date.now() });

      return sendJson(res, 201, { ok: true, sprint: newSprint });
    }

    // PUT /api/sprints/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/sprints/')) {
      const sprintId = decodeURIComponent(pathname.replace('/api/sprints/', ''));
      const body = await getBody(req, res);
      const now = new Date().toISOString();
      const project = registry.projects.find(p => p.id === body.projectId)
        || registry.projects.find(p => p.id === registry.activeProjectId)
        || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];

      const sIdx = backlog.sprints.findIndex((s: any) => s.id === sprintId || s.name === sprintId);
      if (sIdx === -1) return sendJson(res, 404, { error: 'Sprint no encontrado' });

      const existingSprint = backlog.sprints[sIdx];
      const oldName = existingSprint.name;
      const newName = body.name ? body.name.trim() : oldName;
      const newStatus = body.status || existingSprint.status;

      // Si pasa a activo, asegurar que solo 1 sprint esté activo a la vez
      if (newStatus === 'active') {
        backlog.sprints = backlog.sprints.map((s: any) => s.id !== existingSprint.id && s.status === 'active' ? { ...s, status: 'planned' } : s);
      }

      const updatedSprint = {
        ...existingSprint,
        name: newName,
        goal: body.goal !== undefined ? body.goal : existingSprint.goal,
        startDate: body.startDate !== undefined ? body.startDate : existingSprint.startDate,
        endDate: body.endDate !== undefined ? body.endDate : existingSprint.endDate,
        durationWeeks: body.durationWeeks !== undefined ? body.durationWeeks : existingSprint.durationWeeks,
        status: newStatus,
        completedAt: newStatus === 'completed' ? (existingSprint.completedAt || now) : undefined
      };

      backlog.sprints[sIdx] = updatedSprint;

      // Si se cambió el nombre del sprint, actualizar referencias en las tareas
      if (oldName && newName && oldName !== newName) {
        backlog.items.forEach((it: any) => {
          if (it.sprint === oldName || it.targetSprint === oldName) {
            it.sprint = newName;
            it.targetSprint = newName;
            if (isBacklogMdProject(project)) {
              saveBacklogMdItem(project, it);
            }
          }
        });
      }

      // DEV-070: Guardar retro en backlog/retros/ si se incluyó en la llamada
      if (body.retro) {
        try {
          const retrosDir = path.join(project.repoPath || '', project.backlogDir || 'backlog', 'retros');
          if (!fs.existsSync(retrosDir)) {
            fs.mkdirSync(retrosDir, { recursive: true });
          }
          const todayStr = new Date().toISOString().split('T')[0];
          const sprintKey = String(updatedSprint.id || newName).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
          const retroFile = path.join(retrosDir, `${sprintKey}-retro.md`);
          const r = body.retro;
          const md = `# Retrospectiva — ${newName}

**Fecha:** ${todayStr}  
**Sprint:** ${newName}  
**Proyecto:** ${project.name}

---

## 🟢 Fortalezas (¿Qué funcionó bien y debe repetirse?)
${r.whatWentWell ? r.whatWentWell.trim() : 'No se registraron comentarios específicos.'}

## 🔴 Problemas (¿Qué falló, se rompió o tomó más tiempo del esperado?)
${r.whatWentWrong ? r.whatWentWrong.trim() : 'No se registraron incidentes críticos.'}

## 🟡 Eficiencia (¿Qué podría haberse hecho en menos pasos o con menos tokens?)
${r.whatToImprove ? r.whatToImprove.trim() : 'Flujo eficiente y directo.'}

## 📌 Acciones Concretas (Compromisos y Mejoras)
${Array.isArray(r.actions) && r.actions.length > 0 
  ? r.actions.map((act: string) => `- [ ] ${act}`).join('\n') 
  : '- [ ] Continuar aplicando las buenas prácticas establecidas.'}
`;
          atomicWriteFileSync(retroFile, md, 'utf8');
        } catch (e: any) {
          console.warn('[Retro Save Error]', e.message);
        }
      }

      writeProjectBacklog(project, backlog);
      broadcastSse('backlog_changed', { projectId: project.id, action: 'sprint_updated', sprintId: updatedSprint.id, timestamp: Date.now() });

      return sendJson(res, 200, { ok: true, sprint: updatedSprint });
    }

    // GET /api/retros (DEV-070)
    if (req.method === 'GET' && (pathname === '/api/retros' || pathname.startsWith('/api/retros'))) {
      const projectId = searchParams.get('projectId');
      const project = registry.projects.find(p => p.id === projectId)
        || registry.projects.find(p => p.id === registry.activeProjectId)
        || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });
      const retrosDir = path.join(project.repoPath || '', project.backlogDir || 'backlog', 'retros');
      if (!fs.existsSync(retrosDir)) return sendJson(res, 200, { retros: [] });
      const files = fs.readdirSync(retrosDir).filter(f => f.endsWith('.md'));
      const retros = files.map(f => {
        const full = path.join(retrosDir, f);
        const raw = fs.readFileSync(full, 'utf8');
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const dateMatch = raw.match(/\*\*Fecha:\*\*\s*([^\n]+)/);
        return {
          file: f,
          sprintId: f.replace(/-retro\.md$/, ''),
          title: titleMatch ? titleMatch[1].trim() : f,
          date: dateMatch ? dateMatch[1].trim() : '',
          content: raw
        };
      });
      return sendJson(res, 200, { retros });
    }

    // DELETE /api/sprints/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/sprints/')) {
      const sprintId = decodeURIComponent(pathname.replace('/api/sprints/', ''));
      const projectId = searchParams.get('projectId') || registry.activeProjectId || registry.projects[0]?.id;
      const project = registry.projects.find(p => p.id === projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: 'Project not found' });

      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];

      const sIdx = backlog.sprints.findIndex((s: any) => s.id === sprintId || s.name === sprintId);
      if (sIdx === -1) return sendJson(res, 404, { error: 'Sprint no encontrado' });

      const deletedSprint = backlog.sprints[sIdx];
      backlog.sprints.splice(sIdx, 1);

      // Reasignar tareas que pertenecían a este sprint hacia el Backlog
      backlog.items.forEach((it: any) => {
        if (it.sprint === deletedSprint.name || it.targetSprint === deletedSprint.name || it.sprint === deletedSprint.id) {
          it.sprint = undefined;
          it.targetSprint = undefined;
          if (it.milestone && it.milestone.toLowerCase().includes('sprint')) {
            it.milestone = undefined;
          }
          if (isBacklogMdProject(project)) {
            saveBacklogMdItem(project, it);
          }
        }
      });

      writeProjectBacklog(project, backlog);
      broadcastSse('backlog_changed', { projectId: project.id, action: 'sprint_deleted', sprintId, timestamp: Date.now() });

      return sendJson(res, 200, { ok: true, deleted: true });
    }

    // POST /api/import (DEV-012)
    if (req.method === 'POST' && pathname === '/api/import') {
      try {
        const body = await getBody(req, res).catch(() => ({}));
        const projectId = body.projectId || registry.activeProjectId || registry.projects[0]?.id;
        const targetProject = registry.projects.find(p => p.id === projectId) || registry.projects[0];
        if (!targetProject) {
          return sendJson(res, 404, { ok: false, error: 'Proyecto no encontrado' });
        }

        const docsDir = body.docsPath || getProjectDocsPath(targetProject);
        if (body.docsPath && !isAllowedBrowsePath(body.docsPath)) {
          return sendJson(res, 403, { ok: false, error: 'Forbidden: docsPath is outside allowed roots' });
        }
        if (!docsDir || !fs.existsSync(docsDir)) {
          return sendJson(res, 400, {
            ok: false,
            error: `El proyecto "${targetProject.name}" no tiene una carpeta de documentación vinculada (/docs) válida o existente.`
          });
        }

        if (isBacklogMdProject(targetProject)) {
          // Importación directa a tareas Markdown individuales
          const boardData: any = runMigration(docsDir, null, targetProject as any);
          let updatedCount = 0;
          for (const item of (boardData.items || [])) {
            item.projectId = targetProject.id;
            saveBacklogMdItem(targetProject, item);
            updatedCount++;
          }

          if (boardData.releases && boardData.releases.length > 0 && targetProject.repoPath) {
            const releasesPath = path.join(targetProject.repoPath, targetProject.backlogDir || 'backlog', 'releases.json');
            try {
              if (!fs.existsSync(path.dirname(releasesPath))) fs.mkdirSync(path.dirname(releasesPath), { recursive: true });
              atomicWriteFileSync(releasesPath, JSON.stringify(boardData.releases, null, 2), 'utf8');
            } catch (relErr: any) {
              console.warn('[gripm] Error saving releases during import:', relErr.message);
            }
          }

          return sendJson(res, 200, {
            ok: true,
            projectId: targetProject.id,
            projectName: targetProject.name,
            importedCount: updatedCount,
            releasesCount: boardData.releases?.length || 0,
            storageType: 'markdown'
          });
        } else {
          // Almacenamiento JSON
          const targetFile = (await import('../services/registry.ts')).getProjectBacklogPath(targetProject);
          const boardData: any = runMigration(docsDir, targetFile, targetProject as any);
          return sendJson(res, 200, {
            ok: true,
            projectId: targetProject.id,
            projectName: targetProject.name,
            importedCount: boardData.items?.length || 0,
            releasesCount: boardData.releases?.length || 0,
            storageType: 'json'
          });
        }
      } catch (importErr: any) {
        console.error('[gripm API] Error in /api/import:', importErr);
        return sendJson(res, 500, { ok: false, error: importErr.message });
      }
    }

    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (err: any) {
    if (err?.statusCode === 413) {
      return;
    }
    console.error('[gripm API Error]', err);
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
}
