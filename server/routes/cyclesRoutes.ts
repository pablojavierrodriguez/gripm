/**
 * server/routes/cyclesRoutes.ts
 *
 * REST API routes for agile cycles: Releases, Sprints, and Retrospectives.
 * Handles:
 *  - /api/releases and /api/releases/*
 *  - /api/sprints and /api/sprints/*
 *  - /api/retros
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  readProjectBacklog,
  writeProjectBacklog,
  parseReleaseNotesMd
} from '../services/storage.ts';
import { BacklogService } from '../services/backlogService.ts';
import { isBacklogMdProject } from '../services/registry.ts';
import { atomicWriteFileSync } from '../services/atomicWrite.ts';
import { broadcastSse } from '../sse/sseManager.ts';
import { getBody, sendJson } from '../middleware/security.ts';

export async function handleCyclesRoutes(
  req: any,
  res: any,
  pathname: string,
  searchParams: URLSearchParams,
  registry: any
): Promise<boolean> {
  // POST /api/releases
  if (req.method === 'POST' && pathname === '/api/releases') {
    const body = await getBody(req, res);
    const now = new Date().toISOString();

    const project = registry.projects.find((p: any) => p.id === body.projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }

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
            BacklogService.saveTask(project, updated);
          }
          return updated;
        }
      } else {
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
              BacklogService.saveTask(project, updated);
            }
            return updated;
          }
        } else if (prevRel === relVCLean) {
          const updated = {
            ...it,
            targetRelease: undefined,
            release: undefined,
            milestone: it.milestone && it.milestone.replace(/^v/i, '') === relVCLean ? undefined : it.milestone,
            updatedAt: now
          };
          if (isBacklogMdProject(project)) {
            BacklogService.saveTask(project, updated);
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
    sendJson(res, 201, { ok: true, release });
    return true;
  }

  // DELETE /api/releases/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/releases/')) {
    const releaseId = decodeURIComponent(pathname.replace('/api/releases/', ''));
    const project = registry.projects.find((p: any) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }
    const backlog = readProjectBacklog(project);
    const initialCount = backlog.releases.length;
    backlog.releases = (backlog.releases || []).filter((r: any) => r.id !== releaseId && r.version !== releaseId);
    writeProjectBacklog(project, backlog);
    sendJson(res, 200, { ok: true, deleted: initialCount > backlog.releases.length });
    return true;
  }

  // POST /api/releases/sync-legacy
  if (req.method === 'POST' && pathname === '/api/releases/sync-legacy') {
    const body = await getBody(req, res);
    const project = registry.projects.find((p: any) => p.id === body.projectId)
      || registry.projects.find((p: any) => p.id === registry.activeProjectId)
      || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }

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

    sendJson(res, 200, {
      ok: true,
      releases: backlog.releases,
      count: backlog.releases.length
    });
    return true;
  }

  // GET /api/sprints
  if (req.method === 'GET' && (pathname === '/api/sprints' || pathname.startsWith('/api/sprints'))) {
    const projectId = searchParams.get('projectId') || registry.activeProjectId || registry.projects[0]?.id;
    const project = registry.projects.find((p: any) => p.id === projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }
    const backlog = readProjectBacklog(project);
    sendJson(res, 200, { ok: true, sprints: backlog.sprints || [] });
    return true;
  }

  // POST /api/sprints
  if (req.method === 'POST' && pathname === '/api/sprints') {
    const body = await getBody(req, res);
    const now = new Date().toISOString();
    const project = registry.projects.find((p: any) => p.id === body.projectId)
      || registry.projects.find((p: any) => p.id === registry.activeProjectId)
      || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }

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

    sendJson(res, 201, { ok: true, sprint: newSprint });
    return true;
  }

  // PUT /api/sprints/:id
  if (req.method === 'PUT' && pathname.startsWith('/api/sprints/')) {
    const sprintId = decodeURIComponent(pathname.replace('/api/sprints/', ''));
    const body = await getBody(req, res);
    const now = new Date().toISOString();
    const project = registry.projects.find((p: any) => p.id === body.projectId)
      || registry.projects.find((p: any) => p.id === registry.activeProjectId)
      || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }

    const backlog = readProjectBacklog(project);
    backlog.sprints = backlog.sprints || [];

    const sIdx = backlog.sprints.findIndex((s: any) => s.id === sprintId || s.name === sprintId);
    if (sIdx === -1) {
      sendJson(res, 404, { error: 'Sprint no encontrado' });
      return true;
    }

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
            BacklogService.saveTask(project, it);
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
        const md = `# Retrospectiva - ${newName}

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

    sendJson(res, 200, { ok: true, sprint: updatedSprint });
    return true;
  }

  // GET /api/retros (DEV-070)
  if (req.method === 'GET' && (pathname === '/api/retros' || pathname.startsWith('/api/retros'))) {
    const projectId = searchParams.get('projectId');
    const project = registry.projects.find((p: any) => p.id === projectId)
      || registry.projects.find((p: any) => p.id === registry.activeProjectId)
      || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }
    const retrosDir = path.join(project.repoPath || '', project.backlogDir || 'backlog', 'retros');
    if (!fs.existsSync(retrosDir)) {
      sendJson(res, 200, { retros: [] });
      return true;
    }
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
    sendJson(res, 200, { retros });
    return true;
  }

  // DELETE /api/sprints/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/sprints/')) {
    const sprintId = decodeURIComponent(pathname.replace('/api/sprints/', ''));
    const projectId = searchParams.get('projectId') || registry.activeProjectId || registry.projects[0]?.id;
    const project = registry.projects.find((p: any) => p.id === projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: 'Project not found' });
      return true;
    }

    const backlog = readProjectBacklog(project);
    backlog.sprints = backlog.sprints || [];

    const sIdx = backlog.sprints.findIndex((s: any) => s.id === sprintId || s.name === sprintId);
    if (sIdx === -1) {
      sendJson(res, 404, { error: 'Sprint no encontrado' });
      return true;
    }

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
          BacklogService.saveTask(project, it);
        }
      }
    });

    writeProjectBacklog(project, backlog);
    broadcastSse('backlog_changed', { projectId: project.id, action: 'sprint_deleted', sprintId, timestamp: Date.now() });

    sendJson(res, 200, { ok: true, deleted: true });
    return true;
  }

  return false;
}
