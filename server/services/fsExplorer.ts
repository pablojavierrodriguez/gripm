import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getRegistry } from './registry.ts';

export function getAllowedBrowseRoots(): string[] {
  const roots: string[] = [];
  const homedir = os.homedir();
  if (homedir) {
    roots.push(path.resolve(homedir));
    try { roots.push(fs.realpathSync(homedir)); } catch {}
  }
  const cwd = process.cwd();
  if (cwd) {
    roots.push(path.resolve(cwd));
    try { roots.push(fs.realpathSync(cwd)); } catch {}
  }
  const tmpdir = os.tmpdir();
  if (tmpdir) {
    roots.push(path.resolve(tmpdir));
    try { roots.push(fs.realpathSync(tmpdir)); } catch {}
  }
  try {
    const reg = getRegistry();
    if (reg && Array.isArray(reg.projects)) {
      for (const p of reg.projects) {
        if (p.repoPath) {
          roots.push(path.resolve(p.repoPath));
          try { roots.push(fs.realpathSync(p.repoPath)); } catch {}
        }
      }
    }
  } catch {}
  const extra = process.env.GRIPM_ALLOWED_PATHS;
  if (extra) {
    for (const p of extra.split(path.delimiter)) {
      if (p.trim()) {
        roots.push(path.resolve(p.trim()));
        try { roots.push(fs.realpathSync(p.trim())); } catch {}
      }
    }
  }
  return [...new Set(roots)];
}

export function isPathContained(targetPath: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function isAllowedBrowsePath(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  try {
    const resolved = path.resolve(path.normalize(targetPath));
    const roots = getAllowedBrowseRoots();
    if (roots.some(root => isPathContained(resolved, root))) return true;

    try {
      const real = fs.realpathSync(resolved);
      if (roots.some(root => isPathContained(real, root))) return true;
    } catch {}

    return false;
  } catch {
    return false;
  }
}

export function getSafeInitialBrowseDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '..'),
    process.cwd(),
    os.homedir()
  ];
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate) && isAllowedBrowsePath(candidate)) {
        fs.readdirSync(candidate);
        return candidate;
      }
    } catch {}
  }
  return path.resolve(os.homedir() || process.cwd());
}
