#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// scripts/registryConfig.js
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
function getGripmHomeDir() {
  if (process.env.GRIPM_HOME) {
    return path.resolve(process.env.GRIPM_HOME);
  }
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, "gripm");
  }
  return path.join(os.homedir(), ".gripm");
}
function getRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (process.env.GRIPM_REGISTRY_PATH) {
    return path.resolve(process.env.GRIPM_REGISTRY_PATH);
  }
  return path.join(getGripmHomeDir(), "registry.json");
}
function loadRegistryFile(pkgRoot = DEFAULT_PKG_ROOT) {
  const primaryPath = getRegistryPath(pkgRoot);
  try {
    if (primaryPath && fs.existsSync(primaryPath)) {
      const content = fs.readFileSync(primaryPath, "utf8");
      const data = JSON.parse(content);
      if (data && Array.isArray(data.projects) && data.projects.length > 0) {
        return data;
      }
    }
  } catch {
  }
  return { activeProjectId: "", projects: [] };
}
function atomicWriteFileSync(filePath, content, encoding = "utf8") {
  const resolvedPath = path.resolve(filePath);
  const targetDir = path.dirname(resolvedPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd;
  let renamed = false;
  try {
    fd = fs.openSync(tempPath, "w");
    if (typeof content === "string") {
      fs.writeFileSync(fd, content, encoding);
    } else {
      fs.writeFileSync(fd, content);
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = void 0;
    let attempts = 0;
    while (!renamed) {
      try {
        fs.renameSync(tempPath, resolvedPath);
        renamed = true;
      } catch (renameErr) {
        attempts++;
        if ((renameErr.code === "EPERM" || renameErr.code === "EACCES" || renameErr.code === "EBUSY") && attempts <= 5) {
          const end = Date.now() + 10;
          while (Date.now() < end) {
          }
          continue;
        }
        throw renameErr;
      }
    }
  } finally {
    if (fd !== void 0) {
      try {
        fs.closeSync(fd);
      } catch {
      }
    }
    if (!renamed && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
      }
    }
  }
}
function saveRegistryFile(registry, pkgRoot = DEFAULT_PKG_ROOT) {
  const targetPath = getRegistryPath(pkgRoot);
  try {
    atomicWriteFileSync(targetPath, JSON.stringify(registry, null, 2), "utf8");
  } catch {
  }
}
function resolveProjectIdentity(repoPath) {
  const normalized = path.resolve(repoPath);
  let name = "";
  let explicitId = null;
  let codePrefix = "";
  const gripmCfgPath = path.join(normalized, ".gripm", "config.json");
  if (fs.existsSync(gripmCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(gripmCfgPath, "utf8"));
      if (cfg.projectName || cfg.name) {
        name = cfg.projectName || cfg.name;
      }
      if (cfg.projectId || cfg.id) {
        explicitId = cfg.projectId || cfg.id;
      }
      if (cfg.codePrefix) {
        codePrefix = cfg.codePrefix;
      }
    } catch {
    }
  }
  if (!name) {
    const pkgJsonPath = path.join(normalized, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const pkgName = pkg.productName || pkg.displayName || pkg.name;
        if (pkgName) {
          name = pkgName;
          if (!codePrefix) {
            codePrefix = (pkg.codePrefix || pkgName.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4)).toUpperCase();
          }
        }
      } catch {
      }
    }
  }
  if (!name) {
    name = path.basename(normalized);
  }
  if (!codePrefix) {
    codePrefix = name.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "PROJ";
  }
  const id = explicitId || name.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9_-]/g, "-");
  return {
    id,
    name,
    codePrefix
  };
}
var __filename, __dirname, DEFAULT_PKG_ROOT;
var init_registryConfig = __esm({
  "scripts/registryConfig.js"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    DEFAULT_PKG_ROOT = path.resolve(__dirname, "..");
  }
});

// scripts/updateChecker.js
import fs2 from "node:fs";
import path2 from "node:path";
function semverGreaterThan(target, current) {
  if (!target || !current) return false;
  const cleanT = target.replace(/^v/, "").trim().split(".").map((n) => parseInt(n, 10) || 0);
  const cleanC = current.replace(/^v/, "").trim().split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const partT = cleanT[i] || 0;
    const partC = cleanC[i] || 0;
    if (partT > partC) return true;
    if (partT < partC) return false;
  }
  return false;
}
function getUpdateCachePath() {
  if (process.env.GRIPM_UPDATE_CACHE_PATH) {
    return path2.resolve(process.env.GRIPM_UPDATE_CACHE_PATH);
  }
  return path2.join(getGripmHomeDir(), CACHE_FILE_NAME);
}
function readUpdateCache() {
  try {
    const cachePath = getUpdateCachePath();
    if (!fs2.existsSync(cachePath)) return null;
    const content = fs2.readFileSync(cachePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeUpdateCache(data) {
  const cachePath = getUpdateCachePath();
  try {
    const dir = path2.dirname(cachePath);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    atomicWriteFileSync(cachePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
  }
}
function isUpdateCheckDisabled() {
  const env = process.env.GRIPM_NO_UPDATE_CHECK;
  return env === "1" || env === "true";
}
function formatUpdateBanner(currentVersion2, latestVersion) {
  const cleanCurrent = (currentVersion2 || "").replace(/^v/, "").trim();
  const cleanLatest = (latestVersion || "").replace(/^v/, "").trim();
  return `  \u25B2 Actualizaci\xF3n disponible: v${cleanCurrent} \u2192 v${cleanLatest} \xB7 npm i -g @gripm/board@latest`;
}
function getCachedUpdateInfo(currentVersion2) {
  if (isUpdateCheckDisabled()) return null;
  const cached = readUpdateCache();
  if (cached && cached.hasUpdate && cached.latestVersion) {
    if (semverGreaterThan(cached.latestVersion, currentVersion2)) {
      return {
        hasUpdate: true,
        currentVersion: currentVersion2,
        latestVersion: cached.latestVersion,
        url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`
      };
    } else {
      writeUpdateCache({
        ...cached,
        currentVersion: currentVersion2,
        hasUpdate: false
      });
    }
  }
  return null;
}
async function checkForUpdates(currentVersion2, { force = false, timeoutMs = 2e3 } = {}) {
  if (isUpdateCheckDisabled()) {
    return { hasUpdate: false, currentVersion: currentVersion2, latestVersion: currentVersion2, disabled: true };
  }
  const cached = readUpdateCache();
  const now = Date.now();
  if (!force && cached && cached.lastCheck && now - cached.lastCheck < CACHE_TTL_MS) {
    const hasUpdate = semverGreaterThan(cached.latestVersion, currentVersion2);
    return {
      hasUpdate,
      currentVersion: currentVersion2,
      latestVersion: cached.latestVersion || currentVersion2,
      url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      fromCache: true
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let latestVersion = "";
    let releaseUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
    try {
      const npmRes = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE}/latest`, {
        signal: controller.signal,
        headers: {
          "Accept": "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
          "User-Agent": "gripm-cli"
        }
      });
      if (npmRes.ok) {
        const npmData = await npmRes.json();
        if (npmData && typeof npmData.version === "string") {
          latestVersion = npmData.version.trim();
          releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${latestVersion}`;
        }
      }
    } catch {
    }
    if (!latestVersion) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          signal: controller.signal,
          headers: {
            "User-Agent": "gripm-cli",
            "Accept": "application/vnd.github.v3+json"
          }
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const rawTag = ghData.tag_name || ghData.name || "";
          latestVersion = rawTag.replace(/^v/, "").trim();
          if (ghData.html_url) releaseUrl = ghData.html_url;
        }
      } catch {
      }
    }
    clearTimeout(timer);
    if (latestVersion) {
      const cleanLatest = latestVersion.replace(/^v/, "").trim();
      const hasUpdate = semverGreaterThan(cleanLatest, currentVersion2);
      const url = releaseUrl || `https://github.com/${GITHUB_REPO}/releases/tag/v${cleanLatest}`;
      const cacheData = {
        lastCheck: now,
        currentVersion: currentVersion2,
        latestVersion: cleanLatest,
        hasUpdate,
        url
      };
      writeUpdateCache(cacheData);
      return {
        hasUpdate,
        currentVersion: currentVersion2,
        latestVersion: cleanLatest,
        url,
        fromCache: false
      };
    } else {
      if (cached) {
        writeUpdateCache({ ...cached, lastCheck: now });
      } else {
        writeUpdateCache({ lastCheck: now, currentVersion: currentVersion2, latestVersion: currentVersion2, hasUpdate: false });
      }
    }
  } catch {
    if (cached) {
      writeUpdateCache({ ...cached, lastCheck: now });
    } else {
      writeUpdateCache({ lastCheck: now, currentVersion: currentVersion2, latestVersion: currentVersion2, hasUpdate: false });
    }
  }
  return {
    hasUpdate: cached ? semverGreaterThan(cached.latestVersion, currentVersion2) : false,
    currentVersion: currentVersion2,
    latestVersion: cached?.latestVersion || currentVersion2,
    fromCache: true
  };
}
var CACHE_FILE_NAME, CACHE_TTL_MS, NPM_PACKAGE, GITHUB_REPO;
var init_updateChecker = __esm({
  "scripts/updateChecker.js"() {
    "use strict";
    init_registryConfig();
    CACHE_FILE_NAME = "update-cache.json";
    CACHE_TTL_MS = 4 * 60 * 60 * 1e3;
    NPM_PACKAGE = "@gripm/board";
    GITHUB_REPO = "pablojavierrodriguez/gripm";
  }
});

// src/utils/legacyParser.ts
function parseLegacyMarkdown(rawContent, defaultMilestone) {
  if (!rawContent || !rawContent.trim()) return [];
  const lines = rawContent.split(/\r?\n/);
  const items = [];
  let currentHeading = defaultMilestone || "";
  let currentModule = "";
  let currentItem = null;
  let currentDescLines = [];
  let counter = 1;
  const flushCurrentItem = () => {
    if (currentItem) {
      if (currentDescLines.length > 0) {
        currentItem.description = currentDescLines.join("\n").trim();
      }
      items.push(currentItem);
      currentItem = null;
      currentDescLines = [];
    }
  };
  const checkboxRegex = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
  const headerRegex = /^(#{1,4})\s+(.*)$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      flushCurrentItem();
      const headerText = headerMatch[2].trim();
      const lower = headerText.toLowerCase();
      if (lower.includes("sprint") || lower.includes("milestone") || lower.includes("fase") || lower.includes("v1.") || lower.includes("v0.")) {
        currentHeading = headerText;
      } else if (lower.includes("m\xF3dulo") || lower.includes("modulo") || lower.includes("component")) {
        currentModule = headerText.replace(/m[óo]dulo:?\s*/i, "").trim();
      } else {
        currentHeading = headerText;
      }
      continue;
    }
    const checkMatch = line.match(checkboxRegex);
    if (checkMatch) {
      flushCurrentItem();
      const isChecked = checkMatch[2].toLowerCase() === "x";
      let title = checkMatch[3].trim();
      let priority = "p2";
      if (/(\[p0\]|#p0|\(p0\)|\(alta\)|\(urgente\)|p0:)/i.test(title)) {
        priority = "p0";
        title = title.replace(/(\[p0\]|#p0|\(p0\)|\(alta\)|\(urgente\)|p0:)/gi, "").trim();
      } else if (/(\[p1\]|#p1|\(p1\)|\(high\)|p1:)/i.test(title)) {
        priority = "p1";
        title = title.replace(/(\[p1\]|#p1|\(p1\)|\(high\)|p1:)/gi, "").trim();
      } else if (/(\[p2\]|#p2|\(p2\)|\(medium\)|p2:)/i.test(title)) {
        priority = "p2";
        title = title.replace(/(\[p2\]|#p2|\(p2\)|\(medium\)|p2:)/gi, "").trim();
      } else if (/(\[p3\]|#p3|\(p3\)|\(low\)|p3:)/i.test(title)) {
        priority = "p3";
        title = title.replace(/(\[p3\]|#p3|\(p3\)|\(low\)|p3:)/gi, "").trim();
      }
      let type = "feature";
      if (/(\[bug\]|#bug|\(bug\)|fix:|bug:)/i.test(title)) {
        type = "bug";
        title = title.replace(/(\[bug\]|#bug|\(bug\)|fix:|bug:)/gi, "").trim();
      } else if (/(\[tech[_-]?debt\]|#tech[_-]?debt|refactor:|chore:)/i.test(title)) {
        type = "tech_debt";
        title = title.replace(/(\[tech[_-]?debt\]|#tech[_-]?debt|refactor:|chore:)/gi, "").trim();
      } else if (/(\[ux\]|#ux|\(ux\)|design:|ui:)/i.test(title)) {
        type = "ux";
        title = title.replace(/(\[ux\]|#ux|\(ux\)|design:|ui:)/gi, "").trim();
      } else if (/(\[feat(ure)?\]|#feat(ure)?)/i.test(title)) {
        type = "feature";
        title = title.replace(/(\[feat(ure)?\]|#feat(ure)?)/gi, "").trim();
      }
      title = title.replace(/^[:\-\s]+/, "").trim();
      const isSprintHeading = currentHeading.toLowerCase().includes("sprint");
      const isReleaseHeading = /(v\d|\d+\.\d+)/i.test(currentHeading);
      currentItem = {
        tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
        title: title || "Sin t\xEDtulo",
        description: "",
        status: isChecked ? "done" : "ready",
        priority,
        type,
        milestone: currentHeading || void 0,
        module: currentModule || void 0,
        sprint: isSprintHeading ? currentHeading : void 0,
        release: isReleaseHeading ? currentHeading : void 0,
        targetSprint: isSprintHeading ? currentHeading : void 0,
        targetRelease: isReleaseHeading ? currentHeading : void 0,
        selected: true
      };
      continue;
    }
    if (currentItem) {
      const trimmed = line.trim();
      if (trimmed) {
        currentDescLines.push(trimmed);
      }
    }
  }
  flushCurrentItem();
  return items;
}
var init_legacyParser = __esm({
  "src/utils/legacyParser.ts"() {
    "use strict";
  }
});

// server/services/atomicWrite.ts
import fs5 from "node:fs";
import path5 from "node:path";
function parseOptions(options) {
  let encoding = "utf8";
  let mode = void 0;
  if (typeof options === "string") {
    encoding = options;
  } else if (options && typeof options === "object") {
    if ("encoding" in options && options.encoding) {
      encoding = options.encoding;
    }
    if ("mode" in options && typeof options.mode === "number") {
      mode = options.mode;
    }
  }
  return { encoding, mode };
}
function atomicWriteFileSync2(filePath, content, options) {
  const resolvedPath = path5.resolve(filePath);
  const dir = path5.dirname(resolvedPath);
  if (!fs5.existsSync(dir)) {
    fs5.mkdirSync(dir, { recursive: true });
  }
  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd;
  let renamed = false;
  try {
    fd = fs5.openSync(tempPath, "w", mode);
    if (typeof content === "string") {
      fs5.writeFileSync(fd, content, { encoding });
    } else {
      fs5.writeFileSync(fd, content);
    }
    fs5.fsyncSync(fd);
    fs5.closeSync(fd);
    fd = void 0;
    let attempts = 0;
    while (!renamed) {
      try {
        fs5.renameSync(tempPath, resolvedPath);
        renamed = true;
      } catch (renameErr) {
        attempts++;
        if ((renameErr.code === "EPERM" || renameErr.code === "EACCES" || renameErr.code === "EBUSY") && attempts <= 5) {
          const end = Date.now() + 10;
          while (Date.now() < end) {
          }
          continue;
        }
        throw renameErr;
      }
    }
  } finally {
    if (fd !== void 0) {
      try {
        fs5.closeSync(fd);
      } catch {
      }
    }
    if (!renamed && fs5.existsSync(tempPath)) {
      try {
        fs5.unlinkSync(tempPath);
      } catch {
      }
    }
  }
}
var init_atomicWrite = __esm({
  "server/services/atomicWrite.ts"() {
    "use strict";
  }
});

// server/services/registry.ts
var registry_exports = {};
__export(registry_exports, {
  DEFAULT_CONFIG: () => DEFAULT_CONFIG,
  DEMO_FILE: () => DEMO_FILE,
  PKG_ROOT: () => PKG_ROOT2,
  detectProjectStorage: () => detectProjectStorage,
  getBacklogTasksDir: () => getBacklogTasksDir,
  getConfigFilepath: () => getConfigFilepath,
  getProjectBacklogPath: () => getProjectBacklogPath,
  getProjectDocsPath: () => getProjectDocsPath,
  getRegistry: () => getRegistry,
  isBacklogMdProject: () => isBacklogMdProject,
  readProjectConfig: () => readProjectConfig,
  saveRegistry: () => saveRegistry,
  writeProjectConfig: () => writeProjectConfig
});
import fs6 from "node:fs";
import path6 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
function detectProjectStorage(repoPath) {
  if (!repoPath) return { storageType: "json", backlogDir: "backlog" };
  const normalized = path6.normalize(repoPath.trim());
  try {
    if (fs6.existsSync(path6.join(normalized, "backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs6.existsSync(path6.join(normalized, ".backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
    if (fs6.existsSync(path6.join(normalized, "backlog"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs6.existsSync(path6.join(normalized, ".backlog"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
  } catch {
  }
  return { storageType: "json", backlogDir: "backlog" };
}
function isBacklogMdProject(project) {
  if (project.isDemo) return false;
  if (project.storageType === "markdown") return true;
  if (project.storageType === "json") return false;
  if (project.repoPath) {
    return detectProjectStorage(project.repoPath).storageType === "markdown";
  }
  return false;
}
function getBacklogTasksDir(project) {
  const dir = project.backlogDir || "backlog";
  return path6.join(project.repoPath || "", dir, "tasks");
}
function getProjectDocsPath(project) {
  if (project.docsPath && fs6.existsSync(project.docsPath)) {
    return project.docsPath;
  }
  if (project.repoPath) {
    const defaultDocs = path6.join(project.repoPath, "docs");
    if (fs6.existsSync(defaultDocs)) {
      try {
        const files = fs6.readdirSync(defaultDocs);
        const hasDocFiles = files.some(
          (f) => ["quality_log.md", "backlog.md", "release_notes.md"].includes(f.toLowerCase()) || f.toLowerCase() === "specs"
        );
        if (hasDocFiles) return defaultDocs;
      } catch {
      }
    }
  }
  return null;
}
function getRegistry() {
  let reg = loadRegistryFile(PKG_ROOT2);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: "", projects: [] };
  }
  const cwd = process.cwd();
  const hasLocalGripm = fs6.existsSync(path6.join(cwd, ".gripm")) || fs6.existsSync(path6.join(cwd, "backlog"));
  if (hasLocalGripm) {
    const cwdResolved = path6.resolve(cwd);
    const existingLocal = reg.projects.find((p) => p.repoPath && path6.resolve(p.repoPath) === cwdResolved);
    if (!existingLocal) {
      const detected = detectProjectStorage(cwdResolved);
      const identity = resolveProjectIdentity(cwdResolved);
      const localProject = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: cwdResolved,
        storageType: detected.storageType,
        backlogDir: detected.backlogDir || "backlog",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
  reg.projects = reg.projects.filter((p) => {
    if (p.isDemo || p.id === "demo") return true;
    if (p.repoPath && !fs6.existsSync(p.repoPath)) return false;
    return true;
  });
  if (reg.projects.length === 0) {
    reg = {
      activeProjectId: "demo",
      projects: [
        {
          id: "demo",
          name: "Proyecto Demo (Tour)",
          codePrefix: "DEMO",
          description: "Proyecto de demostraci\xF3n de gripm. Puedes explorarlo o eliminarlo en cualquier momento.",
          isDemo: true,
          storageType: "json",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]
    };
  }
  reg.projects = reg.projects.map((p) => {
    if (!p.storageType && p.repoPath) {
      const detected = detectProjectStorage(p.repoPath);
      return { ...p, storageType: detected.storageType, backlogDir: detected.backlogDir };
    }
    return { ...p, storageType: p.storageType || "json" };
  });
  return reg;
}
function saveRegistry(registry) {
  const sanitized = {
    ...registry,
    projects: registry.projects.map((p) => {
      const clean = { ...p };
      if (!clean.isDemo) {
        delete clean.isDemo;
      }
      return clean;
    })
  };
  saveRegistryFile(sanitized, PKG_ROOT2);
}
function getProjectBacklogPath(project) {
  if (project.isDemo) {
    return DEMO_FILE;
  }
  if (project.repoPath) {
    return path6.join(project.repoPath, ".gripm/backlog.json");
  }
  return path6.resolve(PKG_ROOT2, `data/${project.id}-backlog.json`);
}
function getConfigFilepath(project) {
  const repo = project?.repoPath || process.cwd();
  return path6.join(repo, ".gripm/config.json");
}
function readProjectConfig(project) {
  if (project?.isDemo || project?.id === "demo") {
    return { ...DEFAULT_CONFIG };
  }
  const configFile = getConfigFilepath(project);
  try {
    if (fs6.existsSync(configFile)) {
      const raw = fs6.readFileSync(configFile, "utf8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, _filepath: configFile };
    }
  } catch (err) {
    console.warn(`[gripm Config] Failed to read ${configFile}:`, err.message);
  }
  return { ...DEFAULT_CONFIG, _filepath: configFile };
}
function writeProjectConfig(config, project) {
  const repo = project?.repoPath || process.cwd();
  const configFile = path6.join(repo, ".gripm/config.json");
  const dir = path6.dirname(configFile);
  if (!fs6.existsSync(dir)) {
    fs6.mkdirSync(dir, { recursive: true });
  }
  const toSave = { ...config };
  delete toSave._filepath;
  atomicWriteFileSync2(configFile, JSON.stringify(toSave, null, 2), "utf8");
  return configFile;
}
var __filename3, __dirname3, PKG_ROOT2, DEMO_FILE, DEFAULT_CONFIG;
var init_registry = __esm({
  "server/services/registry.ts"() {
    "use strict";
    init_registryConfig();
    init_atomicWrite();
    __filename3 = fileURLToPath3(import.meta.url);
    __dirname3 = path6.dirname(__filename3);
    PKG_ROOT2 = path6.resolve(__dirname3, "../../");
    DEMO_FILE = fs6.existsSync(path6.resolve(PKG_ROOT2, "data/demo-backlog.json")) ? path6.resolve(PKG_ROOT2, "data/demo-backlog.json") : path6.resolve(PKG_ROOT2, "src/data/demo-backlog.json");
    DEFAULT_CONFIG = {
      theme: "dark",
      density: "comfortable",
      autoSave: true,
      kanban: {
        showIdeasByDefault: false,
        showDoneHistoryByDefault: false,
        wipLimits: {
          "col-doing": 0,
          "col-review": 0,
          "col-ready": 0
        }
      },
      version: "1.0.0"
    };
  }
});

// server/sse/sseManager.ts
import fs7 from "node:fs";
import path7 from "node:path";
function broadcastSse(event, data) {
  const msg = `event: ${event}
data: ${JSON.stringify(data)}

`;
  for (const client of sseClients) {
    try {
      if (client.destroyed || client.writableEnded) {
        sseClients.delete(client);
        continue;
      }
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}
function closeWatchers() {
  for (const w of activeWatchers) {
    try {
      w.close();
    } catch {
    }
  }
  activeWatchers = [];
}
function setupProjectWatchers() {
  closeWatchers();
  const registry = getRegistry();
  const dirsToWatch = /* @__PURE__ */ new Set();
  const dataDir = path7.resolve(PKG_ROOT2, "data");
  if (fs7.existsSync(dataDir)) dirsToWatch.add(dataDir);
  for (const p of registry.projects) {
    try {
      if (p.repoPath && fs7.existsSync(p.repoPath)) {
        const backlogDir = path7.join(p.repoPath, p.backlogDir || "backlog");
        if (fs7.existsSync(backlogDir)) dirsToWatch.add(backlogDir);
        const gripmDir = path7.join(p.repoPath, ".gripm");
        if (fs7.existsSync(gripmDir)) dirsToWatch.add(gripmDir);
      }
    } catch (err) {
      console.warn(`[gripm Watcher] Error checking repoPath for ${p.id}:`, err.message);
    }
  }
  let debounceTimer = null;
  const notifyChange = (eventDir, filename) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      broadcastSse("backlog_changed", {
        dir: eventDir,
        file: filename,
        timestamp: Date.now()
      });
    }, 250);
  };
  for (const dir of dirsToWatch) {
    try {
      const watcher = fs7.watch(dir, { recursive: true }, (_eventType, filename) => {
        if (filename && (filename.endsWith(".log") || filename.endsWith(".tmp") || filename.includes(".git") || filename.startsWith(".") && !filename.includes("gripm") && !filename.includes("backlog"))) {
          return;
        }
        notifyChange(dir, filename);
      });
      watcher.on("error", (err) => {
        console.warn(`[gripm Watcher] Error on ${dir}:`, err?.message || err);
      });
      activeWatchers.push(watcher);
    } catch (err) {
      console.warn(`[gripm Watcher] Could not watch ${dir}:`, err.message);
    }
  }
}
function handleSseRoute(req, res, originHeader, isAllowedOrigin) {
  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  };
  if (originHeader && isAllowedOrigin) {
    sseHeaders["Access-Control-Allow-Origin"] = originHeader;
    sseHeaders["Vary"] = "Origin";
  }
  res.writeHead(200, sseHeaders);
  res.write(`event: connected
data: ${JSON.stringify({ status: "connected", clients: sseClients.size + 1 })}

`);
  sseClients.add(res);
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(pingInterval);
    sseClients.delete(res);
  };
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      cleanup();
    }
  }, 25e3);
  if (typeof pingInterval.unref === "function") pingInterval.unref();
  req.on("close", cleanup);
  req.on("error", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
}
var sseClients, activeWatchers;
var init_sseManager = __esm({
  "server/sse/sseManager.ts"() {
    "use strict";
    init_registry();
    sseClients = /* @__PURE__ */ new Set();
    activeWatchers = [];
  }
});

// server/middleware/security.ts
import crypto from "node:crypto";
function applySecurityHeaders(res) {
  if (typeof res.setHeader === "function") {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
    );
  }
}
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
function getBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = "";
    let receivedBytes = 0;
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) return;
      receivedBytes += chunk ? chunk.length || Buffer.byteLength(chunk) : 0;
      if (receivedBytes > MAX_BODY_SIZE) {
        aborted = true;
        const err = new Error("Payload Too Large: request body exceeds 10MB limit");
        err.statusCode = 413;
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Payload Too Large: request body exceeds 10MB limit" }));
        reject(err);
        if (typeof req.destroy === "function") req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (aborted) return;
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", (err) => {
      if (aborted) return;
      reject(err);
    });
  });
}
function getEphemeralToken() {
  return ephemeralToken;
}
function generateEphemeralToken() {
  ephemeralToken = crypto.randomBytes(16).toString("hex");
  return ephemeralToken;
}
function parseHostHeader(rawHost) {
  const trimmed = (rawHost || "").trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end !== -1) {
      return trimmed.slice(0, end + 1);
    }
  }
  return trimmed.split(":")[0];
}
function extractRequestToken(req) {
  const headerToken = req.headers["x-gripm-token"];
  if (headerToken && typeof headerToken === "string") {
    return headerToken.trim();
  }
  const authHeader = req.headers["authorization"];
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.url) {
    try {
      const urlObj = new URL(req.url, "http://localhost");
      const queryToken = urlObj.searchParams.get("token");
      if (queryToken) return queryToken.trim();
    } catch {
    }
  }
  return null;
}
function validateSecurity(req, res) {
  applySecurityHeaders(res);
  const hostHeader = parseHostHeader(req.headers.host || "");
  const originHeader = req.headers.origin;
  const configuredHost = (process.env.GRIPM_HOST || "127.0.0.1").toLowerCase();
  const isLoopbackHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostHeader);
  const isIpHost = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(hostHeader) || hostHeader.includes(":") || hostHeader.endsWith(".local");
  const extraAllowedHosts = (process.env.GRIPM_ALLOWED_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const isAllowedHost = isLoopbackHost || configuredHost !== "0.0.0.0" && hostHeader === configuredHost || configuredHost === "0.0.0.0" && isIpHost || extraAllowedHosts.includes(hostHeader);
  if (!isAllowedHost) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Forbidden: Invalid or untrusted Host header" }));
    return null;
  }
  let isAllowedOrigin = false;
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const originHost = originUrl.hostname.toLowerCase();
      const isLoopbackOrigin = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(originHost);
      isAllowedOrigin = isLoopbackOrigin || originHost === hostHeader || configuredHost !== "0.0.0.0" && originHost === configuredHost || extraAllowedHosts.includes(originHost);
      if (!isAllowedOrigin) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Forbidden: Cross-Origin request blocked" }));
        return null;
      }
    } catch {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Malformed Origin header" }));
      return null;
    }
  }
  let activeToken = process.env.GRIPM_TOKEN || getEphemeralToken();
  if (configuredHost === "0.0.0.0" && !activeToken) {
    activeToken = generateEphemeralToken();
    process.env.GRIPM_TOKEN = activeToken;
  }
  if (activeToken && !isLoopbackHost) {
    const providedToken = extractRequestToken(req);
    if (!providedToken || providedToken !== activeToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized: Ephemeral token required for LAN access" }));
      return null;
    }
  }
  const method = (req.method || "GET").toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const contentType = (req.headers["content-type"] || "").toLowerCase();
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > 0 || method === "POST" || method === "PUT") {
      if (!contentType.includes("application/json")) {
        res.statusCode = 415;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Unsupported Media Type: Content-Type must be application/json" }));
        return null;
      }
    }
  }
  if (method === "OPTIONS") {
    if (originHeader && isAllowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", originHeader);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Gripm-Token, Authorization");
    }
    res.statusCode = 204;
    res.end();
    return null;
  }
  return { isAllowedOrigin };
}
var MAX_BODY_SIZE, ephemeralToken;
var init_security = __esm({
  "server/middleware/security.ts"() {
    "use strict";
    MAX_BODY_SIZE = 10 * 1024 * 1024;
    ephemeralToken = null;
  }
});

// scripts/backlogMdParser.ts
function normalizeStatus(raw) {
  if (!raw) return "draft";
  const clean = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (clean) {
    case "ideas":
    case "idea":
    case "discovery":
      return "ideas";
    case "draft":
    case "drafts":
    case "backlog":
    case "todo":
    case "open":
      return "draft";
    case "doing":
    case "inprogress":
    case "wip":
    case "inprog":
    case "active":
    case "started":
      return "doing";
    case "blocked":
    case "impediment":
    case "block":
    case "hold":
    case "onhold":
      return "blocked";
    case "review":
    case "testing":
    case "testingqa":
    case "qa":
    case "test":
    case "inreview":
      return "review";
    case "ready":
    case "finish":
    case "readyfordeploy":
    case "staged":
    case "resolved":
      return "ready";
    case "done":
    case "deployed":
    case "closed":
    case "completed":
    case "shipped":
      return "done";
    case "dismissed":
    case "cancelled":
    case "canceled":
    case "abandoned":
    case "archived":
    case "archive":
      return "dismissed";
    default:
      return "draft";
  }
}
function formatStatusForMd(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case "ideas":
      return "ideas";
    case "draft":
      return "draft";
    case "doing":
      return "doing";
    case "blocked":
      return "blocked";
    case "review":
      return "review";
    case "ready":
      return "ready";
    case "done":
      return "done";
    case "dismissed":
      return "dismissed";
    default:
      return "draft";
  }
}
function normalizePriority(raw) {
  if (!raw) return "p2";
  const clean = raw.trim().toLowerCase();
  if (clean === "p0" || clean === "urgent" || clean === "critical") return "p0";
  if (clean === "p1" || clean === "high") return "p1";
  if (clean === "p2" || clean === "medium" || clean === "med") return "p2";
  if (clean === "p3" || clean === "low") return "p3";
  return "p2";
}
function formatPriorityForMd(p) {
  if (p === "p0") return "urgent";
  if (p === "p1") return "high";
  if (p === "p2") return "medium";
  if (p === "p3") return "low";
  return p || "medium";
}
function normalizeType(raw) {
  if (!raw) return "feature";
  const clean = raw.trim().toLowerCase();
  if (clean === "bugfix" || clean === "defect" || clean === "fix") return "bug";
  return clean;
}
function escapeSectionMarkers2(text) {
  if (!text) return text;
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!\\-- $1 -->");
}
function unescapeSectionMarkers(text) {
  if (!text) return text;
  return text.replace(/<!\\--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!-- $1 -->");
}
function getCodeFenceRanges(text) {
  const ranges = [];
  if (!text) return ranges;
  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match;
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;
  let fenceStart = -1;
  while ((match = lineRegex.exec(text)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;
    if (match[0].length === 0 && lineStart >= text.length) {
      break;
    }
    if (!inFence) {
      const openMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})/);
      if (openMatch) {
        const char = openMatch[1][0];
        const restOfLine = line.slice(openMatch.index + openMatch[0].length);
        if (char === "`" && restOfLine.includes("`")) {
          continue;
        }
        inFence = true;
        fenceChar = char;
        fenceLength = openMatch[1].length;
        fenceStart = lineStart;
      }
    } else {
      const closeMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLength) {
        ranges.push({ start: fenceStart, end: lineEnd });
        inFence = false;
        fenceChar = "";
        fenceLength = 0;
        fenceStart = -1;
      }
    }
  }
  if (inFence && fenceStart !== -1) {
    ranges.push({ start: fenceStart, end: text.length });
  }
  return ranges;
}
function isOffsetInFence(offset, fenceRanges) {
  for (const range of fenceRanges) {
    if (offset >= range.start && offset < range.end) {
      return true;
    }
  }
  return false;
}
function extractMarkerContent(text, beginMarkerName, endMarkerName) {
  if (!text) return null;
  const fenceRanges = getCodeFenceRanges(text);
  const beginRegex = new RegExp(`<!--\\s*${beginMarkerName}\\s*-->`, "gi");
  const endRegex = new RegExp(`<!--\\s*${endMarkerName}\\s*-->`, "gi");
  let beginMatch = null;
  while ((beginMatch = beginRegex.exec(text)) !== null) {
    if (!isOffsetInFence(beginMatch.index, fenceRanges)) {
      break;
    }
  }
  if (!beginMatch) {
    return null;
  }
  const payloadStart = beginMatch.index + beginMatch[0].length;
  endRegex.lastIndex = payloadStart;
  let endMatch = null;
  while ((endMatch = endRegex.exec(text)) !== null) {
    if (!isOffsetInFence(endMatch.index, fenceRanges)) {
      break;
    }
  }
  if (!endMatch) {
    return text.slice(payloadStart);
  }
  return text.slice(payloadStart, endMatch.index);
}
function extractSectionBlock(body, headerName) {
  if (!body) return "";
  const fenceRanges = getCodeFenceRanges(body);
  const escapedHeader = headerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const targetHeaderRegex = new RegExp(`^[ ]{0,3}##\\s+${escapedHeader}\\b[^\r
]*`, "i");
  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match;
  let sectionFound = false;
  let startIndex = -1;
  let endIndex = body.length;
  while ((match = lineRegex.exec(body)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;
    if (match[0].length === 0 && lineStart >= body.length) {
      break;
    }
    if (!isOffsetInFence(lineStart, fenceRanges)) {
      const isH2 = /^[ ]{0,3}##\s+[^\r\n]*/.test(line);
      if (isH2) {
        if (!sectionFound) {
          if (targetHeaderRegex.test(line)) {
            sectionFound = true;
            startIndex = lineEnd;
          }
        } else {
          endIndex = lineStart;
          break;
        }
      }
    }
  }
  if (!sectionFound || startIndex === -1) {
    return "";
  }
  return body.slice(startIndex, endIndex);
}
function unquoteYamlScalar(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "	");
    }
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
function cleanItem(val) {
  return unquoteYamlScalar(val);
}
function parseInlineList(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  const items = [];
  let currentToken = "";
  let inQuote = null;
  let escaped = false;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (escaped) {
      currentToken += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      currentToken += char;
      continue;
    }
    if (inQuote) {
      currentToken += char;
      if (char === inQuote) {
        inQuote = null;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = char;
        currentToken += char;
      } else if (char === ",") {
        const item = cleanItem(currentToken);
        if (item) items.push(item);
        currentToken = "";
      } else {
        currentToken += char;
      }
    }
  }
  const lastItem = cleanItem(currentToken);
  if (lastItem) items.push(lastItem);
  return items;
}
function parseBacklogMd(content, defaultId = "") {
  const result = {
    id: defaultId,
    title: "Sin t\xEDtulo",
    status: "draft",
    type: "feature",
    priority: "p2",
    assignees: [],
    labels: [],
    dependencies: [],
    acceptanceCriteria: [],
    rawExtraFrontmatter: {}
  };
  if (!content) return result;
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 65279) {
    cleanContent = cleanContent.slice(1);
  }
  let bodyContent = cleanContent;
  const frontmatterMatch = cleanContent.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (frontmatterMatch) {
    const rawFm = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2] || "";
    const lines = rawFm.split(/\r?\n/);
    let currentKey = "";
    let currentList = [];
    let inList = false;
    const finalizeList = () => {
      if (inList && currentKey) {
        if (currentKey === "labels") result.labels = currentList;
        else if (currentKey === "assignee" || currentKey === "assignees") result.assignees = currentList;
        else if (currentKey === "dependencies") result.dependencies = currentList;
        else if (currentKey === "blocks") result.blocks = currentList;
        else if (currentKey === "blocked_by" || currentKey === "blockedby") result.blockedBy = currentList;
        else if (currentKey === "related_to" || currentKey === "relatedto") result.relatedTo = currentList;
        else if (currentKey === "sprints") {
          result.sprints = currentList;
          if (currentList.length > 0 && !result.sprint) {
            result.sprint = currentList[currentList.length - 1];
            result.targetSprint = currentList[currentList.length - 1];
          }
        } else if (currentKey === "releases" || currentKey === "release") result.releases = currentList;
        else {
          if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
          result.rawExtraFrontmatter[currentKey] = currentList;
        }
      }
      inList = false;
      currentList = [];
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("- ")) {
        const itemVal = unquoteYamlScalar(trimmed.replace(/^- /, ""));
        currentList.push(itemVal);
        continue;
      }
      if (inList && !line.startsWith(" ") && !line.startsWith("	")) {
        finalizeList();
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const rawKey = line.slice(0, colonIdx).trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(rawKey)) {
          continue;
        }
        const key = rawKey.toLowerCase();
        const rawVal = line.slice(colonIdx + 1).trim();
        const cleanVal = unquoteYamlScalar(rawVal);
        currentKey = key;
        if (!rawVal) {
          inList = true;
          currentList = [];
          continue;
        }
        if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
          const items = parseInlineList(rawVal);
          if (key === "labels") result.labels = items;
          else if (key === "assignee" || key === "assignees") result.assignees = items;
          else if (key === "dependencies") result.dependencies = items;
          else if (key === "blocks") result.blocks = items;
          else if (key === "blocked_by" || key === "blockedby") result.blockedBy = items;
          else if (key === "related_to" || key === "relatedto") result.relatedTo = items;
          else if (key === "sprints") {
            result.sprints = items;
            if (items.length > 0 && !result.sprint) {
              result.sprint = items[items.length - 1];
              result.targetSprint = items[items.length - 1];
            }
          } else if (key === "releases" || key === "release") result.releases = items;
          else {
            if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
            result.rawExtraFrontmatter[key] = items;
          }
          continue;
        }
        switch (key) {
          case "id":
            result.id = cleanVal;
            break;
          case "title":
            result.title = cleanVal;
            break;
          case "status":
            result.rawStatus = cleanVal;
            result.status = normalizeStatus(cleanVal);
            break;
          case "type":
            result.type = normalizeType(cleanVal);
            break;
          case "priority":
            result.priority = cleanVal;
            break;
          case "milestone":
            result.milestone = cleanVal;
            break;
          case "module":
            result.module = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.module = cleanVal;
            break;
          case "epic":
            result.epic = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.epic = cleanVal;
            break;
          case "category":
            result.category = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.category = cleanVal;
            break;
          case "impactedfile":
            result.impactedFile = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.impactedFile = cleanVal;
            break;
          case "risk":
            result.risk = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.risk = cleanVal;
            break;
          case "fix":
            result.fix = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.fix = cleanVal;
            break;
          case "parent":
          case "parentid":
            result.parentId = cleanVal;
            break;
          case "blocks":
            result.blocks = [cleanVal];
            break;
          case "blocked_by":
          case "blockedby":
            result.blockedBy = [cleanVal];
            break;
          case "blocked_reason":
          case "blockedreason":
            result.blockedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.blocked_reason = cleanVal;
            break;
          case "dismissed_reason":
          case "dismissedreason":
            result.dismissedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.dismissed_reason = cleanVal;
            break;
          case "related_to":
          case "relatedto":
            result.relatedTo = [cleanVal];
            break;
          case "sprints":
            result.sprints = [cleanVal];
            break;
          case "releases":
            result.releases = [cleanVal];
            break;
          case "sprint":
          case "targetsprint":
            result.sprint = cleanVal;
            result.targetSprint = cleanVal;
            if (!result.sprints || result.sprints.length === 0) {
              result.sprints = [cleanVal];
            }
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.sprint = cleanVal;
              result.rawExtraFrontmatter.targetSprint = cleanVal;
            }
            break;
          case "release":
          case "targetrelease":
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.release = cleanVal;
              result.rawExtraFrontmatter.targetRelease = cleanVal;
            }
            break;
          case "created_date":
          case "createdat":
            result.createdDate = cleanVal;
            break;
          case "updated_date":
          case "updatedat":
            result.updatedDate = cleanVal;
            break;
          case "start_date":
          case "startdate":
            result.startDate = cleanVal;
            break;
          case "due_date":
          case "duedate":
          case "target_date":
          case "targetdate":
            result.dueDate = cleanVal;
            break;
          case "assignee":
            result.assignees = [cleanVal];
            break;
          case "isdeleted":
            result.isDeleted = cleanVal.toLowerCase() === "true";
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "deletedat":
            result.deletedAt = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "previousstatus":
            result.previousStatus = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "estimate":
          case "estimation":
          case "points":
          case "story_points":
          case "storypoints": {
            const num = Number(cleanVal);
            result.estimate = !isNaN(num) && cleanVal !== "" && !cleanVal.includes(" ") ? num : cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.estimate = cleanVal;
            }
            break;
          }
          default:
            if (result.rawExtraFrontmatter) {
              if (rawVal === "true") {
                result.rawExtraFrontmatter[key] = true;
              } else if (rawVal === "false") {
                result.rawExtraFrontmatter[key] = false;
              } else if (/^-?\d+(?:\.\d+)?$/.test(rawVal)) {
                result.rawExtraFrontmatter[key] = Number(rawVal);
              } else {
                result.rawExtraFrontmatter[key] = cleanVal;
              }
            }
            break;
        }
      }
    }
    finalizeList();
    if (result.sprints && result.sprints.length > 0 && !result.sprint) {
      result.sprint = result.sprints[result.sprints.length - 1];
      result.targetSprint = result.sprint;
    }
  }
  const descBlock = extractSectionBlock(bodyContent, "Description");
  const descMarker = extractMarkerContent(descBlock || bodyContent, "SECTION:DESCRIPTION:BEGIN", "SECTION:DESCRIPTION:END");
  if (descMarker !== null) {
    result.description = unescapeSectionMarkers(descMarker.trim());
  } else if (descBlock) {
    result.description = unescapeSectionMarkers(descBlock.trim());
  }
  const acBlock = extractSectionBlock(bodyContent, "Acceptance Criteria");
  const acMarker = extractMarkerContent(acBlock || bodyContent, "AC:BEGIN", "AC:END");
  let acText = "";
  if (acMarker !== null) {
    acText = acMarker;
  } else if (acBlock) {
    acText = acBlock;
  }
  if (acText) {
    const acFenceRanges = getCodeFenceRanges(acText);
    const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
    let match;
    const parsedAC = [];
    let autoIndex = 1;
    while ((match = lineRegex.exec(acText)) !== null) {
      const line = match[1];
      const lineStart = match.index;
      if (match[0].length === 0 && lineStart >= acText.length) break;
      if (!isOffsetInFence(lineStart, acFenceRanges)) {
        const itemMatch = line.match(/^-\s*\[([ xX])\]\s*(?:#(\d+)\s+)?(.*)$/);
        if (itemMatch) {
          const checked = itemMatch[1].toLowerCase() === "x";
          const num = itemMatch[2] ? parseInt(itemMatch[2], 10) : autoIndex++;
          const text = unescapeSectionMarkers(itemMatch[3].trim());
          parsedAC.push({ index: num, text, checked });
        }
      }
    }
    result.acceptanceCriteria = parsedAC;
  }
  const planBlock = extractSectionBlock(bodyContent, "Implementation Plan");
  const planMarker = extractMarkerContent(planBlock || bodyContent, "SECTION:PLAN:BEGIN", "SECTION:PLAN:END");
  if (planMarker !== null) {
    result.implementationPlan = unescapeSectionMarkers(planMarker.trim());
  } else if (planBlock) {
    result.implementationPlan = unescapeSectionMarkers(planBlock.trim());
  }
  const notesBlock = extractSectionBlock(bodyContent, "Implementation Notes");
  const notesMarker = extractMarkerContent(notesBlock || bodyContent, "SECTION:NOTES:BEGIN", "SECTION:NOTES:END");
  if (notesMarker !== null) {
    result.implementationNotes = unescapeSectionMarkers(notesMarker.trim());
  } else if (notesBlock) {
    result.implementationNotes = unescapeSectionMarkers(notesBlock.trim());
  }
  const summaryBlock = extractSectionBlock(bodyContent, "Final Summary");
  const summaryMarker = extractMarkerContent(summaryBlock || bodyContent, "SECTION:FINAL_SUMMARY:BEGIN", "SECTION:FINAL_SUMMARY:END");
  if (summaryMarker !== null) {
    result.finalSummary = unescapeSectionMarkers(summaryMarker.trim());
  } else if (summaryBlock) {
    result.finalSummary = unescapeSectionMarkers(summaryBlock.trim());
  }
  return result;
}
function serializeBacklogMd(task) {
  const frontmatterLines = ["---"];
  const cleanId = (task.id || "").replace(/[\r\n]+/g, "").trim();
  frontmatterLines.push(`id: ${cleanId}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || "Sin t\xEDtulo")}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push("assignee:");
    task.assignees.forEach((a) => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }
  const nowStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
  const cleanCreated = (task.createdDate || nowStr).replace(/[\r\n']+/g, "").trim();
  const cleanUpdated = (task.updatedDate || nowStr).replace(/[\r\n']+/g, "").trim();
  frontmatterLines.push(`created_date: '${cleanCreated}'`);
  frontmatterLines.push(`updated_date: '${cleanUpdated}'`);
  if (task.labels && task.labels.length > 0) {
    frontmatterLines.push("labels:");
    task.labels.forEach((l) => frontmatterLines.push(`  - ${JSON.stringify(l)}`));
  } else {
    frontmatterLines.push("labels: []");
  }
  if (task.dependencies && task.dependencies.length > 0) {
    frontmatterLines.push("dependencies:");
    task.dependencies.forEach((d) => frontmatterLines.push(`  - ${JSON.stringify(d)}`));
  } else {
    frontmatterLines.push("dependencies: []");
  }
  frontmatterLines.push(`priority: ${formatPriorityForMd(task.priority || "p2")}`);
  if (task.type) {
    const cleanType = String(task.type).replace(/[\r\n]+/g, "").trim();
    if (/^[a-zA-Z0-9_-]+$/.test(cleanType)) {
      frontmatterLines.push(`type: ${cleanType}`);
    } else {
      frontmatterLines.push(`type: ${JSON.stringify(cleanType)}`);
    }
  }
  if (task.milestone) {
    frontmatterLines.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }
  if (task.parentId) {
    frontmatterLines.push(`parent: ${JSON.stringify(task.parentId)}`);
  }
  if (task.blocks && task.blocks.length > 0) {
    frontmatterLines.push("blocks:");
    task.blocks.forEach((b) => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }
  if (task.blockedBy && task.blockedBy.length > 0) {
    frontmatterLines.push("blocked_by:");
    task.blockedBy.forEach((b) => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }
  if (task.blockedReason) {
    frontmatterLines.push(`blocked_reason: ${JSON.stringify(task.blockedReason)}`);
  }
  if (task.dismissedReason) {
    frontmatterLines.push(`dismissed_reason: ${JSON.stringify(task.dismissedReason)}`);
  }
  if (task.relatedTo && task.relatedTo.length > 0) {
    frontmatterLines.push("related_to:");
    task.relatedTo.forEach((r) => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }
  const isInvalidSprint = (s) => {
    if (!s) return true;
    const clean = s.trim().toLowerCase();
    return clean === "backlog-futuro" || clean === "sin-sprint" || clean === "sin sprint" || clean === "backlog" || clean === "none" || clean === "null";
  };
  if (task.sprints && task.sprints.length > 0) {
    const validSprints = task.sprints.filter((s) => !isInvalidSprint(s));
    if (validSprints.length > 0) {
      frontmatterLines.push("sprints:");
      validSprints.forEach((s) => frontmatterLines.push(`  - ${JSON.stringify(s)}`));
    }
  }
  if (task.releases && task.releases.length > 0) {
    frontmatterLines.push("releases:");
    task.releases.forEach((r) => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }
  if (task.sprint && !isInvalidSprint(task.sprint)) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }
  if (task.targetSprint && task.targetSprint !== task.sprint && !isInvalidSprint(task.targetSprint)) {
    frontmatterLines.push(`targetSprint: ${JSON.stringify(task.targetSprint)}`);
  }
  if (task.isDeleted) {
    frontmatterLines.push("isDeleted: true");
    if (task.deletedAt) {
      frontmatterLines.push(`deletedAt: ${JSON.stringify(task.deletedAt)}`);
    }
    if (task.previousStatus) {
      frontmatterLines.push(`previousStatus: ${JSON.stringify(task.previousStatus)}`);
    }
  }
  if (task.estimate !== void 0 && task.estimate !== null && task.estimate !== "") {
    if (typeof task.estimate === "number") {
      frontmatterLines.push(`estimate: ${task.estimate}`);
    } else {
      frontmatterLines.push(`estimate: ${JSON.stringify(task.estimate)}`);
    }
  }
  if (task.startDate) {
    frontmatterLines.push(`start_date: ${JSON.stringify(task.startDate)}`);
  }
  if (task.dueDate) {
    frontmatterLines.push(`due_date: ${JSON.stringify(task.dueDate)}`);
  }
  if (task.rawExtraFrontmatter) {
    for (const [k, v] of Object.entries(task.rawExtraFrontmatter)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(k)) {
        continue;
      }
      if (!["id", "title", "status", "assignee", "assignees", "created_date", "updated_date", "labels", "dependencies", "priority", "type", "milestone", "parent", "parentid", "blocks", "blocked_by", "blockedby", "blocked_reason", "blockedreason", "dismissed_reason", "dismissedreason", "related_to", "relatedto", "sprints", "releases", "sprint", "targetsprint", "isdeleted", "deletedat", "previousstatus", "estimate", "estimation", "points", "story_points", "storypoints", "start_date", "startdate", "due_date", "duedate", "target_date", "targetdate"].includes(k.toLowerCase())) {
        if (v === void 0 || v === null) {
          continue;
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            frontmatterLines.push(`${k}: []`);
          } else {
            frontmatterLines.push(`${k}:`);
            v.forEach((item) => frontmatterLines.push(`  - ${JSON.stringify(item)}`));
          }
        } else if (typeof v === "number" || typeof v === "boolean") {
          frontmatterLines.push(`${k}: ${v}`);
        } else {
          frontmatterLines.push(`${k}: ${JSON.stringify(v)}`);
        }
      }
    }
  }
  frontmatterLines.push("---");
  frontmatterLines.push("");
  const bodySections = [];
  bodySections.push("## Description\n");
  bodySections.push("<!-- SECTION:DESCRIPTION:BEGIN -->");
  bodySections.push(escapeSectionMarkers2(task.description || ""));
  bodySections.push("<!-- SECTION:DESCRIPTION:END -->\n");
  bodySections.push("## Acceptance Criteria\n");
  bodySections.push("<!-- AC:BEGIN -->");
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, i) => {
      const idx = ac.index || i + 1;
      const mark = ac.checked ? "x" : " ";
      bodySections.push(`- [${mark}] #${idx} ${escapeSectionMarkers2(ac.text)}`);
    });
  }
  bodySections.push("<!-- AC:END -->\n");
  bodySections.push("## Implementation Plan\n");
  bodySections.push("<!-- SECTION:PLAN:BEGIN -->");
  if (task.implementationPlan) {
    bodySections.push(escapeSectionMarkers2(task.implementationPlan));
  }
  bodySections.push("<!-- SECTION:PLAN:END -->\n");
  if (task.implementationNotes) {
    bodySections.push("## Implementation Notes\n");
    bodySections.push("<!-- SECTION:NOTES:BEGIN -->");
    bodySections.push(escapeSectionMarkers2(task.implementationNotes));
    bodySections.push("<!-- SECTION:NOTES:END -->\n");
  }
  if (task.finalSummary) {
    bodySections.push("## Final Summary\n");
    bodySections.push("<!-- SECTION:FINAL_SUMMARY:BEGIN -->");
    bodySections.push(escapeSectionMarkers2(task.finalSummary));
    bodySections.push("<!-- SECTION:FINAL_SUMMARY:END -->\n");
  }
  return `${frontmatterLines.join("\n")}
${bodySections.join("\n")}`;
}
function generateTaskFilename(id, title) {
  const sanitizedId = (id || "").replace(/[^a-zA-Z0-9_-]/g, "").replace(/--+/g, "-").trim().toUpperCase();
  const cleanId = sanitizedId || "TASK";
  let cleanTitle = (title || "Task").replace(/[/\\:*?"<>|]/g, "").replace(/\.\.+/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleanTitle.length > 200) {
    cleanTitle = cleanTitle.slice(0, 200).trim();
  }
  return `${cleanId} - ${cleanTitle || "Task"}.md`;
}
function generateMonolithicBacklogMd(projectName, items) {
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const lines = [
    `# Backlog: ${projectName}`,
    `> Consolidado generado el ${now} por gripm`,
    "",
    "## Resumen de Estados",
    ""
  ];
  const statuses = ["ideas", "doing", "blocked", "review", "ready", "draft", "done", "dismissed", "cancelled"];
  const grouped = {
    ideas: [],
    doing: [],
    blocked: [],
    review: [],
    ready: [],
    draft: [],
    done: [],
    dismissed: [],
    cancelled: []
  };
  for (const item of items) {
    const s = item.status || "draft";
    if (grouped[s]) grouped[s].push(item);
    else grouped.draft.push(item);
  }
  for (const s of statuses) {
    const list = grouped[s];
    if (list.length === 0) continue;
    const titleMap = {
      ideas: "\u{1F4A1} Ideas / Discovery",
      doing: "\u26A1 In Progress / Doing",
      review: "\u{1F50D} Review & QA",
      ready: "\u{1F680} Ready for Deploy",
      draft: "\u{1F4CB} Backlog / Draft",
      done: "\u2705 Done / Deployed",
      dismissed: "\u{1F4E6} Archivadas / Descartadas",
      cancelled: "\u{1F6AB} Canceladas / Cancelled"
    };
    lines.push(`### ${titleMap[s] || s.toUpperCase()} (${list.length})`);
    lines.push("");
    for (const item of list) {
      lines.push(`#### [${item.id}] ${item.title}`);
      lines.push(`- **Prioridad**: \`${item.priority || "p2"}\` | **Tipo**: \`${item.type || "feature"}\``);
      if (item.milestone) lines.push(`- **Sprint / Milestone**: ${item.milestone}`);
      if (item.description) lines.push(`
${item.description}
`);
      if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
        lines.push("**Criterios de Aceptaci\xF3n:**");
        item.acceptanceCriteria.forEach((ac) => {
          lines.push(`- [${ac.checked ? "x" : " "}] #${ac.index} ${ac.text}`);
        });
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }
  return lines.join("\n");
}
var init_backlogMdParser = __esm({
  "scripts/backlogMdParser.ts"() {
    "use strict";
  }
});

// server/utils/fs-lock.ts
import fs8 from "node:fs";
import path8 from "node:path";
function getLockFilePath(targetPath) {
  const resolved = path8.resolve(targetPath);
  return resolved.endsWith(".lock") ? resolved : `${resolved}.lock`;
}
function sleepSync(ms) {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
    }
  }
}
function calculateNextDelay(currentDelay, maxDelay) {
  const jitter = 0.8 + Math.random() * 0.4;
  const next = Math.min(Math.round(currentDelay * 1.5 * jitter), maxDelay);
  return Math.max(10, next);
}
function checkAndCleanStaleLock(lockFilePath, staleTimeoutMs) {
  try {
    const stat = fs8.statSync(lockFilePath);
    const age = Date.now() - stat.mtimeMs;
    let isStale = age > staleTimeoutMs;
    if (!isStale) {
      try {
        const content = fs8.readFileSync(lockFilePath, "utf8");
        const payload = JSON.parse(content);
        if (typeof payload.expiresAt === "number" && Date.now() > payload.expiresAt) {
          isStale = true;
        }
      } catch {
      }
    }
    if (isStale) {
      try {
        fs8.unlinkSync(lockFilePath);
        return true;
      } catch {
      }
    }
  } catch (statErr) {
    const err = statErr;
    if (err && err.code === "ENOENT") {
      return true;
    }
  }
  return false;
}
function acquireLockSync(targetPath, options) {
  const lockFilePath = getLockFilePath(targetPath);
  const timeoutMs = options?.timeoutMs ?? 1e4;
  const minDelay = options?.minRetryDelayMs ?? 25;
  const maxDelay = options?.maxRetryDelayMs ?? 250;
  const staleTimeoutMs = options?.staleTimeoutMs ?? 5e3;
  const dir = path8.dirname(lockFilePath);
  if (!fs8.existsSync(dir)) {
    fs8.mkdirSync(dir, { recursive: true });
  }
  const startTime = Date.now();
  let currentDelay = minDelay;
  while (true) {
    try {
      const fd = fs8.openSync(lockFilePath, "wx");
      const payload = {
        pid: process.pid,
        createdAt: Date.now(),
        expiresAt: Date.now() + staleTimeoutMs,
        metadata: options?.metadata
      };
      try {
        fs8.writeFileSync(fd, JSON.stringify(payload), "utf8");
      } finally {
        try {
          fs8.closeSync(fd);
        } catch {
        }
      }
      return {
        lockPath: lockFilePath,
        targetPath: path8.resolve(targetPath),
        acquiredAt: Date.now(),
        release: () => releaseLockSync(lockFilePath)
      };
    } catch (openErr) {
      const err = openErr;
      if (err && err.code === "EEXIST") {
        const cleaned = checkAndCleanStaleLock(lockFilePath, staleTimeoutMs);
        if (cleaned) {
          continue;
        }
        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(`[fs-lock] Excedido timeout de ${timeoutMs}ms intentando adquirir lock: ${lockFilePath}`);
        }
        sleepSync(currentDelay);
        currentDelay = calculateNextDelay(currentDelay, maxDelay);
        continue;
      }
      throw openErr;
    }
  }
}
function releaseLockSync(targetPath) {
  const lockFilePath = getLockFilePath(targetPath);
  try {
    if (fs8.existsSync(lockFilePath)) {
      fs8.unlinkSync(lockFilePath);
    }
  } catch (unlinkErr) {
    const err = unlinkErr;
    if (err && err.code !== "ENOENT") {
    }
  }
}
function withFileLockSync(targetPath, fn, options) {
  const handle = acquireLockSync(targetPath, options);
  try {
    return fn();
  } finally {
    handle.release();
  }
}
var init_fs_lock = __esm({
  "server/utils/fs-lock.ts"() {
    "use strict";
  }
});

// server/services/backlogService.ts
import fs9 from "node:fs";
import path9 from "node:path";
import { execSync } from "node:child_process";
function resolveJsonBacklogPath(project) {
  if (project.isDemo) return DEMO_FILE2;
  if (project.repoPath) {
    return path9.join(project.repoPath, ".gripm/backlog.json");
  }
  return path9.join(PKG_ROOT2, `data/${project.id}-backlog.json`);
}
function getProjectTasksDir(project) {
  if (!project.repoPath) return "";
  return path9.join(project.repoPath, project.backlogDir || "backlog", "tasks");
}
function getProjectSprintsPath(project) {
  if (!project.repoPath) return "";
  return path9.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
}
function getProjectReleasesPath(project) {
  if (!project.repoPath) return "";
  return path9.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
}
function getProjectRetrospectivesPath(project) {
  if (!project.repoPath) return "";
  return path9.join(project.repoPath, project.backlogDir || "backlog", "retrospectives.json");
}
function getProjectTaskAllocationLockPath(project) {
  if (project.repoPath) {
    const baseDir = path9.join(project.repoPath, project.backlogDir || "backlog");
    return path9.join(baseDir, ".task-allocation.lock");
  }
  return path9.join(PKG_ROOT2, `data/.${project.id}-task-allocation.lock`);
}
function validateVerifyCommand(cmd, repoPath) {
  if (!cmd || typeof cmd !== "string") {
    return { valid: false, reason: "El comando de verificaci\xF3n debe ser un texto no vac\xEDo." };
  }
  const trimmed = cmd.trim();
  if (!trimmed) {
    return { valid: false, reason: "El comando de verificaci\xF3n no puede estar vac\xEDo." };
  }
  const forbiddenChars = /[|&;`$()<>\n\r'"]/;
  if (forbiddenChars.test(trimmed)) {
    return {
      valid: false,
      reason: "Contiene metacaracteres o secuencias de encadenamiento de shell no permitidas ('|', '&', ';', '`', '$()', '<', '>', comillas)."
    };
  }
  const tokens = trimmed.split(/\s+/);
  const runner = tokens[0].toLowerCase();
  const tokenPattern = /^[a-zA-Z0-9_\-.:/\\=]+$/;
  for (const token of tokens) {
    if (!tokenPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' contiene caracteres no permitidos. Solo se permiten caracteres alfanum\xE9ricos y separadores est\xE1ndar (- _ . : / \\ =).`
      };
    }
  }
  const forbiddenFlagPattern = /^(--prefix|--config|-c|--script-shell|--eval|-e|--import|--loader)(?:=.*)?$/i;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (forbiddenFlagPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (flags de configuraci\xF3n/evasi\xF3n prohibidas).`
      };
    }
    if (token.includes("..")) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (secuencias relativas '..' prohibidas).`
      };
    }
    if (token.startsWith("/") || token.startsWith("\\") || /^[a-zA-Z]:[/\\]/.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (rutas absolutas prohibidas).`
      };
    }
  }
  let pkgScripts = {};
  let pkgDeps = /* @__PURE__ */ new Set();
  try {
    const pkgPath = path9.join(repoPath, "package.json");
    if (fs9.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs9.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && typeof pkg.scripts === "object") {
        pkgScripts = pkg.scripts;
      }
      if (pkg.dependencies && typeof pkg.dependencies === "object") {
        Object.keys(pkg.dependencies).forEach((d) => pkgDeps.add(d));
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === "object") {
        Object.keys(pkg.devDependencies).forEach((d) => pkgDeps.add(d));
      }
    }
  } catch {
  }
  if (["npm", "pnpm", "yarn"].includes(runner)) {
    const subCmd = tokens[1];
    if (!subCmd) {
      return {
        valid: false,
        reason: `Debe especificar un subcomando para ${runner} (ej: '${runner} test' o '${runner} run <script>').`
      };
    }
    if (subCmd === "test" || subCmd === "t") {
      if (!pkgScripts["test"]) {
        return {
          valid: false,
          reason: `El script 'test' no est\xE1 definido en el package.json de '${repoPath}'.`
        };
      }
      return { valid: true, command: trimmed };
    }
    if (subCmd === "run") {
      const scriptName = tokens[2];
      if (!scriptName) {
        return {
          valid: false,
          reason: `Debe especificar el nombre del script a ejecutar (ej: '${runner} run <script>').`
        };
      }
      if (!pkgScripts[scriptName]) {
        return {
          valid: false,
          reason: `El script '${scriptName}' no est\xE1 definido en los scripts de package.json.`
        };
      }
      return { valid: true, command: trimmed };
    }
    if ((runner === "yarn" || runner === "pnpm") && pkgScripts[subCmd]) {
      return { valid: true, command: trimmed };
    }
    return {
      valid: false,
      reason: `Subcomando '${subCmd}' no autorizado para ${runner}. Solo se permiten '${runner} test' o '${runner} run <script>'.`
    };
  }
  if (runner === "npx") {
    const tool = tokens[1];
    if (!tool) {
      return {
        valid: false,
        reason: "Debe especificar la herramienta a ejecutar con npx (ej: 'npx tsc --noEmit')."
      };
    }
    const safeToolsAllowlist = /* @__PURE__ */ new Set([
      "tsc",
      "eslint",
      "vitest",
      "jest",
      "playwright",
      "prettier",
      "biome"
    ]);
    if (!safeToolsAllowlist.has(tool) && !pkgDeps.has(tool)) {
      return {
        valid: false,
        reason: `La herramienta '${tool}' no est\xE1 permitida para ejecuci\xF3n con npx. Solo se permiten herramientas del stack de calidad (${Array.from(safeToolsAllowlist).join(", ")}) o dependencias declaradas en package.json.`
      };
    }
    return { valid: true, command: trimmed };
  }
  return {
    valid: false,
    reason: `El ejecutable '${runner}' no est\xE1 permitido en verifyCommand. Solo se permiten scripts de package.json ('npm test', 'npm run <script>') o herramientas de verificaci\xF3n ('npx <herramienta>').`
  };
}
function validateGatekeeperTransition(task, targetStatus, options, repoPath) {
  const normTarget = normalizeStatus(targetStatus);
  const isTransitionToTerminal = normTarget === "ready" || normTarget === "done";
  if (!options?.force && isTransitionToTerminal) {
    const acs = task.acceptanceCriteriaList || task.acceptanceCriteria || [];
    const unchecked = acs.filter((ac) => !ac.checked);
    if (unchecked.length > 0) {
      const taskId = task.code || task.id || "desconocida";
      const uncheckedList = unchecked.map((ac) => ` - [ ] #${ac.index} ${ac.text}`).join("\n");
      throw new Error(
        `[MCP Gatekeeper] Transici\xF3n rechazada: No se puede mover la tarea '${taskId}' a '${normTarget}' porque tiene ${unchecked.length} criterio(s) de aceptaci\xF3n sin cumplir:
${uncheckedList}

Acci\xF3n correctiva: Completa la implementaci\xF3n de cada criterio pendiente y m\xE1rcalo como completado (- [x]) antes de certificar la tarea como '${normTarget}'.`
      );
    }
    const verifyCmd = options?.verifyCommand;
    if (verifyCmd && typeof verifyCmd === "string") {
      const execCwd = repoPath || process.cwd();
      const validation = validateVerifyCommand(verifyCmd, execCwd);
      if (!validation.valid) {
        throw new Error(
          `[MCP Gatekeeper Security] Transici\xF3n rechazada: El comando de verificaci\xF3n '${verifyCmd}' no est\xE1 permitido al intentar mover '${task.code || task.id}' a '${normTarget}':
${validation.reason}

Acci\xF3n correctiva: Utiliza \xFAnicamente scripts definidos en package.json (ej: 'npm test', 'npm run <script>') o herramientas autorizadas ('npx tsc --noEmit').`
        );
      }
      try {
        execSync(validation.command || verifyCmd, {
          cwd: execCwd,
          stdio: "pipe",
          encoding: "utf8",
          timeout: 15e3
        });
      } catch (execErr) {
        const outMsg = (execErr.stderr || execErr.stdout || execErr.message || "").toString().trim();
        throw new Error(
          `[MCP Gatekeeper] Transici\xF3n rechazada: El comando de verificaci\xF3n '${verifyCmd}' fall\xF3 al intentar mover '${task.code || task.id}' a '${normTarget}':
${outMsg}

Acci\xF3n correctiva: Revisa los errores del script de verificaci\xF3n, soluciona los fallos y vuelve a intentar certificar la tarea.`
        );
      }
    }
  }
}
function resolveLegibleSprint(project, val) {
  if (!val) return void 0;
  const clean = String(val).trim();
  if (!clean) return void 0;
  const lower = clean.toLowerCase();
  if (lower === "backlog-futuro" || lower === "backlog" || lower === "sin sprint" || lower === "sin-sprint" || lower === "none" || lower === "null") {
    return void 0;
  }
  if (!project.repoPath) return clean;
  const sprintsPath = getProjectSprintsPath(project);
  if (fs9.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs9.readFileSync(sprintsPath, "utf8"));
      if (Array.isArray(registeredSprints) && registeredSprints.length > 0) {
        const matched = registeredSprints.find(
          (s) => s.id && s.id.toLowerCase() === lower || s.name && s.name.trim().toLowerCase() === lower
        );
        if (matched) {
          return matched.name || clean;
        }
      }
    } catch {
    }
  }
  if (lower.startsWith("sprint-") || lower.includes("backlog-futuro")) {
    return void 0;
  }
  return clean;
}
function parseReleaseNotesMd(repoPath, projectPrefix, knownItems = []) {
  if (!repoPath) return [];
  const possiblePaths = [
    path9.join(repoPath, "docs/RELEASE_NOTES.md"),
    path9.join(repoPath, "docs/releasenotes.md"),
    path9.join(repoPath, "RELEASE_NOTES.md"),
    path9.join(repoPath, "releasenotes.md"),
    path9.join(repoPath, "docs/CHANGELOG.md"),
    path9.join(repoPath, "CHANGELOG.md"),
    path9.join(repoPath, "changelog.md")
  ];
  let notesContent = "";
  for (const p of possiblePaths) {
    if (fs9.existsSync(p)) {
      try {
        notesContent = fs9.readFileSync(p, "utf8");
        break;
      } catch {
      }
    }
  }
  if (!notesContent.trim()) return [];
  const knownCodeSet = new Set(knownItems.map((it) => (it.code || it.id || "").toUpperCase()).filter(Boolean));
  const prefixUpper = (projectPrefix || "").toUpperCase().trim();
  const sections = notesContent.split(/(?=^##\s+)/m);
  const releases = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith("##")) continue;
    const firstLineEnd = trimmed.indexOf("\n");
    const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
    const bodyContent = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1) : "";
    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\] - - -]+)?)\]?/);
    if (!vMatch) continue;
    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, "");
    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : "";
    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, "").trim();
    if (date) {
      title = title.replace(date, "").trim();
    }
    title = title.replace(/^[-:\u2014\u2013🚀 ]+/, "").trim();
    if (!title) title = `Release ${version}`;
    let summary = "";
    const summaryMatch = bodyContent.match(/###\s*(?:🎯\s*)?Resumen\s*\n+([^\n#]+)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].replace(/^\*+|\*+$/g, "").trim();
    }
    const itemCodesSet = /* @__PURE__ */ new Set();
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
      const m = (it.milestone || it.targetSprint || "").replace(/^v/i, "");
      if (m && m === version) {
        itemCodesSet.add(it.code || it.id);
      }
    }
    releases.push({
      id: `rel-${version.replace(/\./g, "-")}`,
      version,
      date,
      title,
      summary,
      status: "released",
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed
    });
  }
  return releases;
}
function findTaskFile(project, id) {
  if (!project.repoPath) return null;
  const tasksDir = getProjectTasksDir(project);
  if (!fs9.existsSync(tasksDir)) return null;
  const cleanId = id.toLowerCase();
  const files = fs9.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  let found = files.find((f) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });
  if (!found) {
    for (const f of files) {
      try {
        const raw = fs9.readFileSync(path9.join(tasksDir, f), "utf8");
        const fallbackId = f.split("-")[0] || f.replace(/\.md$/, "");
        const parsed = parseBacklogMd(raw, fallbackId);
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          found = f;
          break;
        }
      } catch {
      }
    }
  }
  if (!found) return null;
  const filePath = path9.join(tasksDir, found);
  try {
    const raw = fs9.readFileSync(filePath, "utf8");
    const fallbackId = found.split("-")[0] || found.replace(/\.md$/, "");
    const task = parseBacklogMd(raw, fallbackId);
    return { filePath, filename: found, task };
  } catch {
    return { filePath, filename: found, task: {} };
  }
}
function mapMarkdownTaskToCanonical(task, project, filename, fileStat) {
  const rawFm = task.rawExtraFrontmatter || {};
  const isDeletedRaw = task.isDeleted !== void 0 ? task.isDeleted : rawFm.isdeleted !== void 0 ? rawFm.isdeleted : rawFm.isDeleted;
  const isDeletedVal = isDeletedRaw === true || isDeletedRaw === "true";
  const deletedAtVal = task.deletedAt || rawFm.deletedat || rawFm.deletedAt || void 0;
  const previousStatusVal = task.previousStatus || rawFm.previousstatus || rawFm.previousStatus || void 0;
  const sprintVal = task.sprint || task.targetSprint || rawFm.sprint || rawFm.targetSprint || void 0;
  const releaseVal = task.milestone || rawFm.release || rawFm.targetRelease || rawFm.releases || void 0;
  const id = task.id || filename.split("-")[0] || filename.replace(/\.md$/, "");
  const mtime = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();
  const canonical = {
    id,
    code: id,
    projectId: project.id,
    title: task.title || "Sin t\xEDtulo",
    description: task.description || "",
    type: normalizeType(task.type || rawFm.type) || "feature",
    priority: normalizePriority(task.priority || rawFm.priority) || "p2",
    status: normalizeStatus(task.status),
    sprint: sprintVal,
    release: releaseVal,
    targetSprint: sprintVal,
    targetRelease: releaseVal,
    milestone: releaseVal,
    parentId: task.parentId || rawFm.parent || rawFm.parentId || void 0,
    blocks: task.blocks || (rawFm.blocks ? Array.isArray(rawFm.blocks) ? rawFm.blocks : [rawFm.blocks] : []),
    blockedBy: task.blockedBy || (rawFm.blocked_by ? Array.isArray(rawFm.blocked_by) ? rawFm.blocked_by : [rawFm.blocked_by] : []),
    blockedReason: task.blockedReason || rawFm.blocked_reason || rawFm.blockedReason || void 0,
    dismissedReason: task.dismissedReason || rawFm.dismissed_reason || rawFm.dismissedReason || void 0,
    relatedTo: task.relatedTo || (rawFm.related_to ? Array.isArray(rawFm.related_to) ? rawFm.related_to : [rawFm.related_to] : []),
    dependencies: task.dependencies || [],
    sprints: task.sprints && task.sprints.length > 0 ? task.sprints : sprintVal ? [sprintVal] : [],
    releases: task.releases && task.releases.length > 0 ? task.releases.filter((r) => !r.toLowerCase().includes("sprint")) : releaseVal ? [releaseVal] : [],
    module: task.module || rawFm.module || void 0,
    epic: task.epic || rawFm.epic || void 0,
    category: task.category || rawFm.category || void 0,
    impactedFile: task.impactedFile || rawFm.impactedfile || rawFm.impactedFile || void 0,
    risk: task.risk || rawFm.risk || void 0,
    fix: task.fix || rawFm.fix || void 0,
    acceptanceCriteriaList: task.acceptanceCriteria || [],
    acceptanceCriteria: task.acceptanceCriteria || [],
    implementationPlan: task.implementationPlan || "",
    notes: task.implementationNotes || task.fix || void 0,
    implementationNotes: task.implementationNotes || task.fix || void 0,
    finalSummary: task.finalSummary || rawFm.finalsummary || rawFm.finalSummary || void 0,
    assignees: task.assignees || [],
    labels: task.labels || [],
    estimate: task.estimate !== void 0 ? task.estimate : rawFm.estimate,
    startDate: task.startDate || rawFm.start_date || rawFm.startDate || void 0,
    dueDate: task.dueDate || rawFm.due_date || rawFm.dueDate || rawFm.target_date || rawFm.targetDate || void 0,
    order: rawFm.order !== void 0 ? Number(rawFm.order) : 0,
    isDeleted: isDeletedVal ? true : void 0,
    deletedAt: deletedAtVal,
    previousStatus: previousStatusVal,
    createdAt: task.createdDate ? task.createdDate.includes("T") ? task.createdDate : `${task.createdDate}T00:00:00.000Z` : (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: task.updatedDate ? task.updatedDate.includes("T") ? task.updatedDate : `${task.updatedDate}T00:00:00.000Z` : (/* @__PURE__ */ new Date()).toISOString(),
    mtime,
    _file: filename,
    _raw: task
  };
  return canonical;
}
function normalizeTaskUpdates(project, updates) {
  const u = updates || {};
  const inner = u.updates && typeof u.updates === "object" ? u.updates : null;
  const usedUpdatesObject = Boolean(inner && !u.status && inner.status);
  const rawStatus = u.status || inner?.status;
  const status = rawStatus ? normalizeStatus(rawStatus) : void 0;
  const title = u.title !== void 0 ? u.title : inner?.title;
  const description = u.description !== void 0 ? u.description : inner?.description;
  const rawPriority = u.priority || inner?.priority;
  const priority = rawPriority ? normalizePriority(rawPriority) : void 0;
  const rawType = u.type || inner?.type;
  const type = rawType ? normalizeType(rawType) : void 0;
  const implementationPlan = u.implementationPlan !== void 0 ? u.implementationPlan : inner?.implementationPlan;
  const implementationNotes = u.implementationNotes !== void 0 ? u.implementationNotes : u.notes !== void 0 ? u.notes : u.fix !== void 0 ? u.fix : inner?.implementationNotes;
  let sprint;
  let targetSprint;
  let sprints;
  let clearSprint = false;
  const rawSprint = u.sprint !== void 0 ? u.sprint : u.targetSprint !== void 0 ? u.targetSprint : inner?.sprint;
  if (rawSprint !== void 0) {
    const legSprint = resolveLegibleSprint(project, rawSprint);
    if (legSprint) {
      sprint = legSprint;
      targetSprint = legSprint;
      sprints = [legSprint];
    } else {
      clearSprint = true;
      sprint = void 0;
      targetSprint = void 0;
      sprints = [];
    }
  } else if (u.sprints !== void 0 || inner?.sprints !== void 0) {
    const explicitSprints = Array.isArray(u.sprints) ? u.sprints : Array.isArray(inner?.sprints) ? inner.sprints : [];
    sprints = explicitSprints;
    sprint = explicitSprints.length > 0 ? explicitSprints[0] : void 0;
    targetSprint = sprint;
  }
  let release;
  let targetRelease;
  let milestone;
  let releases;
  if (u.release !== void 0 || u.targetRelease !== void 0 || u.milestone !== void 0 || u.releases !== void 0 || inner?.release !== void 0 || inner?.targetRelease !== void 0 || inner?.milestone !== void 0 || inner?.releases !== void 0) {
    const rawRel = (u.release || u.targetRelease || u.milestone || inner?.release || inner?.targetRelease || inner?.milestone || (Array.isArray(u.releases) && u.releases.length > 0 ? u.releases[0] : "") || (Array.isArray(inner?.releases) && inner.releases.length > 0 ? inner.releases[0] : "") || "").trim();
    const rawRelArr = Array.isArray(u.releases) ? u.releases : Array.isArray(inner?.releases) ? inner.releases : rawRel ? [rawRel] : [];
    releases = rawRelArr.filter(Boolean).filter((r) => !r.toLowerCase().includes("sprint"));
    release = rawRel || void 0;
    targetRelease = rawRel || void 0;
    milestone = rawRel || void 0;
  }
  let estimate;
  const rawEstimate = u.estimate !== void 0 ? u.estimate : inner?.estimate;
  if (rawEstimate !== void 0) {
    if (rawEstimate === "" || rawEstimate === null) {
      estimate = null;
    } else {
      const num = Number(rawEstimate);
      estimate = !isNaN(num) && typeof rawEstimate !== "boolean" && !String(rawEstimate).includes(" ") ? num : rawEstimate;
    }
  }
  const labels = Array.isArray(u.labels) ? u.labels : Array.isArray(inner?.labels) ? inner.labels : void 0;
  const assignees = Array.isArray(u.assignees) ? u.assignees : Array.isArray(inner?.assignees) ? inner.assignees : void 0;
  const parentId = u.parentId !== void 0 ? u.parentId : inner?.parentId;
  const blocks = Array.isArray(u.blocks) ? u.blocks : Array.isArray(inner?.blocks) ? inner.blocks : void 0;
  const blockedBy = Array.isArray(u.blockedBy) ? u.blockedBy : Array.isArray(inner?.blockedBy) ? inner.blockedBy : void 0;
  const blockedReason = u.blockedReason !== void 0 ? u.blockedReason : inner?.blockedReason;
  const dismissedReason = u.dismissedReason !== void 0 ? u.dismissedReason : inner?.dismissedReason;
  const relatedTo = Array.isArray(u.relatedTo) ? u.relatedTo : Array.isArray(inner?.relatedTo) ? inner.relatedTo : void 0;
  const dependencies = Array.isArray(u.dependencies) ? u.dependencies : Array.isArray(inner?.dependencies) ? inner.dependencies : void 0;
  const module = u.module !== void 0 ? u.module : inner?.module;
  const epic = u.epic !== void 0 ? u.epic : inner?.epic;
  const category = u.category !== void 0 ? u.category : inner?.category;
  const impactedFile = u.impactedFile !== void 0 ? u.impactedFile : inner?.impactedFile;
  const risk = u.risk !== void 0 ? u.risk : inner?.risk;
  const checkAllAcs = u.checkAllAcs !== void 0 ? u.checkAllAcs : inner?.checkAllAcs;
  const toggleAcIndex = u.toggleAcIndex !== void 0 ? u.toggleAcIndex : inner?.toggleAcIndex;
  return {
    status,
    rawStatus,
    title,
    description,
    priority,
    type,
    implementationPlan,
    implementationNotes,
    milestone,
    release,
    targetRelease,
    releases,
    sprint,
    targetSprint,
    sprints,
    clearSprint,
    estimate,
    labels,
    assignees,
    parentId,
    blocks,
    blockedBy,
    blockedReason,
    dismissedReason,
    relatedTo,
    dependencies,
    module,
    epic,
    category,
    impactedFile,
    risk,
    checkAllAcs,
    toggleAcIndex,
    usedUpdatesObject
  };
}
var ConflictError, DEMO_FILE2, BacklogService;
var init_backlogService = __esm({
  "server/services/backlogService.ts"() {
    "use strict";
    init_backlogMdParser();
    init_registry();
    init_atomicWrite();
    init_fs_lock();
    ConflictError = class _ConflictError extends Error {
      conflict = true;
      currentMtime;
      currentItem;
      constructor(message, currentMtime, currentItem) {
        super(message);
        this.name = "ConflictError";
        this.currentMtime = currentMtime;
        this.currentItem = currentItem;
        Object.setPrototypeOf(this, _ConflictError.prototype);
      }
    };
    DEMO_FILE2 = fs9.existsSync(path9.resolve(PKG_ROOT2, "data/demo-backlog.json")) ? path9.resolve(PKG_ROOT2, "data/demo-backlog.json") : path9.resolve(PKG_ROOT2, "src/data/demo-backlog.json");
    BacklogService = class _BacklogService {
      /**
       * Reads all tasks for a project with optional filters.
       * By default, soft-deleted tasks (isDeleted: true) are EXCLUDED (AC 6).
       */
      static listTasks(project, options) {
        let items = [];
        if (isBacklogMdProject(project) && project.repoPath) {
          const tasksDir = getProjectTasksDir(project);
          if (fs9.existsSync(tasksDir)) {
            const files = fs9.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
            files.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
            let orderIdx = 1;
            for (const file of files) {
              try {
                const fullPath = path9.join(tasksDir, file);
                const raw = fs9.readFileSync(fullPath, "utf8");
                const fallbackId = file.split("-")[0] || file.replace(/\.md$/, "");
                const parsed = parseBacklogMd(raw, fallbackId);
                const stat = fs9.statSync(fullPath);
                const canonical = mapMarkdownTaskToCanonical(parsed, project, file, stat);
                if (canonical.order === 0) canonical.order = orderIdx++;
                items.push(canonical);
              } catch {
              }
            }
          }
        } else {
          const jsonPath = resolveJsonBacklogPath(project);
          if (fs9.existsSync(jsonPath)) {
            try {
              const raw = fs9.readFileSync(jsonPath, "utf8");
              const data = JSON.parse(raw);
              const jsonStat = fs9.statSync(jsonPath);
              const jsonMtime = Math.round(jsonStat.mtimeMs);
              items = (data.items || []).map((it) => ({
                ...it,
                code: it.code || it.id,
                projectId: it.projectId || project.id,
                status: normalizeStatus(it.status),
                priority: normalizePriority(it.priority),
                acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
                acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
                sprint: it.sprint || it.targetSprint,
                targetSprint: it.targetSprint || it.sprint,
                mtime: it.mtime || jsonMtime
              }));
            } catch {
            }
          }
        }
        const includeDeleted = options?.includeDeleted === true;
        if (!includeDeleted) {
          items = items.filter((it) => !it.isDeleted && it.isDeleted !== "true");
        }
        if (options?.openOnly) {
          const closed = ["done", "dismissed", "cancelled", "released"];
          items = items.filter((t) => !closed.includes(normalizeStatus(t.status)));
        }
        if (options?.status) {
          const sNorm = normalizeStatus(options.status);
          items = items.filter((t) => normalizeStatus(t.status) === sNorm);
        }
        if (options?.priority) {
          const pNorm = normalizePriority(options.priority);
          items = items.filter((t) => normalizePriority(t.priority) === pNorm);
        }
        if (options?.sprint) {
          const sp = String(options.sprint).toLowerCase();
          items = items.filter(
            (t) => t.sprint && String(t.sprint).toLowerCase() === sp || t.targetSprint && String(t.targetSprint).toLowerCase() === sp || Array.isArray(t.sprints) && t.sprints.some((s) => String(s).toLowerCase() === sp)
          );
        }
        if (options?.milestone) {
          const mLower = String(options.milestone).toLowerCase();
          items = items.filter(
            (t) => t.milestone && String(t.milestone).toLowerCase() === mLower || t.targetSprint && String(t.targetSprint).toLowerCase() === mLower || t.release && String(t.release).toLowerCase() === mLower || t.targetRelease && String(t.targetRelease).toLowerCase() === mLower
          );
        }
        if (options?.prefix) {
          const pfx = String(options.prefix).toLowerCase();
          items = items.filter(
            (t) => t.id && t.id.toLowerCase().startsWith(pfx) || t.code && t.code.toLowerCase().startsWith(pfx)
          );
        }
        if (Array.isArray(options?.taskIds) && options.taskIds.length > 0) {
          const idsSet = new Set(options.taskIds.map((id) => String(id).toLowerCase()));
          items = items.filter(
            (t) => t.id && idsSet.has(t.id.toLowerCase()) || t.code && idsSet.has(t.code.toLowerCase())
          );
        }
        if (options?.search) {
          const q = String(options.search).toLowerCase();
          items = items.filter(
            (t) => t.title && t.title.toLowerCase().includes(q) || t.id && t.id.toLowerCase().includes(q) || t.code && t.code.toLowerCase().includes(q) || t.labels && Array.isArray(t.labels) && t.labels.some((l) => l.toLowerCase().includes(q))
          );
        }
        const offset = options?.offset !== void 0 ? options.offset : 0;
        if (options?.limit !== void 0) {
          items = items.slice(offset, offset + options.limit);
        } else if (offset > 0) {
          items = items.slice(offset);
        }
        return items;
      }
      /**
       * Retrieves single task by ID.
       */
      static getTask(project, taskId, options) {
        if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
          throw new Error(`[Validation] Par\xE1metro 'taskId' requerido y debe ser un string no vac\xEDo.`);
        }
        const cleanId = taskId.toLowerCase();
        const includeDeleted = options?.includeDeleted !== false;
        if (project) {
          const tasks = _BacklogService.listTasks(project, { includeDeleted: true });
          const match = tasks.find(
            (t) => t.id && t.id.toLowerCase() === cleanId || t.code && t.code.toLowerCase() === cleanId
          );
          if (match && (includeDeleted || !match.isDeleted)) {
            return {
              found: true,
              project: { id: project.id, name: project.name, storageType: project.storageType },
              task: match
            };
          }
        }
        throw new Error(`Tarea ${taskId} no encontrada.`);
      }
      /**
       * Calculates dashboard / metrics statistics over active tasks (excluding isDeleted).
       */
      static getStats(project) {
        const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
        const total = tasks.length;
        const closedStatuses = ["done", "dismissed", "cancelled", "released"];
        let openCount = 0;
        let doneCount = 0;
        const byStatus = {};
        const byPriority = {};
        const byPrefix = {};
        for (const t of tasks) {
          const s = normalizeStatus(t.status);
          const p = normalizePriority(t.priority);
          const isClosed = closedStatuses.includes(s);
          if (isClosed) doneCount++;
          else openCount++;
          byStatus[s] = (byStatus[s] || 0) + 1;
          byPriority[p] = (byPriority[p] || 0) + 1;
          const code = String(t.code || t.id || "");
          const parts = code.split("-");
          const prefix = parts.length > 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "OTHER";
          if (!byPrefix[prefix]) {
            byPrefix[prefix] = { total: 0, open: 0, done: 0 };
          }
          byPrefix[prefix].total++;
          if (isClosed) byPrefix[prefix].done++;
          else byPrefix[prefix].open++;
        }
        const completionRate = `${total > 0 ? Math.round(doneCount / total * 100) : 0}%`;
        return {
          total,
          open: openCount,
          done: doneCount,
          completionRate,
          byStatus,
          byPriority,
          byPrefix
        };
      }
      /**
       * Inspects existing tasks in memory and on disk to compute the next correlative task ID.
       */
      static getNextTaskId(project, options) {
        if (options?.withoutLock) {
          return _BacklogService.computeNextTaskId(project);
        }
        const lockPath = getProjectTaskAllocationLockPath(project);
        return withFileLockSync(lockPath, () => {
          return _BacklogService.computeNextTaskId(project);
        });
      }
      static computeNextTaskId(project) {
        const cleanPrefix = (project.codePrefix || "DEV").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "DEV";
        const allTasks = _BacklogService.listTasks(project, { includeDeleted: true });
        let maxNum = 0;
        const regex = new RegExp(`^${cleanPrefix}-(\\d+)`, "i");
        for (const t of allTasks) {
          const m = (t.code || t.id || "").match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        if (isBacklogMdProject(project) && project.repoPath) {
          const tasksDir = getProjectTasksDir(project);
          if (fs9.existsSync(tasksDir)) {
            const diskFiles = fs9.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
            for (const f of diskFiles) {
              const m = f.match(regex);
              if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
              }
            }
          }
        }
        const nextNum = maxNum > 0 ? maxNum + 1 : allTasks.length > 0 ? allTasks.length + 1 : 1;
        return `${cleanPrefix}-${String(nextNum).padStart(3, "0")}`;
      }
      /**
       * Creates a new task in the project with correlative code generation under atomic lock.
       */
      static createTask(project, data) {
        const lockPath = getProjectTaskAllocationLockPath(project);
        return withFileLockSync(lockPath, () => {
          const allTasks = _BacklogService.listTasks(project, { includeDeleted: true });
          const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : _BacklogService.computeNextTaskId(project);
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const now = (/* @__PURE__ */ new Date()).toISOString();
          let acList = [];
          if (Array.isArray(data.acceptanceCriteria)) {
            acList = data.acceptanceCriteria.map((item, i) => {
              if (typeof item === "string") {
                return { index: i + 1, text: item, checked: false };
              }
              return { index: item.index || i + 1, text: item.text || "", checked: Boolean(item.checked) };
            });
          } else if (Array.isArray(data.acceptanceCriteriaList)) {
            acList = data.acceptanceCriteriaList.map((item, i) => ({
              index: item.index || i + 1,
              text: item.text || "",
              checked: Boolean(item.checked)
            }));
          }
          let initialEstimate;
          if (data.estimate !== void 0 && data.estimate !== null && data.estimate !== "") {
            const num = Number(data.estimate);
            initialEstimate = !isNaN(num) && typeof data.estimate !== "boolean" && !String(data.estimate).includes(" ") ? num : data.estimate;
          }
          const rawSprint = data.sprint || data.targetSprint;
          const legSprint = rawSprint ? resolveLegibleSprint(project, rawSprint) : void 0;
          const rawRel = (data.release || data.targetRelease || data.milestone || (Array.isArray(data.releases) && data.releases.length > 0 ? data.releases[0] : "") || "").trim();
          const relArr = Array.isArray(data.releases) ? data.releases.filter(Boolean).filter((r) => !r.toLowerCase().includes("sprint")) : rawRel ? [rawRel] : [];
          const normalizedSt = normalizeStatus(data.status || "draft");
          const taskData = {
            id: code,
            title: data.title || "Sin t\xEDtulo",
            status: normalizedSt,
            priority: normalizePriority(data.priority || "medium"),
            type: data.type || "feature",
            createdDate: today,
            updatedDate: today,
            milestone: rawRel || void 0,
            sprint: legSprint || void 0,
            targetSprint: legSprint || void 0,
            sprints: legSprint ? [legSprint] : Array.isArray(data.sprints) ? data.sprints : [],
            releases: relArr,
            estimate: initialEstimate,
            description: data.description || "",
            acceptanceCriteria: acList,
            implementationPlan: data.implementationPlan || "",
            implementationNotes: data.implementationNotes || data.notes || data.fix,
            assignees: Array.isArray(data.assignees) ? data.assignees : [],
            labels: Array.isArray(data.labels) ? data.labels : [],
            dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
            parentId: data.parentId || void 0,
            blocks: Array.isArray(data.blocks) ? data.blocks : [],
            blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
            blockedReason: data.blockedReason || void 0,
            dismissedReason: data.dismissedReason || void 0,
            relatedTo: Array.isArray(data.relatedTo) ? data.relatedTo : [],
            module: data.module || void 0,
            impactedFile: data.impactedFile || void 0,
            risk: data.risk || void 0,
            epic: data.epic || void 0,
            category: data.category || void 0,
            fix: data.fix || void 0
          };
          if (isBacklogMdProject(project) && project.repoPath) {
            const tasksDir = getProjectTasksDir(project);
            if (!fs9.existsSync(tasksDir)) fs9.mkdirSync(tasksDir, { recursive: true });
            const filename = generateTaskFilename(code, taskData.title);
            const filepath = path9.join(tasksDir, filename);
            const serialized = serializeBacklogMd(taskData);
            atomicWriteFileSync2(filepath, serialized, "utf8");
            const fileStat = fs9.existsSync(filepath) ? fs9.statSync(filepath) : void 0;
            const canonical = mapMarkdownTaskToCanonical(taskData, project, filename, fileStat);
            return { ok: true, task: canonical, savedFile: filepath };
          }
          const jsonPath = resolveJsonBacklogPath(project);
          const newItem = {
            ...taskData,
            code,
            projectId: project.id,
            acceptanceCriteriaList: acList,
            order: typeof data.order === "number" ? data.order : allTasks.length + 1,
            createdAt: now,
            updatedAt: now,
            completedAt: normalizedSt === "done" ? now : void 0
          };
          let existingData = { project: { ...project, storageType: "json" }, items: [], releases: [], sprints: [] };
          if (fs9.existsSync(jsonPath)) {
            try {
              existingData = JSON.parse(fs9.readFileSync(jsonPath, "utf8"));
            } catch {
            }
          }
          if (!Array.isArray(existingData.items)) existingData.items = [];
          existingData.items.push(newItem);
          existingData.lastUpdated = now;
          atomicWriteFileSync2(jsonPath, JSON.stringify(existingData, null, 2), "utf8");
          const jsonStat = fs9.existsSync(jsonPath) ? fs9.statSync(jsonPath) : void 0;
          newItem.mtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
          return { ok: true, task: newItem, savedFile: jsonPath };
        });
      }
      /**
       * Updates an existing task by ID with Gatekeeper validation.
       */
      static updateTask(project, taskId, updates, options) {
        if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
          throw new Error(`[Validation] Par\xE1metro 'taskId' requerido y debe ser un string no vac\xEDo.`);
        }
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const norm = normalizeTaskUpdates(project, updates);
        if (isBacklogMdProject(project) && project.repoPath) {
          const fileInfo = findTaskFile(project, taskId);
          if (!fileInfo) {
            throw new Error(`Tarea ${taskId} no encontrada para actualizar.`);
          }
          const { filePath, filename, task: current2 } = fileInfo;
          const fileStat = fs9.existsSync(filePath) ? fs9.statSync(filePath) : void 0;
          const currentMtime2 = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();
          if (!options?.force && typeof options?.expectedMtime === "number") {
            if (currentMtime2 > options.expectedMtime) {
              const canonicalCurrent = mapMarkdownTaskToCanonical(current2, project, filename, fileStat);
              throw new ConflictError(
                `La tarea "${current2.id}" fue modificada en disco por otro proceso o agente.`,
                currentMtime2,
                canonicalCurrent
              );
            }
          }
          if (norm.status) current2.status = norm.status;
          if (norm.title !== void 0) current2.title = norm.title;
          if (norm.description !== void 0) current2.description = norm.description;
          if (norm.priority) current2.priority = norm.priority;
          if (norm.type) current2.type = norm.type;
          if (norm.implementationPlan !== void 0) current2.implementationPlan = norm.implementationPlan;
          if (norm.implementationNotes !== void 0) {
            current2.implementationNotes = norm.implementationNotes;
            if (!current2.rawExtraFrontmatter) current2.rawExtraFrontmatter = {};
            current2.rawExtraFrontmatter.fix = norm.implementationNotes;
          }
          if (norm.milestone !== void 0) current2.milestone = norm.milestone;
          if (norm.labels !== void 0) current2.labels = norm.labels;
          if (norm.assignees !== void 0) current2.assignees = norm.assignees;
          if (norm.parentId !== void 0) current2.parentId = norm.parentId || void 0;
          if (norm.blocks !== void 0) current2.blocks = norm.blocks;
          if (norm.blockedBy !== void 0) current2.blockedBy = norm.blockedBy;
          if (norm.blockedReason !== void 0) current2.blockedReason = norm.blockedReason || void 0;
          if (norm.dismissedReason !== void 0) current2.dismissedReason = norm.dismissedReason || void 0;
          if (norm.relatedTo !== void 0) current2.relatedTo = norm.relatedTo;
          if (norm.dependencies !== void 0) current2.dependencies = norm.dependencies;
          if (norm.module !== void 0) current2.module = norm.module || void 0;
          if (norm.epic !== void 0) current2.epic = norm.epic || void 0;
          if (norm.category !== void 0) current2.category = norm.category || void 0;
          if (norm.impactedFile !== void 0) current2.impactedFile = norm.impactedFile || void 0;
          if (norm.risk !== void 0) current2.risk = norm.risk || void 0;
          if (norm.clearSprint) {
            current2.sprint = void 0;
            current2.targetSprint = void 0;
            current2.sprints = [];
            if (current2.rawExtraFrontmatter) {
              delete current2.rawExtraFrontmatter.sprint;
              delete current2.rawExtraFrontmatter.targetSprint;
            }
          } else if (norm.sprint !== void 0) {
            current2.sprint = norm.sprint;
            current2.targetSprint = norm.sprint;
            current2.sprints = norm.sprints || [norm.sprint];
            if (!current2.rawExtraFrontmatter) current2.rawExtraFrontmatter = {};
            current2.rawExtraFrontmatter.sprint = norm.sprint;
            current2.rawExtraFrontmatter.targetSprint = norm.sprint;
          } else if (norm.sprints !== void 0) {
            current2.sprints = norm.sprints;
          }
          if (norm.estimate !== void 0) {
            if (norm.estimate === null) {
              current2.estimate = void 0;
              if (current2.rawExtraFrontmatter) delete current2.rawExtraFrontmatter.estimate;
            } else {
              current2.estimate = norm.estimate;
              if (current2.rawExtraFrontmatter) current2.rawExtraFrontmatter.estimate = String(norm.estimate);
            }
          }
          current2.updatedDate = today;
          if (norm.checkAllAcs !== void 0 && current2.acceptanceCriteria) {
            current2.acceptanceCriteria = current2.acceptanceCriteria.map((ac) => ({
              ...ac,
              checked: Boolean(norm.checkAllAcs)
            }));
          } else if (norm.toggleAcIndex !== void 0) {
            if (typeof norm.toggleAcIndex !== "number" || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
              throw new Error(`[Validation] Par\xE1metro 'toggleAcIndex' inv\xE1lido: debe ser un entero positivo (1-indexed), recibido '${norm.toggleAcIndex}'.`);
            }
            const acList = current2.acceptanceCriteria || [];
            const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
            if (!foundAc) {
              throw new Error(`[Validation] Criterio de aceptaci\xF3n #${norm.toggleAcIndex} no encontrado en la tarea '${current2.id}'.`);
            }
            current2.acceptanceCriteria = acList.map(
              (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
            );
          }
          const targetStatus2 = norm.status || current2.status;
          validateGatekeeperTransition(current2, targetStatus2, options, project.repoPath);
          if (current2.rawExtraFrontmatter) {
            delete current2.rawExtraFrontmatter.verifyCommand;
            delete current2.rawExtraFrontmatter.verify_command;
            delete current2.rawExtraFrontmatter.verifyCmd;
          }
          const serialized = serializeBacklogMd(current2);
          atomicWriteFileSync2(filePath, serialized, "utf8");
          const freshStat = fs9.existsSync(filePath) ? fs9.statSync(filePath) : void 0;
          const canonical = mapMarkdownTaskToCanonical(current2, project, filename, freshStat);
          const resp2 = { ok: true, updatedTask: canonical, filePath };
          if (norm.usedUpdatesObject) {
            resp2.warning = "Aviso: Se aplic\xF3 'status' recibido dentro del objeto 'updates'. Para m\xE1xima compatibilidad con AGENTS.md se recomienda pasar 'status' como campo top-level.";
          }
          if (options?.force) {
            const forceWarning = `[MCP Gatekeeper Audit] Se utiliz\xF3 'force: true' para forzar la actualizaci\xF3n de la tarea '${current2.id}', omitiendo las validaciones del Gatekeeper.`;
            resp2.warning = resp2.warning ? `${resp2.warning} ${forceWarning}` : forceWarning;
            resp2.audit = {
              bypassedGatekeeper: true,
              timestamp: now
            };
          }
          return resp2;
        }
        const jsonPath = resolveJsonBacklogPath(project);
        if (!fs9.existsSync(jsonPath)) {
          throw new Error(`Archivo de backlog JSON no encontrado en ${jsonPath}.`);
        }
        const data = JSON.parse(fs9.readFileSync(jsonPath, "utf8"));
        const cleanId = String(taskId).toLowerCase();
        const idx = (data.items || []).findIndex(
          (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
        );
        if (idx < 0) {
          throw new Error(`Tarea ${taskId} no encontrada para actualizar.`);
        }
        const current = data.items[idx];
        const jsonStat = fs9.existsSync(jsonPath) ? fs9.statSync(jsonPath) : void 0;
        const currentMtime = typeof current.mtime === "number" ? current.mtime : jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
        if (!options?.force && typeof options?.expectedMtime === "number") {
          if (currentMtime > options.expectedMtime) {
            throw new ConflictError(
              `La tarea "${current.code || current.id}" fue modificada en disco por otro proceso o agente.`,
              currentMtime,
              current
            );
          }
        }
        const wasDone = current.status === "done";
        if (norm.status) current.status = norm.status;
        const isNowDone = current.status === "done";
        if (norm.title !== void 0) current.title = norm.title;
        if (norm.description !== void 0) current.description = norm.description;
        if (norm.priority) current.priority = norm.priority;
        if (norm.type) current.type = norm.type;
        if (norm.implementationPlan !== void 0) current.implementationPlan = norm.implementationPlan;
        if (norm.implementationNotes !== void 0) {
          current.implementationNotes = norm.implementationNotes;
          current.fix = norm.implementationNotes;
        }
        if (norm.milestone !== void 0) {
          current.milestone = norm.milestone;
          current.release = norm.release;
          current.targetRelease = norm.targetRelease;
          current.releases = norm.releases;
        }
        if (norm.labels !== void 0) current.labels = norm.labels;
        if (norm.assignees !== void 0) current.assignees = norm.assignees;
        if (norm.parentId !== void 0) current.parentId = norm.parentId || void 0;
        if (norm.blocks !== void 0) current.blocks = norm.blocks;
        if (norm.blockedBy !== void 0) current.blockedBy = norm.blockedBy;
        if (norm.blockedReason !== void 0) current.blockedReason = norm.blockedReason || void 0;
        if (norm.dismissedReason !== void 0) current.dismissedReason = norm.dismissedReason || void 0;
        if (norm.relatedTo !== void 0) current.relatedTo = norm.relatedTo;
        if (norm.dependencies !== void 0) current.dependencies = norm.dependencies;
        if (norm.module !== void 0) current.module = norm.module || void 0;
        if (norm.epic !== void 0) current.epic = norm.epic || void 0;
        if (norm.category !== void 0) current.category = norm.category || void 0;
        if (norm.impactedFile !== void 0) current.impactedFile = norm.impactedFile || void 0;
        if (norm.risk !== void 0) current.risk = norm.risk || void 0;
        if (norm.clearSprint) {
          current.sprint = void 0;
          current.targetSprint = void 0;
          current.sprints = [];
        } else if (norm.sprint !== void 0) {
          current.sprint = norm.sprint;
          current.targetSprint = norm.sprint;
          current.sprints = norm.sprints || [norm.sprint];
        } else if (norm.sprints !== void 0) {
          current.sprints = norm.sprints;
        }
        if (norm.estimate !== void 0) {
          current.estimate = norm.estimate === null ? void 0 : norm.estimate;
        }
        current.updatedAt = now;
        if (isNowDone && !wasDone) {
          current.completedAt = now;
        } else if (!isNowDone) {
          current.completedAt = void 0;
        }
        if (norm.checkAllAcs !== void 0 && current.acceptanceCriteriaList) {
          current.acceptanceCriteriaList = current.acceptanceCriteriaList.map((ac) => ({
            ...ac,
            checked: Boolean(norm.checkAllAcs)
          }));
        } else if (norm.toggleAcIndex !== void 0) {
          if (typeof norm.toggleAcIndex !== "number" || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
            throw new Error(`[Validation] Par\xE1metro 'toggleAcIndex' inv\xE1lido: debe ser un entero positivo (1-indexed), recibido '${norm.toggleAcIndex}'.`);
          }
          const acList = current.acceptanceCriteriaList || [];
          const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
          if (!foundAc) {
            throw new Error(`[Validation] Criterio de aceptaci\xF3n #${norm.toggleAcIndex} no encontrado en la tarea '${current.id || current.code}'.`);
          }
          current.acceptanceCriteriaList = acList.map(
            (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
          );
        }
        const targetStatus = norm.status || current.status;
        validateGatekeeperTransition(current, targetStatus, options, project.repoPath);
        delete current.verifyCommand;
        data.items[idx] = current;
        data.lastUpdated = now;
        atomicWriteFileSync2(jsonPath, JSON.stringify(data, null, 2), "utf8");
        const freshJsonStat = fs9.existsSync(jsonPath) ? fs9.statSync(jsonPath) : void 0;
        current.mtime = freshJsonStat ? Math.round(freshJsonStat.mtimeMs) : Date.now();
        const resp = { ok: true, updatedTask: current, filePath: jsonPath };
        if (norm.usedUpdatesObject) {
          resp.warning = "Aviso: Se aplic\xF3 'status' recibido dentro del objeto 'updates'. Para m\xE1xima compatibilidad con AGENTS.md se recomienda pasar 'status' como campo top-level.";
        }
        if (options?.force) {
          const forceWarning = `[MCP Gatekeeper Audit] Se utiliz\xF3 'force: true' para forzar la actualizaci\xF3n de la tarea '${current.id || current.code}', omitiendo las validaciones del Gatekeeper.`;
          resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
          resp.audit = {
            bypassedGatekeeper: true,
            timestamp: now
          };
        }
        return resp;
      }
      /**
       * Bulk updates tasks with Gatekeeper validation applied to ALL matching tasks (AC 3).
       */
      static bulkUpdateTasks(project, targetFilter, updates, options) {
        if (Array.isArray(targetFilter.items)) {
          const updatedIds2 = [];
          const failedUpdates2 = [];
          let updatedCount2 = 0;
          for (const patch of targetFilter.items) {
            if (!patch || !patch.id && !patch.code) continue;
            const targetId = patch.code || patch.id;
            try {
              const res = _BacklogService.updateTask(project, targetId, patch, options);
              if (res.ok) {
                updatedCount2++;
                updatedIds2.push(targetId);
              }
            } catch (err) {
              failedUpdates2.push({ id: targetId, error: err.message });
            }
          }
          const resp2 = {
            ok: failedUpdates2.length === 0,
            projectId: project.id,
            storageType: project.storageType || "markdown",
            updatedCount: updatedCount2,
            updatedIds: updatedIds2,
            ...failedUpdates2.length > 0 ? { failedUpdates: failedUpdates2, error: `${failedUpdates2.length} tarea(s) fallaron al actualizarse.` } : {}
          };
          if (options?.force) {
            resp2.warning = `[MCP Gatekeeper Audit] Se utiliz\xF3 'force: true' para forzar la actualizaci\xF3n masiva de tareas, omitiendo las validaciones del Gatekeeper.`;
            resp2.audit = {
              bypassedGatekeeper: true,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          return resp2;
        }
        const cleanIds = Array.isArray(targetFilter.taskIds) ? new Set(targetFilter.taskIds.map((id) => String(id).toLowerCase())) : null;
        const pfxFilter = targetFilter.filterPrefix ? String(targetFilter.filterPrefix).toLowerCase() : null;
        const statusFilter = targetFilter.filterStatus ? normalizeStatus(targetFilter.filterStatus) : null;
        const allTasks = _BacklogService.listTasks(project, { includeDeleted: false });
        const matchedTasks = allTasks.filter((t) => {
          const taskId = String(t.id || t.code || "").toLowerCase();
          if (cleanIds && !cleanIds.has(taskId)) return false;
          if (pfxFilter && !taskId.startsWith(pfxFilter)) return false;
          if (statusFilter && normalizeStatus(t.status) !== statusFilter) return false;
          return true;
        });
        if (matchedTasks.length === 0) {
          return {
            ok: true,
            projectId: project.id,
            storageType: project.storageType || "markdown",
            updatedCount: 0,
            updatedIds: []
          };
        }
        const norm = normalizeTaskUpdates(project, updates);
        if (norm.status) {
          for (const t of matchedTasks) {
            validateGatekeeperTransition(t, norm.status, options, project.repoPath);
          }
        }
        const updatedIds = [];
        const failedUpdates = [];
        let updatedCount = 0;
        for (const t of matchedTasks) {
          try {
            const res = _BacklogService.updateTask(project, t.id || t.code, updates, options);
            if (res.ok) {
              updatedCount++;
              updatedIds.push(t.code || t.id);
            }
          } catch (err) {
            failedUpdates.push({ id: t.id || t.code, error: err.message });
          }
        }
        const resp = {
          ok: failedUpdates.length === 0,
          projectId: project.id,
          storageType: project.storageType || "markdown",
          updatedCount,
          updatedIds,
          ...failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} tarea(s) fallaron al actualizarse.` } : {}
        };
        if (options?.force) {
          resp.warning = `[MCP Gatekeeper Audit] Se utiliz\xF3 'force: true' para forzar la actualizaci\xF3n masiva de tareas, omitiendo las validaciones del Gatekeeper.`;
          resp.audit = {
            bypassedGatekeeper: true,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
        return resp;
      }
      /**
       * Soft deletes or purges a task. Protected done tasks cannot be soft-deleted.
       */
      static deleteTask(project, taskId, options) {
        const isPurge = options?.purge === true;
        if (isBacklogMdProject(project) && project.repoPath) {
          const fileInfo = findTaskFile(project, taskId);
          if (!fileInfo) return { ok: false, id: taskId };
          const { filePath, filename, task } = fileInfo;
          const currentStatus = (task.status || "").toLowerCase();
          if (!isPurge && currentStatus === "done") {
            throw new Error("Cannot soft-delete a done item. Done items are protected historical records.");
          }
          if (isPurge) {
            const archiveDir = path9.join(project.repoPath, project.backlogDir || "backlog", "archive");
            if (!fs9.existsSync(archiveDir)) fs9.mkdirSync(archiveDir, { recursive: true });
            fs9.renameSync(filePath, path9.join(archiveDir, filename));
            return { ok: true, id: taskId, purged: true };
          }
          const previousStatus = task.status || "draft";
          const raw = fs9.readFileSync(filePath, "utf8");
          let updated = raw;
          updated = updated.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
          updated = updated.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
          updated = updated.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          if (/^status:.*$/m.test(updated)) {
            updated = updated.replace(/^(status:.*$)/m, `$1
isDeleted: true
deletedAt: "${nowIso}"
previousStatus: "${previousStatus}"`);
          } else {
            updated = updated.replace(/^---\r?\n/, `---
isDeleted: true
deletedAt: "${nowIso}"
previousStatus: "${previousStatus}"
`);
          }
          atomicWriteFileSync2(filePath, updated, "utf8");
          return { ok: true, id: taskId, softDeleted: true };
        }
        const jsonPath = resolveJsonBacklogPath(project);
        if (!fs9.existsSync(jsonPath)) return { ok: false, id: taskId };
        const data = JSON.parse(fs9.readFileSync(jsonPath, "utf8"));
        const cleanId = taskId.toLowerCase();
        const idx = (data.items || []).findIndex(
          (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
        );
        if (idx < 0) return { ok: false, id: taskId };
        const item = data.items[idx];
        if (!isPurge && item.status === "done") {
          throw new Error("Cannot soft-delete a done item.");
        }
        if (isPurge) {
          data.items.splice(idx, 1);
        } else {
          item.previousStatus = item.status;
          item.isDeleted = true;
          item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
          data.items[idx] = item;
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        atomicWriteFileSync2(jsonPath, JSON.stringify(data, null, 2), "utf8");
        return { ok: true, id: taskId, softDeleted: !isPurge, purged: isPurge };
      }
      /**
       * Restores a soft-deleted task to active state.
       */
      static restoreTask(project, taskId) {
        if (isBacklogMdProject(project) && project.repoPath) {
          const fileInfo = findTaskFile(project, taskId);
          if (!fileInfo) return false;
          const { filePath } = fileInfo;
          let raw = fs9.readFileSync(filePath, "utf8");
          const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
          const restoreStatus2 = prevMatch ? prevMatch[1].trim() : "draft";
          if (/^status:.*$/m.test(raw)) {
            raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus2}`);
          }
          raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
          raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
          raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
          atomicWriteFileSync2(filePath, raw, "utf8");
          return true;
        }
        const jsonPath = resolveJsonBacklogPath(project);
        if (!fs9.existsSync(jsonPath)) return false;
        const data = JSON.parse(fs9.readFileSync(jsonPath, "utf8"));
        const cleanId = taskId.toLowerCase();
        const item = (data.items || []).find(
          (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
        );
        if (!item) return false;
        const restoreStatus = item.previousStatus || "draft";
        item.status = restoreStatus;
        delete item.isDeleted;
        delete item.deletedAt;
        delete item.previousStatus;
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        atomicWriteFileSync2(jsonPath, JSON.stringify(data, null, 2), "utf8");
        return true;
      }
      /**
       * Exports monolithic BACKLOG.md excluding soft-deleted items (AC 6).
       */
      static exportBacklogMd(project, options) {
        const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
        const mdTasks = tasks.map((t) => ({
          id: t.code || t.id,
          title: t.title,
          status: normalizeStatus(t.status),
          type: t.type,
          priority: t.priority,
          milestone: t.milestone || t.targetSprint,
          description: t.description || "",
          acceptanceCriteria: t.acceptanceCriteriaList || t.acceptanceCriteria || []
        }));
        const content = generateMonolithicBacklogMd(project.name, mdTasks);
        let savedPath;
        if (options?.save !== false && project.repoPath) {
          savedPath = path9.join(project.repoPath, "BACKLOG.md");
          atomicWriteFileSync2(savedPath, content, "utf8");
        }
        return {
          ok: true,
          content,
          savedPath,
          taskCount: tasks.length
        };
      }
      /**
       * Synchronizes backlog tasks and BACKLOG.md.
       * DEV-293 / AC 4: Does NOT auto-promote tasks to ready! Only emits quality warnings,
       * and writes BACKLOG.md strictly when real changes exist or autoFix is true.
       */
      static syncBacklog(project, options) {
        let fixedCount = 0;
        const errors = [];
        const warnings = [];
        const autoFix = options?.autoFix === true;
        if (isBacklogMdProject(project) && project.repoPath) {
          const tasksDir = getProjectTasksDir(project);
          if (fs9.existsSync(tasksDir)) {
            const files = fs9.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
            for (const file of files) {
              const filePath = path9.join(tasksDir, file);
              const content2 = fs9.readFileSync(filePath, "utf8");
              const fmMatch = content2.match(/^---\r?\n([\s\S]*?)\r?\n---/);
              if (!fmMatch) continue;
              const fm = fmMatch[1];
              const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
              const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
              const rawStatus = (statusMatch ? statusMatch[1] : "").toLowerCase();
              const taskId = idMatch ? idMatch[1] : file.split("-")[0];
              const acBlockMatch = content2.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
              if (!acBlockMatch) continue;
              const acBlock = acBlockMatch[1];
              const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
              const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];
              const totalAcs = allAcs.length;
              const totalChecked = checkedAcs.length;
              if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === "draft" || rawStatus === "doing")) {
                warnings.push(
                  `${taskId}: Todos los AC completados (${totalChecked}/${totalAcs}) pero status es '${rawStatus}' (aviso de calidad: requiere certificaci\xF3n de QA para pasar a ready)`
                );
              }
              if (rawStatus === "done" && totalAcs > 0 && totalChecked < totalAcs) {
                errors.push(`${taskId}: Status es 'done' pero solo tiene ${totalChecked}/${totalAcs} ACs marcados`);
              }
            }
          }
        }
        const exportRes = _BacklogService.exportBacklogMd(project, { save: false });
        const content = exportRes.content;
        let backlogPath = null;
        let changesWritten = false;
        if (project.repoPath) {
          backlogPath = path9.join(project.repoPath, "BACKLOG.md");
          let existingContent = "";
          if (fs9.existsSync(backlogPath)) {
            try {
              existingContent = fs9.readFileSync(backlogPath, "utf8");
            } catch {
            }
          }
          const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
          const stripDate = (s) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, "");
          const isDifferent = stripDate(normalize(existingContent)) !== stripDate(normalize(content));
          if (isDifferent || autoFix) {
            atomicWriteFileSync2(backlogPath, content, "utf8");
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
      /**
       * Reads full project backlog (items, releases, sprints) with ZERO disk mutations (AC 5).
       * Does NOT auto-close sprints, does NOT auto-write releases.json or sprints.json.
       */
      static readProjectBacklog(project) {
        if (isBacklogMdProject(project)) {
          const tasksDir = getProjectTasksDir(project);
          try {
            if (!fs9.existsSync(tasksDir)) {
              return {
                project: { ...project, storageType: "markdown" },
                items: [],
                releases: [],
                sprints: [],
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
            const items = _BacklogService.listTasks(project, { includeDeleted: true });
            let releases = [];
            const releasesPath = getProjectReleasesPath(project);
            if (fs9.existsSync(releasesPath)) {
              try {
                releases = JSON.parse(fs9.readFileSync(releasesPath, "utf8"));
              } catch {
              }
            }
            if (releases.length === 0 && project.repoPath) {
              const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, items);
              if (parsed.length > 0) {
                releases = parsed;
              }
            }
            if (releases.length > 0) {
              for (const rel of releases) {
                const vClean = (rel.version || "").replace(/^v/i, "");
                const existingCodes = new Set((rel.itemCodes || []).map((c2) => c2.toUpperCase()));
                for (const it of items) {
                  const itRel = (it.release || it.targetRelease || "").replace(/^v/i, "");
                  const inReleases = (it.releases || []).some((r) => r.replace(/^v/i, "") === vClean);
                  if (itRel === vClean || inReleases) {
                    const codeUpper = (it.code || it.id).toUpperCase();
                    if (!existingCodes.has(codeUpper)) {
                      existingCodes.add(codeUpper);
                      if (!rel.itemCodes) rel.itemCodes = [];
                      rel.itemCodes.push(it.code || it.id);
                    }
                  }
                }
              }
              const releaseByCode = /* @__PURE__ */ new Map();
              for (const rel of releases) {
                const isReleased = rel.status === "released";
                for (const code of rel.itemCodes || []) {
                  const key = code.toUpperCase();
                  if (!releaseByCode.has(key) || !releaseByCode.get(key).isReleased && isReleased) {
                    releaseByCode.set(key, { version: rel.version, date: rel.date, isReleased });
                  }
                }
              }
              for (const it of items) {
                const key = (it.code || it.id).toUpperCase();
                if (releaseByCode.has(key)) {
                  const rInfo = releaseByCode.get(key);
                  it.targetRelease = it.targetRelease || rInfo.version;
                  it.release = it.release || rInfo.version;
                  if (rInfo.isReleased) {
                    it.releasedAt = it.releasedAt || (rInfo.date ? new Date(rInfo.date).toISOString() : void 0);
                  }
                }
              }
            }
            let sprints = [];
            const sprintsPath = getProjectSprintsPath(project);
            if (fs9.existsSync(sprintsPath)) {
              try {
                sprints = JSON.parse(fs9.readFileSync(sprintsPath, "utf8"));
              } catch {
              }
            }
            sprints = (sprints || []).map((s) => ({
              ...s,
              projectId: project.id
            }));
            if (project.repoPath) {
              const detectedSprintNames = /* @__PURE__ */ new Set();
              for (const it of items) {
                const sp = it.sprint || it.targetSprint;
                if (sp && typeof sp === "string" && sp.trim() && sp.toLowerCase() !== "backlog" && !sp.toLowerCase().includes("sin sprint") && sp !== "-") {
                  detectedSprintNames.add(sp.trim());
                }
              }
              if (detectedSprintNames.size > 0) {
                const existingNames = new Set(sprints.map((s) => s.name?.toLowerCase().trim()));
                for (const name of detectedSprintNames) {
                  if (!existingNames.has(name.toLowerCase())) {
                    const sprintItems = items.filter((it) => (it.sprint || it.targetSprint || "").trim().toLowerCase() === name.toLowerCase());
                    const allDone = sprintItems.length > 0 && sprintItems.every((it) => it.status === "done" || it.status === "ready" || it.status === "finish");
                    const hasDoing = sprintItems.some((it) => it.status === "doing" || it.status === "review");
                    sprints.push({
                      id: `sprint-${name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
                      projectId: project.id,
                      name,
                      goal: "",
                      status: allDone ? "completed" : hasDoing ? "active" : "planned",
                      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                      completedAt: allDone ? (/* @__PURE__ */ new Date()).toISOString() : void 0
                    });
                  }
                }
              }
            }
            return {
              project: { ...project, storageType: "markdown" },
              items,
              releases,
              sprints,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
          } catch (err) {
            console.warn(`[gripm BacklogService] Error reading Backlog.md tasks for ${project.id}:`, err.message);
            return {
              project: { ...project, storageType: "markdown", error: err.message },
              items: [],
              releases: [],
              sprints: [],
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
        }
        const filePath = resolveJsonBacklogPath(project);
        try {
          if (!fs9.existsSync(filePath)) {
            const initial = {
              project: { ...project, storageType: "json" },
              items: [],
              releases: [],
              sprints: [],
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
            try {
              atomicWriteFileSync2(filePath, JSON.stringify(initial, null, 2), "utf8");
            } catch (writeErr) {
              console.error(`[gripm BacklogService] Cannot initialize backlog at ${filePath}:`, writeErr.message);
            }
            return initial;
          }
          const jsonStat = fs9.statSync(filePath);
          const jsonMtime = Math.round(jsonStat.mtimeMs);
          const raw = fs9.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(raw);
          let items = Array.isArray(parsed.items) ? parsed.items : [];
          items = items.map((it) => ({
            ...it,
            code: it.code || it.id,
            projectId: it.projectId || project.id,
            status: normalizeStatus(it.status),
            acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
            acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
            mtime: it.mtime || jsonMtime
          }));
          return {
            project: { ...project, storageType: "json" },
            items,
            releases: Array.isArray(parsed.releases) ? parsed.releases : [],
            sprints: Array.isArray(parsed.sprints) ? parsed.sprints : [],
            lastUpdated: parsed.lastUpdated || (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          console.error(`[gripm BacklogService] Error reading backlog for project ${project.id}:`, err.message);
          return {
            project: { ...project, storageType: "json", error: err.message },
            items: [],
            releases: [],
            sprints: [],
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      /**
       * Reads releases from disk guarded by atomic file lock.
       */
      static readReleases(project) {
        const filePath = getProjectReleasesPath(project);
        if (!filePath || !fs9.existsSync(filePath)) return [];
        return withFileLockSync(filePath, () => {
          try {
            if (!fs9.existsSync(filePath)) return [];
            const content = fs9.readFileSync(filePath, "utf8");
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        });
      }
      /**
       * Mutates releases on disk guarded by atomic file lock.
       */
      static mutateReleases(project, mutator) {
        const filePath = getProjectReleasesPath(project);
        if (!filePath) return [];
        return withFileLockSync(filePath, () => {
          let current = [];
          if (fs9.existsSync(filePath)) {
            try {
              const content = fs9.readFileSync(filePath, "utf8");
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) current = parsed;
            } catch {
            }
          }
          const result = mutator(current);
          const toWrite = Array.isArray(result) ? result : current;
          atomicWriteFileSync2(filePath, JSON.stringify(toWrite, null, 2), "utf8");
          return toWrite;
        });
      }
      /**
       * Reads retrospectives from disk guarded by atomic file lock.
       */
      static readRetrospectives(project) {
        const filePath = getProjectRetrospectivesPath(project);
        if (!filePath || !fs9.existsSync(filePath)) return [];
        return withFileLockSync(filePath, () => {
          try {
            if (!fs9.existsSync(filePath)) return [];
            const content = fs9.readFileSync(filePath, "utf8");
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        });
      }
      /**
       * Mutates retrospectives on disk guarded by atomic file lock.
       */
      static mutateRetrospectives(project, mutator) {
        const filePath = getProjectRetrospectivesPath(project);
        if (!filePath) return [];
        return withFileLockSync(filePath, () => {
          let current = [];
          if (fs9.existsSync(filePath)) {
            try {
              const content = fs9.readFileSync(filePath, "utf8");
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) current = parsed;
            } catch {
            }
          }
          const result = mutator(current);
          const toWrite = Array.isArray(result) ? result : current;
          atomicWriteFileSync2(filePath, JSON.stringify(toWrite, null, 2), "utf8");
          return toWrite;
        });
      }
      /**
       * Writes releases and sprints to disk atomically (markdown) or updates backlog.json (JSON).
       */
      static writeProjectBacklog(project, data) {
        if (isBacklogMdProject(project)) {
          if (project.repoPath) {
            try {
              const dir = path9.join(project.repoPath, project.backlogDir || "backlog");
              if (!fs9.existsSync(dir)) fs9.mkdirSync(dir, { recursive: true });
              const releasesPath = path9.join(dir, "releases.json");
              withFileLockSync(releasesPath, () => {
                let releasesToWrite = data.releases || [];
                if (fs9.existsSync(releasesPath)) {
                  try {
                    const diskReleases = JSON.parse(fs9.readFileSync(releasesPath, "utf8"));
                    if (Array.isArray(diskReleases)) {
                      releasesToWrite = releasesToWrite.map((rel) => {
                        const diskMatch = diskReleases.find((dr) => dr.id === rel.id || dr.version === rel.version);
                        if (diskMatch && Array.isArray(diskMatch.itemCodes) && diskMatch.itemCodes.length > 0) {
                          if (!rel.itemCodes || rel.itemCodes.length === 0) {
                            return { ...rel, itemCodes: diskMatch.itemCodes };
                          }
                        }
                        return rel;
                      });
                    }
                  } catch {
                  }
                }
                atomicWriteFileSync2(releasesPath, JSON.stringify(releasesToWrite, null, 2), "utf8");
              });
              if (data.sprints !== void 0) {
                atomicWriteFileSync2(path9.join(dir, "sprints.json"), JSON.stringify(data.sprints || [], null, 2), "utf8");
              }
            } catch (err) {
              console.warn(`[gripm BacklogService] Warning writing releases/sprints: ${err.message}`);
            }
          }
          return;
        }
        const filePath = resolveJsonBacklogPath(project);
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        try {
          atomicWriteFileSync2(filePath, JSON.stringify(data, null, 2), "utf8");
        } catch (err) {
          console.error(`[gripm BacklogService] Error writing project backlog to ${filePath}:`, err.message);
        }
      }
      /**
       * Saves or creates a single task item (used by legacy and HTTP adapters).
       */
      static saveTask(project, item) {
        if (!project.repoPath && isBacklogMdProject(project)) return;
        if (isBacklogMdProject(project)) {
          const tasksDir = getProjectTasksDir(project);
          if (!fs9.existsSync(tasksDir)) fs9.mkdirSync(tasksDir, { recursive: true });
          const fileInfo = findTaskFile(project, item.code || item.id);
          let existingFile = fileInfo?.filename;
          let existingTask = fileInfo?.task || {};
          const taskData = {
            id: item.code || item.id,
            title: item.title || existingTask.title || "Sin t\xEDtulo",
            status: normalizeStatus(item.status),
            type: normalizeType(item.type || existingTask.type) || "feature",
            priority: item.priority || existingTask.priority || "p2",
            assignees: item.assignees !== void 0 ? item.assignees : existingTask.assignees || [],
            labels: item.labels !== void 0 ? item.labels : existingTask.labels || [],
            dependencies: item.dependencies || existingTask.dependencies || [],
            parentId: item.parentId !== void 0 ? item.parentId : existingTask.parentId,
            blocks: item.blocks !== void 0 ? item.blocks : existingTask.blocks,
            blockedBy: item.blockedBy !== void 0 ? item.blockedBy : existingTask.blockedBy,
            blockedReason: item.blockedReason !== void 0 ? item.blockedReason : existingTask.blockedReason,
            dismissedReason: item.dismissedReason !== void 0 ? item.dismissedReason : existingTask.dismissedReason,
            relatedTo: item.relatedTo !== void 0 ? item.relatedTo : existingTask.relatedTo,
            sprints: item.sprints !== void 0 ? item.sprints : existingTask.sprints,
            releases: item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 || item.releases !== void 0 ? (Array.isArray(item.releases) ? item.releases.filter(Boolean) : item.release ? [item.release] : []).filter((r) => !r.toLowerCase().includes("sprint")) : (existingTask.releases || []).filter((r) => !r.toLowerCase().includes("sprint")),
            milestone: item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 ? (item.release || item.targetRelease || item.milestone || "").toLowerCase().includes("sprint") ? void 0 : item.release || item.targetRelease || item.milestone || void 0 : existingTask.milestone && !existingTask.milestone.toLowerCase().includes("sprint") ? existingTask.milestone : void 0,
            createdDate: item.createdAt || existingTask.createdDate,
            updatedDate: item.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
            description: item.description !== void 0 ? item.description : existingTask.description || "",
            acceptanceCriteria: item.acceptanceCriteriaList || existingTask.acceptanceCriteria || [],
            implementationPlan: item.implementationPlan !== void 0 ? item.implementationPlan : existingTask.implementationPlan || "",
            implementationNotes: item.fix || item.implementationNotes || existingTask.implementationNotes,
            finalSummary: item.finalSummary || existingTask.finalSummary,
            estimate: item.estimate !== void 0 ? item.estimate === "" ? void 0 : item.estimate : existingTask.estimate,
            startDate: item.startDate !== void 0 ? item.startDate : existingTask.startDate,
            dueDate: item.dueDate !== void 0 ? item.dueDate : existingTask.dueDate,
            rawExtraFrontmatter: {
              ...existingTask.rawExtraFrontmatter || {}
            }
          };
          if (item.isDeleted) {
            taskData.isDeleted = true;
            taskData.deletedAt = item.deletedAt || (/* @__PURE__ */ new Date()).toISOString();
            taskData.previousStatus = item.previousStatus || existingTask.previousStatus || existingTask.status || "draft";
            if (taskData.rawExtraFrontmatter) {
              taskData.rawExtraFrontmatter.isDeleted = "true";
              if (taskData.deletedAt) taskData.rawExtraFrontmatter.deletedAt = taskData.deletedAt;
              if (taskData.previousStatus) taskData.rawExtraFrontmatter.previousStatus = taskData.previousStatus;
            }
          } else {
            taskData.isDeleted = void 0;
            taskData.deletedAt = void 0;
            taskData.previousStatus = void 0;
            if (taskData.rawExtraFrontmatter) {
              delete taskData.rawExtraFrontmatter.isdeleted;
              delete taskData.rawExtraFrontmatter.isDeleted;
              delete taskData.rawExtraFrontmatter.deletedat;
              delete taskData.rawExtraFrontmatter.deletedAt;
              delete taskData.rawExtraFrontmatter.previousstatus;
              delete taskData.rawExtraFrontmatter.previousStatus;
            }
          }
          if (item.estimate !== void 0) {
            if (item.estimate === "" || item.estimate === null) {
              taskData.estimate = void 0;
              if (taskData.rawExtraFrontmatter) delete taskData.rawExtraFrontmatter.estimate;
            } else {
              taskData.estimate = item.estimate;
              if (taskData.rawExtraFrontmatter) taskData.rawExtraFrontmatter.estimate = String(item.estimate);
            }
          }
          if (item.impactedFile !== void 0) taskData.rawExtraFrontmatter.impactedFile = item.impactedFile;
          if (item.risk !== void 0) taskData.rawExtraFrontmatter.risk = item.risk;
          if (item.fix !== void 0) taskData.rawExtraFrontmatter.fix = item.fix;
          if (item.module !== void 0) taskData.rawExtraFrontmatter.module = item.module;
          if (item.epic !== void 0) taskData.rawExtraFrontmatter.epic = item.epic;
          if (item.category !== void 0) taskData.rawExtraFrontmatter.category = item.category;
          const isSprintProvided = item.sprint !== void 0 || item.targetSprint !== void 0 || item.sprints !== void 0;
          const rawSVal = isSprintProvided ? item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : "") || "" : existingTask.sprint || existingTask.targetSprint || (existingTask.sprints && existingTask.sprints.length > 0 ? existingTask.sprints[existingTask.sprints.length - 1] : "") || "";
          const resolvedSprint = resolveLegibleSprint(project, rawSVal);
          if (resolvedSprint) {
            taskData.sprint = resolvedSprint;
            taskData.targetSprint = resolvedSprint;
            taskData.sprints = [resolvedSprint];
            taskData.rawExtraFrontmatter.sprint = resolvedSprint;
            taskData.rawExtraFrontmatter.targetSprint = resolvedSprint;
          } else {
            taskData.sprint = void 0;
            taskData.targetSprint = void 0;
            taskData.sprints = [];
            delete taskData.rawExtraFrontmatter.sprint;
            delete taskData.rawExtraFrontmatter.targetSprint;
          }
          const isReleaseProvided = item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 || item.releases !== void 0;
          if (isReleaseProvided) {
            const rawRVal = (item.release || item.targetRelease || item.milestone || (item.releases && item.releases.length > 0 ? item.releases[0] : "") || "").trim();
            const rVal = rawRVal.toLowerCase().includes("sprint") ? "" : rawRVal;
            const relArray = (Array.isArray(item.releases) ? item.releases.filter(Boolean) : rVal ? [rVal] : []).filter((r) => !r.toLowerCase().includes("sprint"));
            if (rVal || relArray.length > 0) {
              taskData.rawExtraFrontmatter.release = rVal || relArray[0];
              taskData.rawExtraFrontmatter.targetRelease = rVal || relArray[0];
              taskData.milestone = rVal || relArray[0];
              taskData.releases = relArray;
            } else {
              delete taskData.rawExtraFrontmatter.release;
              delete taskData.rawExtraFrontmatter.targetRelease;
              delete taskData.rawExtraFrontmatter.releases;
              taskData.milestone = void 0;
              taskData.releases = [];
            }
            if (project.repoPath) {
              const releasesPath = getProjectReleasesPath(project);
              if (releasesPath) {
                withFileLockSync(releasesPath, () => {
                  if (fs9.existsSync(releasesPath)) {
                    try {
                      const relsData = JSON.parse(fs9.readFileSync(releasesPath, "utf8"));
                      const taskCode = (taskData.id || "").toUpperCase();
                      let changed = false;
                      const targetVersion = (rVal || (relArray[0] || "")).replace(/^v/i, "");
                      let versionFound = false;
                      for (const rel of relsData) {
                        const vClean = (rel.version || "").replace(/^v/i, "");
                        if (!rel.itemCodes) rel.itemCodes = [];
                        const idx2 = rel.itemCodes.findIndex((c2) => c2.toUpperCase() === taskCode);
                        if (targetVersion && vClean === targetVersion) {
                          versionFound = true;
                          if (idx2 < 0) {
                            rel.itemCodes.push(taskData.id);
                            changed = true;
                          }
                        } else if (idx2 >= 0 && !relArray.some((rv) => rv.replace(/^v/i, "") === vClean)) {
                          rel.itemCodes.splice(idx2, 1);
                          changed = true;
                        }
                      }
                      if (targetVersion && !versionFound) {
                        const now = /* @__PURE__ */ new Date();
                        const todayStr = now.toISOString().slice(0, 10);
                        const targetDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
                        relsData.unshift({
                          id: `rel-${targetVersion.replace(/\./g, "-")}`,
                          projectId: project.id,
                          version: targetVersion,
                          date: todayStr,
                          targetDate,
                          status: "unreleased",
                          title: `v${targetVersion}`,
                          summary: `Versi\xF3n ${targetVersion} creada para planificaci\xF3n.`,
                          itemCodes: [taskData.id],
                          markdownContent: `## [${targetVersion}] - Unreleased

### \u{1F3AF} Resumen
*Versi\xF3n ${targetVersion} en planificaci\xF3n.*`,
                          createdAt: now.toISOString()
                        });
                        changed = true;
                      }
                      if (changed) {
                        atomicWriteFileSync2(releasesPath, JSON.stringify(relsData, null, 2), "utf8");
                      }
                    } catch (syncErr) {
                      console.warn("[gripm BacklogService] Error sincronizando releases.json al guardar tarea:", syncErr.message);
                    }
                  }
                });
              }
            }
          }
          if (item.order !== void 0) taskData.rawExtraFrontmatter.order = item.order;
          const content = serializeBacklogMd(taskData);
          const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
          const targetFilePath = path9.join(tasksDir, targetFilename);
          atomicWriteFileSync2(targetFilePath, content, "utf8");
          return;
        }
        const jsonPath = resolveJsonBacklogPath(project);
        let currentBacklog = { project, items: [] };
        if (fs9.existsSync(jsonPath)) {
          try {
            currentBacklog = JSON.parse(fs9.readFileSync(jsonPath, "utf8"));
          } catch {
          }
        }
        const cleanId = String(item.code || item.id).toLowerCase();
        const idx = (currentBacklog.items || []).findIndex(
          (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
        );
        if (idx >= 0) {
          currentBacklog.items[idx] = { ...currentBacklog.items[idx], ...item, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        } else {
          currentBacklog.items.push({ ...item, createdAt: (/* @__PURE__ */ new Date()).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
        }
        currentBacklog.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        atomicWriteFileSync2(jsonPath, JSON.stringify(currentBacklog, null, 2), "utf8");
      }
    };
  }
});

// server/services/storage.ts
function readProjectBacklog(project) {
  return BacklogService.readProjectBacklog(project);
}
function writeProjectBacklog(project, data) {
  BacklogService.writeProjectBacklog(project, data);
}
var init_storage = __esm({
  "server/services/storage.ts"() {
    "use strict";
    init_backlogService();
    init_backlogService();
  }
});

// server/services/fsExplorer.ts
import fs10 from "node:fs";
import path10 from "node:path";
import os2 from "node:os";
function getAllowedBrowseRoots() {
  const roots = [];
  const homedir = os2.homedir();
  if (homedir) {
    roots.push(path10.resolve(homedir));
    try {
      roots.push(fs10.realpathSync(homedir));
    } catch {
    }
  }
  const cwd = process.cwd();
  if (cwd) {
    roots.push(path10.resolve(cwd));
    try {
      roots.push(fs10.realpathSync(cwd));
    } catch {
    }
  }
  const tmpdir = os2.tmpdir();
  if (tmpdir) {
    roots.push(path10.resolve(tmpdir));
    try {
      roots.push(fs10.realpathSync(tmpdir));
    } catch {
    }
  }
  try {
    const reg = getRegistry();
    if (reg && Array.isArray(reg.projects)) {
      for (const p of reg.projects) {
        if (p.repoPath) {
          roots.push(path10.resolve(p.repoPath));
          try {
            roots.push(fs10.realpathSync(p.repoPath));
          } catch {
          }
        }
      }
    }
  } catch {
  }
  const extra = process.env.GRIPM_ALLOWED_PATHS;
  if (extra) {
    for (const p of extra.split(path10.delimiter)) {
      if (p.trim()) {
        roots.push(path10.resolve(p.trim()));
        try {
          roots.push(fs10.realpathSync(p.trim()));
        } catch {
        }
      }
    }
  }
  return [...new Set(roots)];
}
function isSystemRootDir(targetPath) {
  if (!targetPath || typeof targetPath !== "string") return true;
  try {
    const resolved = path10.resolve(targetPath);
    const parsed = path10.parse(resolved);
    if (resolved.toLowerCase() === parsed.root.toLowerCase()) return true;
    const tmp = os2.tmpdir();
    if (tmp) {
      if (isPathContained(resolved, path10.resolve(tmp))) return false;
      try {
        const realTmp = fs10.realpathSync(tmp);
        if (realTmp && isPathContained(resolved, realTmp)) return false;
      } catch {
      }
    }
    const lower = resolved.toLowerCase();
    const restrictedPrefixes = [
      "c:\\windows",
      "c:\\program files",
      "c:\\program files (x86)",
      "/etc",
      "/var",
      "/usr",
      "/bin",
      "/sbin",
      "/sys",
      "/proc",
      "/dev"
    ];
    return restrictedPrefixes.some((p) => lower === p || lower.startsWith(p + path10.sep));
  } catch {
    return true;
  }
}
function isPathContained(targetPath, rootDir) {
  const relative = path10.relative(rootDir, targetPath);
  return !relative.startsWith("..") && !path10.isAbsolute(relative);
}
function isAllowedBrowsePath(targetPath, extraRoots = []) {
  if (!targetPath || typeof targetPath !== "string") return false;
  try {
    const normalized = path10.resolve(path10.normalize(targetPath));
    if (isSystemRootDir(normalized)) return false;
    const baseRoots = getAllowedBrowseRoots();
    const roots = [...baseRoots];
    for (const er of extraRoots) {
      if (er) {
        roots.push(path10.resolve(er));
        try {
          roots.push(fs10.realpathSync(er));
        } catch {
        }
      }
    }
    const uniqueRoots = [...new Set(roots)];
    let current = normalized;
    const remainingSegments = [];
    let realPath = normalized;
    while (true) {
      try {
        const resolvedAncestor = fs10.realpathSync(current);
        realPath = remainingSegments.length > 0 ? path10.join(resolvedAncestor, ...remainingSegments) : resolvedAncestor;
        break;
      } catch (err) {
        if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) {
          const parent = path10.dirname(current);
          if (parent === current) {
            realPath = current;
            break;
          }
          remainingSegments.unshift(path10.basename(current));
          current = parent;
        } else {
          return false;
        }
      }
    }
    if (isSystemRootDir(realPath)) return false;
    return uniqueRoots.some((root) => isPathContained(realPath, root));
  } catch {
    return false;
  }
}
function getSafeInitialBrowseDir() {
  const candidates = [
    path10.resolve(process.cwd(), ".."),
    process.cwd(),
    os2.homedir()
  ];
  for (const candidate of candidates) {
    try {
      if (candidate && fs10.existsSync(candidate) && isAllowedBrowsePath(candidate)) {
        fs10.readdirSync(candidate);
        return candidate;
      }
    } catch {
    }
  }
  return path10.resolve(os2.homedir() || process.cwd());
}
var init_fsExplorer = __esm({
  "server/services/fsExplorer.ts"() {
    "use strict";
    init_registry();
  }
});

// scripts/import-docs.js
import fs11 from "node:fs";
import path11 from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";
function runMigration(docsDir = M3_DOCS_DIR, targetFile = OUT_FILE, projectMeta = null) {
  console.log(`[gripm Migrator] Starting migration from: ${docsDir}`);
  if (!fs11.existsSync(docsDir)) {
    throw new Error(`Docs directory not found: ${docsDir}`);
  }
  if (!projectMeta) {
    throw new Error(
      "[gripm Migrator] projectMeta es obligatorio: no se embeben proyectos por defecto. Pas\xE1 el proyecto destino o ejecut\xE1 la importaci\xF3n desde la UI, que ya lo provee."
    );
  }
  const codePrefix = String(projectMeta.codePrefix || "").trim().toUpperCase();
  if (!codePrefix) {
    throw new Error(
      `[gripm Migrator] El proyecto "${projectMeta.name || projectMeta.id}" no define codePrefix, que es necesario para generar los c\xF3digos de las tareas importadas.`
    );
  }
  const ctx = { codePrefix, projectId: projectMeta.id };
  const itemsMap = /* @__PURE__ */ new Map();
  const qualityLogPath = path11.join(docsDir, "QUALITY_LOG.md");
  if (fs11.existsSync(qualityLogPath)) {
    const content = fs11.readFileSync(qualityLogPath, "utf8");
    parseQualityLog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: QUALITY_LOG.md not found at ${qualityLogPath}`);
  }
  const backlogPath = path11.join(docsDir, "BACKLOG.md");
  if (fs11.existsSync(backlogPath)) {
    const content = fs11.readFileSync(backlogPath, "utf8");
    parseBacklog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: BACKLOG.md not found at ${backlogPath}`);
  }
  const specsDir = path11.join(docsDir, "specs");
  if (fs11.existsSync(specsDir)) {
    parseSpecs(specsDir, itemsMap, ctx);
  }
  const releases = [];
  const releaseNotesPath = path11.join(docsDir, "RELEASE_NOTES.md");
  if (fs11.existsSync(releaseNotesPath)) {
    const content = fs11.readFileSync(releaseNotesPath, "utf8");
    const parsedReleases = parseReleaseNotes(content, itemsMap, ctx);
    releases.push(...parsedReleases);
  }
  const items = Array.from(itemsMap.values());
  items.sort((a, b) => {
    const pOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
    if (pOrder[a.priority] !== pOrder[b.priority]) {
      return pOrder[a.priority] - pOrder[b.priority];
    }
    return a.code.localeCompare(b.code, void 0, { numeric: true });
  });
  const project = projectMeta;
  items.forEach((item, index) => {
    item.order = index + 1;
    if (projectMeta) {
      item.projectId = projectMeta.id;
    }
  });
  const boardData = {
    projects: [project],
    items,
    releases,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (targetFile) {
    if (!fs11.existsSync(path11.dirname(targetFile))) {
      fs11.mkdirSync(path11.dirname(targetFile), { recursive: true });
    }
    fs11.writeFileSync(targetFile, JSON.stringify(boardData, null, 2), "utf8");
    console.log(`[gripm Migrator] Migration successfully written to ${targetFile}`);
  }
  console.log(`[gripm Migrator] Summary: ${items.length} items, ${releases.length} releases, 1 project.`);
  return boardData;
}
function parseQualityLog(content, itemsMap, ctx) {
  const verificationMap = /* @__PURE__ */ new Map();
  const phaseLines = content.split("\n");
  for (const line of phaseLines) {
    const match = line.match(/^-\s*\[x\]\s*`?([A-Z0-9_-]+)`?\s*Verificado\s*\((.*?)\)/i);
    if (match) {
      verificationMap.set(match[1].trim(), match[2].trim());
    }
  }
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("| ID") || trimmed.startsWith("|ID")) {
      inTable = true;
      continue;
    }
    if (inTable && trimmed.startsWith("|---")) {
      continue;
    }
    if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
      continue;
    }
    if (inTable && trimmed.startsWith("|")) {
      const cols = trimmed.split("|").map((c2) => c2.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.length >= 6) {
        const rawId = cols[0].replace(/\*\*/g, "").replace(/`/g, "").trim();
        const area = cols[1].replace(/\*\*/g, "").trim();
        const desc = cols[2].trim();
        const impactedFile = cols[3].replace(/`/g, "").trim();
        const rawSev = cols[4].replace(/\*\*/g, "").toLowerCase().trim();
        const rawStatus = cols[5].toLowerCase().trim();
        if (!rawId || rawId === "ID") continue;
        let priority = "p2";
        if (rawSev.includes("cr\xEDtica") || rawSev.includes("critica")) priority = "p0";
        else if (rawSev.includes("alta")) priority = "p1";
        else if (rawSev.includes("media")) priority = "p2";
        else if (rawSev.includes("baja")) priority = "p3";
        let type = "bug";
        if (rawId.startsWith("UX-")) type = "ux";
        else if (rawId.startsWith("TEC-")) type = "tech_debt";
        let status = "done";
        if (rawStatus.includes("[ ]")) status = "backlog";
        const code = `${ctx.codePrefix}-${rawId}`;
        const fixNote = verificationMap.get(rawId) || `Verificado en la suite de estabilizaci\xF3n de ${ctx.codePrefix}`;
        itemsMap.set(rawId, {
          id: `item-${rawId.toLowerCase()}`,
          code,
          projectId: ctx.projectId,
          title: desc.length > 90 ? desc.slice(0, 90) + "..." : desc,
          description: desc,
          type,
          priority,
          status,
          module: area,
          impactedFile: impactedFile !== "-" && impactedFile !== "-" ? impactedFile : void 0,
          fix: fixNote,
          targetRelease: "1.0.0",
          targetSprint: "Integridad Financiera",
          sourceDoc: "QUALITY_LOG.md",
          order: itemsMap.size + 1,
          createdAt: "2026-09-10T12:00:00.000Z",
          updatedAt: "2026-09-15T18:00:00.000Z",
          completedAt: status === "done" ? "2026-09-15T18:00:00.000Z" : void 0,
          releasedAt: status === "done" ? "2026-09-15T20:00:00.000Z" : void 0
        });
      }
    }
  }
}
function parseBacklog(content, itemsMap, ctx) {
  const sprintMap = /* @__PURE__ */ new Map();
  const sprintRegex = /### Sprint\s+"([^"]+)"\s*\(([^)]+)\)([\s\S]*?)(?=### Sprint|## |$)/g;
  let sMatch;
  while ((sMatch = sprintRegex.exec(content)) !== null) {
    const sprintName = sMatch[1].trim();
    const sprintBody = sMatch[3];
    const itemLines = sprintBody.split("\n");
    for (const l of itemLines) {
      const lineMatch = l.match(/^-\s*\[([ xX])\]\s*\*\*([A-Z0-9_-]+):?\*\*:?\s*(.*)/);
      if (lineMatch) {
        const isResolved = lineMatch[1].toLowerCase() === "x";
        const id = lineMatch[2].trim();
        const shortNote = lineMatch[3].trim();
        sprintMap.set(id, { sprint: sprintName, isResolved, shortNote });
      }
    }
  }
  const sectionRegex = /###\s+([A-Z0-9_-]+)\s+[-]\s+([^\n]+)([\s\S]*?)(?=\n###\s+[A-Z0-9_-]+\s+[-]|## |$)/g;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const rawId = match[1].trim();
    const rawTitle = match[2].trim();
    const body = match[3];
    const fileMatch = body.match(/\*\*Archivo:\*\*\s*(?:\[([^\]]+)\]\([^)]+\)|`([^`]+)`|([^\n]+))/i);
    const probMatch = body.match(/\*\*Problema:\*\*\s*([\s\S]*?)(?=\*\*(?:Riesgo|Fix|Impacto):|\n\n##|$)/i);
    const riskMatch = body.match(/\*\*Riesgo:\*\*\s*([\s\S]*?)(?=\*\*(?:Fix|Problema):|\n\n##|$)/i);
    const fixMatch = body.match(/\*\*Fix:\*\*\s*([\s\S]*?)(?=\*\*(?:Riesgo|Problema):|\n\n##|$)/i);
    const impactedFile = fileMatch ? (fileMatch[1] || fileMatch[2] || fileMatch[3] || "").trim() : void 0;
    const problema = probMatch ? probMatch[1].trim() : "";
    const riesgo = riskMatch ? riskMatch[1].trim() : "";
    const fix = fixMatch ? fixMatch[1].trim() : "";
    let type = "bug";
    if (rawId.startsWith("FEAT-")) type = "feature";
    else if (rawId.startsWith("TEC-")) type = "tech_debt";
    else if (rawId.startsWith("UX-")) type = "ux";
    let priority = "p2";
    if (rawId.startsWith("BUG-C")) priority = "p0";
    else if (rawId.startsWith("BUG-A")) priority = "p1";
    else if (rawId.startsWith("TEC-M") || rawId.startsWith("UX-M")) priority = "p2";
    else if (rawId.startsWith("FEAT-S")) priority = "p1";
    const sprintInfo = sprintMap.get(rawId);
    let targetSprint = sprintInfo ? sprintInfo.sprint : void 0;
    let status = "backlog";
    if (sprintInfo) {
      status = sprintInfo.isResolved ? "done" : "backlog";
      if (sprintInfo.sprint.includes("P0")) priority = "p0";
      else if (sprintInfo.sprint.includes("P1")) priority = "p1";
      else if (sprintInfo.sprint.includes("P2")) priority = "p2";
      else if (sprintInfo.sprint.includes("P3")) priority = "p3";
      else if (sprintInfo.sprint.includes("P4")) priority = "p3";
    }
    let module = "Core / Store";
    if (impactedFile) {
      if (impactedFile.includes("supabase") || impactedFile.includes("sql")) module = "Base de Datos / RLS";
      else if (impactedFile.includes("sync") || impactedFile.includes("offline")) module = "Sincronizaci\xF3n Offline";
      else if (impactedFile.includes("components") || impactedFile.includes("pages")) module = "UI / Ergonom\xEDa";
      else if (impactedFile.includes("rules")) module = "Reglas / Automatizaci\xF3n";
      else if (impactedFile.includes("forecast") || impactedFile.includes("cashflow")) module = "Multi-Divisa / Proyecci\xF3n";
    } else {
      if (type === "feature") module = "Arquitectura / Features";
      else if (type === "tech_debt") module = "Deuda T\xE9cnica / Rendimiento";
    }
    if (itemsMap.has(rawId)) {
      const existing = itemsMap.get(rawId);
      existing.title = rawTitle || existing.title;
      if (problema) existing.description = `${existing.description}

${problema}`;
      if (riesgo) existing.risk = riesgo;
      if (fix) existing.fix = `${existing.fix ? existing.fix + "\n\n" : ""}${fix}`;
      if (impactedFile && !existing.impactedFile) existing.impactedFile = impactedFile;
      if (targetSprint) existing.targetSprint = targetSprint;
      if (sprintInfo && sprintInfo.isResolved) existing.status = "done";
    } else {
      itemsMap.set(rawId, {
        id: `item-${rawId.toLowerCase()}`,
        code: `${ctx.codePrefix}-${rawId}`,
        projectId: ctx.projectId,
        title: rawTitle,
        description: problema || rawTitle,
        type,
        priority,
        status,
        module,
        impactedFile,
        risk: riesgo || void 0,
        fix: fix || void 0,
        targetSprint,
        targetRelease: status === "done" ? "1.0.0" : status === "backlog" ? "1.1.0" : void 0,
        sourceDoc: "BACKLOG.md",
        order: itemsMap.size + 1,
        createdAt: "2026-09-12T10:00:00.000Z",
        updatedAt: "2026-09-15T18:00:00.000Z",
        completedAt: status === "done" ? "2026-09-15T18:00:00.000Z" : void 0,
        releasedAt: status === "done" ? "2026-09-15T20:00:00.000Z" : void 0
      });
    }
  }
}
function parseSpecs(specsDir, itemsMap, ctx) {
  const files = fs11.readdirSync(specsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path11.join(specsDir, file);
    const content = fs11.readFileSync(filePath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/[- - - ].*$/, "").trim() : file.replace(".md", "");
    const paras = content.split("\n\n").map((p) => p.trim()).filter((p) => p && !p.startsWith("#"));
    const description = paras.length > 0 ? paras.slice(0, 2).join("\n\n") : "Especificaci\xF3n t\xE9cnica y requerimientos.";
    let code = `${ctx.codePrefix}-${file.replace(".md", "").toUpperCase()}`;
    const specNumMatch = file.match(/SPEC-(\d+)/i);
    if (specNumMatch) {
      code = `${ctx.codePrefix}-SPEC-${specNumMatch[1]}`;
    }
    let type = "feature";
    if (file.includes("BENCHMARK") || file.includes("DISCOVERY")) type = "tech_debt";
    if (file.includes("brand") || file.includes("a11y") || file.includes("design")) type = "ux";
    let module = "Especificaciones & Arquitectura";
    if (file.includes("sync") || file.includes("db")) module = "Persistencia & Datos";
    else if (file.includes("api") || file.includes("net")) module = "Servicios & API";
    else if (file.includes("agent") || file.includes("mcp")) module = "Agentes & Tooling";
    else if (file.includes("ui") || file.includes("ux")) module = "Dise\xF1o & Ergonom\xEDa";
    else if (file.includes("analytics") || file.includes("metrics")) module = "M\xE9tricas & Monitoreo";
    const itemId = `spec-${file.replace(".md", "").toLowerCase()}`;
    itemsMap.set(itemId, {
      id: itemId,
      code,
      projectId: ctx.projectId,
      title,
      description: description.length > 500 ? description.slice(0, 500) + "..." : description,
      type,
      priority: file.includes("SPEC-001") || file.includes("SPEC-029") ? "p1" : "p2",
      status: "ideas",
      module,
      sourceDoc: `specs/${file}`,
      order: itemsMap.size + 1,
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z"
    });
  }
}
function parseReleaseNotes(content, itemsMap, ctx) {
  const releases = [];
  const releaseMatch = content.match(/##\s+\[([0-9.]+)\]\s+[-]\s+([0-9-]+)\s+(?:🚀\s+)?([^\n]+)/);
  if (releaseMatch) {
    const version = releaseMatch[1];
    const date = releaseMatch[2];
    const title = releaseMatch[3].trim();
    const summaryMatch = content.match(/### 🎯 Resumen\s*\n\*?([^\n]+(?:\n[^\n#]+)*)\*?/);
    const summary = summaryMatch ? summaryMatch[1].replace(/\*/g, "").trim() : "";
    const itemCodes = [];
    for (const item of itemsMap.values()) {
      if (item.status === "done" || item.targetRelease === version || item.targetRelease === "1.0.0") {
        itemCodes.push(item.code);
      }
    }
    releases.push({
      id: `rel-${version.replace(/\./g, "-")}`,
      projectId: ctx.projectId,
      version,
      date,
      title,
      summary,
      itemCodes,
      markdownContent: content.trim(),
      createdAt: `${date}T20:00:00.000Z`
    });
  }
  return releases;
}
var __filename4, __dirname4, M3_DOCS_DIR, DATA_DIR, OUT_FILE;
var init_import_docs = __esm({
  "scripts/import-docs.js"() {
    "use strict";
    __filename4 = fileURLToPath4(import.meta.url);
    __dirname4 = path11.dirname(__filename4);
    M3_DOCS_DIR = process.env.M3_DOCS_DIR || "";
    DATA_DIR = path11.join(__dirname4, "../data");
    OUT_FILE = path11.join(DATA_DIR, "gripm-board.json");
    if (process.argv[1] && fileURLToPath4(import.meta.url) === process.argv[1]) {
      try {
        if (!process.env.M3_DOCS_DIR) {
          console.error("[gripm Migrator] Falta la variable de entorno M3_DOCS_DIR con la ruta de documentos a importar.");
          process.exit(1);
        }
        runMigration(process.env.M3_DOCS_DIR);
      } catch (err) {
        console.error("[gripm Migrator] Error during migration:", err);
        process.exit(1);
      }
    }
  }
});

// server/routes/api.ts
import fs12 from "node:fs";
import path12 from "node:path";
function getVisibleProjects(projects, activeProject) {
  return projects.filter((p) => {
    if (p.isDemo || p.id === "demo") return true;
    if (activeProject && (p.id === activeProject.id || p.repoPath && activeProject.repoPath && path12.resolve(p.repoPath) === path12.resolve(activeProject.repoPath))) {
      return true;
    }
    if (p.repoPath) {
      const cfg = readProjectConfig(p);
      if (cfg?.mode === "single") return false;
    }
    return true;
  });
}
async function handleApiRequest(req, res) {
  const url = req.url || "";
  const urlObj = new URL(url, "http://localhost");
  const pathname = decodeURIComponent(urlObj.pathname);
  const searchParams = urlObj.searchParams;
  try {
    const registry = getRegistry();
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;
    const targetRepo = targetRepoEnv ? path12.resolve(targetRepoEnv) : path12.resolve(process.cwd());
    const targetProject = registry.projects.find((p) => p.repoPath && path12.resolve(p.repoPath) === targetRepo);
    const projectConfig = targetProject || registry.projects[0] ? readProjectConfig(targetProject || registry.projects[0]) : null;
    const envMode = process.env.GRIPM_MODE;
    const configuredMode = envMode || projectConfig?.mode;
    const isMultiMode = configuredMode === "multi";
    const isSingleMode = configuredMode === "single" ? true : isMultiMode ? false : registry.projects.length <= 1;
    let activeProject = isSingleMode ? targetProject || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0] : registry.projects.find((p) => p.id === registry.activeProjectId) || targetProject || registry.projects[0];
    if (activeProject && activeProject.repoPath) {
      const identity = resolveProjectIdentity(activeProject.repoPath);
      activeProject = {
        ...activeProject,
        id: identity.id || activeProject.id,
        name: identity.name || activeProject.name,
        codePrefix: identity.codePrefix || activeProject.codePrefix
      };
    }
    if (!activeProject && targetRepo) {
      const identity = resolveProjectIdentity(targetRepo);
      activeProject = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: targetRepo,
        storageType: "markdown",
        backlogDir: "backlog",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (req.method === "GET" && pathname === "/api/settings") {
      const urlObj2 = new URL(`http://localhost${url}`);
      const projectId = urlObj2.searchParams.get("projectId");
      const project = isSingleMode && activeProject ? activeProject : registry.projects.find((p) => p.id === (projectId || registry.activeProjectId)) || registry.projects[0];
      const config = readProjectConfig(project);
      return sendJson(res, 200, { ok: true, config, projectId: project?.id });
    }
    if (req.method === "POST" && pathname === "/api/settings") {
      const body = await getBody(req, res);
      const projectId = body.projectId || registry.activeProjectId;
      const project = isSingleMode && activeProject ? activeProject : registry.projects.find((p) => p.id === projectId) || registry.projects[0];
      const configToSave = body.config || body;
      if (configToSave.mode === "multi" || configToSave.mode === "single") {
        process.env.GRIPM_MODE = configToSave.mode;
      }
      const savedPath = writeProjectConfig(configToSave, project);
      broadcastSse("settings_changed", {
        projectId: project?.id,
        config: configToSave,
        timestamp: Date.now()
      });
      return sendJson(res, 200, {
        ok: true,
        config: readProjectConfig(project),
        savedPath
      });
    }
    if (req.method === "GET" && (pathname === "/api/data" || url === "/api/data")) {
      const allItems = [];
      const allReleases = [];
      const allSprints = [];
      const resolvedProjects = [];
      const projectsToProcess = isSingleMode && activeProject ? [activeProject] : getVisibleProjects(registry.projects, activeProject);
      for (const p of projectsToProcess) {
        const backlog = readProjectBacklog(p);
        const proj = backlog.project || p;
        const docsPath = getProjectDocsPath(proj);
        resolvedProjects.push({
          ...proj,
          docsPath: docsPath || void 0,
          hasDocs: Boolean(docsPath)
        });
        allItems.push(...backlog.items || []);
        allReleases.push(...backlog.releases || []);
        allSprints.push(...backlog.sprints || []);
      }
      const resolvedActiveId = activeProject?.id || registry.activeProjectId || resolvedProjects[0]?.id || "";
      const updateInfo = getCachedUpdateInfo(appVersion);
      checkForUpdates(appVersion).catch(() => {
      });
      return sendJson(res, 200, {
        projects: resolvedProjects,
        activeProjectId: resolvedActiveId,
        singleProject: isSingleMode,
        items: allItems,
        releases: allReleases,
        sprints: allSprints,
        updateAvailable: updateInfo || null,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (req.method === "GET" && pathname === "/api/updates") {
      const cached = getCachedUpdateInfo(appVersion);
      return sendJson(res, 200, {
        currentVersion: appVersion,
        update: cached || null
      });
    }
    if (req.method === "POST" && pathname === "/api/items") {
      const body = await getBody(req, res);
      const project = registry.projects.find((p) => p.id === (body.projectId || registry.projects[0]?.id)) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "No active project found" });
      try {
        const result = BacklogService.createTask(project, body);
        return sendJson(res, 201, {
          ok: true,
          item: result.task,
          task: result.task,
          savedFile: result.savedFile
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || "Failed to create task" });
      }
    }
    if (req.method === "POST" && pathname === "/api/items/bulk") {
      const body = await getBody(req, res);
      const explicitProjectId = body.projectId || searchParams.get("projectId");
      const targetProject2 = explicitProjectId ? registry.projects.find((p) => p.id === explicitProjectId) : registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!targetProject2) {
        return sendJson(res, 400, { error: "No active project found for bulk update" });
      }
      const targetFilter = {
        taskIds: body.taskIds,
        filterPrefix: body.filterPrefix,
        filterStatus: body.filterStatus,
        items: body.items
      };
      const updates = body.updates || body;
      const result = BacklogService.bulkUpdateTasks(targetProject2, targetFilter, updates, { force: body.force });
      broadcastSse("backlog_changed", {
        projectId: targetProject2.id,
        action: "bulk_updated",
        count: result.updatedCount,
        timestamp: Date.now()
      });
      return sendJson(res, 200, {
        ok: result.ok,
        updatedCount: result.updatedCount,
        count: result.updatedCount,
        updatedIds: result.updatedIds,
        failedUpdates: result.failedUpdates
      });
    }
    if (req.method === "PUT" && pathname.startsWith("/api/items/")) {
      const id = decodeURIComponent(pathname.replace("/api/items/", ""));
      const body = await getBody(req, res);
      const explicitProjectId = body?.projectId || searchParams.get("projectId");
      const candidateProjects = explicitProjectId ? registry.projects.filter((p) => p.id === explicitProjectId) : [
        registry.projects.find((p) => p.id === registry.activeProjectId),
        ...registry.projects.filter((p) => p.id !== registry.activeProjectId)
      ].filter(Boolean);
      for (const p of candidateProjects) {
        try {
          const result = BacklogService.updateTask(p, id, body, {
            force: body?.force,
            expectedMtime: body?.expectedMtime
          });
          if (result.ok) {
            return sendJson(res, 200, {
              ok: true,
              item: result.updatedTask,
              updatedTask: result.updatedTask,
              warning: result.warning,
              audit: result.audit
            });
          }
        } catch (err) {
          if (err instanceof ConflictError || err?.conflict || err?.name === "ConflictError") {
            return sendJson(res, 409, {
              error: "conflict",
              message: err.message,
              currentMtime: err.currentMtime,
              currentItem: err.currentItem
            });
          }
          if (err?.message && (err.message.includes("Gatekeeper") || err.message.includes("[Validation]"))) {
            return sendJson(res, 400, { error: err.message });
          }
          if (err?.message && err.message.includes("no encontrada")) {
            continue;
          }
          return sendJson(res, 400, { error: err.message });
        }
      }
      return sendJson(res, 404, { error: "Item not found in any registered project" });
    }
    if (req.method === "PATCH" && /^\/api\/items\/[^/]+\/restore$/.test(pathname)) {
      const id = decodeURIComponent(pathname.replace("/api/items/", "").replace("/restore", ""));
      const explicitProjectId = searchParams.get("projectId");
      const candidateProjects = explicitProjectId ? registry.projects.filter((p) => p.id === explicitProjectId) : [
        registry.projects.find((p) => p.id === registry.activeProjectId),
        ...registry.projects.filter((p) => p.id !== registry.activeProjectId)
      ].filter(Boolean);
      for (const p of candidateProjects) {
        const restored = BacklogService.restoreTask(p, id);
        if (restored) {
          broadcastSse("change", { type: "item_restored", id });
          return sendJson(res, 200, { ok: true, id });
        }
      }
      return sendJson(res, 404, { error: "Item not found" });
    }
    if (req.method === "DELETE" && pathname.startsWith("/api/items/")) {
      const isPurge = searchParams.get("purge") === "true";
      const id = decodeURIComponent(pathname.replace("/api/items/", ""));
      const explicitProjectId = searchParams.get("projectId");
      const candidateProjects = explicitProjectId ? registry.projects.filter((p) => p.id === explicitProjectId) : [
        registry.projects.find((p) => p.id === registry.activeProjectId),
        ...registry.projects.filter((p) => p.id !== registry.activeProjectId)
      ].filter(Boolean);
      for (const p of candidateProjects) {
        try {
          const resDel = BacklogService.deleteTask(p, id, { purge: isPurge });
          if (resDel.ok) {
            broadcastSse("change", {
              type: isPurge ? "item_purged" : "item_soft_deleted",
              id
            });
            return sendJson(res, 200, {
              ok: true,
              id,
              purged: isPurge ? true : void 0,
              softDeleted: !isPurge ? true : void 0
            });
          }
        } catch (err) {
          if (err?.message && err.message.includes("Cannot soft-delete a done item")) {
            return sendJson(res, 403, { error: err.message });
          }
          return sendJson(res, 400, { error: err.message });
        }
      }
      return sendJson(res, 404, { error: "Item not found" });
    }
    if (req.method === "POST" && pathname === "/api/import/legacy-md") {
      const body = await getBody(req, res);
      const projectId = body.projectId || registry.projects[0]?.id;
      const project = registry.projects.find((p) => p.id === projectId);
      if (!project) return sendJson(res, 404, { error: "Proyecto no encontrado" });
      let itemsToImport = [];
      if (Array.isArray(body.items) && body.items.length > 0) {
        itemsToImport = body.items.filter((it) => it.selected !== false);
      } else if (body.content) {
        itemsToImport = parseLegacyMarkdown(body.content, body.defaultMilestone);
      }
      if (itemsToImport.length === 0) {
        return sendJson(res, 400, { error: "No se encontraron tareas seleccionadas para importar" });
      }
      const currentBacklog = readProjectBacklog(project);
      const prefix = (project.codePrefix || "ITEM").toUpperCase();
      let maxNum = 0;
      for (const item of currentBacklog.items) {
        const code = String(item.code || item.id || "");
        const match = code.match(new RegExp(`^${prefix}-(\\d+)`, "i"));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const createdItems = [];
      let order = currentBacklog.items.length + 1;
      for (const it of itemsToImport) {
        maxNum++;
        const itemCode = `${prefix}-${String(maxNum).padStart(3, "0")}`;
        const newItem = {
          id: itemCode,
          code: itemCode,
          projectId: project.id,
          title: it.title || "Sin t\xEDtulo",
          description: it.description || "",
          status: it.status || "draft",
          type: it.type || "feature",
          priority: normalizePriority(it.priority || "p2"),
          module: it.module || void 0,
          sprint: it.sprint || it.targetSprint || (it.milestone?.toLowerCase().includes("sprint") ? it.milestone : void 0),
          release: it.release || it.targetRelease || (it.milestone && !it.milestone.toLowerCase().includes("sprint") ? it.milestone : void 0),
          targetSprint: it.sprint || it.targetSprint || it.milestone || void 0,
          targetRelease: it.release || it.targetRelease || void 0,
          milestone: it.milestone || void 0,
          order: order++,
          createdAt: now,
          updatedAt: now,
          completedAt: it.status === "done" ? now : void 0
        };
        if (isBacklogMdProject(project)) {
          BacklogService.saveTask(project, newItem);
        } else {
          currentBacklog.items.push(newItem);
        }
        createdItems.push(newItem);
      }
      if (!isBacklogMdProject(project)) {
        writeProjectBacklog(project, currentBacklog);
      }
      broadcastSse("backlog_changed", {
        projectId: project.id,
        action: "imported",
        count: createdItems.length,
        timestamp: Date.now()
      });
      return sendJson(res, 200, {
        ok: true,
        importedCount: createdItems.length,
        items: createdItems
      });
    }
    if (req.method === "POST" && pathname === "/api/projects") {
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const id = (body.id || body.codePrefix || body.name || `proj-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      let storageType = body.storageType;
      let backlogDir = body.backlogDir || "backlog";
      if (body.backlogDir) {
        const normBacklog = path12.normalize(body.backlogDir);
        if (path12.isAbsolute(normBacklog) || normBacklog.startsWith("..") || normBacklog.includes(`..${path12.sep}`)) {
          return sendJson(res, 400, { ok: false, error: "Invalid backlogDir: must be a relative directory inside the repository" });
        }
      }
      const normalizedRepoPath = body.repoPath ? path12.normalize(body.repoPath.trim()) : void 0;
      if (normalizedRepoPath && !isAllowedBrowsePath(normalizedRepoPath)) {
        return sendJson(res, 403, { error: "Forbidden: repoPath is outside allowed roots" });
      }
      if (!storageType && normalizedRepoPath) {
        const detected = detectProjectStorage(normalizedRepoPath);
        storageType = detected.storageType;
        backlogDir = detected.backlogDir;
      }
      const newProject = {
        id,
        name: body.name || "Nuevo Proyecto",
        codePrefix: (body.codePrefix || "PRJ").toUpperCase().replace(/[^A-Z0-9]/g, "") || "PRJ",
        repoPath: normalizedRepoPath,
        ...body.isDemo ? { isDemo: true } : {},
        storageType: storageType || "json",
        backlogDir,
        createdAt: now
      };
      registry.projects.push(newProject);
      saveRegistry(registry);
      if (newProject.repoPath) {
        readProjectBacklog(newProject);
      }
      return sendJson(res, 201, { ok: true, project: newProject });
    }
    if (req.method === "POST" && pathname === "/api/projects/restore-demo") {
      const hasDemo = registry.projects.some((p) => p.id === "demo");
      if (!hasDemo) {
        registry.projects.push({
          id: "demo",
          name: "Proyecto Demo (Tour)",
          codePrefix: "DEMO",
          description: "Proyecto de demostraci\xF3n de gripm. Puedes explorarlo o eliminarlo en cualquier momento.",
          isDemo: true,
          storageType: "json",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      registry.activeProjectId = "demo";
      saveRegistry(registry);
      const visible = isSingleMode ? activeProject ? [activeProject] : [] : getVisibleProjects(registry.projects, activeProject);
      return sendJson(res, 200, { ok: true, projects: visible, activeProjectId: "demo" });
    }
    if (req.method === "POST" && pathname === "/api/projects/detect-path") {
      const body = await getBody(req, res);
      const inputPath = body.repoPath ? path12.normalize(body.repoPath.trim()) : "";
      if (!inputPath) {
        return sendJson(res, 400, { error: "repoPath required" });
      }
      if (!isAllowedBrowsePath(inputPath)) {
        return sendJson(res, 403, { error: "Forbidden: repoPath is outside allowed roots" });
      }
      const exists = fs12.existsSync(inputPath);
      const isGit = exists && fs12.existsSync(path12.join(inputPath, ".git"));
      const detection = detectProjectStorage(inputPath);
      return sendJson(res, 200, {
        ok: true,
        exists,
        isGit,
        normalizedPath: inputPath,
        ...detection
      });
    }
    if (req.method === "DELETE" && pathname.startsWith("/api/projects/")) {
      const id = decodeURIComponent(pathname.replace("/api/projects/", ""));
      const initialLen = registry.projects.length;
      registry.projects = registry.projects.filter((p) => p.id !== id);
      if (registry.projects.length === initialLen) {
        return sendJson(res, 404, { error: "Project not found in registry" });
      }
      if (registry.activeProjectId === id) {
        registry.activeProjectId = registry.projects[0]?.id || "";
      }
      saveRegistry(registry);
      const visible = isSingleMode ? activeProject ? [activeProject] : [] : getVisibleProjects(registry.projects, activeProject);
      return sendJson(res, 200, { ok: true, id, remainingProjects: visible });
    }
    if (req.method === "POST" && pathname === "/api/projects/active") {
      const body = await getBody(req, res);
      const { projectId } = body || {};
      if (isSingleMode) {
        return sendJson(res, 200, { ok: true, activeProjectId: activeProject?.id, singleProject: true });
      }
      const visibleProjects = getVisibleProjects(registry.projects, activeProject);
      if (projectId && visibleProjects.some((p) => p.id === projectId)) {
        registry.activeProjectId = projectId;
        saveRegistry(registry);
        return sendJson(res, 200, { ok: true, activeProjectId: projectId });
      }
      return sendJson(res, 400, { error: "Invalid or missing projectId" });
    }
    if (req.method === "GET" && (pathname === "/api/fs/browse" || pathname.startsWith("/api/fs/browse"))) {
      let rawDir = searchParams.get("dir") || "";
      let targetDir = rawDir.trim();
      if (!targetDir) {
        targetDir = getSafeInitialBrowseDir();
      } else {
        targetDir = path12.resolve(path12.normalize(targetDir));
        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        }
      }
      try {
        if (!fs12.existsSync(targetDir)) {
          targetDir = getSafeInitialBrowseDir();
        }
        const stat = fs12.statSync(targetDir);
        if (!stat.isDirectory()) {
          targetDir = path12.dirname(targetDir);
        }
        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        }
        const parent = path12.dirname(targetDir);
        const parentPath = parent !== targetDir && isAllowedBrowsePath(parent) ? parent : null;
        let entries = [];
        let dirWarning = void 0;
        try {
          entries = fs12.readdirSync(targetDir, { withFileTypes: true });
        } catch (readErr) {
          console.warn(`[gripm FS] Cannot scan ${targetDir}: ${readErr.message}`);
          dirWarning = readErr.code === "EPERM" || readErr.code === "EACCES" ? `Permiso restringido por el sistema al explorar esta carpeta (${readErr.message}). Puedes escribir o pegar la ruta exacta manualmente.` : `No se pudieron leer subcarpetas: ${readErr.message}`;
        }
        const folders = [];
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith(".") && entry.name !== ".backlog") continue;
          if (["node_modules", "dist", "build", ".git", "$RECYCLE.BIN", "System Volume Information"].includes(entry.name)) continue;
          const fullPath = path12.join(targetDir, entry.name);
          let isGit = false;
          let hasBacklog = false;
          try {
            isGit = fs12.existsSync(path12.join(fullPath, ".git"));
            hasBacklog = fs12.existsSync(path12.join(fullPath, "backlog")) || fs12.existsSync(path12.join(fullPath, ".backlog"));
          } catch {
          }
          folders.push({
            name: entry.name,
            path: fullPath,
            isGit,
            hasBacklog
          });
        }
        folders.sort((a, b) => a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
        let isCurrentGit = false;
        let hasCurrentBacklog = false;
        let hasCurrentGripm = false;
        try {
          isCurrentGit = fs12.existsSync(path12.join(targetDir, ".git"));
          hasCurrentBacklog = fs12.existsSync(path12.join(targetDir, "backlog")) || fs12.existsSync(path12.join(targetDir, ".backlog"));
          hasCurrentGripm = fs12.existsSync(path12.join(targetDir, ".gripm"));
        } catch {
        }
        return sendJson(res, 200, {
          ok: true,
          currentPath: targetDir,
          parentPath,
          folders,
          isGit: isCurrentGit,
          hasBacklog: hasCurrentBacklog,
          hasGripm: hasCurrentGripm,
          warning: dirWarning
        });
      } catch (browseErr) {
        const safeDir = getSafeInitialBrowseDir();
        const parent = path12.dirname(safeDir);
        const parentPath = parent !== safeDir && isAllowedBrowsePath(parent) ? parent : null;
        return sendJson(res, 200, {
          ok: true,
          currentPath: safeDir,
          parentPath,
          folders: [],
          warning: `No se pudo acceder a la ruta solicitada (${browseErr.message}). Se carg\xF3 una ruta segura.`
        });
      }
    }
    if (req.method === "POST" && /^\/api\/projects\/[^/]+\/detect-storage$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/detect-storage$/)[1]);
      const p = registry.projects.find((proj) => proj.id === id);
      if (!p) return sendJson(res, 404, { error: "Project not found" });
      const detection = detectProjectStorage(p.repoPath);
      return sendJson(res, 200, { ok: true, ...detection });
    }
    if (req.method === "POST" && /^\/api\/projects\/[^/]+\/convert-to-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-md$/)[1]);
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      }
      const currentBacklog = readProjectBacklog(project);
      const tasksDir = path12.join(project.repoPath, "backlog/tasks");
      if (!fs12.existsSync(tasksDir)) {
        fs12.mkdirSync(tasksDir, { recursive: true });
      }
      let converted = 0;
      for (const item of currentBacklog.items) {
        BacklogService.saveTask({ ...project, storageType: "markdown", backlogDir: "backlog" }, item);
        converted++;
      }
      project.storageType = "markdown";
      project.backlogDir = "backlog";
      saveRegistry(registry);
      return sendJson(res, 200, {
        ok: true,
        message: `Convertidos ${converted} items a Backlog.md en ${tasksDir}`,
        convertedCount: converted,
        tasksDir
      });
    }
    if (req.method === "POST" && /^\/api\/projects\/[^/]+\/convert-to-json$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-json$/)[1]);
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      }
      const currentBacklog = readProjectBacklog(project);
      const jsonPath = path12.join(project.repoPath, ".gripm/backlog.json");
      const gripmDir = path12.dirname(jsonPath);
      if (!fs12.existsSync(gripmDir)) {
        fs12.mkdirSync(gripmDir, { recursive: true });
      }
      atomicWriteFileSync2(jsonPath, JSON.stringify(currentBacklog, null, 2), "utf8");
      project.storageType = "json";
      saveRegistry(registry);
      return sendJson(res, 200, {
        ok: true,
        message: `Unificadas ${currentBacklog.items.length} tareas en ${jsonPath}`,
        savedPath: jsonPath
      });
    }
    if (req.method === "GET" && /^\/api\/projects\/[^/]+\/export-json$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-json$/)[1]);
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, {
        ok: true,
        project,
        data: backlog
      });
    }
    if (req.method === "GET" && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)[1]);
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      const result = BacklogService.exportBacklogMd(project, { save: false });
      return sendJson(res, 200, {
        ok: true,
        content: result.content
      });
    }
    if (req.method === "POST" && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
      const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)[1]);
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      if (!project.repoPath) return sendJson(res, 400, { error: "Project lacks repoPath" });
      await getBody(req, res).catch(() => ({}));
      const result = BacklogService.exportBacklogMd(project, { save: true });
      return sendJson(res, 200, {
        ok: true,
        content: result.content,
        savedPath: result.savedPath
      });
    }
    if (req.method === "POST" && pathname === "/api/releases") {
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      const requestedStatus = body.status === "released" ? "released" : "unreleased";
      const isReleased = requestedStatus === "released";
      const isUnreleased = requestedStatus === "unreleased";
      const existingIdx = backlog.releases.findIndex(
        (r) => body.id && r.id === body.id || body.version && (r.version === body.version || r.version?.replace(/^v/i, "") === body.version?.replace(/^v/i, ""))
      );
      const existingRel = existingIdx >= 0 ? backlog.releases[existingIdx] : null;
      let resolvedItemCodes = body.itemCodes;
      if (resolvedItemCodes === void 0 || Array.isArray(resolvedItemCodes) && resolvedItemCodes.length === 0 && existingRel && Array.isArray(existingRel.itemCodes) && existingRel.itemCodes.length > 0 && body.clearItemCodes !== true) {
        resolvedItemCodes = existingRel ? existingRel.itemCodes : [];
      }
      const release = {
        id: body.id || (existingRel ? existingRel.id : `rel-${(body.version || "1.0.0").replace(/\./g, "-")}-${Date.now()}`),
        projectId: project.id,
        version: body.version || (existingRel ? existingRel.version : "1.0.0"),
        date: body.date || (existingRel ? existingRel.date : now.split("T")[0]),
        title: body.title || (existingRel ? existingRel.title : isUnreleased ? `En Preparaci\xF3n: v${body.version}` : `Release v${body.version}`),
        summary: body.summary !== void 0 ? body.summary : existingRel ? existingRel.summary : "",
        itemCodes: resolvedItemCodes || [],
        markdownContent: body.markdownContent !== void 0 ? body.markdownContent : existingRel ? existingRel.markdownContent : "",
        createdAt: body.createdAt || (existingRel ? existingRel.createdAt : now),
        status: requestedStatus,
        targetDate: body.targetDate !== void 0 ? body.targetDate : existingRel ? existingRel.targetDate : void 0,
        scopeNotes: body.scopeNotes !== void 0 ? body.scopeNotes : existingRel ? existingRel.scopeNotes : void 0
      };
      const itemCodeSet = new Set((release.itemCodes || []).map((c2) => c2.toUpperCase()));
      const relVCLean = (release.version || "").replace(/^v/i, "");
      backlog.items = backlog.items.map((it) => {
        const codeUpper = (it.code || it.id || "").toUpperCase();
        const isItemInRelease = itemCodeSet.has(codeUpper);
        const prevRel = (it.targetRelease || it.release || "").replace(/^v/i, "");
        if (isReleased) {
          if (isItemInRelease) {
            const updated = {
              ...it,
              targetRelease: release.version,
              release: release.version,
              releasedAt: now,
              status: it.status === "ready" || it.status === "finish" ? "done" : it.status,
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
              targetRelease: void 0,
              release: void 0,
              milestone: it.milestone && it.milestone.replace(/^v/i, "") === relVCLean ? void 0 : it.milestone,
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
      const targetIdx = backlog.releases.findIndex((r) => r.id === release.id || r.version === release.version);
      if (targetIdx >= 0) {
        backlog.releases[targetIdx] = { ...backlog.releases[targetIdx], ...release };
      } else {
        backlog.releases.unshift(release);
      }
      writeProjectBacklog(project, backlog);
      return sendJson(res, 201, { ok: true, release });
    }
    if (req.method === "DELETE" && pathname.startsWith("/api/releases/")) {
      const releaseId = decodeURIComponent(pathname.replace("/api/releases/", ""));
      const project = registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      const initialCount = backlog.releases.length;
      backlog.releases = (backlog.releases || []).filter((r) => r.id !== releaseId && r.version !== releaseId);
      writeProjectBacklog(project, backlog);
      return sendJson(res, 200, { ok: true, deleted: initialCount > backlog.releases.length });
    }
    if (req.method === "POST" && pathname === "/api/releases/sync-legacy") {
      const body = await getBody(req, res);
      const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      if (project.repoPath) {
        const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, backlog.items);
        if (parsed.length > 0) {
          backlog.releases = parsed;
          const releasesPath = path12.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
          try {
            if (!fs12.existsSync(path12.dirname(releasesPath))) fs12.mkdirSync(path12.dirname(releasesPath), { recursive: true });
            atomicWriteFileSync2(releasesPath, JSON.stringify(backlog.releases, null, 2), "utf8");
          } catch (err) {
            console.warn(`[gripm API] Error saving synced releases:`, err.message);
          }
          broadcastSse("backlog_changed", { projectId: project.id, action: "releases_synced", timestamp: Date.now() });
        }
      }
      return sendJson(res, 200, {
        ok: true,
        releases: backlog.releases,
        count: backlog.releases.length
      });
    }
    if (req.method === "GET" && (pathname === "/api/sprints" || pathname.startsWith("/api/sprints"))) {
      const projectId = searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
      const project = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, { ok: true, sprints: backlog.sprints || [] });
    }
    if (req.method === "POST" && pathname === "/api/sprints") {
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];
      const requestedStatus = body.status === "active" ? "active" : body.status === "completed" ? "completed" : "planned";
      if (requestedStatus === "active") {
        backlog.sprints = backlog.sprints.map((s) => s.status === "active" ? { ...s, status: "planned" } : s);
      }
      let sprintId = body.id ? String(body.id).trim() : "";
      while (sprintId.startsWith("sprint-sprint-")) {
        sprintId = sprintId.replace(/^sprint-/, "");
      }
      if (!sprintId || /^sprint-\d{10,}$/.test(sprintId)) {
        const nameMatch = (body.name || "").match(/sprint\s*(\d+)/i);
        if (nameMatch) {
          sprintId = `sprint-${nameMatch[1]}`;
        } else {
          let maxNum = -1;
          for (const s of backlog.sprints) {
            const m = (s.id || "").match(/^sprint-(\d+)$/);
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
        goal: body.goal || "",
        startDate: body.startDate || void 0,
        endDate: body.endDate || void 0,
        durationWeeks: body.durationWeeks || void 0,
        status: requestedStatus,
        createdAt: now
      };
      backlog.sprints.push(newSprint);
      writeProjectBacklog(project, backlog);
      broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_created", sprintId: newSprint.id, timestamp: Date.now() });
      return sendJson(res, 201, { ok: true, sprint: newSprint });
    }
    if (req.method === "PUT" && pathname.startsWith("/api/sprints/")) {
      const sprintId = decodeURIComponent(pathname.replace("/api/sprints/", ""));
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];
      const sIdx = backlog.sprints.findIndex((s) => s.id === sprintId || s.name === sprintId);
      if (sIdx === -1) return sendJson(res, 404, { error: "Sprint no encontrado" });
      const existingSprint = backlog.sprints[sIdx];
      const oldName = existingSprint.name;
      const newName = body.name ? body.name.trim() : oldName;
      const newStatus = body.status || existingSprint.status;
      if (newStatus === "active") {
        backlog.sprints = backlog.sprints.map((s) => s.id !== existingSprint.id && s.status === "active" ? { ...s, status: "planned" } : s);
      }
      const updatedSprint = {
        ...existingSprint,
        name: newName,
        goal: body.goal !== void 0 ? body.goal : existingSprint.goal,
        startDate: body.startDate !== void 0 ? body.startDate : existingSprint.startDate,
        endDate: body.endDate !== void 0 ? body.endDate : existingSprint.endDate,
        durationWeeks: body.durationWeeks !== void 0 ? body.durationWeeks : existingSprint.durationWeeks,
        status: newStatus,
        completedAt: newStatus === "completed" ? existingSprint.completedAt || now : void 0
      };
      backlog.sprints[sIdx] = updatedSprint;
      if (oldName && newName && oldName !== newName) {
        backlog.items.forEach((it) => {
          if (it.sprint === oldName || it.targetSprint === oldName) {
            it.sprint = newName;
            it.targetSprint = newName;
            if (isBacklogMdProject(project)) {
              BacklogService.saveTask(project, it);
            }
          }
        });
      }
      if (body.retro) {
        try {
          const retrosDir = path12.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
          if (!fs12.existsSync(retrosDir)) {
            fs12.mkdirSync(retrosDir, { recursive: true });
          }
          const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const sprintKey = String(updatedSprint.id || newName).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
          const retroFile = path12.join(retrosDir, `${sprintKey}-retro.md`);
          const r = body.retro;
          const md = `# Retrospectiva - ${newName}

**Fecha:** ${todayStr}  
**Sprint:** ${newName}  
**Proyecto:** ${project.name}

---

## \u{1F7E2} Fortalezas (\xBFQu\xE9 funcion\xF3 bien y debe repetirse?)
${r.whatWentWell ? r.whatWentWell.trim() : "No se registraron comentarios espec\xEDficos."}

## \u{1F534} Problemas (\xBFQu\xE9 fall\xF3, se rompi\xF3 o tom\xF3 m\xE1s tiempo del esperado?)
${r.whatWentWrong ? r.whatWentWrong.trim() : "No se registraron incidentes cr\xEDticos."}

## \u{1F7E1} Eficiencia (\xBFQu\xE9 podr\xEDa haberse hecho en menos pasos o con menos tokens?)
${r.whatToImprove ? r.whatToImprove.trim() : "Flujo eficiente y directo."}

## \u{1F4CC} Acciones Concretas (Compromisos y Mejoras)
${Array.isArray(r.actions) && r.actions.length > 0 ? r.actions.map((act) => `- [ ] ${act}`).join("\n") : "- [ ] Continuar aplicando las buenas pr\xE1cticas establecidas."}
`;
          atomicWriteFileSync2(retroFile, md, "utf8");
        } catch (e) {
          console.warn("[Retro Save Error]", e.message);
        }
      }
      writeProjectBacklog(project, backlog);
      broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_updated", sprintId: updatedSprint.id, timestamp: Date.now() });
      return sendJson(res, 200, { ok: true, sprint: updatedSprint });
    }
    if (req.method === "GET" && (pathname === "/api/retros" || pathname.startsWith("/api/retros"))) {
      const projectId = searchParams.get("projectId");
      const project = registry.projects.find((p) => p.id === projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const retrosDir = path12.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
      if (!fs12.existsSync(retrosDir)) return sendJson(res, 200, { retros: [] });
      const files = fs12.readdirSync(retrosDir).filter((f) => f.endsWith(".md"));
      const retros = files.map((f) => {
        const full = path12.join(retrosDir, f);
        const raw = fs12.readFileSync(full, "utf8");
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const dateMatch = raw.match(/\*\*Fecha:\*\*\s*([^\n]+)/);
        return {
          file: f,
          sprintId: f.replace(/-retro\.md$/, ""),
          title: titleMatch ? titleMatch[1].trim() : f,
          date: dateMatch ? dateMatch[1].trim() : "",
          content: raw
        };
      });
      return sendJson(res, 200, { retros });
    }
    if (req.method === "DELETE" && pathname.startsWith("/api/sprints/")) {
      const sprintId = decodeURIComponent(pathname.replace("/api/sprints/", ""));
      const projectId = searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
      const project = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      backlog.sprints = backlog.sprints || [];
      const sIdx = backlog.sprints.findIndex((s) => s.id === sprintId || s.name === sprintId);
      if (sIdx === -1) return sendJson(res, 404, { error: "Sprint no encontrado" });
      const deletedSprint = backlog.sprints[sIdx];
      backlog.sprints.splice(sIdx, 1);
      backlog.items.forEach((it) => {
        if (it.sprint === deletedSprint.name || it.targetSprint === deletedSprint.name || it.sprint === deletedSprint.id) {
          it.sprint = void 0;
          it.targetSprint = void 0;
          if (it.milestone && it.milestone.toLowerCase().includes("sprint")) {
            it.milestone = void 0;
          }
          if (isBacklogMdProject(project)) {
            BacklogService.saveTask(project, it);
          }
        }
      });
      writeProjectBacklog(project, backlog);
      broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_deleted", sprintId, timestamp: Date.now() });
      return sendJson(res, 200, { ok: true, deleted: true });
    }
    if (req.method === "POST" && pathname === "/api/import") {
      try {
        const body = await getBody(req, res).catch(() => ({}));
        const projectId = body.projectId || registry.activeProjectId || registry.projects[0]?.id;
        const targetProject2 = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
        if (!targetProject2) {
          return sendJson(res, 404, { ok: false, error: "Proyecto no encontrado" });
        }
        const docsDir = body.docsPath || getProjectDocsPath(targetProject2);
        if (body.docsPath && !isAllowedBrowsePath(body.docsPath)) {
          return sendJson(res, 403, { ok: false, error: "Forbidden: docsPath is outside allowed roots" });
        }
        if (!docsDir || !fs12.existsSync(docsDir)) {
          return sendJson(res, 400, {
            ok: false,
            error: `El proyecto "${targetProject2.name}" no tiene una carpeta de documentaci\xF3n vinculada (/docs) v\xE1lida o existente.`
          });
        }
        if (isBacklogMdProject(targetProject2)) {
          const boardData = runMigration(docsDir, null, targetProject2);
          let updatedCount = 0;
          for (const item of boardData.items || []) {
            item.projectId = targetProject2.id;
            BacklogService.saveTask(targetProject2, item);
            updatedCount++;
          }
          if (boardData.releases && boardData.releases.length > 0 && targetProject2.repoPath) {
            const releasesPath = path12.join(targetProject2.repoPath, targetProject2.backlogDir || "backlog", "releases.json");
            try {
              if (!fs12.existsSync(path12.dirname(releasesPath))) fs12.mkdirSync(path12.dirname(releasesPath), { recursive: true });
              atomicWriteFileSync2(releasesPath, JSON.stringify(boardData.releases, null, 2), "utf8");
            } catch (relErr) {
              console.warn("[gripm] Error saving releases during import:", relErr.message);
            }
          }
          return sendJson(res, 200, {
            ok: true,
            projectId: targetProject2.id,
            projectName: targetProject2.name,
            importedCount: updatedCount,
            releasesCount: boardData.releases?.length || 0,
            storageType: "markdown"
          });
        } else {
          const targetFile = (await Promise.resolve().then(() => (init_registry(), registry_exports))).getProjectBacklogPath(targetProject2);
          const boardData = runMigration(docsDir, targetFile, targetProject2);
          return sendJson(res, 200, {
            ok: true,
            projectId: targetProject2.id,
            projectName: targetProject2.name,
            importedCount: boardData.items?.length || 0,
            releasesCount: boardData.releases?.length || 0,
            storageType: "json"
          });
        }
      } catch (importErr) {
        console.error("[gripm API] Error in /api/import:", importErr);
        return sendJson(res, 500, { ok: false, error: importErr.message });
      }
    }
    sendJson(res, 404, { error: "Endpoint not found" });
  } catch (err) {
    if (err?.statusCode === 413) {
      return;
    }
    console.error("[gripm API Error]", err);
    sendJson(res, 500, { error: err.message || "Internal server error" });
  }
}
var appVersion;
var init_api = __esm({
  "server/routes/api.ts"() {
    "use strict";
    init_registry();
    init_storage();
    init_backlogService();
    init_fsExplorer();
    init_atomicWrite();
    init_sseManager();
    init_security();
    init_import_docs();
    init_backlogMdParser();
    init_legacyParser();
    init_registryConfig();
    init_updateChecker();
    appVersion = "1.0.0";
    try {
      const pkg = JSON.parse(fs12.readFileSync(path12.resolve(PKG_ROOT2, "package.json"), "utf8"));
      if (pkg.version) appVersion = pkg.version;
    } catch {
    }
  }
});

// server/plugin.ts
var plugin_exports = {};
__export(plugin_exports, {
  gripmApi: () => gripmApi
});
function gripmApi() {
  const apiMiddleware = (req, res, next) => {
    applySecurityHeaders(res);
    const url = req.url || "";
    const pathname = url.split("?")[0];
    if (!pathname.startsWith("/api/")) {
      return next();
    }
    const sec = validateSecurity(req, res);
    if (!sec) {
      return;
    }
    const method = (req.method || "GET").toUpperCase();
    if (method === "GET" && pathname === "/api/events") {
      const originHeader = req.headers.origin;
      return handleSseRoute(req, res, originHeader, sec.isAllowedOrigin);
    }
    handleApiRequest(req, res);
  };
  return {
    name: "vite-plugin-gripm-api",
    // DEV-190: exposed so tests (and embedders) can release the filesystem
    // watchers without waiting for a server close event. `fs.watch()` handles
    // cannot be unref'd, so an explicit release is the only way out.
    closeWatchers,
    configureServer(server) {
      setupProjectWatchers();
      server.middlewares.use(apiMiddleware);
      const httpServer = server.httpServer;
      if (httpServer && typeof httpServer.once === "function") {
        httpServer.once("close", () => closeWatchers());
      }
      if (typeof server.listen === "function") {
        const origListen = server.listen.bind(server);
        server.listen = async (...args2) => {
          const res = await origListen(...args2);
          if (server.resolvedUrls?.local) {
            server.resolvedUrls.local = server.resolvedUrls.local.map(
              (u) => u.replace("127.0.0.1", "localhost")
            );
          }
          return res;
        };
      }
    },
    configurePreviewServer(server) {
      setupProjectWatchers();
      server.middlewares.use(apiMiddleware);
      if (typeof server.listen === "function") {
        const origListen = server.listen.bind(server);
        server.listen = async (...args2) => {
          const res = await origListen(...args2);
          if (server.resolvedUrls?.local) {
            server.resolvedUrls.local = server.resolvedUrls.local.map(
              (u) => u.replace("127.0.0.1", "localhost")
            );
          }
          return res;
        };
      }
    }
  };
}
var init_plugin = __esm({
  "server/plugin.ts"() {
    "use strict";
    init_sseManager();
    init_security();
    init_api();
  }
});

// scripts/gripm-runner.js
init_registryConfig();
init_updateChecker();
import fs13 from "node:fs";
import path13 from "node:path";
import os3 from "node:os";
import { fileURLToPath as fileURLToPath5 } from "node:url";
import { execFile } from "node:child_process";

// scripts/initScaffold.js
init_registryConfig();
import fs3 from "node:fs";
import path3 from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath as fileURLToPath2, pathToFileURL } from "node:url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var PKG_ROOT = path3.resolve(__dirname2, "..");
function getSkillTemplate(language = "en") {
  const isEn = String(language).toLowerCase() === "en";
  const skillFile = isEn ? "SKILL.en.md" : "SKILL.es.md";
  const sourceGripmSkill = path3.join(PKG_ROOT, ".agents/skills/gripm", skillFile);
  if (fs3.existsSync(sourceGripmSkill)) {
    try {
      return fs3.readFileSync(sourceGripmSkill, "utf8");
    } catch {
    }
  }
  const baseGripm = path3.join(PKG_ROOT, ".agents/skills/gripm/SKILL.md");
  if (fs3.existsSync(baseGripm)) {
    try {
      return fs3.readFileSync(baseGripm, "utf8");
    } catch {
    }
  }
  console.warn(`\u26A0\uFE0F  [gripm init] ADVERTENCIA: No se encontr\xF3 la plantilla can\xF3nica de skill en "${sourceGripmSkill}". Generando stub b\xE1sico.`);
  return "# gripm Agent Skill\n";
}
var CANONICAL_AGENTS_EN = `# AI Agent Contribution Guide (AGENTS.md)

Welcome to **{{projectName}}**. When working on this repository, AI agents (Antigravity, Cursor, Claude Code) and human developers must strictly adhere to the following guidelines:

## 1. Dogfooding and Living Backlog
- **Every code modification must be associated with a task in \`backlog/tasks/\`**.
- Move the task to \`doing\` before writing code.
- Check acceptance criteria (\`- [x]\`) live as they are completed.
- **Canonical Limit of Development: Only up to \`ready\`**. The agent NEVER promotes a task to \`done\` during the sprint. The \`ready\` status (Ready for Release) is the terminal development state in a sprint.
- The \`done\` status belongs exclusively to formally released versions.
- Include the task \`.md\` file in the same commit as the code changes.

## 2. gripm MCP Server
Use gripm tools (\`gripm-mcp\` or \`npm run mcp\`):
- \`gripm_list_tasks\`: Token-efficient task listing and filtering.
- \`gripm_get_task\`: Read full task details and acceptance criteria.
- \`gripm_update_task\`: Update status, plan, and check criteria sequentially.
- \`gripm_sync_backlog\`: Automatically reconcile tasks and regenerate \`BACKLOG.md\`.

## 3. Pre-Commit Safeguards & Developer Sovereignty
- **Prohibited \`git commit\` by Deduction**: The agent only stages workspace changes and validates tests and typing (\`tsc\`). Execute \`git commit\` **solely upon explicit textual instruction from the user**.
- **Zero Inferred Releases**: Belonging to a sprint does not imply having a release assigned. Release fields remain unassigned until explicitly set by the user.
`;
var CANONICAL_AGENTS_ES = `# Gu\xEDa de Contribuci\xF3n para Agentes de IA (AGENTS.md)

Bienvenido a **{{projectName}}**. Al trabajar en este repositorio, tanto agentes de IA (Antigravity, Cursor, Claude Code) como desarrolladores humanos deben adherirse a las siguientes normas:

## 1. Dogfooding y Backlog Vivo
- **Toda modificaci\xF3n de c\xF3digo debe estar asociada a una tarea en \`backlog/tasks/\`**.
- Pasa la tarea a \`doing\` antes de comenzar a codificar.
- Tilda los criterios de aceptaci\xF3n (\`- [x]\`) en vivo a medida que se cumplan.
- **L\xEDmite Can\xF3nico del Desarrollo: S\xF3lo hasta \`ready\`**. El agente NUNCA promueve una tarea a \`done\` durante el sprint. El estado \`ready\` (Ready for Release) es el estado terminal del desarrollo en el sprint.
- El estado \`done\` pertenece exclusivamente al Release formalmente liberado.
- Incluye el archivo \`.md\` de la tarea en el mismo commit que el c\xF3digo.

## 2. Servidor MCP de gripm
Usa las herramientas de gripm (\`gripm-mcp\` o \`npm run mcp\`):
- \`gripm_list_tasks\`: Lista y filtra tareas con m\xEDnimo consumo de tokens.
- \`gripm_get_task\`: Lee detalles y criterios de aceptaci\xF3n.
- \`gripm_update_task\`: Actualiza estado, plan y tilda criterios secuencialmente.
- \`gripm_sync_backlog\`: Reconcilia tareas y regenera \`BACKLOG.md\` autom\xE1ticamente.

## 3. Salvaguarda Pre-Commit y Soberan\xEDa del Desarrollador
- **Prohibido \`git commit\` por deducci\xF3n**: El agente solo prepara los cambios en el \xE1rbol de trabajo y valida pruebas y tipado (\`tsc\`). Se ejecuta \`git commit\` **\xFAnica y exclusivamente ante una orden textual y expl\xEDcita del usuario**.
- **Cero Releases Falsos**: Pertenecer a un sprint no implica tener versi\xF3n asignada. Los campos de release permanecen sin asignar hasta decisi\xF3n expresa del usuario.
`;
function getAgentsMdTemplate(projectName, language = "en") {
  const isEn = String(language).toLowerCase() === "en";
  const filename = isEn ? "AGENTS.en.md" : "AGENTS.es.md";
  const primaryPath = path3.join(PKG_ROOT, "scripts", "templates", filename);
  const fallbackPath = path3.join(PKG_ROOT, ".agents", filename);
  const templatePath = fs3.existsSync(primaryPath) ? primaryPath : fallbackPath;
  if (fs3.existsSync(templatePath)) {
    try {
      return fs3.readFileSync(templatePath, "utf8").replace(/\{\{projectName\}\}/g, projectName);
    } catch {
    }
  }
  const embedded = isEn ? CANONICAL_AGENTS_EN : CANONICAL_AGENTS_ES;
  return embedded.replace(/\{\{projectName\}\}/g, projectName);
}
async function runInitWizard(targetRepo = process.cwd(), options = {}) {
  const isInteractive = options.isInteractive !== false && process.stdin.isTTY && !options.yes;
  const detectedIdentity = resolveProjectIdentity(targetRepo);
  let projectName = options.name || detectedIdentity.name;
  let projectId = options.id || detectedIdentity.id;
  let codePrefix = options.codePrefix || detectedIdentity.codePrefix;
  let language = (options.language || options.lang || "en").toLowerCase();
  if (language !== "es") language = "en";
  const isEn = language === "en";
  console.log(`
  ${isEn ? "gripm \xB7 Repository Initialization Wizard" : "gripm \xB7 Asistente de Inicializaci\xF3n"}

  \u279C  ${isEn ? "Repository:" : "Repositorio:"}  ${targetRepo}
  \u279C  ${isEn ? "Project:" : "Proyecto:"}     ${projectName}
`);
  let mode = options.mode || (options.hub ? "multi" : "single");
  let profile = options.profile || (options.minimal ? "minimal" : options.full ? "full" : null);
  let methodology = options.methodology || (profile === "full" ? "scrum" : "kanban");
  let enabledTabs = options.enabledTabs || {
    kanban: true,
    sprint: profile === "full",
    release: true
  };
  let installSkill = options.skill !== void 0 ? options.skill : true;
  let installAgentsMd = options.agentsMd !== void 0 ? options.agentsMd : profile === "minimal" ? false : true;
  let installPlaybook = options.playbook !== void 0 ? Boolean(options.playbook) : options.withPlaybook ? true : false;
  let updatePkgJson = options.packageJson !== void 0 ? options.packageJson : true;
  let updateGitignore = options.gitignore !== void 0 ? options.gitignore : true;
  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      console.log("  Initial configuration / Configuraci\xF3n inicial:\n");
      const langAnswer = await rl.question(
        "  1. Language / Idioma:\n     [1] English (en) [Default]\n     [2] Espa\xF1ol (es)\n     Select option / Selecciona opci\xF3n [1]: "
      );
      if (langAnswer.trim() === "2" || langAnswer.trim().toLowerCase() === "es") {
        language = "es";
      } else {
        language = "en";
      }
      const isEn2 = language === "en";
      const nameAnswer = await rl.question(
        isEn2 ? `
  2. Project name [${projectName}]: ` : `
  2. Nombre del proyecto [${projectName}]: `
      );
      if (nameAnswer.trim()) {
        projectName = nameAnswer.trim();
        projectId = projectName.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9_-]/g, "-");
        codePrefix = projectName.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "PROJ";
      }
      const profilePrompt = isEn2 ? "\n  3. Adoption Profile:\n     [1] Minimalist AI-First (Recommended: Pure Kanban, no timeboxes or ceremonies, tasks & skill only)\n     [2] Batteries Included (Full Scrum with Sprints, Releases and AGENTS.md)\n     [3] Custom (Manual configuration of each add-on and setting)\n     Select option [1]: " : "\n  3. Perfil de Adopci\xF3n:\n     [1] Minimalista AI-First (Recomendado: Kanban puro, sin timeboxes ni ceremonias, solo tareas y skill)\n     [2] Bater\xEDas Incluidas (Scrum completo con Sprints, Releases y AGENTS.md)\n     [3] Personalizado (Configuraci\xF3n manual de cada add-on y opci\xF3n)\n     Selecciona opci\xF3n [1]: ";
      const profileAnswer = await rl.question(profilePrompt);
      const trimmedProfile = profileAnswer.trim();
      if (trimmedProfile === "2") {
        profile = "full";
        methodology = "scrum";
        enabledTabs = { kanban: true, sprint: true, release: true };
        installAgentsMd = true;
      } else if (trimmedProfile === "3") {
        profile = "custom";
      } else {
        profile = "minimal";
        methodology = "kanban";
        enabledTabs = { kanban: true, sprint: false, release: true };
        installAgentsMd = false;
      }
      if (profile === "custom") {
        const modePrompt = isEn2 ? "\n  3.1 Instantiation Mode:\n      [1] Single-Project (Recommended: isolated, self-contained board for this repo)\n      [2] Multi-Project (Register in global Hub to view alongside other repositories)\n      Select option [1]: " : "\n  3.1 Modo de Instanciaci\xF3n:\n      [1] Mono-Proyecto (Recomendado: tablero aislado y autocontenido para este repo)\n      [2] Multi-Proyecto (Registrar en el Hub global para verlo junto a otros repositorios)\n      Selecciona opci\xF3n [1]: ";
        const modeAnswer = await rl.question(modePrompt);
        if (modeAnswer.trim() === "2") {
          mode = "multi";
        } else {
          mode = "single";
        }
        const methPrompt = isEn2 ? "\n  3.2 Methodology:\n      [1] Pure Kanban (Continuous flow, no sprint timeboxes)\n      [2] Scrum / Sprints (Timeboxes and active sprints)\n      Select option [1]: " : "\n  3.2 Metodolog\xEDa:\n      [1] Kanban puro (Flujo continuo, sin timeboxes de sprint)\n      [2] Scrum / Sprints (Timeboxes y sprints activos)\n      Selecciona opci\xF3n [1]: ";
        const methAnswer = await rl.question(methPrompt);
        if (methAnswer.trim() === "2") {
          methodology = "scrum";
          enabledTabs.sprint = true;
        } else {
          methodology = "kanban";
          enabledTabs.sprint = false;
        }
        const skillPrompt = isEn2 ? "\n  3.3 Install agent skill (.agents/skills/gripm/SKILL.md)? (Y/n) [Y]: " : "\n  3.3 \xBFInstalar skill para agentes (.agents/skills/gripm/SKILL.md)? (S/n) [S]: ";
        const skillAnswer = await rl.question(skillPrompt);
        installSkill = skillAnswer.trim().toLowerCase() !== "n";
        const agentsPrompt = isEn2 ? "  3.4 Generate agent governance guide (AGENTS.md)? (Y/n) [Y]: " : "  3.4 \xBFGenerar gu\xEDa de gobernanza para agentes (AGENTS.md)? (S/n) [S]: ";
        const agentsAnswer = await rl.question(agentsPrompt);
        installAgentsMd = agentsAnswer.trim().toLowerCase() !== "n";
        const pkgPrompt = isEn2 ? '  3.5 Configure start scripts ("board", "mcp") in package.json? (Y/n) [Y]: ' : '  3.5 \xBFConfigurar scripts de inicio ("board", "mcp") en package.json? (S/n) [S]: ';
        const pkgAnswer = await rl.question(pkgPrompt);
        updatePkgJson = pkgAnswer.trim().toLowerCase() !== "n";
        const playbookPrompt = isEn2 ? "  3.7 Install Gripm Playbook (@gripm/playbook) with agent roles & UX audit? (y/N) [N]: " : "  3.7 \xBFInstalar Gripm Playbook (@gripm/playbook) con roles de equipo de agentes y auditor\xEDa de UX? (s/N) [N]: ";
        const playbookAnswer = await rl.question(playbookPrompt);
        installPlaybook = isEn2 ? /^y(es)?$/i.test(playbookAnswer.trim()) : /^(s|si|sí)$/i.test(playbookAnswer.trim());
      } else {
        const playbookPrompt = isEn2 ? "\n  4. Do you want to install Gripm Playbook (@gripm/playbook) with agent roles (PM, Principal Engineer, QA, Designer) and UX audit? (y/N) [N]: " : "\n  4. \xBFDeseas instalar tambi\xE9n Gripm Playbook (@gripm/playbook) con roles de agentes (PM, Principal Engineer, QA, Designer) y auditor\xEDa de UX? (s/N) [N]: ";
        const playbookAnswer = await rl.question(playbookPrompt);
        installPlaybook = isEn2 ? /^y(es)?$/i.test(playbookAnswer.trim()) : /^(s|si|sí)$/i.test(playbookAnswer.trim());
      }
    } finally {
      rl.close();
    }
  }
  const isEnOutput = language === "en";
  console.log(isEnOutput ? "\n  \u2699\uFE0F  Applying configuration...\n" : "\n  \u2699\uFE0F  Aplicando configuraci\xF3n elegida...\n");
  const results = {
    projectName,
    projectId,
    mode,
    language,
    profile,
    methodology,
    enabledTabs,
    gripmConfig: false,
    tasksDir: false,
    skill: false,
    agentsMd: false,
    playbook: false,
    packageJson: false,
    gitignore: false,
    registeredInHub: false
  };
  const gripmDir = path3.join(targetRepo, ".gripm");
  if (!fs3.existsSync(gripmDir)) {
    fs3.mkdirSync(gripmDir, { recursive: true });
  }
  const configFile = path3.join(gripmDir, "config.json");
  let currentConfig = {
    projectName,
    projectId,
    codePrefix,
    language,
    theme: "dark",
    density: "comfortable",
    autoSave: true,
    mode,
    methodology,
    enabledTabs,
    kanban: {
      showIdeasByDefault: false,
      showDoneHistoryByDefault: false,
      wipLimits: {
        "col-doing": 0,
        "col-review": 0,
        "col-ready": 0
      }
    },
    version: "1.0.0"
  };
  const existingConfigPath = fs3.existsSync(configFile) ? configFile : null;
  if (existingConfigPath) {
    try {
      const existing = JSON.parse(fs3.readFileSync(existingConfigPath, "utf8"));
      currentConfig = {
        ...existing,
        mode,
        language: options.language || options.lang || existing.language || language,
        projectName: existing.projectName || projectName,
        projectId: existing.projectId || projectId,
        codePrefix: existing.codePrefix || codePrefix,
        methodology: options.methodology || (profile ? methodology : existing.methodology || methodology),
        enabledTabs: options.enabledTabs || (profile ? enabledTabs : existing.enabledTabs || enabledTabs)
      };
    } catch {
    }
  }
  fs3.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2) + "\n", "utf8");
  results.gripmConfig = true;
  const isEnCurrent = (currentConfig.language || language) === "en";
  console.log(
    isEnCurrent ? `  \u2705 .gripm/config.json saved (Project: ${projectName}, Language: ${currentConfig.language}, Mode: ${mode === "single" ? "Single-Project" : "Multi-Project Hub"})` : `  \u2705 .gripm/config.json guardado (Proyecto: ${projectName}, Idioma: ${currentConfig.language}, Modo: ${mode === "single" ? "Mono-Proyecto" : "Multi-Proyecto Hub"})`
  );
  const tasksDir = path3.join(targetRepo, "backlog/tasks");
  if (!fs3.existsSync(tasksDir)) {
    fs3.mkdirSync(tasksDir, { recursive: true });
    console.log(isEnCurrent ? "  \u2705 backlog/tasks/ directory created for Markdown tasks" : "  \u2705 Directorio backlog/tasks/ creado para tareas Markdown");
  } else {
    console.log(isEnCurrent ? "  \u2139\uFE0F  Existing backlog/tasks/ directory preserved" : "  \u2139\uFE0F  Directorio backlog/tasks/ existente preservado");
  }
  results.tasksDir = true;
  if (mode === "multi") {
    try {
      const registry = loadRegistryFile(PKG_ROOT);
      const existingIdx = registry.projects.findIndex((p) => p.id === projectId || p.repoPath && path3.resolve(p.repoPath) === path3.resolve(targetRepo));
      const meta = {
        id: projectId,
        name: projectName,
        codePrefix,
        repoPath: path3.resolve(targetRepo),
        storageType: "markdown",
        backlogDir: "backlog",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (existingIdx !== -1) {
        registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...meta };
      } else {
        registry.projects.unshift(meta);
      }
      registry.activeProjectId = projectId;
      saveRegistryFile(registry, PKG_ROOT);
      results.registeredInHub = true;
      console.log(isEnCurrent ? "  \u2705 Project registered in global Hub (~/.gripm/registry.json)" : "  \u2705 Proyecto registrado en el Hub global (~/.gripm/registry.json)");
    } catch (err) {
      console.warn(isEnCurrent ? "  \u26A0\uFE0F Could not register in global Hub:" : "  \u26A0\uFE0F No se pudo registrar en el Hub global:", err.message);
    }
  } else {
    console.log(isEnCurrent ? "  \u{1F512} Single-Project mode active: Self-contained execution without external dependencies" : "  \u{1F512} Modo Mono-Proyecto activo: Ejecuci\xF3n autocontenida sin dependencias externas");
  }
  if (installSkill) {
    const skillContent = getSkillTemplate(currentConfig.language || language);
    const gripmSkillDir = path3.join(targetRepo, ".agents/skills/gripm");
    if (!fs3.existsSync(gripmSkillDir)) {
      fs3.mkdirSync(gripmSkillDir, { recursive: true });
    }
    fs3.writeFileSync(path3.join(gripmSkillDir, "SKILL.md"), skillContent, "utf8");
    results.skill = true;
    console.log(
      isEnCurrent ? `  \u2705 Agent skill installed at .agents/skills/gripm/SKILL.md (${currentConfig.language || language})` : `  \u2705 Skill para agentes instalada en .agents/skills/gripm/SKILL.md (${currentConfig.language || language})`
    );
  }
  if (installAgentsMd) {
    const agentsMdPath = path3.join(targetRepo, "AGENTS.md");
    if (!fs3.existsSync(agentsMdPath) || options.force) {
      fs3.writeFileSync(agentsMdPath, getAgentsMdTemplate(projectName, currentConfig.language || language), "utf8");
      results.agentsMd = true;
      console.log(
        isEnCurrent ? `  \u2705 Governance guide generated at AGENTS.md (${currentConfig.language || language})` : `  \u2705 Gu\xEDa de gobernanza generada en AGENTS.md (${currentConfig.language || language})`
      );
    } else {
      console.log(isEnCurrent ? "  \u2139\uFE0F  Existing AGENTS.md preserved" : "  \u2139\uFE0F  AGENTS.md existente preservado");
      results.agentsMd = true;
    }
  }
  if (updatePkgJson) {
    const hostPkgPath = path3.join(targetRepo, "package.json");
    if (fs3.existsSync(hostPkgPath)) {
      try {
        const pkg = JSON.parse(fs3.readFileSync(hostPkgPath, "utf8"));
        pkg.scripts = pkg.scripts || {};
        let modified = false;
        const canonicalBoard = "gripm 2>/dev/null || npx -y @gripm/board";
        const canonicalMcp = "gripm-mcp 2>/dev/null || npx -y -p @gripm/board gripm-mcp";
        if (!pkg.scripts.board || !pkg.scripts.board.includes("gripm")) {
          pkg.scripts.board = canonicalBoard;
          modified = true;
        }
        if (!pkg.scripts.mcp || !pkg.scripts.mcp.includes("gripm")) {
          pkg.scripts.mcp = canonicalMcp;
          modified = true;
        }
        if (modified) {
          fs3.writeFileSync(hostPkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
          console.log(isEnCurrent ? '  \u2705 Scripts "board" and "mcp" added to package.json' : '  \u2705 Scripts "board" y "mcp" agregados a package.json');
        } else {
          console.log(isEnCurrent ? "  \u2139\uFE0F  package.json scripts were already configured" : "  \u2139\uFE0F  Scripts de package.json ya estaban configurados");
        }
        results.packageJson = true;
      } catch (err) {
        console.warn(isEnCurrent ? "  \u26A0\uFE0F Could not update package.json:" : "  \u26A0\uFE0F No se pudo actualizar package.json:", err.message);
      }
    }
  }
  if (updateGitignore) {
    const gitignorePath = path3.join(targetRepo, ".gitignore");
    const ignoreLines = [
      "",
      "# gripm local cache",
      ".gripm/update-cache.json",
      ".gripm/*.tmp"
    ].join("\n");
    if (fs3.existsSync(gitignorePath)) {
      const content = fs3.readFileSync(gitignorePath, "utf8");
      if (!content.includes(".gripm/update-cache.json")) {
        fs3.appendFileSync(gitignorePath, ignoreLines + "\n", "utf8");
        console.log(isEnCurrent ? "  \u2705 gripm rules added to .gitignore" : "  \u2705 Reglas de gripm a\xF1adidas a .gitignore");
      } else {
        console.log(isEnCurrent ? "  \u2139\uFE0F  .gitignore already contained gripm rules" : "  \u2139\uFE0F  .gitignore ya conten\xEDa las reglas de gripm");
      }
    } else {
      fs3.writeFileSync(gitignorePath, ignoreLines.trim() + "\n", "utf8");
      console.log(isEnCurrent ? "  \u2705 .gitignore file created with gripm rules" : "  \u2705 Archivo .gitignore creado con reglas de gripm");
    }
    results.gitignore = true;
  }
  if (installPlaybook) {
    try {
      console.log(isEnCurrent ? "  \u{1F4E6} Synchronizing Gripm Playbook (@gripm/playbook)..." : "  \u{1F4E6} Sincronizando Gripm Playbook (@gripm/playbook)...");
      const syncScript = path3.join(PKG_ROOT, "scripts", "sync-playbook.mjs");
      if (fs3.existsSync(syncScript)) {
        const { runPlaybookSync } = await import(pathToFileURL(syncScript).href);
        await runPlaybookSync(targetRepo, { yes: true });
        results.playbook = true;
        console.log(isEnCurrent ? "  \u2705 Gripm Playbook synchronized successfully." : "  \u2705 Gripm Playbook sincronizado con \xE9xito.");
      } else {
        const { execFileSync } = await import("node:child_process");
        const isWin = process.platform === "win32";
        execFileSync(isWin ? "npx.cmd" : "npx", ["-y", "@gripm/playbook", "sync", "--repo", targetRepo, "--yes"], { stdio: "inherit", shell: isWin });
        results.playbook = true;
        console.log(isEnCurrent ? "  \u2705 Gripm Playbook synchronized successfully via npm (@gripm/playbook)." : "  \u2705 Gripm Playbook sincronizado con \xE9xito desde npm (@gripm/playbook).");
      }
    } catch (err) {
      console.warn(isEnCurrent ? "  \u26A0\uFE0F Could not synchronize Gripm Playbook automatically:" : "  \u26A0\uFE0F No se pudo sincronizar Gripm Playbook autom\xE1ticamente:", err.message);
    }
  } else {
    console.log(isEnCurrent ? "  \u2728 Clean repository: Gripm Board configured without Playbook." : "  \u2728 Repositorio limpio: Gripm Board configurado sin Playbook.");
  }
  if (isEnCurrent) {
    console.log(`
  \u2714 gripm initialized successfully!

  To open the board:
  \u2022 npm run board
    (or direct: npx @gripm/board)

  To start the MCP server:
  \u2022 npm run mcp
    (or: npx -p @gripm/board gripm-mcp)

  Tip: Run 'npm install -g @gripm/board'
  to use the global direct command 'gripm'.
`);
  } else {
    console.log(`
  \u2714 \xA1gripm inicializado con \xE9xito!

  Para abrir el tablero:
  \u2022 npm run board
    (o directo: npx @gripm/board)

  Para iniciar el servidor MCP:
  \u2022 npm run mcp
    (or: npx -p @gripm/board gripm-mcp)

  Consejo: Ejecuta 'npm install -g @gripm/board'
  para usar el comando global directo 'gripm'.
`);
  }
  return results;
}

// scripts/uninstall.js
init_registryConfig();
import fs4 from "node:fs";
import path4 from "node:path";
import readline2 from "node:readline/promises";
var PROTECTED_PATHS = ["backlog", "BACKLOG.md"];
var MANAGED_SCRIPTS = ["board", "mcp"];
var MANAGED_GITIGNORE_MARKERS = [
  ".gripm/update-cache.json",
  ".gripm/*.tmp"
];
var MANAGED_GITIGNORE_HEADERS = [
  "# gripm local cache"
];
function isProtected(relPath) {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  return PROTECTED_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`)
  );
}
function removeIfExists(repoPath, relPath) {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (isProtected(normalized)) {
    return { removed: false, reason: "protegido", path: normalized };
  }
  const target = path4.resolve(repoPath, normalized);
  const root = path4.resolve(repoPath);
  if (target !== root && !target.startsWith(root + path4.sep)) {
    return { removed: false, reason: "fuera-del-repo", path: normalized };
  }
  if (!fs4.existsSync(target)) {
    return { removed: false, reason: "no-existe", path: normalized };
  }
  fs4.rmSync(target, { recursive: true, force: true });
  return { removed: true, path: normalized };
}
function revertManagedScripts(repoPath) {
  const pkgPath = path4.join(repoPath, "package.json");
  if (!fs4.existsSync(pkgPath)) {
    return { modified: false, removed: [], preserved: [] };
  }
  let pkg;
  try {
    pkg = JSON.parse(fs4.readFileSync(pkgPath, "utf8"));
  } catch {
    return { modified: false, removed: [], preserved: MANAGED_SCRIPTS, error: "package.json ilegible" };
  }
  const removed = [];
  const preserved = [];
  for (const name of MANAGED_SCRIPTS) {
    const value = pkg.scripts?.[name];
    if (value === void 0) continue;
    const isManaged = value === "gripm" || value === "gripm-mcp" || value.includes("@gripm/board") || value.includes("github:pablojavierrodriguez/gripm");
    if (isManaged) {
      delete pkg.scripts[name];
      removed.push(name);
    } else {
      preserved.push(name);
    }
  }
  if (Object.keys(pkg.scripts || {}).length === 0 && pkg.scripts) {
    delete pkg.scripts;
  }
  if (removed.length > 0) {
    fs4.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }
  return { modified: removed.length > 0, removed, preserved };
}
function revertGitignoreRules(repoPath) {
  const gitignorePath = path4.join(repoPath, ".gitignore");
  if (!fs4.existsSync(gitignorePath)) {
    return { modified: false, removedLines: 0 };
  }
  const original = fs4.readFileSync(gitignorePath, "utf8");
  const lines = original.split("\n");
  const headerIndices = lines.map((l, idx) => MANAGED_GITIGNORE_HEADERS.includes(l.trim()) ? idx : -1).filter((idx) => idx !== -1);
  const kept = lines.filter((line, idx) => {
    if (headerIndices.includes(idx)) return false;
    return !MANAGED_GITIGNORE_MARKERS.includes(line.trim());
  });
  if (kept.length === lines.length) {
    return { modified: false, removedLines: 0 };
  }
  const result = kept.join("\n").replace(/\n{3,}$/, "\n");
  fs4.writeFileSync(gitignorePath, result, "utf8");
  return { modified: true, removedLines: lines.length - kept.length };
}
function uninstallLocalProject(repoPath, options = {}) {
  const result = {
    scope: "local",
    repoPath,
    removed: [],
    skipped: [],
    scripts: { removed: [], preserved: [] },
    agentArtifacts: null
  };
  if (options.removeAgentArtifacts) {
    for (const rel of [".agents/skills/gripm", "AGENTS.md"]) {
      const r = removeIfExists(repoPath, rel);
      (r.removed ? result.removed : result.skipped).push(
        r.removed ? r.path : `${r.path} (${r.reason})`
      );
    }
  } else {
    result.agentArtifacts = "preservados (skill y AGENTS.md conservados)";
  }
  for (const dir of [".gripm"]) {
    const localConfig = removeIfExists(repoPath, dir);
    if (localConfig.removed) {
      result.removed.push(localConfig.path);
    } else if (localConfig.reason !== "no-existe") {
      result.skipped.push(`${localConfig.path} (${localConfig.reason})`);
    }
  }
  result.scripts = revertManagedScripts(repoPath);
  result.gitignore = revertGitignoreRules(repoPath);
  for (const p of PROTECTED_PATHS) {
    if (!fs4.existsSync(path4.join(repoPath, p))) {
      result.integrityWarning = `ATENCI\xD3N: ${p} no existe. El m\xF3dulo nunca lo borra; revis\xE1 que el repositorio est\xE9 completo.`;
    }
  }
  return result;
}
function purgeGlobalGripm(repoPath, options = {}) {
  const result = {
    scope: "global",
    repoPath,
    local: null,
    registry: null,
    unlinkedRepos: [],
    removed: [],
    skipped: []
  };
  result.local = uninstallLocalProject(repoPath, options);
  const registryPath = getRegistryPath();
  if (fs4.existsSync(registryPath)) {
    let registry;
    try {
      registry = loadRegistryFile();
    } catch {
      registry = null;
    }
    if (registry && Array.isArray(registry.projects)) {
      const surviving = [];
      for (const p of registry.projects) {
        const isCurrent = p.repoPath && path4.resolve(p.repoPath) === path4.resolve(repoPath);
        const isDead = p.repoPath && !fs4.existsSync(p.repoPath);
        if (isCurrent) {
          result.removed.push(`registro: ${p.id}`);
        } else if (isDead) {
          result.unlinkedRepos.push({ id: p.id, repoPath: p.repoPath, reason: "ruta inexistente" });
        } else {
          surviving.push(p);
        }
      }
      registry.projects = surviving;
      if (!surviving.some((p) => p.id === registry.activeProjectId)) {
        registry.activeProjectId = surviving[0]?.id || null;
      }
      try {
        saveRegistryFile(registry);
        result.registry = "actualizado";
      } catch (err) {
        result.registry = `error: ${err.message}`;
      }
    }
  } else {
    result.registry = "no-existe";
  }
  return result;
}
async function askYesNo(question, rl) {
  const raw = await rl.question(`${question} (s/N): `);
  const answer = (raw || "").trim().toLowerCase();
  return answer === "s" || answer === "si" || answer === "s\xED" || answer === "y";
}
function printPlan(repoPath, registryInfo) {
  const lines = [
    "",
    "  gripm \xB7 Desacople Seguro",
    ""
  ];
  if (registryInfo && registryInfo.otherProjects > 0) {
    lines.push(`  \u279C  Hub:          ${registryInfo.otherProjects} otros proyectos registrados`);
  }
  lines.push(
    `  \u279C  Repositorio:  ${repoPath}`,
    "",
    "  Se preservan siempre:",
    "    \u2022 backlog/  (tareas, releases.json, retro/)",
    "    \u2022 BACKLOG.md",
    "",
    "  Alcance:",
    "    [1] Desacoplar s\xF3lo este proyecto (Recomendado)",
    "    [2] Desvincular del registro global del Hub",
    "",
    "  Selecciona opci\xF3n [1]: "
  );
  return lines.join("\n");
}
function detectScope(repoPath) {
  let mode = "single";
  const configPath = path4.join(repoPath, ".gripm", "config.json");
  if (fs4.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs4.readFileSync(configPath, "utf8"));
      if (cfg && (cfg.mode === "multi" || cfg.mode === "hub")) mode = "multi";
    } catch {
    }
  }
  let otherProjects = 0;
  try {
    const registry = loadRegistryFile();
    if (registry && Array.isArray(registry.projects)) {
      otherProjects = registry.projects.filter(
        (p) => !p.repoPath || path4.resolve(p.repoPath) !== path4.resolve(repoPath)
      ).length;
    }
  } catch {
    otherProjects = 0;
  }
  return { mode, otherProjects };
}
function printResult(result) {
  console.log("\n  Resultado:");
  for (const item of result.removed || []) {
    console.log(`    \u2705 eliminado: ${item}`);
  }
  for (const item of result.skipped || []) {
    console.log(`    \u2139\uFE0F  sin cambios: ${item}`);
  }
  if (result.scripts) {
    if (result.scripts.removed.length > 0) {
      console.log(`    \u2705 scripts de npm revertidos: ${result.scripts.removed.join(", ")}`);
    }
    if (result.scripts.preserved.length > 0) {
      console.log(`    \u{1F512} scripts propios del usuario preservados: ${result.scripts.preserved.join(", ")}`);
    }
  }
  if (result.integrityWarning) {
    console.log(`    \u26A0\uFE0F  ${result.integrityWarning}`);
  }
  if (result.unlinkedRepos && result.unlinkedRepos.length > 0) {
    console.log(`    \u{1F9F9} registros hu\xE9rfanos quitados: ${result.unlinkedRepos.map((r) => r.id).join(", ")}`);
  }
  console.log("\n  \u{1F512} Tu backlog est\xE1 intacto: backlog/ y BACKLOG.md no se tocan nunca.");
}
async function runUninstallCommand(repoPath, options = {}) {
  const { mode, otherProjects } = detectScope(repoPath);
  let scope = "local";
  let removeAgentArtifacts = options.removeAgentArtifacts === true;
  const isInteractive = (options.interactive ?? process.stdin.isTTY) && !options.yes && !options.global;
  if (isInteractive) {
    const rl = readline2.createInterface({
      input: options.input || process.stdin,
      output: options.output || process.stdout
    });
    try {
      console.log(printPlan(repoPath, { otherProjects }));
      const rawAnswer = await rl.question("");
      const answer = (rawAnswer || "").trim();
      if (answer === "2") scope = "global";
      if (await askYesNo("\n  \xBFEliminar tambi\xE9n la skill de agentes (.agents/skills/gripm) y AGENTS.md?", rl)) {
        removeAgentArtifacts = true;
      } else {
        console.log("  \u2139\uFE0F  Se conservar\xE1n la skill y AGENTS.md para seguir colaborando con agentes.");
      }
      if (scope === "global" && otherProjects > 0) {
        const confirmed = await askYesNo(
          `  \u26A0\uFE0F  Esto desregistrar\xE1 ${otherProjects} proyecto(s) m\xE1s de este dispositivo. \xBFContinuar?`,
          rl
        );
        if (!confirmed) {
          scope = "local";
          console.log("  \u2139\uFE0F  Se contin\xFAa con el desacople local solamente.");
        }
      }
    } finally {
      rl.close();
    }
  } else {
    scope = options.global ? "global" : "local";
    console.log(
      options.global ? "\n  \u{1F9F9} Modo no interactivo: purga global (--global)." : `
  \u{1F9F9} Modo no interactivo: desacople local del proyecto (modo detectado: ${mode}).`
    );
  }
  const result = scope === "global" ? purgeGlobalGripm(repoPath, { removeAgentArtifacts }) : uninstallLocalProject(repoPath, { removeAgentArtifacts });
  result.scope = scope;
  printResult(result);
  if (scope === "global") {
    console.log(
      "\n  Para quitar el binario global (si lo instalaste):\n    npm uninstall -g @gripm/board (o gripm)"
    );
  }
  return result;
}

// scripts/portUtils.js
import net from "node:net";
async function isPortAvailable(port, host = "localhost") {
  const checkConnect = (targetHost) => new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const cleanup = () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        clearTimeout(guard);
      }
    };
    const guard = setTimeout(() => {
      cleanup();
      resolve(true);
    }, 150);
    socket.once("connect", () => {
      cleanup();
      resolve(false);
    });
    socket.once("error", () => {
      cleanup();
      resolve(true);
    });
    try {
      socket.connect(port, targetHost);
    } catch {
      cleanup();
      resolve(true);
    }
  });
  const [v4Free, v6Free] = await Promise.all([
    checkConnect("127.0.0.1"),
    checkConnect("::1")
  ]);
  if (!v4Free || !v6Free) {
    return false;
  }
  const checkBind = (targetHost) => new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    try {
      server.listen(port, targetHost);
    } catch {
      resolve(false);
    }
  });
  const bindV4 = await checkBind("127.0.0.1");
  if (!bindV4) return false;
  const bindV6 = await checkBind("::1");
  if (!bindV6) return false;
  if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    const bindCustom = await checkBind(host);
    if (!bindCustom) return false;
  }
  return true;
}
async function findAvailablePort(startPort = 4100, host = "localhost", maxAttempts = 30) {
  let candidate = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const available = await isPortAvailable(candidate, host);
    if (available) {
      return candidate;
    }
    candidate++;
  }
  return startPort;
}

// src/utils/universalImporter.ts
init_legacyParser();
function escapeSectionMarkers(text) {
  if (!text) return "";
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!\\-- $1 -->");
}
function parseCsv(text) {
  if (!text || !text.trim()) return [];
  const cleaned = text.charCodeAt(0) === 65279 ? text.slice(1) : text;
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = cleaned.length;
  while (i < len) {
    const char = cleaned[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleaned[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        currentRow.push(currentField);
        currentField = "";
        if (i + 1 < len && cleaned[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
        rows.push(currentRow);
        currentRow = [];
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }
  currentRow.push(currentField);
  rows.push(currentRow);
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0].trim() === "") {
      rows.pop();
    }
  }
  return rows;
}
function mapUniversalStatus(rawStatus) {
  if (!rawStatus) return "draft";
  const clean = rawStatus.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (clean.includes("review") || clean.includes("testing") || clean.includes("qa") || clean.includes("under review") || clean.includes("code review") || clean.includes("in verification") || /\bpr\b/.test(clean)) {
    return "review";
  }
  if (clean.includes("in progress") || clean.includes("doing") || clean.includes("started") || clean.includes("in development") || clean.includes("in dev") || clean.includes("active") || clean.includes("wip") || clean === "working") {
    return "doing";
  }
  if (clean.includes("ready") || clean.includes("staged") || clean.includes("resolved") || clean.includes("finish")) {
    return "ready";
  }
  if (clean.includes("done") || clean.includes("complete") || clean.includes("closed") || clean.includes("shipped") || clean.includes("released")) {
    return "done";
  }
  if (clean.includes("cancel") || clean.includes("duplicate") || clean.includes("wontfix") || clean.includes("won't fix") || clean.includes("dismissed") || clean.includes("rejected") || clean.includes("abandoned")) {
    return "cancelled";
  }
  return "draft";
}
function mapUniversalPriority(rawPriority) {
  if (rawPriority === void 0 || rawPriority === null) return "p2";
  const clean = String(rawPriority).trim().toLowerCase();
  if (clean === "p0" || clean === "urgent" || clean === "critical" || clean === "blocker" || clean === "highest") {
    return "p0";
  }
  if (clean === "p1" || clean === "high" || clean === "1" || clean === "major") {
    return "p1";
  }
  if (clean === "p2" || clean === "medium" || clean === "normal" || clean === "2" || clean === "moderate" || clean === "med") {
    return "p2";
  }
  if (clean === "p3" || clean === "low" || clean === "lowest" || clean === "3" || clean === "4" || clean === "minor" || clean === "trivial" || clean === "no priority") {
    return "p3";
  }
  return "p2";
}
function mapUniversalType(rawType) {
  if (!rawType) return "feature";
  const clean = rawType.trim().toLowerCase();
  if (clean.includes("bug") || clean.includes("defect") || clean.includes("incident") || clean.includes("error")) {
    return "bug";
  }
  if (clean.includes("epic") || clean.includes("initiative")) {
    return "epic";
  }
  if (clean.includes("ux") || clean.includes("design") || clean.includes("ui")) {
    return "ux";
  }
  if (clean.includes("task") || clean.includes("subtask") || clean.includes("sub-task") || clean.includes("chore") || clean.includes("tech") || clean.includes("refactor") || clean.includes("improvement")) {
    return "tech_debt";
  }
  return "feature";
}
function extractAcceptanceCriteria(rawDesc) {
  if (!rawDesc) return { acs: [], cleanedDescription: "" };
  let normalized = rawDesc;
  if (!normalized.includes("\n") && normalized.includes("\\n")) {
    normalized = normalized.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  }
  const lines = normalized.split(/\r?\n/);
  const acs = [];
  const keptLines = [];
  let inAcSection = false;
  let acIndex = 1;
  const checkboxRegex = /^\s*[-*+•]?\s*\[([ xX])\]\s*(?:#\d+\s+)?(.*)$/;
  const acHeaderRegex = /^(?:#{1,4}\s*)?(?:acceptance\s*criteria|criterios?\s*(?:de\s*)?aceptaci[oó]n|ac)\s*:?\s*$/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (acHeaderRegex.test(trimmed)) {
      inAcSection = true;
      continue;
    }
    const checkMatch = line.match(checkboxRegex);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === "x";
      const text = checkMatch[2].trim();
      if (text) {
        acs.push({
          index: acIndex++,
          text,
          checked
        });
      }
      continue;
    }
    if (inAcSection) {
      const listItemMatch = line.match(/^\s*(?:[-*+•]|\d+\.)\s+(.*)$/);
      if (listItemMatch && listItemMatch[1].trim()) {
        acs.push({
          index: acIndex++,
          text: listItemMatch[1].trim(),
          checked: false
        });
        continue;
      } else if (trimmed === "") {
        continue;
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        inAcSection = false;
        keptLines.push(line);
        continue;
      }
    }
    keptLines.push(line);
  }
  return {
    acs,
    cleanedDescription: keptLines.join("\n").trim()
  };
}
function extractAdfText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    const joined = node.content.map(extractAdfText).join(node.type === "paragraph" ? "\n" : "");
    return joined;
  }
  return "";
}
function parseUniversalExport(rawContent, defaultMilestone) {
  if (!rawContent || !rawContent.trim()) {
    return {
      source: "unknown",
      label: "Sin contenido detectable",
      totalFound: 0,
      items: []
    };
  }
  const trimmed = rawContent.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (isJiraJson(parsedJson)) {
        return parseJiraJson(parsedJson, defaultMilestone);
      }
      if (isLinearJson(parsedJson)) {
        return parseLinearJson(parsedJson, defaultMilestone);
      }
      if (Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === "object") {
        return parseGenericJson(parsedJson, defaultMilestone);
      }
    } catch {
    }
  }
  const csvRows = parseCsv(trimmed);
  if (csvRows.length >= 2 && csvRows[0].length >= 2) {
    const headers = csvRows[0].map((h) => h.trim().toLowerCase());
    if (isJiraCsvHeaders(headers)) {
      return parseJiraCsv(csvRows, defaultMilestone);
    }
    if (isLinearCsvHeaders(headers)) {
      return parseLinearCsv(csvRows, defaultMilestone);
    }
    if (isGenericCsvHeaders(headers)) {
      return parseGenericCsv(csvRows, defaultMilestone);
    }
  }
  if (trimmed.includes("#") || trimmed.includes("- [ ]") || trimmed.includes("- [x]")) {
    const legacyItems = parseLegacyMarkdown(trimmed, defaultMilestone);
    if (legacyItems.length > 0) {
      const items = legacyItems.map((it) => ({
        tempId: it.tempId,
        title: it.title,
        description: it.description,
        status: it.status,
        priority: it.priority,
        type: it.type,
        milestone: it.milestone,
        module: it.module,
        sprint: it.sprint,
        release: it.release,
        targetSprint: it.targetSprint,
        targetRelease: it.targetRelease,
        selected: it.selected
      }));
      return {
        source: "markdown",
        label: `Markdown Legacy detectado: ${items.length} tareas`,
        totalFound: items.length,
        items
      };
    }
  }
  return {
    source: "unknown",
    label: "Formato no reconocido",
    totalFound: 0,
    items: []
  };
}
function isJiraJson(obj) {
  if (obj && Array.isArray(obj.issues) && obj.issues.length > 0) {
    const first = obj.issues[0];
    return Boolean(first && (first.fields || first.key));
  }
  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0];
    return Boolean(first && (first.fields || first.key && first.summary));
  }
  return false;
}
function isLinearJson(obj) {
  let list = null;
  if (Array.isArray(obj)) list = obj;
  else if (obj && obj.data && Array.isArray(obj.data.issues)) list = obj.data.issues;
  else if (obj && Array.isArray(obj.issues)) list = obj.issues;
  if (list && list.length > 0) {
    const first = list[0];
    return Boolean(
      first && (first.identifier || first.title && (first.state || first.priorityLabel || first.cycle || first.project))
    );
  }
  return false;
}
function isJiraCsvHeaders(headers) {
  const hasKey = headers.some((h) => /^(issue\s*key|key|clave(\s*de\s*la\s*incidencia)?|issue\s*id)$/i.test(h));
  const hasJiraFields = headers.some((h) => /^(summary|resumen|issue\s*type|tipo(\s*de\s*incidencia)?)$/i.test(h));
  return hasKey && hasJiraFields;
}
function isLinearCsvHeaders(headers) {
  const hasIdentifier = headers.some((h) => /^(identifier)$/i.test(h));
  const hasLinearFields = headers.some((h) => /^(title|estimate|cycle|cycle\s*name)$/i.test(h));
  return hasIdentifier && hasLinearFields;
}
function isGenericCsvHeaders(headers) {
  return headers.some((h) => /^(title|summary|resumen|name|task|asunto|t[ií]tulo)$/i.test(h));
}
function parseJiraJson(json, defaultMilestone) {
  const rawIssues = Array.isArray(json) ? json : json.issues || [];
  let counter = 1;
  const items = [];
  for (const issue of rawIssues) {
    const fields = issue.fields || issue;
    const key = issue.key || issue.id || `JIRA-${counter}`;
    const rawSummary = fields.summary || fields.title || issue.summary || "Sin t\xEDtulo";
    let rawDesc = "";
    if (typeof fields.description === "string") {
      rawDesc = fields.description;
    } else if (fields.description && typeof fields.description === "object") {
      rawDesc = extractAdfText(fields.description);
    }
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    const rawStatus = fields.status?.name || issue.status?.name || fields.status;
    const rawPriority = fields.priority?.name || issue.priority?.name || fields.priority;
    const rawType = fields.issuetype?.name || issue.issuetype?.name || fields.type;
    const module = fields.components?.[0]?.name;
    const release = fields.fixVersions?.[0]?.name;
    let sprint = void 0;
    if (fields.sprint?.name) {
      sprint = fields.sprint.name;
    } else if (Array.isArray(fields.customfield_10020) && fields.customfield_10020[0]?.name) {
      sprint = fields.customfield_10020[0].name;
    }
    const estimate = fields.customfield_10016 ?? fields.customfield_10026 ?? fields.storyPoints ?? fields.story_points;
    const labels = Array.isArray(fields.labels) ? fields.labels : void 0;
    const assignee = fields.assignee?.displayName || fields.assignee?.name;
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: key,
      title: rawSummary.trim(),
      description: cleanedDescription || rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: release || defaultMilestone || void 0,
      module: module || void 0,
      sprint: sprint || void 0,
      release: release || void 0,
      targetSprint: sprint || void 0,
      targetRelease: release || void 0,
      estimate: estimate !== void 0 ? estimate : void 0,
      labels,
      assignees: assignee ? [assignee] : void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "jira-json",
    label: `Jira JSON detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function parseLinearJson(json, defaultMilestone) {
  const rawIssues = Array.isArray(json) ? json : json.data?.issues || json.issues || [];
  let counter = 1;
  const items = [];
  for (const issue of rawIssues) {
    const key = issue.identifier || issue.id || `LIN-${counter}`;
    const rawTitle = issue.title || "Sin t\xEDtulo";
    const rawDesc = issue.description || "";
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    const rawStatus = issue.state?.name || issue.status?.name || issue.state || issue.status;
    const rawPriority = issue.priorityLabel ?? issue.priority;
    const sprint = issue.cycle?.name || (issue.cycle?.number ? `Cycle ${issue.cycle.number}` : void 0);
    const module = issue.project?.name || issue.team?.name;
    let labels = void 0;
    if (Array.isArray(issue.labels)) {
      labels = issue.labels.map((l) => typeof l === "string" ? l : l.name).filter(Boolean);
    }
    const assignee = issue.assignee?.name || issue.assignee?.displayName;
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: key,
      title: rawTitle.trim(),
      description: cleanedDescription || rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: "feature",
      milestone: defaultMilestone || void 0,
      module: module || void 0,
      sprint: sprint || void 0,
      targetSprint: sprint || void 0,
      estimate: issue.estimate !== void 0 ? issue.estimate : void 0,
      labels,
      assignees: assignee ? [assignee] : void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "linear-json",
    label: `Linear JSON detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function parseGenericJson(array, defaultMilestone) {
  let counter = 1;
  const items = [];
  for (const item of array) {
    const title = item.title || item.summary || item.name || item.task || "Sin t\xEDtulo";
    const rawDesc = item.description || item.details || item.notes || "";
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: item.id || item.code || item.key || void 0,
      title: String(title).trim(),
      description: cleanedDescription || String(rawDesc).trim(),
      status: mapUniversalStatus(item.status || item.state),
      priority: mapUniversalPriority(item.priority),
      type: mapUniversalType(item.type),
      milestone: item.milestone || defaultMilestone || void 0,
      module: item.module || void 0,
      sprint: item.sprint || void 0,
      release: item.release || void 0,
      targetSprint: item.sprint || void 0,
      targetRelease: item.release || void 0,
      estimate: item.estimate !== void 0 ? item.estimate : void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "generic-csv",
    label: `JSON gen\xE9rico detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function parseJiraCsv(rows, defaultMilestone) {
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (regex) => headers.findIndex((h) => regex.test(h));
  const keyIdx = findCol(/^(issue\s*key|key|clave(\s*de\s*la\s*incidencia)?|issue\s*id)$/i);
  const summaryIdx = findCol(/^(summary|resumen|title|t[ií]tulo)$/i);
  const descIdx = findCol(/^(description|descripci[oó]n|body|details)$/i);
  const statusIdx = findCol(/^(status|estado|state)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const typeIdx = findCol(/^(issue\s*type|tipo(\s*de\s*incidencia)?|type)$/i);
  const sprintIdx = findCol(/^(sprint|sprints)$/i);
  const moduleIdx = findCol(/^(component[s]?|componentes?|module|m[oó]dulo)$/i);
  const releaseIdx = findCol(/^(fix\s*version[s]?|fix\s*version\/s|release|milestone)$/i);
  const estimateIdx = findCol(/^(story\s*points?|puntos(\s*de\s*historia)?|estimate)$/i);
  const acIdx = findCol(/^(acceptance\s*criteria|criterios?(\s*de\s*aceptaci[oó]n)?|ac)$/i);
  let counter = 1;
  const items = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.length === 1 && !row[0].trim()) continue;
    const rawSummary = summaryIdx !== -1 ? row[summaryIdx] : `Tarea ${counter}`;
    if (!rawSummary || !rawSummary.trim()) continue;
    const key = keyIdx !== -1 ? row[keyIdx]?.trim() : void 0;
    let rawDesc = descIdx !== -1 ? row[descIdx] || "" : "";
    if (!rawDesc.includes("\n") && rawDesc.includes("\\n")) {
      rawDesc = rawDesc.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
    }
    let acs = [];
    if (acIdx !== -1 && row[acIdx] && row[acIdx].trim()) {
      const parsedAcs = extractAcceptanceCriteria(row[acIdx]);
      acs = parsedAcs.acs;
    }
    const parsedDesc = extractAcceptanceCriteria(rawDesc);
    if (parsedDesc.acs.length > 0) {
      acs = [...acs, ...parsedDesc.acs].map((item, idx) => ({ ...item, index: idx + 1 }));
      rawDesc = parsedDesc.cleanedDescription;
    }
    const rawStatus = statusIdx !== -1 ? row[statusIdx] : "";
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : "";
    const rawType = typeIdx !== -1 ? row[typeIdx] : "";
    const sprint = sprintIdx !== -1 ? row[sprintIdx]?.trim() : void 0;
    const module = moduleIdx !== -1 ? row[moduleIdx]?.trim() : void 0;
    const release = releaseIdx !== -1 ? row[releaseIdx]?.trim() : void 0;
    const estimate = estimateIdx !== -1 ? row[estimateIdx]?.trim() : void 0;
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: key || void 0,
      title: rawSummary.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: release || defaultMilestone || void 0,
      module: module || void 0,
      sprint: sprint || void 0,
      release: release || void 0,
      targetSprint: sprint || void 0,
      targetRelease: release || void 0,
      estimate: estimate || void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "jira-csv",
    label: `Jira CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function parseLinearCsv(rows, defaultMilestone) {
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (regex) => headers.findIndex((h) => regex.test(h));
  const idIdx = findCol(/^(identifier|id)$/i);
  const titleIdx = findCol(/^(title|t[ií]tulo|name|summary)$/i);
  const descIdx = findCol(/^(description|descripci[oó]n)$/i);
  const statusIdx = findCol(/^(status|state|estado)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const estimateIdx = findCol(/^(estimate|estimaci[oó]n|points)$/i);
  const cycleIdx = findCol(/^(cycle(\s*name)?|cycle\s*number|sprint)$/i);
  const projectIdx = findCol(/^(project(\s*name)?|team)$/i);
  const labelsIdx = findCol(/^(labels?|etiquetas?)$/i);
  const assigneeIdx = findCol(/^(assignee(\s*name)?|asignado)$/i);
  let counter = 1;
  const items = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.length === 1 && !row[0].trim()) continue;
    const rawTitle = titleIdx !== -1 ? row[titleIdx] : `Tarea ${counter}`;
    if (!rawTitle || !rawTitle.trim()) continue;
    const key = idIdx !== -1 ? row[idIdx]?.trim() : void 0;
    let rawDesc = descIdx !== -1 ? row[descIdx] || "" : "";
    if (!rawDesc.includes("\n") && rawDesc.includes("\\n")) {
      rawDesc = rawDesc.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
    }
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    if (acs.length > 0) {
      rawDesc = cleanedDescription;
    }
    const rawStatus = statusIdx !== -1 ? row[statusIdx] : "";
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : "";
    const estimate = estimateIdx !== -1 ? row[estimateIdx]?.trim() : void 0;
    const sprint = cycleIdx !== -1 ? row[cycleIdx]?.trim() : void 0;
    const module = projectIdx !== -1 ? row[projectIdx]?.trim() : void 0;
    let labels = void 0;
    if (labelsIdx !== -1 && row[labelsIdx]) {
      labels = row[labelsIdx].split(",").map((s) => s.trim()).filter(Boolean);
    }
    const assignee = assigneeIdx !== -1 ? row[assigneeIdx]?.trim() : void 0;
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: key || void 0,
      title: rawTitle.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: "feature",
      milestone: defaultMilestone || void 0,
      module: module || void 0,
      sprint: sprint || void 0,
      targetSprint: sprint || void 0,
      estimate: estimate || void 0,
      labels,
      assignees: assignee ? [assignee] : void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "linear-csv",
    label: `Linear CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function parseGenericCsv(rows, defaultMilestone) {
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (regex) => headers.findIndex((h) => regex.test(h));
  const titleIdx = findCol(/^(title|summary|resumen|name|task|asunto|t[ií]tulo)$/i);
  const descIdx = findCol(/^(description|details|notes|body|descripci[oó]n|notas)$/i);
  const statusIdx = findCol(/^(status|state|estado)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const typeIdx = findCol(/^(type|tipo|kind)$/i);
  const idIdx = findCol(/^(id|code|key|c[oó]digo)$/i);
  const moduleIdx = findCol(/^(module|m[oó]dulo|component)$/i);
  const sprintIdx = findCol(/^(sprint|milestone|hito)$/i);
  let counter = 1;
  const items = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.length === 1 && !row[0].trim()) continue;
    const title = titleIdx !== -1 ? row[titleIdx] : `Tarea ${counter}`;
    if (!title || !title.trim()) continue;
    const key = idIdx !== -1 ? row[idIdx]?.trim() : void 0;
    let rawDesc = descIdx !== -1 ? row[descIdx] || "" : "";
    if (!rawDesc.includes("\n") && rawDesc.includes("\\n")) {
      rawDesc = rawDesc.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
    }
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    if (acs.length > 0) {
      rawDesc = cleanedDescription;
    }
    const rawStatus = statusIdx !== -1 ? row[statusIdx] : "";
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : "";
    const rawType = typeIdx !== -1 ? row[typeIdx] : "";
    const module = moduleIdx !== -1 ? row[moduleIdx]?.trim() : void 0;
    const sprint = sprintIdx !== -1 ? row[sprintIdx]?.trim() : void 0;
    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, "0")}`,
      originalKey: key || void 0,
      title: title.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: defaultMilestone || void 0,
      module: module || void 0,
      sprint: sprint || void 0,
      targetSprint: sprint || void 0,
      acceptanceCriteria: acs.length > 0 ? acs : void 0,
      selected: true
    });
  }
  return {
    source: "generic-csv",
    label: `CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}
function formatTaskMarkdown(task, id) {
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const frontmatter = [
    "---",
    `id: ${id}`,
    `title: ${JSON.stringify(task.title || "Sin t\xEDtulo")}`,
    `status: ${task.status}`,
    `created_date: '${now}'`,
    `updated_date: '${now}'`
  ];
  if (task.labels && task.labels.length > 0) {
    frontmatter.push("labels:");
    task.labels.forEach((l) => frontmatter.push(`  - ${JSON.stringify(l)}`));
  }
  const priorityMap = {
    p0: "urgent",
    p1: "high",
    p2: "medium",
    p3: "low"
  };
  frontmatter.push(`priority: ${priorityMap[task.priority] || "medium"}`);
  frontmatter.push(`type: ${task.type || "feature"}`);
  if (task.estimate !== void 0 && task.estimate !== null && task.estimate !== "") {
    if (typeof task.estimate === "number") {
      frontmatter.push(`estimate: ${task.estimate}`);
    } else {
      frontmatter.push(`estimate: ${JSON.stringify(task.estimate)}`);
    }
  }
  if (task.sprint) {
    frontmatter.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }
  if (task.milestone) {
    frontmatter.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }
  if (task.assignees && task.assignees.length > 0) {
    frontmatter.push("assignees:");
    task.assignees.forEach((a) => frontmatter.push(`  - ${JSON.stringify(a)}`));
  }
  if (task.originalKey) {
    frontmatter.push(`original_key: ${JSON.stringify(task.originalKey)}`);
  }
  frontmatter.push("---");
  frontmatter.push("");
  const bodySections = [];
  bodySections.push("## Description\n");
  bodySections.push("<!-- SECTION:DESCRIPTION:BEGIN -->");
  bodySections.push(escapeSectionMarkers(task.description || ""));
  bodySections.push("<!-- SECTION:DESCRIPTION:END -->\n");
  bodySections.push("## Acceptance Criteria\n");
  bodySections.push("<!-- AC:BEGIN -->");
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, idx) => {
      const index = ac.index || idx + 1;
      const mark = ac.checked ? "x" : " ";
      bodySections.push(`- [${mark}] #${index} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push("<!-- AC:END -->\n");
  return `${frontmatter.join("\n")}
${bodySections.join("\n")}`;
}

// scripts/gripm-runner.js
var __filename5 = fileURLToPath5(import.meta.url);
var __dirname5 = path13.dirname(__filename5);
var PKG_ROOT3 = path13.resolve(__dirname5, "..");
var pkgJson = JSON.parse(fs13.readFileSync(path13.join(PKG_ROOT3, "package.json"), "utf8"));
var currentVersion = pkgJson.version || "1.0.0";
var args = process.argv.slice(2);
var isColorSupported = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
var c = {
  bold: (s) => isColorSupported ? `\x1B[1m${s}\x1B[0m` : s,
  dim: (s) => isColorSupported ? `\x1B[2m${s}\x1B[0m` : s,
  green: (s) => isColorSupported ? `\x1B[32m${s}\x1B[0m` : s,
  cyan: (s) => isColorSupported ? `\x1B[36m${s}\x1B[0m` : s,
  yellow: (s) => isColorSupported ? `\x1B[33m${s}\x1B[0m` : s
};
function openBrowser(url) {
  if (process.platform === "darwin") {
    execFile("open", [url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  } else if (process.platform === "win32") {
    execFile("cmd", ["/c", "start", '""', url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  } else {
    execFile("xdg-open", [url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  }
}
function isHelpFlag(arg) {
  return arg === "--help" || arg === "-h" || arg === "--h" || arg === "-help";
}
function hasHelpFlag(argList) {
  return Array.isArray(argList) && argList.some(isHelpFlag);
}
function printMainHelp() {
  console.log(`
  gripm CLI - productos locales para backlog y trabajo con agentes

  Uso:
    gripm [opciones]               Abre Gripm Board en el navegador (por defecto)
    gripm <comando> [opciones]     Ejecuta un subcomando espec\xEDfico

  Comandos:
    gripm mcp                      Inicia el servidor MCP sobre stdio para agentes de IA
    gripm playbook sync            Sincroniza materiales de Gripm Playbook en el proyecto actual
    gripm import --file <ruta>     Importa tareas de Jira, Linear o CSV al backlog local

  Opciones de Cockpit:
    --port, -p <puerto>            Puerto para el servidor web (por defecto: 4100)
    --host <host>                  Host de enlace (por defecto: 127.0.0.1)
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --dev                          Inicia en modo desarrollo con Vite HMR (requiere devDependencies)
    --no-open                      No abrir el navegador autom\xE1ticamente
    --single                       Forzar modo de proyecto \xFAnico
    --hub, --multi                 Abrir en modo hub multi-proyecto

  Opciones de Inicializaci\xF3n y Gesti\xF3n:
    --init                         Configura Gripm Board en el proyecto actual
    --minimal                      Inicializaci\xF3n ultraligera AI-First (Kanban puro, sin ceremonias)
    --full                         Inicializaci\xF3n con bater\xEDas incluidas (Scrum, Sprints, gobernanza)
    --language, --lang <es|en>     Idioma del proyecto para scaffolding y plantillas (por defecto: es)
    --with-playbook, --playbook    Instala tambi\xE9n Gripm Playbook (@gripm/playbook) con roles de agentes
    --no-playbook                  Omite la instalaci\xF3n de Gripm Playbook (deja el repositorio limpio)
    --yes, -y                      Aceptar opciones por defecto sin preguntas (para CI / no interactivo)
    --uninstall, --clean           Desacoplar gripm de este repositorio (nunca borra backlog/)
    --global, --all                Con --uninstall: purga tambi\xE9n el registro global del dispositivo
    --remove-agents                Con --uninstall: elimina la skill de agentes y AGENTS.md

  Opciones Generales:
    --version, -v                  Muestra la versi\xF3n instalada
    --help, -h                     Muestra esta ayuda

  Integraci\xF3n con Agentes de IA (MCP):
    Para clientes como Cursor, Claude Desktop o Antigravity, tambi\xE9n puedes configurar
    directamente el comando 'gripm-mcp' sobre stdio (incluido en @gripm/board).
`);
}
function printMcpHelp() {
  console.log(`
  gripm mcp - Servidor Model Context Protocol (MCP) para agentes de IA

  Uso:
    gripm mcp [opciones]
    gripm-mcp [opciones]

  Descripci\xF3n:
    Inicia el servidor MCP de Gripm sobre stdio (JSON-RPC 2.0).
    Permite a agentes de IA (Cursor, Antigravity, Claude Code) consultar,
    crear, actualizar y sincronizar tareas del backlog.

  Opciones:
    --repo, -r <ruta>              Ruta al repositorio del proyecto (por defecto: directorio actual)
    --version, -v                  Muestra la versi\xF3n instalada
    --help, -h                     Muestra esta ayuda
`);
}
function printPlaybookHelp() {
  console.log(`
  gripm playbook - Herramientas y sincronizaci\xF3n de Gripm Playbook

  Uso:
    gripm playbook sync [opciones]

  Comandos:
    sync                           Sincroniza archivos y plantillas de Gripm Playbook en el proyecto actual

  Opciones:
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --branch, -b <rama>            Rama Git remota a sincronizar (por defecto: main)
    --remote <url>                 Repositorio remoto de Gripm Playbook
    --dry-run                      Simula los cambios sin escribir en disco
    --force                        Fuerza la sobrescritura de archivos existentes
    --help, -h                     Muestra esta ayuda

  Nota:
    Este comando sincroniza materiales de Gripm Playbook en un proyecto; no instala el producto Gripm Playbook como CLI independiente.
`);
}
function printImportHelp() {
  console.log(`
  gripm import - Importador universal de backlogs externos (Jira, Linear, CSV)

  Uso:
    gripm import --file <ruta> [opciones]
    gripm import -f <ruta> [opciones]

  Descripci\xF3n:
    Procesa un archivo de exportaci\xF3n de Jira (JSON o CSV), Linear (CSV o JSON),
    o un CSV gen\xE9rico, transformando cada \xEDtem en una tarea Markdown individual
    en backlog/tasks/ de forma 100% local, con cero llamadas a la nube.

  Opciones:
    --file, -f <ruta>              Ruta al archivo a importar (JSON, CSV o MD) [Obligatorio]
    --repo, -r <ruta>              Repositorio de destino (por defecto: directorio actual)
    --prefix <prefijo>             Prefijo de c\xF3digo para las tareas (ej: DEV, TASK)
    --dry-run                      Simula la importaci\xF3n mostrando tareas detectadas sin escribir en disco
    --help, -h                     Muestra esta ayuda
`);
}
async function main() {
  const VALUE_FLAGS = /* @__PURE__ */ new Set([
    "--port",
    "-p",
    "--host",
    "--repo",
    "-r",
    "--language",
    "--lang",
    "--branch",
    "-b",
    "--remote",
    "--source",
    "--from",
    "--file",
    "-f",
    "--prefix"
  ]);
  const nonFlagArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) {
      i++;
      continue;
    }
    if (!args[i].startsWith("-")) {
      nonFlagArgs.push(args[i]);
    }
  }
  const command = nonFlagArgs[0];
  if (command && !["mcp", "playbook", "help", "import"].includes(command)) {
    console.error(`Comando desconocido: "${command}". Ejecuta "gripm --help" para ver los comandos disponibles.`);
    process.exitCode = 1;
    return;
  }
  if (command === "help") {
    const sub = nonFlagArgs[1];
    if (sub === "mcp") {
      printMcpHelp();
      process.exit(0);
    }
    if (sub === "playbook") {
      printPlaybookHelp();
      process.exit(0);
    }
    if (sub === "import") {
      printImportHelp();
      process.exit(0);
    }
    printMainHelp();
    process.exit(0);
  }
  if (command === "mcp" || args.includes("mcp") && command !== "help") {
    if (hasHelpFlag(args)) {
      printMcpHelp();
      process.exit(0);
    }
    if (args.includes("--version") || args.includes("-v")) {
      console.log(currentVersion);
      process.exit(0);
    }
    const mcpBinary = path13.join(PKG_ROOT3, "bin", "gripm-mcp.js");
    const { pathToFileURL: pathToFileURL2 } = await import("node:url");
    await import(pathToFileURL2(mcpBinary).href);
    return;
  }
  if (command === "playbook" || args.includes("playbook") && command !== "help") {
    if (hasHelpFlag(args)) {
      printPlaybookHelp();
      process.exit(0);
    }
    const playbookSub = nonFlagArgs[1] || args[args.indexOf("playbook") + 1];
    if (playbookSub !== "sync") {
      console.error("Uso: gripm playbook sync [--repo <ruta>] [--dry-run] [--force]");
      console.error('Ejecuta "gripm playbook --help" para ver las opciones disponibles.');
      console.error("Este comando sincroniza materiales del Playbook en un proyecto; no instala Gripm Playbook.");
      process.exitCode = 1;
      return;
    }
    const syncScript = path13.join(PKG_ROOT3, "scripts", "sync-playbook.mjs");
    const branchIdx = args.findIndex((a) => a === "--branch" || a === "-b");
    const branch = branchIdx !== -1 ? args[branchIdx + 1] : void 0;
    const remoteIdx = args.findIndex((a) => a === "--remote");
    const remote = remoteIdx !== -1 ? args[remoteIdx + 1] : void 0;
    const sourceIdx = args.findIndex((a) => a === "--source" || a === "--from");
    const source = sourceIdx !== -1 ? args[sourceIdx + 1] : void 0;
    const dryRun = args.includes("--dry-run");
    const force = args.includes("--force");
    let targetRepo2 = process.cwd();
    const repoIdx2 = args.findIndex((a) => a === "--repo" || a === "-r");
    if (repoIdx2 !== -1 && args[repoIdx2 + 1]) {
      targetRepo2 = path13.resolve(args[repoIdx2 + 1]);
    }
    if (fs13.existsSync(syncScript)) {
      const { pathToFileURL: pathToFileURL2 } = await import("node:url");
      const { runPlaybookSync } = await import(pathToFileURL2(syncScript).href);
      await runPlaybookSync(targetRepo2, { branch, remote, source, dryRun, force });
    } else {
      const { execFileSync } = await import("node:child_process");
      const syncArgs = ["-y", "@gripm/playbook", "sync", "--repo", targetRepo2];
      if (branch) syncArgs.push("--branch", branch);
      if (remote) syncArgs.push("--remote", remote);
      if (source) syncArgs.push("--source", source);
      if (dryRun) syncArgs.push("--dry-run");
      if (force) syncArgs.push("--force");
      const isWin = process.platform === "win32";
      execFileSync(isWin ? "npx.cmd" : "npx", syncArgs, { stdio: "inherit", shell: isWin });
    }
    return;
  }
  if (command === "import" || args.includes("import") && command !== "help") {
    if (hasHelpFlag(args)) {
      printImportHelp();
      process.exit(0);
    }
    const fileIdx = args.findIndex((a) => a === "--file" || a === "-f");
    const filePath = fileIdx !== -1 ? args[fileIdx + 1] : void 0;
    if (!filePath) {
      console.error("Error: Debes especificar el archivo a importar con --file <ruta> o -f <ruta>.");
      console.error('Ejecuta "gripm import --help" para ver las opciones disponibles.');
      process.exitCode = 1;
      return;
    }
    const absoluteFilePath = path13.resolve(filePath);
    if (!fs13.existsSync(absoluteFilePath)) {
      console.error(`Error: El archivo "${filePath}" no existe.`);
      process.exitCode = 1;
      return;
    }
    const repoIdx2 = args.findIndex((a) => a === "--repo" || a === "-r");
    const targetRepo2 = repoIdx2 !== -1 && args[repoIdx2 + 1] ? path13.resolve(args[repoIdx2 + 1]) : process.cwd();
    const dryRun = args.includes("--dry-run");
    const prefixIdx = args.findIndex((a) => a === "--prefix");
    const customPrefix = prefixIdx !== -1 ? args[prefixIdx + 1]?.toUpperCase() : void 0;
    const fileContent = fs13.readFileSync(absoluteFilePath, "utf8");
    const result = parseUniversalExport(fileContent);
    if (result.items.length === 0) {
      console.log(`
  ${c.yellow("\u25B2")}  No se detectaron tareas para importar en ${path13.basename(filePath)} (${result.label}).`);
      return;
    }
    console.log(`
  ${c.cyan("\u2139")}  ${c.bold(result.label)}`);
    const tasksDir2 = path13.join(targetRepo2, "backlog/tasks");
    if (!dryRun && !fs13.existsSync(tasksDir2)) {
      fs13.mkdirSync(tasksDir2, { recursive: true });
    }
    let prefix = customPrefix;
    let maxNum = 0;
    if (fs13.existsSync(tasksDir2)) {
      const taskFiles = fs13.readdirSync(tasksDir2).filter((f) => f.endsWith(".md"));
      const prefixCounts = {};
      for (const f of taskFiles) {
        const m = f.match(/^([A-Za-z0-9_-]+)-(\d+)/);
        if (m) {
          const p = m[1].toUpperCase();
          const n = parseInt(m[2], 10);
          prefixCounts[p] = (prefixCounts[p] || 0) + 1;
          if (n > maxNum) maxNum = n;
        }
      }
      if (!prefix) {
        let bestPrefix = "";
        let maxCount = 0;
        for (const [p, count] of Object.entries(prefixCounts)) {
          if (count > maxCount) {
            maxCount = count;
            bestPrefix = p;
          }
        }
        if (bestPrefix) prefix = bestPrefix;
      }
    }
    if (!prefix) {
      const identity = resolveProjectIdentity(targetRepo2);
      prefix = identity.codePrefix || "TASK";
    }
    console.log(`  ${c.dim("Prefijo de tareas:")} ${c.bold(prefix)} (pr\xF3ximo correlativo: ${prefix}-${String(maxNum + 1).padStart(3, "0")})`);
    if (dryRun) {
      console.log(`  ${c.yellow("Modo simulaci\xF3n (--dry-run):")} Ning\xFAn archivo ser\xE1 modificado.
`);
    }
    let importedCount = 0;
    for (const item of result.items) {
      maxNum++;
      const taskId = `${prefix}-${String(maxNum).padStart(3, "0")}`;
      const cleanTitle = (item.title || "Sin t\xEDtulo").replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
      const filename = `${taskId} - ${cleanTitle}.md`;
      const taskContent = formatTaskMarkdown(item, taskId);
      if (dryRun) {
        console.log(`  [SIMULADO] ${taskId} \xB7 ${item.title} (${item.status}, ${item.priority})`);
      } else {
        fs13.writeFileSync(path13.join(tasksDir2, filename), taskContent, "utf8");
      }
      importedCount++;
    }
    if (dryRun) {
      console.log(`
  ${c.green("\u2714")}  Simulaci\xF3n completada: ${importedCount} tareas listas para importar.`);
    } else {
      console.log(`
  ${c.green("\u2714")}  ${importedCount} tareas importadas con \xE9xito en backlog/tasks/`);
      console.log(`  ${c.dim('Ejecuta "npm run backlog:sync" para consolidar BACKLOG.md.')}`);
    }
    return;
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(currentVersion);
    return;
  }
  if (hasHelpFlag(args)) {
    printMainHelp();
    process.exit(0);
  }
  let port = 4100;
  const portIdx = args.findIndex((a) => a === "--port" || a === "-p");
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10) || 4100;
  }
  let host = "127.0.0.1";
  const hostIdx = args.findIndex((a) => a === "--host");
  if (hostIdx !== -1 && args[hostIdx + 1]) {
    host = args[hostIdx + 1];
  }
  if (host === "0.0.0.0") {
    const crypto2 = await import("node:crypto");
    const token = process.env.GRIPM_TOKEN || crypto2.randomBytes(16).toString("hex");
    process.env.GRIPM_TOKEN = token;
    console.warn(`
  ${c.yellow("\u25B2")}  ${c.yellow("Advertencia de seguridad: Enlazando a 0.0.0.0 (red local).")}`);
    console.log(`  ${c.dim("\u279C")}  ${c.dim("Token de acceso:")}  ${token}`);
    console.log(`  ${c.dim("\u279C")}  ${c.dim("Acceso local:")}    ${c.cyan("http://localhost:4100/")}`);
    console.log(`  ${c.dim("\u279C")}  ${c.dim("Acceso en LAN:")}    ${c.cyan(`http://<IP-LAN>:4100/?token=${token}`)}
`);
  }
  let targetRepo = process.cwd();
  const repoIdx = args.findIndex((a) => a === "--repo" || a === "-r");
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    targetRepo = path13.resolve(args[repoIdx + 1]);
  }
  const shouldOpen = !args.includes("--no-open");
  const isHub = args.includes("--hub") || args.includes("--multi");
  const isSingle = args.includes("--single");
  if (isHub) {
    process.env.GRIPM_MODE = "multi";
  } else if (isSingle) {
    process.env.GRIPM_MODE = "single";
  } else {
    delete process.env.GRIPM_MODE;
  }
  process.env.GRIPM_TARGET_REPO = targetRepo;
  process.env.GRIPM_HOST = host;
  if (args.includes("--init")) {
    const isYes = args.includes("--yes") || args.includes("-y") || args.includes("--defaults");
    const isHubInit = args.includes("--hub") || args.includes("--multi");
    const isSingleInit = args.includes("--single");
    const langIdx = args.findIndex((a) => a === "--language" || a === "--lang");
    const cliLang = langIdx !== -1 && args[langIdx + 1] ? args[langIdx + 1].toLowerCase() : void 0;
    const isMinimal = args.includes("--minimal");
    const isFull = args.includes("--full");
    const isWithPlaybook = args.includes("--with-playbook") || args.includes("--playbook");
    const isNoPlaybook = args.includes("--no-playbook");
    await runInitWizard(targetRepo, {
      yes: isYes,
      minimal: isMinimal,
      full: isFull,
      profile: isMinimal ? "minimal" : isFull ? "full" : void 0,
      mode: isHubInit ? "multi" : isSingleInit ? "single" : void 0,
      language: cliLang,
      playbook: isNoPlaybook ? false : isWithPlaybook ? true : void 0,
      skill: args.includes("--no-skill") ? false : args.includes("--skill") ? true : void 0,
      agentsMd: args.includes("--no-agents") ? false : args.includes("--agents") ? true : void 0,
      packageJson: args.includes("--no-scripts") ? false : args.includes("--scripts") ? true : void 0,
      gitignore: args.includes("--no-gitignore") ? false : args.includes("--gitignore") ? true : void 0,
      force: args.includes("--force")
    });
    process.exit(0);
  }
  if (args.includes("--uninstall") || args.includes("--clean")) {
    const result = await runUninstallCommand(targetRepo, {
      yes: args.includes("--yes") || args.includes("-y"),
      global: args.includes("--global") || args.includes("--all"),
      removeAgentArtifacts: args.includes("--remove-agents")
    });
    process.exit(result && result.integrityWarning ? 2 : 0);
  }
  const tasksDir = path13.join(targetRepo, "backlog/tasks");
  const gripmJson = path13.join(targetRepo, ".gripm/backlog.json");
  let storageType = "markdown";
  if (fs13.existsSync(tasksDir)) {
    storageType = "markdown";
  } else if (fs13.existsSync(gripmJson)) {
    storageType = "json";
  } else {
    storageType = "markdown";
  }
  const isHomeDirectory = path13.resolve(targetRepo).toLowerCase() === path13.resolve(os3.homedir()).toLowerCase();
  const isExplicitProject = args.includes("--repo") || args.includes("-r") || args.includes("--init");
  if (!isHomeDirectory || isExplicitProject) {
    try {
      const registry = loadRegistryFile(PKG_ROOT3);
      const identity = resolveProjectIdentity(targetRepo);
      const projectName = identity.name;
      const projectId = identity.id;
      const codePrefix = identity.codePrefix;
      const existingIdx = registry.projects.findIndex((p) => p.id === projectId || p.repoPath && path13.resolve(p.repoPath) === targetRepo);
      const projectMeta = {
        id: projectId,
        name: projectName,
        codePrefix,
        repoPath: targetRepo,
        storageType,
        backlogDir: "backlog",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (existingIdx !== -1) {
        registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...projectMeta };
      } else {
        registry.projects.unshift(projectMeta);
      }
      registry.activeProjectId = projectId;
      saveRegistryFile(registry, PKG_ROOT3);
    } catch (err) {
    }
  }
  const isDev = args.includes("--dev");
  let server;
  let actualPort;
  let displayHost;
  let url;
  const resolvedPort = await findAvailablePort(port, host);
  if (resolvedPort !== port) {
    console.log(`
  ${c.yellow("\u25B2")}  Puerto ${port} ocupado en el sistema. Utilizando puerto disponible ${resolvedPort}...`);
  }
  if (isDev) {
    const { createServer } = await import("vite");
    server = await createServer({
      root: PKG_ROOT3,
      configFile: path13.resolve(PKG_ROOT3, "vite.config.ts"),
      server: {
        port: resolvedPort,
        host,
        strictPort: false,
        open: false
      }
    });
    await server.listen();
    const address = server.httpServer?.address();
    actualPort = typeof address === "object" && address?.port ? address.port : resolvedPort;
    displayHost = host === "127.0.0.1" ? "localhost" : host;
    url = `http://${displayHost}:${actualPort}`;
  } else {
    let serveFile2 = function(filePath, req, res) {
      try {
        const stat = fs13.statSync(filePath);
        if (stat.isDirectory()) {
          const indexInDir = path13.join(filePath, "index.html");
          if (fs13.existsSync(indexInDir) && fs13.statSync(indexInDir).isFile()) {
            return serveFile2(indexInDir, req, res);
          }
          return false;
        }
        const ext = path13.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", stat.size);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
        );
        if (req.method === "HEAD") {
          res.statusCode = 200;
          res.end();
          return true;
        }
        res.statusCode = 200;
        const stream = fs13.createReadStream(filePath);
        stream.on("error", () => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        });
        stream.pipe(res);
        return true;
      } catch {
        return false;
      }
    }, handleStatic2 = function(req, res) {
      const rawUrl = req.url || "/";
      let pathname = rawUrl.split("?")[0];
      try {
        pathname = decodeURIComponent(pathname);
      } catch {
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }
      const safePath = path13.normalize(path13.join(distDir, pathname));
      if (!safePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }
      if (fs13.existsSync(safePath) && safePath !== distDir) {
        if (serveFile2(safePath, req, res)) return;
      }
      const safePublicPath = path13.normalize(path13.join(publicDir, pathname));
      if (safePublicPath.startsWith(publicDir) && fs13.existsSync(safePublicPath) && safePublicPath !== publicDir) {
        if (serveFile2(safePublicPath, req, res)) return;
      }
      const indexPath = path13.join(distDir, "index.html");
      if (pathname === "/" || pathname === "") {
        if (fs13.existsSync(indexPath)) {
          if (serveFile2(indexPath, req, res)) return;
        }
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<h1>dist/index.html no encontrado</h1><p>Ejecuta <code>npm run build</code> antes de iniciar gripm en produccion.</p>");
        return;
      }
      const hasExtension = path13.extname(pathname).length > 0;
      if (!hasExtension && fs13.existsSync(indexPath)) {
        if (serveFile2(indexPath, req, res)) return;
      }
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
    };
    var serveFile = serveFile2, handleStatic = handleStatic2;
    const http = await import("node:http");
    let apiMiddleware = null;
    let closeWatchers2 = null;
    try {
      const serverBundle = path13.join(PKG_ROOT3, "bin", "server.js");
      let gripmApi2;
      if (fs13.existsSync(serverBundle)) {
        const { pathToFileURL: pathToFileURL2 } = await import("node:url");
        const mod = await import(pathToFileURL2(serverBundle).href);
        gripmApi2 = mod.gripmApi;
      } else {
        const mod = await Promise.resolve().then(() => (init_plugin(), plugin_exports));
        gripmApi2 = mod.gripmApi;
      }
      const plugin = gripmApi2();
      closeWatchers2 = plugin.closeWatchers;
      plugin.configureServer({
        middlewares: {
          use: (fn) => {
            apiMiddleware = fn;
          }
        }
      });
    } catch {
    }
    const distDir = path13.resolve(PKG_ROOT3, "dist");
    const publicDir = path13.resolve(PKG_ROOT3, "public");
    const MIME_TYPES = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".mjs": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
      ".ttf": "font/ttf",
      ".map": "application/json",
      ".txt": "text/plain; charset=utf-8"
    };
    server = http.createServer((req, res) => {
      if (apiMiddleware) {
        apiMiddleware(req, res, () => handleStatic2(req, res));
      } else {
        handleStatic2(req, res);
      }
    });
    if (closeWatchers2) {
      server.on("close", () => {
        try {
          closeWatchers2();
        } catch {
        }
      });
    }
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(resolvedPort, host, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
    const address = server.address();
    actualPort = typeof address === "object" && address?.port ? address.port : resolvedPort;
    displayHost = host === "127.0.0.1" ? "localhost" : host;
    url = `http://${displayHost}:${actualPort}`;
  }
  console.log(`
  ${c.bold("gripm")} ${c.dim(`v${currentVersion}`)}  ${c.green("listo")}

  ${c.green("\u279C")}  ${c.bold("Tablero:")}     ${c.cyan(url)}
  ${c.dim("\u279C")}  ${c.dim("Proyecto:")}    ${targetRepo}
  ${c.dim("\u279C")}  ${c.dim("Modo:")}        ${storageType.toUpperCase()} ${c.dim("(tiempo real)")}
`);
  const cachedUpdate = getCachedUpdateInfo(currentVersion);
  if (cachedUpdate && cachedUpdate.hasUpdate) {
    console.log(formatUpdateBanner(currentVersion, cachedUpdate.latestVersion) + "\n");
  }
  checkForUpdates(currentVersion).then((res) => {
    const isNewerThanCached = cachedUpdate?.latestVersion && semverGreaterThan(res.latestVersion, cachedUpdate.latestVersion);
    if (res.hasUpdate && (!cachedUpdate?.hasUpdate || isNewerThanCached)) {
      console.log("\n" + formatUpdateBanner(currentVersion, res.latestVersion) + "\n");
    }
  }).catch(() => {
  });
  if (shouldOpen) {
    try {
      if (typeof server.openBrowser === "function") {
        server.openBrowser();
      } else {
        openBrowser(url);
      }
    } catch {
      openBrowser(url);
    }
  }
}
main().catch((err) => {
  console.error("Error al iniciar gripm:", err);
  process.exit(1);
});
