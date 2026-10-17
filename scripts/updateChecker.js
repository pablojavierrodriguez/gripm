import fs from 'node:fs';
import path from 'node:path';
import { getGripmHomeDir, atomicWriteFileSync } from './registryConfig.js';

export const CACHE_FILE_NAME = 'update-cache.json';
export const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const NPM_PACKAGE = '@gripm/board';
export const GITHUB_REPO = 'pablojavierrodriguez/gripm';

/**
 * Compares two semver strings (e.g., '0.6.0' > '0.5.0' -> true).
 */
export function semverGreaterThan(target, current) {
  if (!target || !current) return false;
  const cleanT = target.replace(/^v/, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  const cleanC = current.replace(/^v/, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const partT = cleanT[i] || 0;
    const partC = cleanC[i] || 0;
    if (partT > partC) return true;
    if (partT < partC) return false;
  }
  return false;
}

/**
 * Returns the path to the update cache file.
 */
export function getUpdateCachePath() {
  if (process.env.GRIPM_UPDATE_CACHE_PATH) {
    return path.resolve(process.env.GRIPM_UPDATE_CACHE_PATH);
  }
  return path.join(getGripmHomeDir(), CACHE_FILE_NAME);
}

/**
 * Reads cached update information.
 */
export function readUpdateCache() {
  try {
    const cachePath = getUpdateCachePath();
    if (!fs.existsSync(cachePath)) return null;
    const content = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Writes update cache to disk safely.
 */
export function writeUpdateCache(data) {
  const cachePath = getUpdateCachePath();
  try {
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    atomicWriteFileSync(cachePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Check if update check should be skipped.
 */
export function isUpdateCheckDisabled() {
  const env = process.env.GRIPM_NO_UPDATE_CHECK;
  return env === '1' || env === 'true';
}

/**
 * Formats a terminal notice notifying about an available update.
 * Subtle, discreet, and simple (DEV-107).
 */
export function formatUpdateBanner(currentVersion, latestVersion) {
  const cleanCurrent = (currentVersion || '').replace(/^v/, '').trim();
  const cleanLatest = (latestVersion || '').replace(/^v/, '').trim();
  return `  ▲ Actualización disponible: v${cleanCurrent} → v${cleanLatest} · npm i -g @gripm/board@latest`;
}

/**
 * Synchronous check of cache for instant, zero-latency notification.
 */
export function getCachedUpdateInfo(currentVersion) {
  if (isUpdateCheckDisabled()) return null;
  const cached = readUpdateCache();
  if (cached && cached.hasUpdate && cached.latestVersion) {
    if (semverGreaterThan(cached.latestVersion, currentVersion)) {
      return {
        hasUpdate: true,
        currentVersion,
        latestVersion: cached.latestVersion,
        url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`
      };
    } else {
      // Auto-invalidate / clean up cached update when currentVersion caught up or passed latestVersion
      writeUpdateCache({
        ...cached,
        currentVersion,
        hasUpdate: false
      });
    }
  }
  return null;
}

/**
 * Checks for updates against npm Registry (canonical) with fallback to GitHub Releases.
 * Non-blocking, cached for 4h, silentiable via GRIPM_NO_UPDATE_CHECK=1.
 */
export async function checkForUpdates(currentVersion, { force = false, timeoutMs = 2000 } = {}) {
  if (isUpdateCheckDisabled()) {
    return { hasUpdate: false, currentVersion, latestVersion: currentVersion, disabled: true };
  }

  const cached = readUpdateCache();
  const now = Date.now();

  if (!force && cached && cached.lastCheck && (now - cached.lastCheck < CACHE_TTL_MS)) {
    const hasUpdate = semverGreaterThan(cached.latestVersion, currentVersion);
    return {
      hasUpdate,
      currentVersion,
      latestVersion: cached.latestVersion || currentVersion,
      url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      fromCache: true
    };
  }

  // Fetch latest version: prioritize npm registry with resilient fallback to GitHub Releases API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let latestVersion = '';
    let releaseUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;

    // 1. Try npm registry (canonical distribution source for @gripm/board)
    try {
      const npmRes = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE}/latest`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
          'User-Agent': 'gripm-cli'
        }
      });
      if (npmRes.ok) {
        const npmData = await npmRes.json();
        if (npmData && typeof npmData.version === 'string') {
          latestVersion = npmData.version.trim();
          releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${latestVersion}`;
        }
      }
    } catch {
      // npm fetch failed or timed out, fallback will proceed
    }

    // 2. Resilient fallback to GitHub Releases API
    if (!latestVersion) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'gripm-cli',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const rawTag = ghData.tag_name || ghData.name || '';
          latestVersion = rawTag.replace(/^v/, '').trim();
          if (ghData.html_url) releaseUrl = ghData.html_url;
        }
      } catch {
        // GitHub fetch failed or timed out
      }
    }

    clearTimeout(timer);

    if (latestVersion) {
      const cleanLatest = latestVersion.replace(/^v/, '').trim();
      const hasUpdate = semverGreaterThan(cleanLatest, currentVersion);
      const url = releaseUrl || `https://github.com/${GITHUB_REPO}/releases/tag/v${cleanLatest}`;

      const cacheData = {
        lastCheck: now,
        currentVersion,
        latestVersion: cleanLatest,
        hasUpdate,
        url
      };
      writeUpdateCache(cacheData);

      return {
        hasUpdate,
        currentVersion,
        latestVersion: cleanLatest,
        url,
        fromCache: false
      };
    } else {
      // On failure to fetch, extend lastCheck to avoid repeating on every run
      if (cached) {
        writeUpdateCache({ ...cached, lastCheck: now });
      } else {
        writeUpdateCache({ lastCheck: now, currentVersion, latestVersion: currentVersion, hasUpdate: false });
      }
    }
  } catch {
    // Network error, timeout, or sandbox restriction: extend lastCheck to avoid rapid retries
    if (cached) {
      writeUpdateCache({ ...cached, lastCheck: now });
    } else {
      writeUpdateCache({ lastCheck: now, currentVersion, latestVersion: currentVersion, hasUpdate: false });
    }
  }

  return {
    hasUpdate: cached ? semverGreaterThan(cached.latestVersion, currentVersion) : false,
    currentVersion,
    latestVersion: cached?.latestVersion || currentVersion,
    fromCache: true
  };
}
