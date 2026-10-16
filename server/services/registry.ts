import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectMeta } from '../types.ts';
import { loadRegistryFile, saveRegistryFile, resolveProjectIdentity } from '../../scripts/registryConfig.js';
import { atomicWriteFileSync } from './atomicWrite.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PKG_ROOT = path.resolve(__dirname, '../../');

export const DEMO_FILE = path.resolve(PKG_ROOT, 'src/data/demo-backlog.json');

export function detectProjectStorage(repoPath?: string): { storageType: 'json' | 'markdown'; backlogDir: string } {
  if (!repoPath) return { storageType: 'json', backlogDir: 'backlog' };
  const normalized = path.normalize(repoPath.trim());
  try {
    if (fs.existsSync(path.join(normalized, 'backlog', 'tasks'))) {
      return { storageType: 'markdown', backlogDir: 'backlog' };
    }
    if (fs.existsSync(path.join(normalized, '.backlog', 'tasks'))) {
      return { storageType: 'markdown', backlogDir: '.backlog' };
    }
    if (fs.existsSync(path.join(normalized, 'backlog'))) {
      return { storageType: 'markdown', backlogDir: 'backlog' };
    }
    if (fs.existsSync(path.join(normalized, '.backlog'))) {
      return { storageType: 'markdown', backlogDir: '.backlog' };
    }
  } catch {}
  return { storageType: 'json', backlogDir: 'backlog' };
}

export function isBacklogMdProject(project: ProjectMeta): boolean {
  if (project.isDemo) return false;
  if (project.storageType === 'markdown') return true;
  if (project.storageType === 'json') return false;
  if (project.repoPath) {
    return detectProjectStorage(project.repoPath).storageType === 'markdown';
  }
  return false;
}

export function getBacklogTasksDir(project: ProjectMeta): string {
  const dir = project.backlogDir || 'backlog';
  return path.join(project.repoPath || '', dir, 'tasks');
}

export function getProjectDocsPath(project: ProjectMeta): string | null {
  if (project.docsPath && fs.existsSync(project.docsPath)) {
    return project.docsPath;
  }
  if (project.repoPath) {
    const defaultDocs = path.join(project.repoPath, 'docs');
    if (fs.existsSync(defaultDocs)) {
      try {
        const files = fs.readdirSync(defaultDocs);
        const hasDocFiles = files.some(f =>
          ['quality_log.md', 'backlog.md', 'release_notes.md'].includes(f.toLowerCase()) ||
          f.toLowerCase() === 'specs'
        );
        if (hasDocFiles) return defaultDocs;
      } catch {}
    }
  }
  return null;
}

export function getRegistry(): { activeProjectId: string; projects: ProjectMeta[] } {
  let reg = loadRegistryFile(PKG_ROOT);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: '', projects: [] };
  }

  // DEV-040: Auto-discover local repo if running inside a repo with .gripm/ or backlog/
  const cwd = process.cwd();
  const hasLocalGripm = fs.existsSync(path.join(cwd, '.gripm')) || fs.existsSync(path.join(cwd, 'backlog'));
  if (hasLocalGripm) {
    const cwdResolved = path.resolve(cwd);
    const existingLocal = reg.projects.find((p: ProjectMeta) => p.repoPath && path.resolve(p.repoPath) === cwdResolved);
    if (!existingLocal) {
      const detected = detectProjectStorage(cwdResolved);
      const identity = resolveProjectIdentity(cwdResolved);
      const localProject: ProjectMeta = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: cwdResolved,
        storageType: detected.storageType,
        backlogDir: detected.backlogDir || 'backlog',
        createdAt: new Date().toISOString()
      };
      reg.projects.unshift(localProject);
      if (!reg.activeProjectId || reg.projects.length === 1) {
        reg.activeProjectId = identity.id;
      }
    } else {
      const identity = resolveProjectIdentity(cwdResolved);
      if (identity.id && identity.id !== existingLocal.id) {
        existingLocal.id = identity.id;
      }
      existingLocal.name = identity.name || existingLocal.name;
      existingLocal.codePrefix = identity.codePrefix || existingLocal.codePrefix;
      if (!reg.activeProjectId) {
        reg.activeProjectId = existingLocal.id;
      }
    }
  }

  // Filter out non-existent filesystem projects (defensive pruning of deleted repos)
  reg.projects = reg.projects.filter((p: ProjectMeta) => {
    if (p.isDemo || p.id === 'demo') return true;
    if (p.repoPath && !fs.existsSync(p.repoPath)) return false;
    return true;
  });

  if (reg.projects.length === 0) {
    reg = {
      activeProjectId: 'demo',
      projects: [
        {
          id: 'demo',
          name: 'Proyecto Demo (Tour)',
          codePrefix: 'DEMO',
          description: 'Proyecto de demostración de gripm. Puedes explorarlo o eliminarlo en cualquier momento.',
          isDemo: true,
          storageType: 'json' as const,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  // Ensure storageType is populated
  reg.projects = reg.projects.map((p: ProjectMeta) => {
    if (!p.storageType && p.repoPath) {
      const detected = detectProjectStorage(p.repoPath);
      return { ...p, storageType: detected.storageType, backlogDir: detected.backlogDir };
    }
    return { ...p, storageType: p.storageType || 'json' };
  });
  return reg;
}

export function saveRegistry(registry: { activeProjectId: string; projects: ProjectMeta[] }) {
  const sanitized = {
    ...registry,
    projects: registry.projects.map(p => {
      const clean: any = { ...p };
      if (!clean.isDemo) {
        delete clean.isDemo;
      }
      return clean;
    })
  };
  saveRegistryFile(sanitized, PKG_ROOT);
}

export function getProjectBacklogPath(project: ProjectMeta): string {
  if (project.isDemo) {
    return DEMO_FILE;
  }
  if (project.repoPath) {
    return path.join(project.repoPath, '.gripm/backlog.json');
  }
  return path.resolve(PKG_ROOT, `data/${project.id}-backlog.json`);
}

export function getConfigFilepath(project?: ProjectMeta): string {
  const repo = project?.repoPath || process.cwd();
  return path.join(repo, '.gripm/config.json');
}

export const DEFAULT_CONFIG = {
  theme: 'dark',
  density: 'comfortable',
  autoSave: true,
  kanban: {
    showIdeasByDefault: false,
    showDoneHistoryByDefault: false,
    wipLimits: {
      'col-doing': 0,
      'col-review': 0,
      'col-ready': 0
    }
  },
  version: '1.0.0'
};

export function readProjectConfig(project?: ProjectMeta): any {
  const configFile = getConfigFilepath(project);
  try {
    if (fs.existsSync(configFile)) {
      const raw = fs.readFileSync(configFile, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, _filepath: configFile };
    }
  } catch (err: any) {
    console.warn(`[gripm Config] Failed to read ${configFile}:`, err.message);
  }
  return { ...DEFAULT_CONFIG, _filepath: configFile };
}

export function writeProjectConfig(config: any, project?: ProjectMeta): string {
  const repo = project?.repoPath || process.cwd();
  const configFile = path.join(repo, '.gripm/config.json');
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const toSave = { ...config };
  delete toSave._filepath;
  atomicWriteFileSync(configFile, JSON.stringify(toSave, null, 2), 'utf8');
  return configFile;
}
