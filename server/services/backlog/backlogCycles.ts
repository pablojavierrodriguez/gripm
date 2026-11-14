/**
 * server/services/backlog/backlogCycles.ts
 *
 * Path resolution, cycles management (sprints, releases, retrospectives),
 * and markdown release notes parsing.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMeta } from '../../types.ts';
import { PKG_ROOT } from '../registry.ts';
import { atomicWriteFileSync } from '../atomicWrite.ts';
import { withFileLockSync } from '../../utils/fs-lock.ts';

export const DEMO_FILE = fs.existsSync(path.resolve(PKG_ROOT, 'data/demo-backlog.json'))
  ? path.resolve(PKG_ROOT, 'data/demo-backlog.json')
  : path.resolve(PKG_ROOT, 'src/data/demo-backlog.json');

export function resolveJsonBacklogPath(project: ProjectMeta): string {
  if (project.isDemo) return DEMO_FILE;
  if (project.repoPath) {
    return path.join(project.repoPath, '.gripm/backlog.json');
  }
  return path.join(PKG_ROOT, `data/${project.id}-backlog.json`);
}

export function getProjectTasksDir(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'tasks');
}

export function getProjectSprintsPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'sprints.json');
}

export function getProjectReleasesPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'releases.json');
}

export function getProjectRetrospectivesPath(project: ProjectMeta): string {
  if (!project.repoPath) return '';
  return path.join(project.repoPath, project.backlogDir || 'backlog', 'retrospectives.json');
}

export function getProjectTaskAllocationLockPath(project: ProjectMeta): string {
  if (project.repoPath) {
    const baseDir = path.join(project.repoPath, project.backlogDir || 'backlog');
    return path.join(baseDir, '.task-allocation.lock');
  }
  return path.join(PKG_ROOT, `data/.${project.id}-task-allocation.lock`);
}

export function resolveLegibleSprint(project: ProjectMeta, val: string | undefined | null): string | undefined {
  if (!val) return undefined;
  const clean = String(val).trim();
  if (!clean) return undefined;
  const lower = clean.toLowerCase();
  if (lower === 'backlog-futuro' || lower === 'backlog' || lower === 'sin sprint' || lower === 'sin-sprint' || lower === 'none' || lower === 'null') {
    return undefined;
  }
  if (!project.repoPath) return clean;

  const sprintsPath = getProjectSprintsPath(project);
  if (fs.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
      if (Array.isArray(registeredSprints) && registeredSprints.length > 0) {
        const matched = registeredSprints.find((s: any) =>
          (s.id && s.id.toLowerCase() === lower) ||
          (s.name && s.name.trim().toLowerCase() === lower)
        );
        if (matched) {
          return matched.name || clean;
        }
      }
    } catch {}
  }

  if (lower.startsWith('sprint-') || lower.includes('backlog-futuro')) {
    return undefined;
  }
  return clean;
}

export function parseReleaseNotesMd(repoPath: string, projectPrefix?: string, knownItems: any[] = []): any[] {
  if (!repoPath) return [];
  const possiblePaths = [
    path.join(repoPath, 'docs/RELEASE_NOTES.md'),
    path.join(repoPath, 'docs/releasenotes.md'),
    path.join(repoPath, 'RELEASE_NOTES.md'),
    path.join(repoPath, 'releasenotes.md'),
    path.join(repoPath, 'docs/CHANGELOG.md'),
    path.join(repoPath, 'CHANGELOG.md'),
    path.join(repoPath, 'changelog.md')
  ];

  let notesContent = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        notesContent = fs.readFileSync(p, 'utf8');
        break;
      } catch {}
    }
  }

  if (!notesContent.trim()) return [];

  const knownCodeSet = new Set(knownItems.map(it => (it.code || it.id || '').toUpperCase()).filter(Boolean));
  const prefixUpper = (projectPrefix || '').toUpperCase().trim();

  const sections = notesContent.split(/(?=^##\s+)/m);
  const releases: any[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith('##')) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
    const bodyContent = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1) : '';

    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\] - - -]+)?)\]?/);
    if (!vMatch) continue;

    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, '');

    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : '';

    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, '').trim();
    if (date) {
      title = title.replace(date, '').trim();
    }
    title = title.replace(/^[-:\u2014\u2013🚀 ]+/, '').trim();
    if (!title) title = `Release ${version}`;

    let summary = '';
    const summaryMatch = bodyContent.match(/###\s*(?:🎯\s*)?Resumen\s*\n+([^\n#]+)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].replace(/^\*+|\*+$/g, '').trim();
    }

    const itemCodesSet = new Set<string>();
    const codeCandidates = trimmed.match(/\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\b/g) || [];
    for (const code of codeCandidates) {
      const upper = code.toUpperCase();
      if (knownCodeSet.has(upper)) {
        itemCodesSet.add(upper);
      } else if (prefixUpper && upper.startsWith(`${prefixUpper}-`)) {
        itemCodesSet.add(upper);
      }
    }

    for (const it of knownItems) {
      const m = (it.milestone || it.targetSprint || '').replace(/^v/i, '');
      if (m && m === version) {
        itemCodesSet.add(it.code || it.id);
      }
    }

    releases.push({
      id: `rel-${version.replace(/\./g, '-')}`,
      version,
      date,
      title,
      summary,
      status: 'released',
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed
    });
  }

  return releases;
}

export function readReleases(project: ProjectMeta): any[] {
  const filePath = getProjectReleasesPath(project);
  if (!filePath || !fs.existsSync(filePath)) return [];
  return withFileLockSync(filePath, () => {
    try {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

export function mutateReleases(project: ProjectMeta, mutator: (current: any[]) => any[] | void): any[] {
  const filePath = getProjectReleasesPath(project);
  if (!filePath) return [];
  return withFileLockSync(filePath, () => {
    let current: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) current = parsed;
      } catch {}
    }
    const result = mutator(current);
    const toWrite = Array.isArray(result) ? result : current;
    atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
    return toWrite;
  });
}

export function readRetrospectives(project: ProjectMeta): any[] {
  const filePath = getProjectRetrospectivesPath(project);
  if (!filePath || !fs.existsSync(filePath)) return [];
  return withFileLockSync(filePath, () => {
    try {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

export function mutateRetrospectives(project: ProjectMeta, mutator: (current: any[]) => any[] | void): any[] {
  const filePath = getProjectRetrospectivesPath(project);
  if (!filePath) return [];
  return withFileLockSync(filePath, () => {
    let current: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) current = parsed;
      } catch {}
    }
    const result = mutator(current);
    const toWrite = Array.isArray(result) ? result : current;
    atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), 'utf8');
    return toWrite;
  });
}
