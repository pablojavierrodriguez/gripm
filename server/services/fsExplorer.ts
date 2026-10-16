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

export function isSystemRootDir(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return true;
  try {
    const resolved = path.resolve(targetPath);
    const parsed = path.parse(resolved);
    if (resolved.toLowerCase() === parsed.root.toLowerCase()) return true;
    const lower = resolved.toLowerCase();
    const restrictedPrefixes = [
      'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
      '/etc', '/var', '/usr', '/bin', '/sbin', '/sys', '/proc', '/dev'
    ];
    return restrictedPrefixes.some(p => lower === p || lower.startsWith(p + path.sep));
  } catch {
    return true;
  }
}

export function isPathContained(targetPath: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function isAllowedBrowsePath(targetPath: string, extraRoots: string[] = []): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  try {
    const normalized = path.resolve(path.normalize(targetPath));
    if (isSystemRootDir(normalized)) return false;

    const baseRoots = getAllowedBrowseRoots();
    const roots = [...baseRoots];
    for (const er of extraRoots) {
      if (er) {
        roots.push(path.resolve(er));
        try { roots.push(fs.realpathSync(er)); } catch {}
      }
    }
    const uniqueRoots = [...new Set(roots)];

    // Ancestor realpath resolution: resolve the closest existing ancestor directory (DEV-302 AC #3)
    let current = normalized;
    const remainingSegments: string[] = [];
    let realPath = normalized;

    while (true) {
      try {
        const resolvedAncestor = fs.realpathSync(current);
        realPath = remainingSegments.length > 0 ? path.join(resolvedAncestor, ...remainingSegments) : resolvedAncestor;
        break;
      } catch (err: any) {
        if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
          const parent = path.dirname(current);
          if (parent === current) {
            // Reached filesystem root and still cannot resolve
            realPath = current;
            break;
          }
          remainingSegments.unshift(path.basename(current));
          current = parent;
        } else {
          return false;
        }
      }
    }

    if (isSystemRootDir(realPath)) return false;

    return uniqueRoots.some(root => isPathContained(realPath, root));
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
