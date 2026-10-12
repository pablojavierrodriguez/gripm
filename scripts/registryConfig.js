import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PKG_ROOT = path.resolve(__dirname, '..');

/**
 * Returns the base user directory for gripm configuration and state.
 * Respects GRIPM_HOME, XDG_CONFIG_HOME, and falls back to ~/.gripm.
 */
export function getGripmHomeDir() {
  if (process.env.GRIPM_HOME) {
    return path.resolve(process.env.GRIPM_HOME);
  }
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'gripm');
  }
  return path.join(os.homedir(), '.gripm');
}

/**
 * Returns the resolved path to registry.json.
 */
export function getRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (process.env.GRIPM_REGISTRY_PATH) {
    return path.resolve(process.env.GRIPM_REGISTRY_PATH);
  }
  return path.join(getGripmHomeDir(), 'registry.json');
}

/**
 * Loads the project registry (~/.gripm/registry.json).
 */
export function loadRegistryFile(pkgRoot = DEFAULT_PKG_ROOT) {
  const primaryPath = getRegistryPath(pkgRoot);

  try {
    if (primaryPath && fs.existsSync(primaryPath)) {
      const content = fs.readFileSync(primaryPath, 'utf8');
      const data = JSON.parse(content);
      if (data && Array.isArray(data.projects) && data.projects.length > 0) {
        return data;
      }
    }
  } catch {
    // Permission or read error on primaryPath
  }

  return { activeProjectId: '', projects: [] };
}

/**
 * Persists the project registry to ~/.gripm/registry.json (or XDG path).
 */
export function saveRegistryFile(registry, pkgRoot = DEFAULT_PKG_ROOT) {
  const targetPath = getRegistryPath(pkgRoot);

  try {
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(registry, null, 2), 'utf8');
  } catch {
    // Ignore if target path cannot be written
  }
}

/**
 * Resolves the real project identity (name, ID, codePrefix) with intelligent priority:
 * 1. .gripm/config.json (projectName / name / codePrefix)
 * 2. package.json in target repo (name / description)
 * 3. Fallback to path.basename(repoPath)
 */
export function resolveProjectIdentity(repoPath) {
  const normalized = path.resolve(repoPath);
  let name = '';
  let explicitId = null;
  let codePrefix = '';

  // 1. Check .gripm/config.json (canonical)
  const gripmCfgPath = path.join(normalized, '.gripm', 'config.json');

  if (fs.existsSync(gripmCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(gripmCfgPath, 'utf8'));
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

  // 2. Check package.json if name wasn't explicitly overridden in config
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
