import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PKG_ROOT = path.resolve(__dirname, '..');

/**
 * Returns the base user directory for DevBoard configuration and state.
 * Respects DEVBOARD_HOME, XDG_CONFIG_HOME, and falls back to ~/.devboard.
 */
export function getDevBoardHomeDir() {
  if (process.env.GRIPM_HOME) {
    return path.resolve(process.env.GRIPM_HOME);
  }
  if (process.env.DEVBOARD_HOME) {
    return path.resolve(process.env.DEVBOARD_HOME);
  }
  if (process.env.XDG_CONFIG_HOME) {
    const gripmDir = path.join(process.env.XDG_CONFIG_HOME, 'gripm');
    if (fs.existsSync(gripmDir)) return gripmDir;
    const devboardDir = path.join(process.env.XDG_CONFIG_HOME, 'devboard');
    if (fs.existsSync(devboardDir)) return devboardDir;
    return gripmDir;
  }
  const primaryDir = path.join(os.homedir(), '.gripm');
  const legacyDir = path.join(os.homedir(), '.devboard');
  if (fs.existsSync(legacyDir) && !fs.existsSync(primaryDir)) {
    return legacyDir;
  }
  return primaryDir;
}

/**
 * Returns the resolved path to registry.json.
 */
export function getRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (process.env.GRIPM_REGISTRY_PATH) {
    return path.resolve(process.env.GRIPM_REGISTRY_PATH);
  }
  if (process.env.DEVBOARD_REGISTRY_PATH) {
    return path.resolve(process.env.DEVBOARD_REGISTRY_PATH);
  }
  return path.join(getDevBoardHomeDir(), 'registry.json');
}

/**
 * Returns the legacy registry path in the package root (for migration only).
 */
export function getLegacyRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (!pkgRoot) return null;
  return path.join(pkgRoot, 'data/projects-registry.json');
}

/**
 * Loads the project registry.
 * If user registry (~/.devboard/registry.json) exists and has projects, reads it.
 * If not, checks for legacy registry in pkgRoot/data/projects-registry.json,
 * automatically migrating existing projects into user registry.
 */
export function loadRegistryFile(pkgRoot = DEFAULT_PKG_ROOT) {
  const primaryPath = getRegistryPath(pkgRoot);
  const legacyPath = getLegacyRegistryPath(pkgRoot);

  try {
    if (primaryPath && fs.existsSync(primaryPath)) {
      const content = fs.readFileSync(primaryPath, 'utf8');
      const data = JSON.parse(content);
      if (data && Array.isArray(data.projects) && data.projects.length > 0) {
        return data;
      }
    }
  } catch {
    // Permission or read error on primaryPath, fallback to legacy
  }

  // Fallback and transparent migration from legacy PKG_ROOT/data/projects-registry.json
  if (legacyPath) {
    try {
      if (fs.existsSync(legacyPath)) {
        const data = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        if (data && Array.isArray(data.projects)) {
          // Attempt transparent migration to user directory if writable
          try {
            saveRegistryFile(data, pkgRoot);
          } catch {}
          return data;
        }
      }
    } catch {
      // Ignore legacy corrupt file
    }
  }

  return { activeProjectId: '', projects: [] };
}

/**
 * Persists the project registry to ~/.devboard/registry.json (or XDG path).
 * Falls back to legacy path if home directory is not writable.
 */
export function saveRegistryFile(registry, pkgRoot = DEFAULT_PKG_ROOT) {
  const targetPath = getRegistryPath(pkgRoot);
  const legacyPath = getLegacyRegistryPath(pkgRoot);
  let saved = false;

  try {
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(registry, null, 2), 'utf8');
    saved = true;
  } catch {
    // Ignore and fallback if target path cannot be written
  }

  if (!saved && legacyPath) {
    try {
      const legacyDir = path.dirname(legacyPath);
      if (!fs.existsSync(legacyDir)) {
        fs.mkdirSync(legacyDir, { recursive: true });
      }
      fs.writeFileSync(legacyPath, JSON.stringify(registry, null, 2), 'utf8');
    } catch {}
  }
}

/**
 * Resolves the real project identity (name, ID, codePrefix) with intelligent priority:
 * 1. .devboard/config.json (projectName / name / codePrefix)
 * 2. package.json in target repo (name / description)
 * 3. Fallback to path.basename(repoPath)
 */
export function resolveProjectIdentity(repoPath) {
  const normalized = path.resolve(repoPath);
  let name = '';
  let explicitId = null;
  let codePrefix = '';

  // 1. Check .gripm/config.json (canonical) with fallback to .devboard/config.json (legacy)
  const gripmCfgPath = path.join(normalized, '.gripm', 'config.json');
  const devboardCfgPath = path.join(normalized, '.devboard', 'config.json');
  const targetCfgPath = fs.existsSync(gripmCfgPath) ? gripmCfgPath : devboardCfgPath;

  if (fs.existsSync(targetCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(targetCfgPath, 'utf8'));
      if (cfg.projectName || cfg.name) {
        name = cfg.projectName || cfg.name;
      }
      if (cfg.projectId || cfg.id) {
        explicitId = cfg.projectId || cfg.id;
      }
      if (cfg.codePrefix) {
        codePrefix = cfg.codePrefix;
      }
    } catch {}
  }

  // 2. Check package.json if name wasn't explicitly overridden in .devboard/config.json
  if (!name) {
    const pkgJsonPath = path.join(normalized, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const pkgName = pkg.productName || pkg.displayName || pkg.name;
        if (pkgName) {
          name = pkgName;
          if (!codePrefix) {
            codePrefix = (pkg.codePrefix || pkgName.replace(/^@[^/]+\//, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4)).toUpperCase();
          }
        }
      } catch {}
    }
  }

  // 3. Fallback to folder name
  if (!name) {
    name = path.basename(normalized);
  }

  if (!codePrefix) {
    codePrefix = name.replace(/^@[^/]+\//, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'PROJ';
  }

  const id = explicitId || name.toLowerCase().replace(/^@[^/]+\//, '').replace(/[^a-z0-9_-]/g, '-');

  return {
    id,
    name,
    codePrefix
  };
}
