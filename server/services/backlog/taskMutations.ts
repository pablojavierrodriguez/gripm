/**
 * server/services/backlog/taskMutations.ts
 *
 * Task mutations: creation, atomic update with Gatekeeper validations,
 * bulk updates, soft-deletion, and restoration.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../../types.ts';
import {
  serializeBacklogMd,
  normalizeStatus,
  normalizePriority,
  generateTaskFilename,
  type BacklogMdTask
} from '../../../scripts/backlogMdParser.ts';
import { isBacklogMdProject } from '../registry.ts';
import { atomicWriteFileSync } from '../atomicWrite.ts';
import { withFileLockSync } from '../../utils/fs-lock.ts';
import { invalidateTaskCache } from '../taskCache.ts';
import {
  findTaskFile,
  mapMarkdownTaskToCanonical
} from './backlogStorageEngine.ts';
import {
  validateGatekeeperTransition,
  type TaskMutationOptions,
  type GatekeeperAudit
} from './gatekeeperSecurity.ts';
import {
  getProjectTasksDir,
  getProjectTaskAllocationLockPath,
  resolveJsonBacklogPath,
  resolveLegibleSprint
} from './backlogCycles.ts';
import {
  ConflictError,
  normalizeTaskUpdates
} from './taskNormalizer.ts';

export function createTask(
  project: ProjectMeta,
  data: any,
  listTasksFn: (project: ProjectMeta, options?: any) => any[],
  computeNextTaskIdFn: (project: ProjectMeta) => string
): { ok: boolean; task: any; savedFile?: string } {
  const lockPath = getProjectTaskAllocationLockPath(project);
  return withFileLockSync(lockPath, () => {
    const allTasks = listTasksFn(project, { includeDeleted: true });
    const code = (typeof data.code === 'string' && data.code.trim())
      ? data.code.trim()
      : computeNextTaskIdFn(project);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    let acList: Array<{ index: number; text: string; checked: boolean }> = [];
    if (Array.isArray(data.acceptanceCriteria)) {
      acList = data.acceptanceCriteria.map((item: any, i: number) => {
        if (typeof item === 'string') {
          return { index: i + 1, text: item, checked: false };
        }
        return { index: item.index || i + 1, text: item.text || '', checked: Boolean(item.checked) };
      });
    } else if (Array.isArray(data.acceptanceCriteriaList)) {
      acList = data.acceptanceCriteriaList.map((item: any, i: number) => ({
        index: item.index || i + 1,
        text: item.text || '',
        checked: Boolean(item.checked)
      }));
    }

    let initialEstimate: string | number | undefined;
    if (data.estimate !== undefined && data.estimate !== null && data.estimate !== '') {
      const num = Number(data.estimate);
      initialEstimate = (!isNaN(num) && typeof data.estimate !== 'boolean' && !String(data.estimate).includes(' ')) ? num : data.estimate;
    }

    const rawSprint = data.sprint || data.targetSprint;
    const legSprint = rawSprint ? resolveLegibleSprint(project, rawSprint) : undefined;

    const rawRel = (
      data.release || data.targetRelease || data.milestone ||
      (Array.isArray(data.releases) && data.releases.length > 0 ? data.releases[0] : '') ||
      ''
    ).trim();
    const relArr = Array.isArray(data.releases)
      ? data.releases.filter(Boolean).filter((r: string) => !r.toLowerCase().includes('sprint'))
      : (rawRel ? [rawRel] : []);

    const normalizedSt = normalizeStatus(data.status || 'draft');
    const taskData: BacklogMdTask = {
      id: code,
      title: data.title || 'Sin título',
      status: normalizedSt,
      priority: normalizePriority(data.priority || 'medium'),
      type: data.type || 'feature',
      createdDate: today,
      updatedDate: today,
      startDate: data.startDate || data.start_date || undefined,
      dueDate: data.dueDate || data.due_date || data.targetDate || data.target_date || undefined,
      milestone: rawRel || undefined,
      sprint: legSprint || undefined,
      targetSprint: legSprint || undefined,
      sprints: legSprint ? [legSprint] : (Array.isArray(data.sprints) ? data.sprints : []),
      releases: relArr,
      estimate: initialEstimate,
      description: data.description || '',
      acceptanceCriteria: acList,
      implementationPlan: data.implementationPlan || '',
      implementationNotes: data.implementationNotes || data.notes || data.fix,
      assignees: Array.isArray(data.assignees) ? data.assignees : [],
      labels: Array.isArray(data.labels) ? data.labels : [],
      dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
      parentId: data.parentId || undefined,
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
      blockedReason: data.blockedReason || undefined,
      dismissedReason: data.dismissedReason || undefined,
      relatedTo: Array.isArray(data.relatedTo) ? data.relatedTo : [],
      module: data.module || undefined,
      impactedFile: data.impactedFile || undefined,
      risk: data.risk || undefined,
      epic: data.epic || undefined,
      category: data.category || undefined,
      fix: data.fix || undefined
    };

    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
      const filename = generateTaskFilename(code, taskData.title);
      const filepath = path.join(tasksDir, filename);

      const serialized = serializeBacklogMd(taskData);
      atomicWriteFileSync(filepath, serialized, 'utf8');
      invalidateTaskCache(filepath);

      const fileStat = fs.existsSync(filepath) ? fs.statSync(filepath) : undefined;
      const canonical = mapMarkdownTaskToCanonical(taskData, project, filename, fileStat);
      return { ok: true, task: canonical, savedFile: filepath };
    }

    // JSON fallback
    const jsonPath = resolveJsonBacklogPath(project);
    const newItem = {
      ...taskData,
      code,
      projectId: project.id,
      acceptanceCriteriaList: acList,
      order: typeof data.order === 'number' ? data.order : allTasks.length + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: normalizedSt === 'done' ? now : undefined
    };

    let existingData: any = { project: { ...project, storageType: 'json' }, items: [], releases: [], sprints: [] };
    if (fs.existsSync(jsonPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch {}
    }
    if (!Array.isArray(existingData.items)) existingData.items = [];
    existingData.items.push(newItem);
    existingData.lastUpdated = now;

    atomicWriteFileSync(jsonPath, JSON.stringify(existingData, null, 2), 'utf8');
    const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
    (newItem as any).mtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    return { ok: true, task: newItem, savedFile: jsonPath };
  });
}

export function updateTask(
  project: ProjectMeta,
  taskId: string,
  updates: any,
  options?: TaskMutationOptions
): { ok: boolean; updatedTask: any; filePath?: string; warning?: string; audit?: GatekeeperAudit } {
  if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
    throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const norm = normalizeTaskUpdates(project, updates);

  if (isBacklogMdProject(project) && project.repoPath) {
    const fileInfo = findTaskFile(project, taskId);
    if (!fileInfo) {
      throw new Error(`Task ${taskId} not found to update.`);
    }

    const { filePath, filename, task: current } = fileInfo;
    const fileStat = fs.existsSync(filePath) ? fs.statSync(filePath) : undefined;
    const currentMtime = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();

    // DEV-017 & DEV-301: Optimistic Concurrency Check (expectedMtime / ETag)
    if (!options?.force && typeof options?.expectedMtime === 'number') {
      if (currentMtime > options.expectedMtime) {
        const canonicalCurrent = mapMarkdownTaskToCanonical(current, project, filename, fileStat);
        throw new ConflictError(
          `Task "${current.id}" was modified on disk by another process or agent.`,
          currentMtime,
          canonicalCurrent
        );
      }
    }

    // Apply normalized updates
    if (norm.status) current.status = norm.status as any;
    if (norm.title !== undefined) current.title = norm.title;
    if (norm.description !== undefined) current.description = norm.description;
    if (norm.priority) current.priority = norm.priority;
    if (norm.type) current.type = norm.type;
    if (norm.implementationPlan !== undefined) current.implementationPlan = norm.implementationPlan;
    if (norm.implementationNotes !== undefined) {
      current.implementationNotes = norm.implementationNotes;
      if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
      current.rawExtraFrontmatter.fix = norm.implementationNotes;
    }
    if (norm.milestone !== undefined) current.milestone = norm.milestone;
    if (norm.labels !== undefined) current.labels = norm.labels;
    if (norm.assignees !== undefined) current.assignees = norm.assignees;
    if (norm.parentId !== undefined) current.parentId = norm.parentId || undefined;
    if (norm.blocks !== undefined) current.blocks = norm.blocks;
    if (norm.blockedBy !== undefined) current.blockedBy = norm.blockedBy;
    if (norm.blockedReason !== undefined) current.blockedReason = norm.blockedReason || undefined;
    if (norm.dismissedReason !== undefined) current.dismissedReason = norm.dismissedReason || undefined;
    if (norm.relatedTo !== undefined) current.relatedTo = norm.relatedTo;
    if (norm.dependencies !== undefined) current.dependencies = norm.dependencies;
    if (norm.module !== undefined) current.module = norm.module || undefined;
    if (norm.epic !== undefined) current.epic = norm.epic || undefined;
    if (norm.category !== undefined) current.category = norm.category || undefined;
    if (norm.impactedFile !== undefined) current.impactedFile = norm.impactedFile || undefined;
    if (norm.risk !== undefined) current.risk = norm.risk || undefined;

    if (norm.clearSprint) {
      current.sprint = undefined;
      current.targetSprint = undefined;
      current.sprints = [];
      if (current.rawExtraFrontmatter) {
        delete current.rawExtraFrontmatter.sprint;
        delete current.rawExtraFrontmatter.targetSprint;
      }
    } else if (norm.sprint !== undefined) {
      current.sprint = norm.sprint;
      current.targetSprint = norm.sprint;
      current.sprints = norm.sprints || [norm.sprint];
      if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
      current.rawExtraFrontmatter.sprint = norm.sprint;
      current.rawExtraFrontmatter.targetSprint = norm.sprint;
    } else if (norm.sprints !== undefined) {
      current.sprints = norm.sprints;
    }

    if (norm.estimate !== undefined) {
      if (norm.estimate === null) {
        current.estimate = undefined;
        if (current.rawExtraFrontmatter) delete current.rawExtraFrontmatter.estimate;
      } else {
        current.estimate = norm.estimate;
        if (current.rawExtraFrontmatter) current.rawExtraFrontmatter.estimate = String(norm.estimate);
      }
    }

    current.updatedDate = today;

    // Handle ACs
    if (norm.checkAllAcs !== undefined && current.acceptanceCriteria) {
      current.acceptanceCriteria = current.acceptanceCriteria.map((ac: any) => ({
        ...ac,
        checked: Boolean(norm.checkAllAcs)
      }));
    } else if (norm.toggleAcIndex !== undefined) {
      if (typeof norm.toggleAcIndex !== 'number' || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
        throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
      }
      const acList = current.acceptanceCriteria || [];
      const foundAc = acList.find((ac: any) => ac.index === norm.toggleAcIndex);
      if (!foundAc) {
        throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id}'.`);
      }
      current.acceptanceCriteria = acList.map((ac: any) =>
        ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
      );
    }

    // Gatekeeper validation (DEV-224 / DEV-244 / SEC-01)
    const targetStatus = norm.status || current.status;
    const gateResult = validateGatekeeperTransition(current, targetStatus, options, project.repoPath);

    // SEC-01: Eradicate persistence of verifyCommand in Markdown frontmatter
    if (current.rawExtraFrontmatter) {
      delete current.rawExtraFrontmatter.verifyCommand;
      delete current.rawExtraFrontmatter.verify_command;
      delete current.rawExtraFrontmatter.verifyCmd;
    }

    const serialized = serializeBacklogMd(current);
    atomicWriteFileSync(filePath, serialized, 'utf8');
    invalidateTaskCache(filePath);

    const freshStat = fs.existsSync(filePath) ? fs.statSync(filePath) : undefined;
    const canonical = mapMarkdownTaskToCanonical(current, project, filename, freshStat);
    const resp: any = { ok: true, updatedTask: canonical, filePath };

    if (norm.usedUpdatesObject) {
      resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
    }
    if (options?.force) {
      let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id}', bypassing Gatekeeper validations.`;
      if (gateResult && typeof gateResult === 'object' && gateResult.locViolations && gateResult.locViolations.length > 0) {
        forceWarning += ` Bypassed LOC ceiling guardrail: ${gateResult.locViolations.map((v: any) => `${v.file} (${v.lines} lines)`).join(', ')}.`;
      }
      resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: now
      };
    }
    return resp;
  }

  // JSON Storage
  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON backlog file not found at ${jsonPath}.`);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const cleanId = String(taskId).toLowerCase();
  const idx = (data.items || []).findIndex((i: any) =>
    (i.id && String(i.id).toLowerCase() === cleanId) ||
    (i.code && String(i.code).toLowerCase() === cleanId)
  );

  if (idx < 0) {
    throw new Error(`Task ${taskId} not found to update.`);
  }

  const current = data.items[idx];
  const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
  const currentMtime = typeof current.mtime === 'number'
    ? current.mtime
    : (jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now());

  // DEV-017 & DEV-301: Optimistic Concurrency Check (expectedMtime / ETag)
  if (!options?.force && typeof options?.expectedMtime === 'number') {
    if (currentMtime > options.expectedMtime) {
      throw new ConflictError(
        `Task "${current.code || current.id}" was modified on disk by another process or agent.`,
        currentMtime,
        current
      );
    }
  }

  const wasDone = current.status === 'done';
  if (norm.status) current.status = norm.status;
  const isNowDone = current.status === 'done';

  if (norm.title !== undefined) current.title = norm.title;
  if (norm.description !== undefined) current.description = norm.description;
  if (norm.priority) current.priority = norm.priority;
  if (norm.type) current.type = norm.type;
  if (norm.implementationPlan !== undefined) current.implementationPlan = norm.implementationPlan;
  if (norm.implementationNotes !== undefined) {
    current.implementationNotes = norm.implementationNotes;
    current.fix = norm.implementationNotes;
  }
  if (norm.milestone !== undefined) {
    current.milestone = norm.milestone;
    current.release = norm.release;
    current.targetRelease = norm.targetRelease;
    current.releases = norm.releases;
  }
  if (norm.labels !== undefined) current.labels = norm.labels;
  if (norm.assignees !== undefined) current.assignees = norm.assignees;
  if (norm.parentId !== undefined) current.parentId = norm.parentId || undefined;
  if (norm.blocks !== undefined) current.blocks = norm.blocks;
  if (norm.blockedBy !== undefined) current.blockedBy = norm.blockedBy;
  if (norm.blockedReason !== undefined) current.blockedReason = norm.blockedReason || undefined;
  if (norm.dismissedReason !== undefined) current.dismissedReason = norm.dismissedReason || undefined;
  if (norm.relatedTo !== undefined) current.relatedTo = norm.relatedTo;
  if (norm.dependencies !== undefined) current.dependencies = norm.dependencies;
  if (norm.module !== undefined) current.module = norm.module || undefined;
  if (norm.epic !== undefined) current.epic = norm.epic || undefined;
  if (norm.category !== undefined) current.category = norm.category || undefined;
  if (norm.impactedFile !== undefined) current.impactedFile = norm.impactedFile || undefined;
  if (norm.risk !== undefined) current.risk = norm.risk || undefined;

  if (norm.clearSprint) {
    current.sprint = undefined;
    current.targetSprint = undefined;
    current.sprints = [];
  } else if (norm.sprint !== undefined) {
    current.sprint = norm.sprint;
    current.targetSprint = norm.sprint;
    current.sprints = norm.sprints || [norm.sprint];
  } else if (norm.sprints !== undefined) {
    current.sprints = norm.sprints;
  }

  if (norm.estimate !== undefined) {
    current.estimate = norm.estimate === null ? undefined : norm.estimate;
  }

  current.updatedAt = now;
  if (isNowDone && !wasDone) {
    current.completedAt = now;
  } else if (!isNowDone) {
    current.completedAt = undefined;
  }

  if (norm.checkAllAcs !== undefined && current.acceptanceCriteriaList) {
    current.acceptanceCriteriaList = current.acceptanceCriteriaList.map((ac: any) => ({
      ...ac,
      checked: Boolean(norm.checkAllAcs)
    }));
  } else if (norm.toggleAcIndex !== undefined) {
    if (typeof norm.toggleAcIndex !== 'number' || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
      throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
    }
    const acList = current.acceptanceCriteriaList || [];
    const foundAc = acList.find((ac: any) => ac.index === norm.toggleAcIndex);
    if (!foundAc) {
      throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id || current.code}'.`);
    }
    current.acceptanceCriteriaList = acList.map((ac: any) =>
      ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
    );
  }

  // Gatekeeper validation
  const targetStatus = norm.status || current.status;
  const gateResult = validateGatekeeperTransition(current, targetStatus, options, project.repoPath);

  // SEC-01: Eradicate persistence of verifyCommand
  delete current.verifyCommand;

  data.items[idx] = current;
  data.lastUpdated = now;
  atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

  const freshJsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : undefined;
  current.mtime = freshJsonStat ? Math.round(freshJsonStat.mtimeMs) : Date.now();

  const resp: any = { ok: true, updatedTask: current, filePath: jsonPath };
  if (norm.usedUpdatesObject) {
    resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
  }
  if (options?.force) {
    let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id || current.code}', bypassing Gatekeeper validations.`;
    if (gateResult && typeof gateResult === 'object' && gateResult.locViolations && gateResult.locViolations.length > 0) {
      forceWarning += ` Bypassed LOC ceiling guardrail: ${gateResult.locViolations.map((v: any) => `${v.file} (${v.lines} lines)`).join(', ')}.`;
    }
    resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
    resp.audit = {
      bypassedGatekeeper: true,
      timestamp: now
    };
  }
  return resp;
}

export function bulkUpdateTasks(
  project: ProjectMeta,
  targetFilter: { taskIds?: string[]; filterPrefix?: string; filterStatus?: string; items?: any[] },
  updates: any,
  options?: TaskMutationOptions,
  listTasksFn?: (project: ProjectMeta, options?: any) => any[]
): {
  ok: boolean;
  projectId: string;
  storageType: string;
  updatedCount: number;
  updatedIds: string[];
  failedUpdates?: any[];
  error?: string;
  warning?: string;
  audit?: GatekeeperAudit;
} {
  if (Array.isArray(targetFilter.items)) {
    const updatedIds: string[] = [];
    const failedUpdates: any[] = [];
    let updatedCount = 0;

    for (const patch of targetFilter.items) {
      if (!patch || (!patch.id && !patch.code)) continue;
      const targetId = patch.code || patch.id;
      try {
        const res = updateTask(project, targetId, patch, options);
        if (res.ok) {
          updatedCount++;
          updatedIds.push(targetId);
        }
      } catch (err: any) {
        failedUpdates.push({ id: targetId, error: err.message });
      }
    }

    const resp: any = {
      ok: failedUpdates.length === 0,
      projectId: project.id,
      storageType: project.storageType || 'markdown',
      updatedCount,
      updatedIds,
      ...(failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {})
    };

    if (options?.force) {
      resp.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: new Date().toISOString()
      };
    }

    return resp;
  }

  const cleanIds = Array.isArray(targetFilter.taskIds)
    ? new Set(targetFilter.taskIds.map(id => String(id).toLowerCase()))
    : null;
  const pfxFilter = targetFilter.filterPrefix ? String(targetFilter.filterPrefix).toLowerCase() : null;
  const statusFilter = targetFilter.filterStatus ? normalizeStatus(targetFilter.filterStatus) : null;

  // Load active tasks (excluding isDeleted by default)
  const allTasks = listTasksFn ? listTasksFn(project, { includeDeleted: false }) : [];
  const matchedTasks = allTasks.filter(t => {
    const taskId = String(t.id || t.code || '').toLowerCase();
    if (cleanIds && !cleanIds.has(taskId)) return false;
    if (pfxFilter && !taskId.startsWith(pfxFilter)) return false;
    if (statusFilter && normalizeStatus(t.status) !== statusFilter) return false;
    return true;
  });

  if (matchedTasks.length === 0) {
    return {
      ok: true,
      projectId: project.id,
      storageType: project.storageType || 'markdown',
      updatedCount: 0,
      updatedIds: []
    };
  }

  // Gatekeeper pre-validation on ALL matched tasks (AC 3)
  const norm = normalizeTaskUpdates(project, updates);
  let bulkLocViolations: Array<{ file: string; lines: number }> = [];
  if (norm.status) {
    for (const t of matchedTasks) {
      const gRes = validateGatekeeperTransition(t, norm.status, options, project.repoPath);
      if (gRes && typeof gRes === 'object' && gRes.locViolations && gRes.locViolations.length > 0) {
        bulkLocViolations = gRes.locViolations;
      }
    }
  }

  const updatedIds: string[] = [];
  const failedUpdates: any[] = [];
  let updatedCount = 0;

  for (const t of matchedTasks) {
    try {
      const res = updateTask(project, t.id || t.code, updates, options);
      if (res.ok) {
        updatedCount++;
        updatedIds.push(t.code || t.id);
      }
    } catch (err: any) {
      failedUpdates.push({ id: t.id || t.code, error: err.message });
    }
  }

  const resp: any = {
    ok: failedUpdates.length === 0,
    projectId: project.id,
    storageType: project.storageType || 'markdown',
    updatedCount,
    updatedIds,
    ...(failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {})
  };

  if (options?.force) {
    let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
    if (bulkLocViolations.length > 0) {
      forceWarning += ` Bypassed LOC ceiling guardrail: ${bulkLocViolations.map((v: any) => `${v.file} (${v.lines} lines)`).join(', ')}.`;
    }
    resp.warning = forceWarning;
    resp.audit = {
      bypassedGatekeeper: true,
      timestamp: new Date().toISOString()
    };
  }

  return resp;
}

export function deleteTask(
  project: ProjectMeta,
  taskId: string,
  options?: { purge?: boolean }
): { ok: boolean; id: string; softDeleted?: boolean; purged?: boolean } {
  const isPurge = options?.purge === true;

  if (isBacklogMdProject(project) && project.repoPath) {
    const fileInfo = findTaskFile(project, taskId);
    if (!fileInfo) return { ok: false, id: taskId };

    const { filePath, filename, task } = fileInfo;
    const currentStatus = (task.status || '').toLowerCase();

    if (!isPurge && currentStatus === 'done') {
      throw new Error('Cannot soft-delete a done item. Done items are protected historical records.');
    }

    if (isPurge) {
      const archiveDir = path.join(project.repoPath, project.backlogDir || 'backlog', 'archive');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(filePath, path.join(archiveDir, filename));
      invalidateTaskCache(filePath);
      return { ok: true, id: taskId, purged: true };
    }

    // Soft delete
    const previousStatus = task.status || 'draft';
    const raw = fs.readFileSync(filePath, 'utf8');
    let updated = raw;

    updated = updated.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
    updated = updated.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
    updated = updated.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');

    const nowIso = new Date().toISOString();
    if (/^status:.*$/m.test(updated)) {
      updated = updated.replace(/^(status:.*$)/m, `$1\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"`);
    } else {
      updated = updated.replace(/^---\r?\n/, `---\nisDeleted: true\ndeletedAt: "${nowIso}"\npreviousStatus: "${previousStatus}"\n`);
    }

    atomicWriteFileSync(filePath, updated, 'utf8');
    invalidateTaskCache(filePath);
    return { ok: true, id: taskId, softDeleted: true };
  }

  // JSON storage
  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs.existsSync(jsonPath)) return { ok: false, id: taskId };

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const cleanId = taskId.toLowerCase();
  const idx = (data.items || []).findIndex((i: any) =>
    (i.id && String(i.id).toLowerCase() === cleanId) ||
    (i.code && String(i.code).toLowerCase() === cleanId)
  );

  if (idx < 0) return { ok: false, id: taskId };

  const item = data.items[idx];
  if (!isPurge && item.status === 'done') {
    throw new Error('Cannot soft-delete a done item.');
  }

  if (isPurge) {
    data.items.splice(idx, 1);
  } else {
    item.previousStatus = item.status;
    item.isDeleted = true;
    item.deletedAt = new Date().toISOString();
    data.items[idx] = item;
  }

  data.lastUpdated = new Date().toISOString();
  atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, id: taskId, softDeleted: !isPurge, purged: isPurge };
}

export function restoreTask(project: ProjectMeta, taskId: string): boolean {
  if (isBacklogMdProject(project) && project.repoPath) {
    const fileInfo = findTaskFile(project, taskId);
    if (!fileInfo) return false;

    const { filePath } = fileInfo;
    let raw = fs.readFileSync(filePath, 'utf8');
    const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
    const restoreStatus = prevMatch ? prevMatch[1].trim() : 'draft';

    if (/^status:.*$/m.test(raw)) {
      raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus}`);
    }
    raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, '');
    raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, '');
    raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, '');

    atomicWriteFileSync(filePath, raw, 'utf8');
    invalidateTaskCache(filePath);
    return true;
  }

  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs.existsSync(jsonPath)) return false;

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const cleanId = taskId.toLowerCase();
  const item = (data.items || []).find((i: any) =>
    (i.id && String(i.id).toLowerCase() === cleanId) ||
    (i.code && String(i.code).toLowerCase() === cleanId)
  );

  if (!item) return false;

  const restoreStatus = item.previousStatus || 'draft';
  item.status = restoreStatus;
  delete item.isDeleted;
  delete item.deletedAt;
  delete item.previousStatus;

  data.lastUpdated = new Date().toISOString();
  atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}
