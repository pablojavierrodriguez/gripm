/**
 * server/routes/projectsRoutes.ts
 *
 * REST API routes for Project management, File System browsing, and Importers.
 * Handles:
 *  - /api/projects and /api/projects/*
 *  - /api/fs/browse
 *  - /api/import and /api/import/legacy-md
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../types.ts';
import {
  saveRegistry,
  readProjectConfig,
  getProjectDocsPath,
  detectProjectStorage,
  isBacklogMdProject
} from '../services/registry.ts';
import {
  readProjectBacklog,
  writeProjectBacklog
} from '../services/storage.ts';
import { BacklogService } from '../services/backlogService.ts';
import { isAllowedBrowsePath, getSafeInitialBrowseDir } from '../services/fsExplorer.ts';
import { atomicWriteFileSync } from '../services/atomicWrite.ts';
import { broadcastSse } from '../sse/sseManager.ts';
import { getBody, sendJson } from '../middleware/security.ts';
import { runMigration } from '../../scripts/import-docs.js';
import { normalizePriority } from '../../scripts/backlogMdParser.ts';
import { parseLegacyMarkdown, type ParsedLegacyItem } from '../../src/utils/legacyParser.ts';

export function getVisibleProjects(projects: ProjectMeta[], activeProject?: ProjectMeta | null): ProjectMeta[] {
  return projects.filter(p => {
    if (p.isDemo || p.id === 'demo') return true;
    if (activeProject && (p.id === activeProject.id || (p.repoPath && activeProject.repoPath && path.resolve(p.repoPath) === path.resolve(activeProject.repoPath)))) {
      return true;
    }
    if (p.repoPath) {
      const cfg = readProjectConfig(p);
      if (cfg?.mode === 'single') return false;
    }
    return true;
  });
}

export async function handleProjectsRoutes(
  req: any,
  res: any,
  pathname: string,
  _url: string,
  searchParams: URLSearchParams,
  activeProject: ProjectMeta | undefined,
  registry: any,
  isSingleMode: boolean
): Promise<boolean> {
  // POST /api/import/legacy-md (DEV-018)
  if (req.method === 'POST' && pathname === '/api/import/legacy-md') {
    const body = await getBody(req, res);
    const projectId = body.projectId || registry.projects[0]?.id;
    const project = registry.projects.find((p: any) => p.id === projectId);
    if (!project) {
      sendJson(res, 404, { error: 'Proyecto no encontrado' });
      return true;
    }

    let itemsToImport: ParsedLegacyItem[] = [];
    if (Array.isArray(body.items) && body.items.length > 0) {
      itemsToImport = body.items.filter((it: any) => it.selected !== false);
    } else if (body.content) {
      itemsToImport = parseLegacyMarkdown(body.content, body.defaultMilestone);
    }

    if (itemsToImport.length === 0) {
      sendJson(res, 400, { error: 'No se encontraron tareas seleccionadas para importar' });
      return true;
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
        BacklogService.saveTask(project, newItem);
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

    sendJson(res, 200, {
      ok: true,
      importedCount: createdItems.length,
      items: createdItems
    });
    return true;
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
        sendJson(res, 400, { ok: false, error: 'Invalid backlogDir: must be a relative directory inside the repository' });
        return true;
      }
    }

    const normalizedRepoPath = body.repoPath ? path.normalize(body.repoPath.trim()) : undefined;
    if (normalizedRepoPath && !isAllowedBrowsePath(normalizedRepoPath)) {
      sendJson(res, 403, { error: 'Forbidden: repoPath is outside allowed roots' });
      return true;
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

    sendJson(res, 201, { ok: true, project: newProject });
    return true;
  }

  // POST /api/projects/restore-demo
  if (req.method === 'POST' && pathname === '/api/projects/restore-demo') {
    const hasDemo = registry.projects.some((p: any) => p.id === 'demo');
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
    const visible = isSingleMode ? (activeProject ? [activeProject] : []) : getVisibleProjects(registry.projects, activeProject);
    sendJson(res, 200, { ok: true, projects: visible, activeProjectId: 'demo' });
    return true;
  }

  // POST /api/projects/detect-path
  if (req.method === 'POST' && pathname === '/api/projects/detect-path') {
    const body = await getBody(req, res);
    const inputPath = body.repoPath ? path.normalize(body.repoPath.trim()) : '';
    if (!inputPath) {
      sendJson(res, 400, { error: 'repoPath required' });
      return true;
    }
    if (!isAllowedBrowsePath(inputPath)) {
      sendJson(res, 403, { error: 'Forbidden: repoPath is outside allowed roots' });
      return true;
    }
    const exists = fs.existsSync(inputPath);
    const isGit = exists && fs.existsSync(path.join(inputPath, '.git'));
    const detection = detectProjectStorage(inputPath);
    sendJson(res, 200, {
      ok: true,
      exists,
      isGit,
      normalizedPath: inputPath,
      ...detection
    });
    return true;
  }

  // DELETE /api/projects/:id (Unlink project from gripm)
  if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
    const id = decodeURIComponent(pathname.replace('/api/projects/', ''));
    const initialLen = registry.projects.length;
    registry.projects = registry.projects.filter((p: any) => p.id !== id);

    if (registry.projects.length === initialLen) {
      sendJson(res, 404, { error: 'Project not found in registry' });
      return true;
    }

    if (registry.activeProjectId === id) {
      registry.activeProjectId = registry.projects[0]?.id || '';
    }

    saveRegistry(registry);
    const visible = isSingleMode ? (activeProject ? [activeProject] : []) : getVisibleProjects(registry.projects, activeProject);
    sendJson(res, 200, { ok: true, id, remainingProjects: visible });
    return true;
  }

  // POST /api/projects/active
  if (req.method === 'POST' && pathname === '/api/projects/active') {
    const body = await getBody(req, res);
    const { projectId } = body || {};
    if (isSingleMode) {
      sendJson(res, 200, { ok: true, activeProjectId: activeProject?.id, singleProject: true });
      return true;
    }
    const visibleProjects = getVisibleProjects(registry.projects, activeProject);
    if (projectId && visibleProjects.some(p => p.id === projectId)) {
      registry.activeProjectId = projectId;
      saveRegistry(registry);
      sendJson(res, 200, { ok: true, activeProjectId: projectId });
      return true;
    }
    sendJson(res, 400, { error: 'Invalid or missing projectId' });
    return true;
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
        sendJson(res, 403, { error: 'Forbidden: Path is outside allowed roots' });
        return true;
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
        sendJson(res, 403, { error: 'Forbidden: Path is outside allowed roots' });
        return true;
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

      sendJson(res, 200, {
        ok: true,
        currentPath: targetDir,
        parentPath,
        folders,
        isGit: isCurrentGit,
        hasBacklog: hasCurrentBacklog,
        hasGripm: hasCurrentGripm,
        warning: dirWarning
      });
      return true;
    } catch (browseErr: any) {
      const safeDir = getSafeInitialBrowseDir();
      const parent = path.dirname(safeDir);
      const parentPath = (parent !== safeDir && isAllowedBrowsePath(parent)) ? parent : null;
      sendJson(res, 200, {
        ok: true,
        currentPath: safeDir,
        parentPath,
        folders: [],
        warning: `No se pudo acceder a la ruta solicitada (${browseErr.message}). Se cargó una ruta segura.`
      });
      return true;
    }
  }

  // POST /api/projects/:id/detect-storage
  if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/detect-storage$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/detect-storage$/)![1]);
    const p = registry.projects.find((proj: any) => proj.id === id);
    if (!p) {
      sendJson(res, 404, { error: 'Project not found' });
      return true;
    }
    const detection = detectProjectStorage(p.repoPath);
    sendJson(res, 200, { ok: true, ...detection });
    return true;
  }

  // POST /api/projects/:id/convert-to-md
  if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/convert-to-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-md$/)![1]);
    const project = registry.projects.find((proj: any) => proj.id === id);
    if (!project || !project.repoPath) {
      sendJson(res, 400, { error: 'Project not found or lacks repoPath' });
      return true;
    }

    const currentBacklog = readProjectBacklog(project);
    const tasksDir = path.join(project.repoPath, 'backlog/tasks');
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    let converted = 0;
    for (const item of currentBacklog.items) {
      BacklogService.saveTask({ ...project, storageType: 'markdown', backlogDir: 'backlog' }, item);
      converted++;
    }

    project.storageType = 'markdown';
    project.backlogDir = 'backlog';
    saveRegistry(registry);

    sendJson(res, 200, {
      ok: true,
      message: `Convertidos ${converted} items a Backlog.md en ${tasksDir}`,
      convertedCount: converted,
      tasksDir
    });
    return true;
  }

  // POST /api/projects/:id/convert-to-json
  if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/convert-to-json$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-json$/)![1]);
    const project = registry.projects.find((proj: any) => proj.id === id);
    if (!project || !project.repoPath) {
      sendJson(res, 400, { error: 'Project not found or lacks repoPath' });
      return true;
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

    sendJson(res, 200, {
      ok: true,
      message: `Unificadas ${currentBacklog.items.length} tareas en ${jsonPath}`,
      savedPath: jsonPath
    });
    return true;
  }

  // GET /api/projects/:id/export-json
  if (req.method === 'GET' && /^\/api\/projects\/[^/]+\/export-json$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-json$/)![1]);
    const project = registry.projects.find((proj: any) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found' });
      return true;
    }

    const backlog = readProjectBacklog(project);
    sendJson(res, 200, {
      ok: true,
      project,
      data: backlog
    });
    return true;
  }

  // GET /api/projects/:id/export-monolithic-md
  if (req.method === 'GET' && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)![1]);
    const project = registry.projects.find((proj: any) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found' });
      return true;
    }

    const result = BacklogService.exportBacklogMd(project, { save: false });
    sendJson(res, 200, {
      ok: true,
      content: result.content
    });
    return true;
  }

  // POST /api/projects/:id/export-monolithic-md
  if (req.method === 'POST' && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)![1]);
    const project = registry.projects.find((proj: any) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found' });
      return true;
    }
    if (!project.repoPath) {
      sendJson(res, 400, { error: 'Project lacks repoPath' });
      return true;
    }

    await getBody(req, res).catch(() => ({}));
    const result = BacklogService.exportBacklogMd(project, { save: true });

    sendJson(res, 200, {
      ok: true,
      content: result.content,
      savedPath: result.savedPath
    });
    return true;
  }

  // POST /api/import (DEV-012)
  if (req.method === 'POST' && pathname === '/api/import') {
    try {
      const body = await getBody(req, res).catch(() => ({}));
      const projectId = body.projectId || registry.activeProjectId || registry.projects[0]?.id;
      const targetProject = registry.projects.find((p: any) => p.id === projectId) || registry.projects[0];
      if (!targetProject) {
        sendJson(res, 404, { ok: false, error: 'Proyecto no encontrado' });
        return true;
      }

      const docsDir = body.docsPath || getProjectDocsPath(targetProject);
      if (body.docsPath && !isAllowedBrowsePath(body.docsPath)) {
        sendJson(res, 403, { ok: false, error: 'Forbidden: docsPath is outside allowed roots' });
        return true;
      }
      if (!docsDir || !fs.existsSync(docsDir)) {
        sendJson(res, 400, {
          ok: false,
          error: `El proyecto "${targetProject.name}" no tiene una carpeta de documentación vinculada (/docs) válida o existente.`
        });
        return true;
      }

      if (isBacklogMdProject(targetProject)) {
        const boardData: any = runMigration(docsDir, null, targetProject as any);
        let updatedCount = 0;
        for (const item of (boardData.items || [])) {
          item.projectId = targetProject.id;
          BacklogService.saveTask(targetProject, item);
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

        sendJson(res, 200, {
          ok: true,
          projectId: targetProject.id,
          projectName: targetProject.name,
          importedCount: updatedCount,
          releasesCount: boardData.releases?.length || 0,
          storageType: 'markdown'
        });
        return true;
      } else {
        const targetFile = (await import('../services/registry.ts')).getProjectBacklogPath(targetProject);
        const boardData: any = runMigration(docsDir, targetFile, targetProject as any);
        sendJson(res, 200, {
          ok: true,
          projectId: targetProject.id,
          projectName: targetProject.name,
          importedCount: boardData.items?.length || 0,
          releasesCount: boardData.releases?.length || 0,
          storageType: 'json'
        });
        return true;
      }
    } catch (importErr: any) {
      console.error('[gripm API] Error in /api/import:', importErr);
      sendJson(res, 500, { ok: false, error: importErr.message });
      return true;
    }
  }

  return false;
}
