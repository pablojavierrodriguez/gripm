/**
 * server/services/backlog/backlogSyncEngine.ts
 *
 * Backlog synchronization engine and monolithic BACKLOG.md export.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../../types.ts';
import {
  type BacklogMdTask,
  normalizeStatus,
  formatPriorityForMd,
  generateMonolithicBacklogMd
} from '../../../scripts/backlogMdParser.ts';
import { isBacklogMdProject } from '../registry.ts';
import { atomicWriteFileSync } from '../atomicWrite.ts';
import { getProjectTasksDir } from './backlogCycles.ts';

export interface SyncBacklogResult {
  ok: boolean;
  autoFix: boolean;
  fixedCount: number;
  errorsFound: number;
  errors: string[];
  warnings: string[];
  taskCount: number;
  backlogPath: string | null;
  changesWritten: boolean;
}

export function exportBacklogMd(
  project: ProjectMeta,
  tasks: any[],
  options?: { save?: boolean }
): { ok: boolean; content: string; savedPath?: string; taskCount: number } {
  const mdTasks: BacklogMdTask[] = tasks.map(t => ({
    id: t.code || t.id,
    title: t.title,
    status: normalizeStatus(t.status),
    type: t.type,
    priority: formatPriorityForMd(t.priority),
    milestone: t.milestone || t.targetSprint,
    description: t.description || '',
    acceptanceCriteria: t.acceptanceCriteriaList || t.acceptanceCriteria || []
  }));

  const content = generateMonolithicBacklogMd(project.name, mdTasks);
  let savedPath: string | undefined;

  if (options?.save !== false && project.repoPath) {
    savedPath = path.join(project.repoPath, 'BACKLOG.md');
    atomicWriteFileSync(savedPath, content, 'utf8');
  }

  return {
    ok: true,
    content,
    savedPath,
    taskCount: tasks.length
  };
}

export function syncBacklog(
  project: ProjectMeta,
  tasks: any[],
  options?: { autoFix?: boolean }
): SyncBacklogResult {
  let fixedCount = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  const autoFix = options?.autoFix === true;

  if (isBacklogMdProject(project) && project.repoPath) {
    const tasksDir = getProjectTasksDir(project);
    if (fs.existsSync(tasksDir)) {
      const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) continue;

        const fm = fmMatch[1];
        const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
        const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
        const rawStatus = (statusMatch ? statusMatch[1] : '').toLowerCase();
        const taskId = idMatch ? idMatch[1] : file.split('-')[0];

        const acBlockMatch = content.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
        if (!acBlockMatch) continue;

        const acBlock = acBlockMatch[1];
        const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
        const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];
        const totalAcs = allAcs.length;
        const totalChecked = checkedAcs.length;

        // DEV-293 & AC 4: All ACs complete on draft/doing -> NEVER auto-promote to ready!
        // Only QA role can move to ready. Emit a quality warning.
        if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === 'draft' || rawStatus === 'doing')) {
          warnings.push(
            `${taskId}: Todos los AC completados (${totalChecked}/${totalAcs}) pero status es '${rawStatus}' (aviso de calidad: requiere certificación de QA para pasar a ready)`
          );
        }

        // Rule 2 (SEC-02): Status is 'done' with pending ACs
        if (rawStatus === 'done' && totalAcs > 0 && totalChecked < totalAcs) {
          errors.push(`${taskId}: Status es 'done' pero solo tiene ${totalChecked}/${totalAcs} ACs marcados`);
        }
      }
    }
  }

  // Generate BACKLOG.md from active tasks (excluding isDeleted)
  const exportRes = exportBacklogMd(project, tasks, { save: false });
  const content = exportRes.content;
  let backlogPath: string | null = null;
  let changesWritten = false;

  if (project.repoPath) {
    backlogPath = path.join(project.repoPath, 'BACKLOG.md');
    let existingContent = '';
    if (fs.existsSync(backlogPath)) {
      try {
        existingContent = fs.readFileSync(backlogPath, 'utf8');
      } catch {}
    }

    const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
    const stripDate = (s: string) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, '');

    const isDifferent = stripDate(normalize(existingContent)) !== stripDate(normalize(content));

    // AC 4: Write BACKLOG.md ONLY when there are real changes OR autoFix is true
    if (isDifferent || autoFix) {
      atomicWriteFileSync(backlogPath, content, 'utf8');
      changesWritten = true;
    }
  }

  return {
    ok: errors.length === 0,
    autoFix,
    fixedCount,
    errorsFound: errors.length,
    errors,
    warnings,
    taskCount: exportRes.taskCount,
    backlogPath,
    changesWritten
  };
}
