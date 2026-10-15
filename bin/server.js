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

// server/services/registry.ts
var registry_exports = {};
__export(registry_exports, {
  DEFAULT_CONFIG: () => DEFAULT_CONFIG,
  DEMO_FILE: () => DEMO_FILE,
  PKG_ROOT: () => PKG_ROOT,
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
import fs2 from "node:fs";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
function detectProjectStorage(repoPath) {
  if (!repoPath) return { storageType: "json", backlogDir: "backlog" };
  const normalized = path2.normalize(repoPath.trim());
  try {
    if (fs2.existsSync(path2.join(normalized, "backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs2.existsSync(path2.join(normalized, ".backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
    if (fs2.existsSync(path2.join(normalized, "backlog"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs2.existsSync(path2.join(normalized, ".backlog"))) {
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
  return path2.join(project.repoPath || "", dir, "tasks");
}
function getProjectDocsPath(project) {
  if (project.docsPath && fs2.existsSync(project.docsPath)) {
    return project.docsPath;
  }
  if (project.repoPath) {
    const defaultDocs = path2.join(project.repoPath, "docs");
    if (fs2.existsSync(defaultDocs)) {
      try {
        const files = fs2.readdirSync(defaultDocs);
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
  let reg = loadRegistryFile(PKG_ROOT);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: "", projects: [] };
  }
  const cwd = process.cwd();
  const hasLocalGripm = fs2.existsSync(path2.join(cwd, ".gripm")) || fs2.existsSync(path2.join(cwd, "backlog"));
  if (hasLocalGripm) {
    const cwdResolved = path2.resolve(cwd);
    const existingLocal = reg.projects.find((p) => p.repoPath && path2.resolve(p.repoPath) === cwdResolved);
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
    if (p.repoPath && !fs2.existsSync(p.repoPath)) return false;
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
  saveRegistryFile(sanitized, PKG_ROOT);
}
function getProjectBacklogPath(project) {
  if (project.isDemo) {
    return DEMO_FILE;
  }
  if (project.repoPath) {
    return path2.join(project.repoPath, ".gripm/backlog.json");
  }
  return path2.resolve(PKG_ROOT, `data/${project.id}-backlog.json`);
}
function getConfigFilepath(project) {
  const repo = project?.repoPath || process.cwd();
  return path2.join(repo, ".gripm/config.json");
}
function readProjectConfig(project) {
  const configFile = getConfigFilepath(project);
  try {
    if (fs2.existsSync(configFile)) {
      const raw = fs2.readFileSync(configFile, "utf8");
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
  const configFile = path2.join(repo, ".gripm/config.json");
  const dir = path2.dirname(configFile);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  const toSave = { ...config };
  delete toSave._filepath;
  fs2.writeFileSync(configFile, JSON.stringify(toSave, null, 2), "utf8");
  return configFile;
}
var __filename2, __dirname2, PKG_ROOT, DEMO_FILE, DEFAULT_CONFIG;
var init_registry = __esm({
  "server/services/registry.ts"() {
    "use strict";
    init_registryConfig();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = path2.dirname(__filename2);
    PKG_ROOT = path2.resolve(__dirname2, "../../");
    DEMO_FILE = path2.resolve(PKG_ROOT, "data/demo-backlog.json");
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
init_registry();
import fs3 from "node:fs";
import path3 from "node:path";
var sseClients = /* @__PURE__ */ new Set();
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
var activeWatchers = [];
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
  const dataDir = path3.resolve(PKG_ROOT, "data");
  if (fs3.existsSync(dataDir)) dirsToWatch.add(dataDir);
  for (const p of registry.projects) {
    try {
      if (p.repoPath && fs3.existsSync(p.repoPath)) {
        const backlogDir = path3.join(p.repoPath, p.backlogDir || "backlog");
        if (fs3.existsSync(backlogDir)) dirsToWatch.add(backlogDir);
        const gripmDir = path3.join(p.repoPath, ".gripm");
        if (fs3.existsSync(gripmDir)) dirsToWatch.add(gripmDir);
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
      const watcher = fs3.watch(dir, { recursive: true }, (_eventType, filename) => {
        if (filename && (filename.endsWith(".log") || filename.endsWith(".tmp") || filename.includes(".git") || filename.startsWith(".") && !filename.includes("gripm") && !filename.includes("backlog"))) {
          return;
        }
        notifyChange(dir, filename);
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

// server/middleware/security.ts
var MAX_BODY_SIZE = 10 * 1024 * 1024;
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
function validateSecurity(req, res) {
  applySecurityHeaders(res);
  const hostHeader = (req.headers.host || "").split(":")[0].toLowerCase();
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
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    res.statusCode = 204;
    res.end();
    return null;
  }
  return { isAllowedOrigin };
}

// server/routes/api.ts
init_registry();
import fs9 from "node:fs";
import path9 from "node:path";

// server/services/storage.ts
import fs5 from "node:fs";
import path5 from "node:path";

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
function escapeSectionMarkers(text) {
  if (!text) return text;
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!\\-- $1 -->");
}
function unescapeSectionMarkers(text) {
  if (!text) return text;
  return text.replace(/<!\\--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!-- $1 -->");
}
function extractSectionBlock(body, headerName) {
  if (!body) return "";
  const escapedHeader = headerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const targetHeaderRegex = new RegExp(`^##\\s+${escapedHeader}\\b[^\r
]*`, "i");
  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match;
  let inCodeFence = false;
  let fenceChar = "";
  let fenceLength = 0;
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
    if (!inCodeFence) {
      const fenceMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        inCodeFence = true;
        fenceChar = fenceMatch[1][0];
        fenceLength = fenceMatch[1].length;
      } else {
        const isH2 = /^##\s+[^\r\n]*/.test(line);
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
    } else {
      const closeMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLength) {
        inCodeFence = false;
      }
    }
  }
  if (!sectionFound || startIndex === -1) {
    return "";
  }
  return body.slice(startIndex, endIndex);
}
function cleanItem(val) {
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s.trim();
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
  let bodyContent = content;
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const rawFm = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2];
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
        const itemVal = trimmed.replace(/^- /, "").trim().replace(/^['"]|['"]$/g, "");
        currentList.push(itemVal);
        continue;
      }
      if (inList && !line.startsWith(" ") && !line.startsWith("	")) {
        finalizeList();
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const rawVal = line.slice(colonIdx + 1).trim();
        const cleanVal = rawVal.replace(/^['"]|['"]$/g, "");
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
              result.rawExtraFrontmatter[key] = cleanVal;
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
  const descTarget = descBlock || bodyContent;
  const descMatch = descTarget.match(/<!--\s*SECTION:DESCRIPTION:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:DESCRIPTION:END\s*-->/i);
  if (descMatch) {
    result.description = unescapeSectionMarkers(descMatch[1].trim());
  } else {
    const descHeaderMatch = descTarget.match(/## Description\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (descHeaderMatch) {
      result.description = unescapeSectionMarkers(descHeaderMatch[1].trim());
    } else if (descBlock) {
      result.description = unescapeSectionMarkers(descBlock.trim());
    }
  }
  const acBlock = extractSectionBlock(bodyContent, "Acceptance Criteria");
  const acTarget = acBlock || bodyContent;
  const acMatch = acTarget.match(/<!--\s*AC:BEGIN\s*-->([\s\S]*?)<!--\s*AC:END\s*-->/i);
  const acText = acMatch ? acMatch[1] : acTarget.match(/## Acceptance Criteria\r?\n([\s\S]*?)(?=\r?\n## |$)/i)?.[1] || "";
  if (acText) {
    const acLines = acText.split(/\r?\n/);
    const parsedAC = [];
    let autoIndex = 1;
    for (const line of acLines) {
      const match = line.match(/^-\s*\[([ xX])\]\s*(?:#(\d+)\s+)?(.*)$/);
      if (match) {
        const checked = match[1].toLowerCase() === "x";
        const num = match[2] ? parseInt(match[2], 10) : autoIndex++;
        const text = unescapeSectionMarkers(match[3].trim());
        parsedAC.push({ index: num, text, checked });
      }
    }
    result.acceptanceCriteria = parsedAC;
  }
  const planBlock = extractSectionBlock(bodyContent, "Implementation Plan");
  const planTarget = planBlock || bodyContent;
  const planMatch = planTarget.match(/<!--\s*SECTION:PLAN:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:PLAN:END\s*-->/i);
  if (planMatch) {
    result.implementationPlan = unescapeSectionMarkers(planMatch[1].trim());
  } else {
    const planHeaderMatch = planTarget.match(/## Implementation Plan\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (planHeaderMatch) {
      result.implementationPlan = unescapeSectionMarkers(planHeaderMatch[1].trim());
    }
  }
  const notesBlock = extractSectionBlock(bodyContent, "Implementation Notes");
  const notesTarget = notesBlock || bodyContent;
  const notesMatch = notesTarget.match(/<!--\s*SECTION:NOTES:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:NOTES:END\s*-->/i);
  if (notesMatch) {
    result.implementationNotes = unescapeSectionMarkers(notesMatch[1].trim());
  } else {
    const notesHeaderMatch = notesTarget.match(/## Implementation Notes\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (notesHeaderMatch) {
      result.implementationNotes = unescapeSectionMarkers(notesHeaderMatch[1].trim());
    }
  }
  const summaryBlock = extractSectionBlock(bodyContent, "Final Summary");
  const summaryTarget = summaryBlock || bodyContent;
  const summaryMatch = summaryTarget.match(/<!--\s*SECTION:FINAL_SUMMARY:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:FINAL_SUMMARY:END\s*-->/i);
  if (summaryMatch) {
    result.finalSummary = unescapeSectionMarkers(summaryMatch[1].trim());
  } else {
    const summaryHeaderMatch = summaryTarget.match(/## Final Summary\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (summaryHeaderMatch) {
      result.finalSummary = unescapeSectionMarkers(summaryHeaderMatch[1].trim());
    }
  }
  return result;
}
function serializeBacklogMd(task) {
  const frontmatterLines = ["---"];
  frontmatterLines.push(`id: ${task.id}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || "Sin t\xEDtulo")}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push("assignee:");
    task.assignees.forEach((a) => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }
  const nowStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
  frontmatterLines.push(`created_date: '${task.createdDate || nowStr}'`);
  frontmatterLines.push(`updated_date: '${nowStr}'`);
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
    frontmatterLines.push(`type: ${task.type}`);
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
      if (!["id", "title", "status", "assignee", "assignees", "created_date", "updated_date", "labels", "dependencies", "priority", "type", "milestone", "parent", "parentid", "blocks", "blocked_by", "blockedby", "related_to", "relatedto", "sprints", "releases", "sprint", "targetsprint", "isdeleted", "deletedat", "previousstatus", "estimate", "estimation", "points", "story_points", "storypoints", "start_date", "startdate", "due_date", "duedate", "target_date", "targetdate"].includes(k.toLowerCase())) {
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
  bodySections.push(escapeSectionMarkers(task.description || ""));
  bodySections.push("<!-- SECTION:DESCRIPTION:END -->\n");
  bodySections.push("## Acceptance Criteria\n");
  bodySections.push("<!-- AC:BEGIN -->");
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, i) => {
      const idx = ac.index || i + 1;
      const mark = ac.checked ? "x" : " ";
      bodySections.push(`- [${mark}] #${idx} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push("<!-- AC:END -->\n");
  bodySections.push("## Implementation Plan\n");
  bodySections.push("<!-- SECTION:PLAN:BEGIN -->");
  if (task.implementationPlan) {
    bodySections.push(escapeSectionMarkers(task.implementationPlan));
  }
  bodySections.push("<!-- SECTION:PLAN:END -->\n");
  if (task.implementationNotes) {
    bodySections.push("## Implementation Notes\n");
    bodySections.push("<!-- SECTION:NOTES:BEGIN -->");
    bodySections.push(escapeSectionMarkers(task.implementationNotes));
    bodySections.push("<!-- SECTION:NOTES:END -->\n");
  }
  if (task.finalSummary) {
    bodySections.push("## Final Summary\n");
    bodySections.push("<!-- SECTION:FINAL_SUMMARY:BEGIN -->");
    bodySections.push(escapeSectionMarkers(task.finalSummary));
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
  const statuses = ["ideas", "doing", "review", "ready", "draft", "done", "dismissed"];
  const grouped = {
    ideas: [],
    doing: [],
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
      dismissed: "\u{1F4E6} Archivadas / Descartadas"
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

// server/services/storage.ts
init_registryConfig();
init_registry();

// server/services/atomicWrite.ts
import fs4 from "node:fs";
import path4 from "node:path";
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
  const resolvedPath = path4.resolve(filePath);
  const dir = path4.dirname(resolvedPath);
  if (!fs4.existsSync(dir)) {
    fs4.mkdirSync(dir, { recursive: true });
  }
  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd;
  let renamed = false;
  try {
    fd = fs4.openSync(tempPath, "w", mode);
    if (typeof content === "string") {
      fs4.writeFileSync(fd, content, { encoding });
    } else {
      fs4.writeFileSync(fd, content);
    }
    fs4.fsyncSync(fd);
    fs4.closeSync(fd);
    fd = void 0;
    let attempts = 0;
    while (!renamed) {
      try {
        fs4.renameSync(tempPath, resolvedPath);
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
        fs4.closeSync(fd);
      } catch {
      }
    }
    if (!renamed && fs4.existsSync(tempPath)) {
      try {
        fs4.unlinkSync(tempPath);
      } catch {
      }
    }
  }
}

// server/services/storage.ts
function parseReleaseNotesMd(repoPath, projectPrefix, knownItems = []) {
  if (!repoPath) return [];
  const possiblePaths = [
    path5.join(repoPath, "docs/RELEASE_NOTES.md"),
    path5.join(repoPath, "docs/releasenotes.md"),
    path5.join(repoPath, "RELEASE_NOTES.md"),
    path5.join(repoPath, "releasenotes.md"),
    path5.join(repoPath, "docs/CHANGELOG.md"),
    path5.join(repoPath, "CHANGELOG.md"),
    path5.join(repoPath, "changelog.md")
  ];
  let notesContent = "";
  for (const p of possiblePaths) {
    if (fs5.existsSync(p)) {
      try {
        notesContent = fs5.readFileSync(p, "utf8");
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
    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\]—–-]+)?)\]?/);
    if (!vMatch) continue;
    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, "");
    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : "";
    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, "").trim();
    if (date) {
      title = title.replace(date, "").trim();
    }
    title = title.replace(/^[-—–:🚀 ]+/, "").trim();
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
      date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      title,
      summary,
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed,
      createdAt: date ? `${date}T00:00:00.000Z` : (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return releases;
}
function readProjectBacklog(project) {
  if (project.repoPath) {
    const identity = resolveProjectIdentity(project.repoPath);
    project = {
      ...project,
      id: identity.id || project.id,
      name: identity.name || project.name,
      codePrefix: identity.codePrefix || project.codePrefix
    };
  }
  if (isBacklogMdProject(project) && project.repoPath) {
    const tasksDir = getBacklogTasksDir(project);
    try {
      const items = [];
      const files = fs5.existsSync(tasksDir) ? fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md")) : [];
      files.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
      let order = 1;
      for (const filename of files) {
        const fullPath = path5.join(tasksDir, filename);
        try {
          const fileStat = fs5.statSync(fullPath);
          const raw = fs5.readFileSync(fullPath, "utf8");
          const fallbackId = filename.split(" - ")[0] || filename.replace(/\.md$/, "");
          const task = parseBacklogMd(raw, fallbackId);
          const rawFm = task.rawExtraFrontmatter || {};
          const sprintVal = task.sprint || task.targetSprint || rawFm.sprint || rawFm.targetSprint || (task.sprints && task.sprints.length > 0 ? task.sprints[task.sprints.length - 1] : void 0);
          const rawReleaseCandidate = rawFm.release || rawFm.targetRelease || (task.releases && task.releases.length > 0 ? task.releases[task.releases.length - 1] : void 0) || (task.milestone && !task.milestone.toLowerCase().includes("sprint") ? task.milestone : void 0);
          const releaseVal = rawReleaseCandidate && !rawReleaseCandidate.toLowerCase().includes("sprint") ? rawReleaseCandidate : void 0;
          const isDeletedRaw = task.isDeleted !== void 0 ? task.isDeleted : rawFm.isdeleted !== void 0 ? rawFm.isdeleted : rawFm.isDeleted;
          const isDeletedVal = isDeletedRaw === true || isDeletedRaw === "true";
          const deletedAtVal = task.deletedAt || rawFm.deletedat || rawFm.deletedAt || void 0;
          const previousStatusVal = task.previousStatus || rawFm.previousstatus || rawFm.previousStatus || void 0;
          items.push({
            id: task.id || fallbackId,
            code: task.id || fallbackId,
            projectId: project.id,
            title: task.title,
            description: task.description || "",
            type: normalizeType(task.type) || "feature",
            priority: normalizePriority(task.priority),
            status: task.status,
            // normalized: draft, doing, review, ready, done, dismissed
            sprint: sprintVal,
            release: releaseVal,
            targetSprint: sprintVal,
            targetRelease: releaseVal,
            milestone: releaseVal,
            parentId: task.parentId || rawFm.parent || rawFm.parentId || void 0,
            blocks: task.blocks || (rawFm.blocks ? Array.isArray(rawFm.blocks) ? rawFm.blocks : [rawFm.blocks] : []),
            blockedBy: task.blockedBy || (rawFm.blocked_by ? Array.isArray(rawFm.blocked_by) ? rawFm.blocked_by : [rawFm.blocked_by] : []),
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
            implementationPlan: task.implementationPlan || "",
            assignees: task.assignees || [],
            labels: task.labels || [],
            estimate: task.estimate !== void 0 ? task.estimate : rawFm.estimate,
            startDate: task.startDate || rawFm.start_date || rawFm.startDate || void 0,
            dueDate: task.dueDate || rawFm.due_date || rawFm.dueDate || rawFm.target_date || rawFm.targetDate || void 0,
            order: rawFm.order !== void 0 ? Number(rawFm.order) : order++,
            isDeleted: isDeletedVal ? true : void 0,
            deletedAt: deletedAtVal,
            previousStatus: previousStatusVal,
            createdAt: task.createdDate || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: task.updatedDate || (/* @__PURE__ */ new Date()).toISOString(),
            mtime: Math.round(fileStat.mtimeMs)
          });
        } catch (err) {
          console.warn(`[gripm Backlog.md] Error reading ${filename}:`, err);
        }
      }
      let releases = [];
      const releasesPath = path5.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
      if (fs5.existsSync(releasesPath)) {
        try {
          releases = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
        } catch {
        }
      }
      if (releases.length === 0 && project.repoPath) {
        const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, items);
        if (parsed.length > 0) {
          releases = parsed;
          try {
            atomicWriteFileSync2(releasesPath, JSON.stringify(releases, null, 2), "utf8");
          } catch (writeErr) {
            console.warn(`[gripm API] Error persisting auto-synced releases:`, writeErr.message);
          }
        }
      }
      if (releases.length > 0) {
        for (const rel of releases) {
          const vClean = (rel.version || "").replace(/^v/i, "");
          const existingCodes = new Set((rel.itemCodes || []).map((c) => c.toUpperCase()));
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
      const sprintsPath = path5.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
      if (fs5.existsSync(sprintsPath)) {
        try {
          sprints = JSON.parse(fs5.readFileSync(sprintsPath, "utf8"));
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
          if (sp && typeof sp === "string" && sp.trim() && sp.toLowerCase() !== "backlog" && !sp.toLowerCase().includes("sin sprint") && sp !== "\u2014") {
            detectedSprintNames.add(sp.trim());
          }
        }
        if (detectedSprintNames.size > 0) {
          const existingNames = new Set(sprints.map((s) => s.name?.toLowerCase().trim()));
          let hasMutations = false;
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
              hasMutations = true;
            }
          }
          sprints.forEach((sp) => {
            const sprintItems = items.filter((it) => (it.sprint || it.targetSprint || "").trim().toLowerCase() === sp.name?.toLowerCase().trim());
            const allDone = sprintItems.length > 0 && sprintItems.every((it) => it.status === "done" || it.status === "ready" || it.status === "finish");
            if (allDone && sp.status !== "completed") {
              sp.status = "completed";
              sp.completedAt = sp.completedAt || (/* @__PURE__ */ new Date()).toISOString();
              hasMutations = true;
            }
          });
          if (hasMutations) {
            try {
              atomicWriteFileSync2(sprintsPath, JSON.stringify(sprints, null, 2), "utf8");
            } catch {
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
      console.warn(`[gripm API] Error reading Backlog.md tasks for ${project.id} at ${tasksDir}:`, err.message);
      return {
        project: { ...project, storageType: "markdown", error: err.message },
        items: [],
        releases: [],
        sprints: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  const filePath = getProjectBacklogPath(project);
  try {
    if (!fs5.existsSync(filePath)) {
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
        console.error(`[gripm API] Cannot initialize backlog at ${filePath}:`, writeErr.message);
      }
      return initial;
    }
    const jsonStat = fs5.existsSync(filePath) ? fs5.statSync(filePath) : null;
    const jsonMtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    const raw = fs5.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    let items = Array.isArray(parsed.items) ? parsed.items : [];
    items = items.map((it) => ({
      ...it,
      projectId: it.projectId || project.id,
      status: normalizeStatus(it.status),
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
    console.error(`[gripm API] Error reading backlog for project ${project.id} from ${filePath}:`, err.message);
    return { project: { ...project, storageType: "json", error: err.message }, items: [], releases: [], sprints: [], lastUpdated: (/* @__PURE__ */ new Date()).toISOString() };
  }
}
function saveBacklogMdItem(project, item) {
  if (!project.repoPath) return;
  const tasksDir = getBacklogTasksDir(project);
  if (!fs5.existsSync(tasksDir)) {
    fs5.mkdirSync(tasksDir, { recursive: true });
  }
  const cleanId = (item.code || item.id).toLowerCase();
  const files = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  let existingFile = files.find((f) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });
  if (!existingFile) {
    for (const f of files) {
      try {
        const raw = fs5.readFileSync(path5.join(tasksDir, f), "utf8");
        const fallbackId = f.split(" - ")[0] || f.replace(/\.md$/, "");
        const parsed = parseBacklogMd(raw, fallbackId);
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          existingFile = f;
          break;
        }
      } catch {
      }
    }
  }
  let existingTask = {};
  if (existingFile) {
    try {
      const raw = fs5.readFileSync(path5.join(tasksDir, existingFile), "utf8");
      existingTask = parseBacklogMd(raw, item.code || item.id);
    } catch {
    }
  }
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
      delete taskData.rawExtraFrontmatter.isdeleted;
      delete taskData.rawExtraFrontmatter.deletedat;
      delete taskData.rawExtraFrontmatter.previousstatus;
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
  let registeredSprints = [];
  if (project.repoPath) {
    const sprintsPath = path5.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
    if (fs5.existsSync(sprintsPath)) {
      try {
        registeredSprints = JSON.parse(fs5.readFileSync(sprintsPath, "utf8"));
      } catch {
      }
    }
  }
  const resolveLegibleSprint = (val) => {
    if (!val) return void 0;
    const clean = String(val).trim();
    if (!clean) return void 0;
    const lower = clean.toLowerCase();
    if (lower === "backlog-futuro" || lower === "backlog" || lower === "sin sprint" || lower === "sin-sprint" || lower === "none" || lower === "null") {
      return void 0;
    }
    if (registeredSprints.length > 0) {
      const matched = registeredSprints.find(
        (s) => s.id && s.id.toLowerCase() === lower || s.name && s.name.trim().toLowerCase() === lower
      );
      if (matched) {
        return matched.name;
      }
    }
    if (lower.startsWith("sprint-") || lower.includes("backlog-futuro")) {
      return void 0;
    }
    return clean;
  };
  const isSprintProvided = item.sprint !== void 0 || item.targetSprint !== void 0 || item.sprints !== void 0;
  const rawSVal = isSprintProvided ? item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : "") || "" : existingTask.sprint || existingTask.targetSprint || (existingTask.sprints && existingTask.sprints.length > 0 ? existingTask.sprints[existingTask.sprints.length - 1] : "") || "";
  const resolvedSprint = resolveLegibleSprint(rawSVal);
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
    if (taskData.milestone && taskData.milestone.toLowerCase().includes("sprint")) {
      taskData.milestone = void 0;
    }
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
      const releasesPath = path5.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
      if (fs5.existsSync(releasesPath)) {
        try {
          const relsData = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
          const taskCode = (taskData.id || "").toUpperCase();
          let changed = false;
          const targetVersion = (rVal || (relArray[0] || "")).replace(/^v/i, "");
          let versionFound = false;
          for (const rel of relsData) {
            const vClean = (rel.version || "").replace(/^v/i, "");
            if (!rel.itemCodes) rel.itemCodes = [];
            const idx = rel.itemCodes.findIndex((c) => c.toUpperCase() === taskCode);
            if (targetVersion && vClean === targetVersion) {
              versionFound = true;
              if (idx < 0) {
                rel.itemCodes.push(taskData.id);
                changed = true;
              }
            } else if (idx >= 0 && !relArray.some((rv) => rv.replace(/^v/i, "") === vClean)) {
              rel.itemCodes.splice(idx, 1);
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
              markdownContent: `## [${targetVersion}] \u2014 Unreleased

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
          console.warn("[gripm API] Error sincronizando releases.json al guardar tarea:", syncErr.message);
        }
      }
    }
  }
  if (item.order !== void 0) taskData.rawExtraFrontmatter.order = item.order;
  const content = serializeBacklogMd(taskData);
  const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
  const targetFilePath = path5.join(tasksDir, targetFilename);
  atomicWriteFileSync2(targetFilePath, content, "utf8");
}
function findBacklogMdFile(project, id) {
  if (!project.repoPath) return null;
  const tasksDir = getBacklogTasksDir(project);
  if (!fs5.existsSync(tasksDir)) return null;
  const cleanId = id.toLowerCase();
  const files = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  let found = files.find((f) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });
  if (!found) {
    for (const f of files) {
      try {
        const raw = fs5.readFileSync(path5.join(tasksDir, f), "utf8");
        const fallbackId = f.split(" - ")[0] || f.replace(/\.md$/, "");
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
  const filePath = path5.join(tasksDir, found);
  try {
    const raw = fs5.readFileSync(filePath, "utf8");
    const fallbackId = found.split(" - ")[0] || found.replace(/\.md$/, "");
    const task = parseBacklogMd(raw, fallbackId);
    return { filePath, filename: found, task };
  } catch {
    return { filePath, filename: found, task: {} };
  }
}
function softDeleteBacklogMdItem(project, id) {
  const found = findBacklogMdFile(project, id);
  if (!found) return false;
  const { filePath, task } = found;
  const currentStatus = (task.status || "").toLowerCase();
  if (currentStatus === "done") return false;
  const previousStatus = task.status || "draft";
  const raw = fs5.readFileSync(filePath, "utf8");
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
  return true;
}
function restoreBacklogMdItem(project, id) {
  const found = findBacklogMdFile(project, id);
  if (!found) return false;
  const { filePath } = found;
  let raw = fs5.readFileSync(filePath, "utf8");
  const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
  const restoreStatus = prevMatch ? prevMatch[1].trim() : "draft";
  if (/^status:.*$/m.test(raw)) {
    raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus}`);
  }
  raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
  raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
  raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
  atomicWriteFileSync2(filePath, raw, "utf8");
  return true;
}
function purgeBacklogMdItem(project, id) {
  if (!project.repoPath) return false;
  const found = findBacklogMdFile(project, id);
  if (!found) return false;
  const archiveDir = path5.join(project.repoPath, project.backlogDir || "backlog", "archive");
  if (!fs5.existsSync(archiveDir)) fs5.mkdirSync(archiveDir, { recursive: true });
  fs5.renameSync(found.filePath, path5.join(archiveDir, found.filename));
  return true;
}
function writeProjectBacklog(project, data) {
  if (isBacklogMdProject(project)) {
    if (project.repoPath) {
      try {
        const dir = path5.join(project.repoPath, project.backlogDir || "backlog");
        if (!fs5.existsSync(dir)) fs5.mkdirSync(dir, { recursive: true });
        const releasesPath = path5.join(dir, "releases.json");
        let releasesToWrite = data.releases || [];
        if (fs5.existsSync(releasesPath)) {
          try {
            const diskReleases = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
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
        if (data.sprints !== void 0) {
          atomicWriteFileSync2(path5.join(dir, "sprints.json"), JSON.stringify(data.sprints || [], null, 2), "utf8");
        }
      } catch (err) {
        console.warn(`[gripm API] Warning writing releases/sprints: ${err.message}`);
      }
    }
    return;
  }
  const filePath = getProjectBacklogPath(project);
  data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  try {
    atomicWriteFileSync2(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`[gripm API] Error writing project backlog to ${filePath}:`, err.message);
  }
}

// server/services/fsExplorer.ts
init_registry();
import fs6 from "node:fs";
import path6 from "node:path";
import os2 from "node:os";
function getAllowedBrowseRoots() {
  const roots = [];
  const homedir = os2.homedir();
  if (homedir) {
    roots.push(path6.resolve(homedir));
    try {
      roots.push(fs6.realpathSync(homedir));
    } catch {
    }
  }
  const cwd = process.cwd();
  if (cwd) {
    roots.push(path6.resolve(cwd));
    try {
      roots.push(fs6.realpathSync(cwd));
    } catch {
    }
  }
  const tmpdir = os2.tmpdir();
  if (tmpdir) {
    roots.push(path6.resolve(tmpdir));
    try {
      roots.push(fs6.realpathSync(tmpdir));
    } catch {
    }
  }
  try {
    const reg = getRegistry();
    if (reg && Array.isArray(reg.projects)) {
      for (const p of reg.projects) {
        if (p.repoPath) {
          roots.push(path6.resolve(p.repoPath));
          try {
            roots.push(fs6.realpathSync(p.repoPath));
          } catch {
          }
        }
      }
    }
  } catch {
  }
  const extra = process.env.GRIPM_ALLOWED_PATHS;
  if (extra) {
    for (const p of extra.split(path6.delimiter)) {
      if (p.trim()) {
        roots.push(path6.resolve(p.trim()));
        try {
          roots.push(fs6.realpathSync(p.trim()));
        } catch {
        }
      }
    }
  }
  return [...new Set(roots)];
}
function isPathContained(targetPath, rootDir) {
  const relative = path6.relative(rootDir, targetPath);
  return !relative.startsWith("..") && !path6.isAbsolute(relative);
}
function isAllowedBrowsePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") return false;
  try {
    const resolved = path6.resolve(path6.normalize(targetPath));
    const roots = getAllowedBrowseRoots();
    try {
      const real = fs6.realpathSync(resolved);
      return roots.some((root) => isPathContained(real, root));
    } catch {
      return roots.some((root) => isPathContained(resolved, root));
    }
  } catch {
    return false;
  }
}
function getSafeInitialBrowseDir() {
  const candidates = [
    path6.resolve(process.cwd(), ".."),
    process.cwd(),
    os2.homedir()
  ];
  for (const candidate of candidates) {
    try {
      if (candidate && fs6.existsSync(candidate) && isAllowedBrowsePath(candidate)) {
        fs6.readdirSync(candidate);
        return candidate;
      }
    } catch {
    }
  }
  return path6.resolve(os2.homedir() || process.cwd());
}

// scripts/import-docs.js
import fs7 from "node:fs";
import path7 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path7.dirname(__filename3);
var M3_DOCS_DIR = process.env.M3_DOCS_DIR || "";
var DATA_DIR = path7.join(__dirname3, "../data");
var OUT_FILE = path7.join(DATA_DIR, "gripm-board.json");
function runMigration(docsDir = M3_DOCS_DIR, targetFile = OUT_FILE, projectMeta = null) {
  console.log(`[gripm Migrator] Starting migration from: ${docsDir}`);
  if (!fs7.existsSync(docsDir)) {
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
  const qualityLogPath = path7.join(docsDir, "QUALITY_LOG.md");
  if (fs7.existsSync(qualityLogPath)) {
    const content = fs7.readFileSync(qualityLogPath, "utf8");
    parseQualityLog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: QUALITY_LOG.md not found at ${qualityLogPath}`);
  }
  const backlogPath = path7.join(docsDir, "BACKLOG.md");
  if (fs7.existsSync(backlogPath)) {
    const content = fs7.readFileSync(backlogPath, "utf8");
    parseBacklog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: BACKLOG.md not found at ${backlogPath}`);
  }
  const specsDir = path7.join(docsDir, "specs");
  if (fs7.existsSync(specsDir)) {
    parseSpecs(specsDir, itemsMap, ctx);
  }
  const releases = [];
  const releaseNotesPath = path7.join(docsDir, "RELEASE_NOTES.md");
  if (fs7.existsSync(releaseNotesPath)) {
    const content = fs7.readFileSync(releaseNotesPath, "utf8");
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
    if (!fs7.existsSync(path7.dirname(targetFile))) {
      fs7.mkdirSync(path7.dirname(targetFile), { recursive: true });
    }
    fs7.writeFileSync(targetFile, JSON.stringify(boardData, null, 2), "utf8");
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
      const cols = trimmed.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
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
          impactedFile: impactedFile !== "\u2014" && impactedFile !== "-" ? impactedFile : void 0,
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
  const sectionRegex = /###\s+([A-Z0-9_-]+)\s+[—-]\s+([^\n]+)([\s\S]*?)(?=\n###\s+[A-Z0-9_-]+\s+[—-]|## |$)/g;
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
  const files = fs7.readdirSync(specsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path7.join(specsDir, file);
    const content = fs7.readFileSync(filePath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/—.*$/, "").replace(/–.*$/, "").trim() : file.replace(".md", "");
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
  const releaseMatch = content.match(/##\s+\[([0-9.]+)\]\s+[—-]\s+([0-9-]+)\s+(?:🚀\s+)?([^\n]+)/);
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
if (process.argv[1] && fileURLToPath3(import.meta.url) === process.argv[1]) {
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

// server/routes/api.ts
init_registryConfig();

// scripts/updateChecker.js
init_registryConfig();
import fs8 from "node:fs";
import path8 from "node:path";
var CACHE_FILE_NAME = "update-cache.json";
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var GITHUB_REPO = "pablojavierrodriguez/gripm";
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
    return path8.resolve(process.env.GRIPM_UPDATE_CACHE_PATH);
  }
  return path8.join(getGripmHomeDir(), CACHE_FILE_NAME);
}
function readUpdateCache() {
  try {
    const cachePath = getUpdateCachePath();
    if (!fs8.existsSync(cachePath)) return null;
    const content = fs8.readFileSync(cachePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeUpdateCache(data) {
  const cachePath = getUpdateCachePath();
  try {
    const dir = path8.dirname(cachePath);
    if (!fs8.existsSync(dir)) {
      fs8.mkdirSync(dir, { recursive: true });
    }
    fs8.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
  }
}
function isUpdateCheckDisabled() {
  const env = process.env.GRIPM_NO_UPDATE_CHECK;
  return env === "1" || env === "true";
}
function getCachedUpdateInfo(currentVersion) {
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
    }
  }
  return null;
}
async function checkForUpdates(currentVersion, { force = false, timeoutMs = 2e3 } = {}) {
  if (isUpdateCheckDisabled()) {
    return { hasUpdate: false, currentVersion, latestVersion: currentVersion, disabled: true };
  }
  const cached = readUpdateCache();
  const now = Date.now();
  if (!force && cached && cached.lastCheck && now - cached.lastCheck < CACHE_TTL_MS) {
    const hasUpdate = semverGreaterThan(cached.latestVersion, currentVersion);
    return {
      hasUpdate,
      currentVersion,
      latestVersion: cached.latestVersion || currentVersion,
      url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      fromCache: true
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "gripm-cli",
        "Accept": "application/vnd.github.v3+json"
      }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rawTag = data.tag_name || data.name || "";
      const latestVersion = rawTag.replace(/^v/, "").trim();
      const hasUpdate = semverGreaterThan(latestVersion, currentVersion);
      const url = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
      const cacheData = {
        lastCheck: now,
        currentVersion,
        latestVersion,
        hasUpdate,
        url
      };
      writeUpdateCache(cacheData);
      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        url,
        fromCache: false
      };
    } else {
      if (cached) {
        writeUpdateCache({ ...cached, lastCheck: now });
      } else {
        writeUpdateCache({ lastCheck: now, currentVersion, latestVersion: currentVersion, hasUpdate: false });
      }
    }
  } catch {
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

// server/routes/api.ts
var appVersion = "1.0.0";
try {
  const pkg = JSON.parse(fs9.readFileSync(path9.resolve(PKG_ROOT, "package.json"), "utf8"));
  if (pkg.version) appVersion = pkg.version;
} catch {
}
async function handleApiRequest(req, res) {
  const url = req.url || "";
  const pathname = url.split("?")[0];
  try {
    const registry = getRegistry();
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;
    const targetRepo = targetRepoEnv ? path9.resolve(targetRepoEnv) : path9.resolve(process.cwd());
    const targetProject = registry.projects.find((p) => p.repoPath && path9.resolve(p.repoPath) === targetRepo);
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
      const urlObj = new URL(`http://localhost${url}`);
      const projectId = urlObj.searchParams.get("projectId");
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
      const projectsToProcess = isSingleMode && activeProject ? [activeProject] : registry.projects;
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
    if (req.method === "GET" && url === "/api/updates") {
      const cached = getCachedUpdateInfo(appVersion);
      return sendJson(res, 200, {
        currentVersion: appVersion,
        update: cached || null
      });
    }
    if (req.method === "POST" && url === "/api/items") {
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const project = registry.projects.find((p) => p.id === (body.projectId || registry.projects[0]?.id)) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "No active project found" });
      const backlog = readProjectBacklog(project);
      const cleanPrefix = (project.codePrefix || "ITEM").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "ITEM";
      let code = body.code;
      if (!code) {
        let maxNum = 0;
        const regex = new RegExp(`^${cleanPrefix}[-_]+(\\d+)`, "i");
        for (const t of backlog.items) {
          const m = (t.code || t.id || "").match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        if (isBacklogMdProject(project)) {
          const tasksDir = getBacklogTasksDir(project);
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
        const nextNum = maxNum > 0 ? maxNum + 1 : backlog.items.length + 1;
        code = `${cleanPrefix}-${String(nextNum).padStart(3, "0")}`;
      }
      const normalizedSt = normalizeStatus(body.status || "draft");
      const newItem = {
        id: isBacklogMdProject(project) ? code : body.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        code,
        projectId: project.id,
        title: body.title || "Sin t\xEDtulo",
        description: body.description || "",
        type: body.type || "feature",
        priority: normalizePriority(body.priority),
        status: normalizedSt,
        module: body.module || void 0,
        impactedFile: body.impactedFile || void 0,
        risk: body.risk || void 0,
        sprint: body.sprint || body.targetSprint || void 0,
        release: body.release || body.targetRelease || void 0,
        targetSprint: body.sprint || body.targetSprint || void 0,
        targetRelease: body.release || body.targetRelease || void 0,
        milestone: body.release || body.targetRelease || body.milestone || void 0,
        parentId: body.parentId || void 0,
        blocks: Array.isArray(body.blocks) ? body.blocks : [],
        blockedBy: Array.isArray(body.blockedBy) ? body.blockedBy : [],
        relatedTo: Array.isArray(body.relatedTo) ? body.relatedTo : [],
        acceptanceCriteriaList: body.acceptanceCriteriaList || [],
        implementationPlan: body.implementationPlan || "",
        assignees: body.assignees || [],
        labels: body.labels || [],
        estimate: body.estimate !== void 0 && body.estimate !== "" ? body.estimate : void 0,
        sourceDoc: body.sourceDoc || void 0,
        order: body.order ?? backlog.items.length + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: normalizedSt === "done" ? now : void 0,
        releasedAt: body.releasedAt || void 0
      };
      if (isBacklogMdProject(project)) {
        saveBacklogMdItem(project, newItem);
      } else {
        backlog.items.push(newItem);
        writeProjectBacklog(project, backlog);
      }
      return sendJson(res, 201, { ok: true, item: newItem });
    }
    if (req.method === "PUT" && url.startsWith("/api/items/")) {
      const id = decodeURIComponent(url.replace("/api/items/", "").split("?")[0]);
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (const p of registry.projects) {
        const backlog = readProjectBacklog(p);
        const index = backlog.items.findIndex((i) => i.id === id || i.code === id);
        if (index !== -1) {
          const existing = backlog.items[index];
          if (!body.force && typeof body.expectedMtime === "number" && typeof existing.mtime === "number") {
            if (existing.mtime > body.expectedMtime + 1e3) {
              return sendJson(res, 409, {
                error: "conflict",
                message: `La tarea "${existing.code}" fue modificada en disco por otro proceso o agente.`,
                currentMtime: existing.mtime,
                currentItem: existing
              });
            }
          }
          const newNormalizedStatus = body.status ? normalizeStatus(body.status) : existing.status;
          const wasDone = existing.status === "done";
          const isNowDone = newNormalizedStatus === "done";
          const updatedItem = {
            ...existing,
            ...body,
            id: existing.id,
            code: existing.code,
            status: newNormalizedStatus,
            priority: body.priority ? normalizePriority(body.priority) : existing.priority,
            updatedAt: now,
            completedAt: isNowDone && !wasDone ? now : isNowDone ? existing.completedAt : void 0
          };
          if (body.sprint !== void 0) {
            updatedItem.sprint = body.sprint || void 0;
            updatedItem.targetSprint = body.sprint || void 0;
            if (!body.sprint && updatedItem.milestone && updatedItem.milestone.toLowerCase().includes("sprint")) {
              updatedItem.milestone = void 0;
            }
            if (body.sprint) {
              updatedItem.sprints = Array.from(/* @__PURE__ */ new Set([...updatedItem.sprints || [], body.sprint]));
            } else {
              updatedItem.sprints = [];
            }
          }
          if (body.sprints !== void 0) {
            updatedItem.sprints = body.sprints;
          }
          if (body.release !== void 0 || body.targetRelease !== void 0 || body.milestone !== void 0 || body.releases !== void 0) {
            const rVal = (body.release || body.targetRelease || body.milestone || (body.releases && body.releases.length > 0 ? body.releases[0] : "") || "").trim();
            const relArr = Array.isArray(body.releases) ? body.releases.filter(Boolean) : rVal ? [rVal] : [];
            updatedItem.release = rVal || void 0;
            updatedItem.targetRelease = rVal || void 0;
            updatedItem.milestone = rVal || void 0;
            updatedItem.releases = relArr;
          }
          if (body.estimate !== void 0) {
            updatedItem.estimate = body.estimate === "" || body.estimate === null ? void 0 : body.estimate;
          }
          if (isBacklogMdProject(p)) {
            saveBacklogMdItem(p, updatedItem);
          } else {
            backlog.items[index] = updatedItem;
            writeProjectBacklog(p, backlog);
          }
          updatedItem.mtime = Date.now();
          return sendJson(res, 200, { ok: true, item: updatedItem });
        }
      }
      return sendJson(res, 404, { error: "Item not found in any registered project" });
    }
    if (req.method === "PATCH" && /^\/api\/items\/[^/]+\/restore$/.test(url)) {
      const id = decodeURIComponent(url.replace("/api/items/", "").replace("/restore", ""));
      for (const p of registry.projects) {
        if (isBacklogMdProject(p)) {
          const restored = restoreBacklogMdItem(p, id);
          if (restored) {
            broadcastSse("change", { type: "item_restored", id });
            return sendJson(res, 200, { ok: true, id });
          }
        } else {
          const backlog = readProjectBacklog(p);
          const item = backlog.items.find((i) => i.id === id || i.code === id);
          if (item) {
            const restoreStatus = item.previousStatus || "draft";
            item.status = restoreStatus;
            delete item.isDeleted;
            delete item.deletedAt;
            delete item.previousStatus;
            writeProjectBacklog(p, backlog);
            broadcastSse("change", { type: "item_restored", id });
            return sendJson(res, 200, { ok: true, id, item });
          }
        }
      }
      return sendJson(res, 404, { error: "Item not found" });
    }
    if (req.method === "DELETE" && url.startsWith("/api/items/")) {
      const rawUrl = url;
      const isPurge = rawUrl.includes("?purge=true");
      const id = decodeURIComponent(rawUrl.replace("/api/items/", "").split("?")[0]);
      for (const p of registry.projects) {
        if (isBacklogMdProject(p)) {
          if (isPurge) {
            const purged = purgeBacklogMdItem(p, id);
            if (purged) {
              broadcastSse("change", { type: "item_purged", id });
              return sendJson(res, 200, { ok: true, id, purged: true });
            }
          } else {
            const found = findBacklogMdFile(p, id);
            if (found && (found.task.status || "").toLowerCase() === "done") {
              return sendJson(res, 403, { error: "Cannot soft-delete a done item. Done items are protected historical records." });
            }
            const deleted = softDeleteBacklogMdItem(p, id);
            if (deleted) {
              broadcastSse("change", { type: "item_soft_deleted", id });
              return sendJson(res, 200, { ok: true, id, softDeleted: true });
            }
          }
        } else {
          const backlog = readProjectBacklog(p);
          const idx = backlog.items.findIndex((i) => i.id === id || i.code === id);
          if (idx !== -1) {
            const item = backlog.items[idx];
            if (!isPurge) {
              if (item.status === "done") {
                return sendJson(res, 403, { error: "Cannot soft-delete a done item." });
              }
              item.previousStatus = item.status;
              item.isDeleted = true;
              item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
            } else {
              backlog.items.splice(idx, 1);
            }
            writeProjectBacklog(p, backlog);
            broadcastSse("change", { type: isPurge ? "item_purged" : "item_soft_deleted", id });
            return sendJson(res, 200, { ok: true, id, softDeleted: !isPurge, purged: isPurge });
          }
        }
      }
      return sendJson(res, 404, { error: "Item not found" });
    }
    if (req.method === "POST" && url === "/api/import/legacy-md") {
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
          saveBacklogMdItem(project, newItem);
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
    if (req.method === "POST" && url === "/api/projects") {
      const body = await getBody(req, res);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const id = (body.id || body.codePrefix || body.name || `proj-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      let storageType = body.storageType;
      let backlogDir = body.backlogDir || "backlog";
      const normalizedRepoPath = body.repoPath ? path9.normalize(body.repoPath.trim()) : void 0;
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
    if (req.method === "POST" && url === "/api/projects/restore-demo") {
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
      return sendJson(res, 200, { ok: true, projects: registry.projects, activeProjectId: "demo" });
    }
    if (req.method === "POST" && url === "/api/projects/detect-path") {
      const body = await getBody(req, res);
      const inputPath = body.repoPath ? path9.normalize(body.repoPath.trim()) : "";
      if (!inputPath) {
        return sendJson(res, 400, { error: "repoPath required" });
      }
      if (!isAllowedBrowsePath(inputPath)) {
        return sendJson(res, 403, { error: "Forbidden: repoPath is outside allowed roots" });
      }
      const exists = fs9.existsSync(inputPath);
      const isGit = exists && fs9.existsSync(path9.join(inputPath, ".git"));
      const detection = detectProjectStorage(inputPath);
      return sendJson(res, 200, {
        ok: true,
        exists,
        isGit,
        normalizedPath: inputPath,
        ...detection
      });
    }
    if (req.method === "DELETE" && url.startsWith("/api/projects/")) {
      const id = decodeURIComponent(url.replace("/api/projects/", "").split("?")[0]);
      const initialLen = registry.projects.length;
      registry.projects = registry.projects.filter((p) => p.id !== id);
      if (registry.projects.length === initialLen) {
        return sendJson(res, 404, { error: "Project not found in registry" });
      }
      if (registry.activeProjectId === id) {
        registry.activeProjectId = registry.projects[0]?.id || "";
      }
      saveRegistry(registry);
      return sendJson(res, 200, { ok: true, id, remainingProjects: registry.projects });
    }
    if (req.method === "POST" && url === "/api/projects/active") {
      const body = await getBody(req, res);
      const { projectId } = body || {};
      if (isSingleMode) {
        return sendJson(res, 200, { ok: true, activeProjectId: activeProject?.id, singleProject: true });
      }
      if (projectId && registry.projects.some((p) => p.id === projectId)) {
        registry.activeProjectId = projectId;
        saveRegistry(registry);
        return sendJson(res, 200, { ok: true, activeProjectId: projectId });
      }
      return sendJson(res, 400, { error: "Invalid or missing projectId" });
    }
    if (req.method === "GET" && url.startsWith("/api/fs/browse")) {
      const urlObj = new URL(`http://localhost${url}`);
      let rawDir = urlObj.searchParams.get("dir") || "";
      let targetDir = rawDir.trim();
      if (!targetDir) {
        targetDir = getSafeInitialBrowseDir();
      } else {
        targetDir = path9.resolve(path9.normalize(targetDir));
        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        }
      }
      try {
        if (!fs9.existsSync(targetDir)) {
          targetDir = getSafeInitialBrowseDir();
        }
        const stat = fs9.statSync(targetDir);
        if (!stat.isDirectory()) {
          targetDir = path9.dirname(targetDir);
        }
        if (!isAllowedBrowsePath(targetDir)) {
          return sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        }
        const parent = path9.dirname(targetDir);
        const parentPath = parent !== targetDir && isAllowedBrowsePath(parent) ? parent : null;
        let entries = [];
        let dirWarning = void 0;
        try {
          entries = fs9.readdirSync(targetDir, { withFileTypes: true });
        } catch (readErr) {
          console.warn(`[gripm FS] Cannot scan ${targetDir}: ${readErr.message}`);
          dirWarning = readErr.code === "EPERM" || readErr.code === "EACCES" ? `Permiso restringido por el sistema al explorar esta carpeta (${readErr.message}). Puedes escribir o pegar la ruta exacta manualmente.` : `No se pudieron leer subcarpetas: ${readErr.message}`;
        }
        const folders = [];
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith(".") && entry.name !== ".backlog") continue;
          if (["node_modules", "dist", "build", ".git", "$RECYCLE.BIN", "System Volume Information"].includes(entry.name)) continue;
          const fullPath = path9.join(targetDir, entry.name);
          let isGit = false;
          let hasBacklog = false;
          try {
            isGit = fs9.existsSync(path9.join(fullPath, ".git"));
            hasBacklog = fs9.existsSync(path9.join(fullPath, "backlog")) || fs9.existsSync(path9.join(fullPath, ".backlog"));
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
          isCurrentGit = fs9.existsSync(path9.join(targetDir, ".git"));
          hasCurrentBacklog = fs9.existsSync(path9.join(targetDir, "backlog")) || fs9.existsSync(path9.join(targetDir, ".backlog"));
          hasCurrentGripm = fs9.existsSync(path9.join(targetDir, ".gripm"));
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
        const parent = path9.dirname(safeDir);
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
    if (req.method === "POST" && url.includes("/detect-storage")) {
      const id = url.split("/")[3];
      const p = registry.projects.find((proj) => proj.id === id);
      if (!p) return sendJson(res, 404, { error: "Project not found" });
      const detection = detectProjectStorage(p.repoPath);
      return sendJson(res, 200, { ok: true, ...detection });
    }
    if (req.method === "POST" && url.includes("/convert-to-md")) {
      const id = url.split("/")[3];
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      }
      const currentBacklog = readProjectBacklog(project);
      const tasksDir = path9.join(project.repoPath, "backlog/tasks");
      if (!fs9.existsSync(tasksDir)) {
        fs9.mkdirSync(tasksDir, { recursive: true });
      }
      let converted = 0;
      for (const item of currentBacklog.items) {
        saveBacklogMdItem({ ...project, storageType: "markdown", backlogDir: "backlog" }, item);
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
    if (req.method === "POST" && url.includes("/convert-to-json")) {
      const id = url.split("/")[3];
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project || !project.repoPath) {
        return sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      }
      const currentBacklog = readProjectBacklog(project);
      const jsonPath = path9.join(project.repoPath, ".gripm/backlog.json");
      const gripmDir = path9.dirname(jsonPath);
      if (!fs9.existsSync(gripmDir)) {
        fs9.mkdirSync(gripmDir, { recursive: true });
      }
      fs9.writeFileSync(jsonPath, JSON.stringify(currentBacklog, null, 2), "utf8");
      project.storageType = "json";
      saveRegistry(registry);
      return sendJson(res, 200, {
        ok: true,
        message: `Unificadas ${currentBacklog.items.length} tareas en ${jsonPath}`,
        savedPath: jsonPath
      });
    }
    if (req.method === "GET" && url.includes("/export-json")) {
      const id = url.split("?")[0].split("/")[3];
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, {
        ok: true,
        project,
        data: backlog
      });
    }
    if (req.method === "GET" && url.includes("/export-monolithic-md")) {
      const id = url.split("?")[0].split("/")[3];
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      const tasks = backlog.items.map((it) => ({
        id: it.code || it.id,
        title: it.title,
        status: normalizeStatus(it.status),
        type: it.type,
        priority: it.priority,
        milestone: it.targetSprint || it.milestone,
        description: it.description,
        acceptanceCriteria: it.acceptanceCriteriaList || []
      }));
      const markdownContent = generateMonolithicBacklogMd(project.name, tasks);
      return sendJson(res, 200, {
        ok: true,
        content: markdownContent
      });
    }
    if (req.method === "POST" && url.includes("/export-monolithic-md")) {
      const id = url.split("?")[0].split("/")[3];
      const project = registry.projects.find((proj) => proj.id === id);
      if (!project) return sendJson(res, 404, { error: "Project not found" });
      if (!project.repoPath) return sendJson(res, 400, { error: "Project lacks repoPath" });
      await getBody(req, res).catch(() => ({}));
      const backlog = readProjectBacklog(project);
      const tasks = backlog.items.map((it) => ({
        id: it.code || it.id,
        title: it.title,
        status: normalizeStatus(it.status),
        type: it.type,
        priority: it.priority,
        milestone: it.targetSprint || it.milestone,
        description: it.description,
        acceptanceCriteria: it.acceptanceCriteriaList || []
      }));
      const markdownContent = generateMonolithicBacklogMd(project.name, tasks);
      const savedPath = path9.join(project.repoPath, "BACKLOG.md");
      atomicWriteFileSync2(savedPath, markdownContent, "utf8");
      return sendJson(res, 200, {
        ok: true,
        content: markdownContent,
        savedPath
      });
    }
    if (req.method === "POST" && url === "/api/releases") {
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
      const itemCodeSet = new Set((release.itemCodes || []).map((c) => c.toUpperCase()));
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
              saveBacklogMdItem(project, updated);
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
                saveBacklogMdItem(project, updated);
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
              saveBacklogMdItem(project, updated);
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
    if (req.method === "DELETE" && url.startsWith("/api/releases/")) {
      const releaseId = decodeURIComponent(url.replace("/api/releases/", "").split("?")[0]);
      const project = registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      const initialCount = backlog.releases.length;
      backlog.releases = (backlog.releases || []).filter((r) => r.id !== releaseId && r.version !== releaseId);
      writeProjectBacklog(project, backlog);
      return sendJson(res, 200, { ok: true, deleted: initialCount > backlog.releases.length });
    }
    if (req.method === "POST" && url === "/api/releases/sync-legacy") {
      const body = await getBody(req, res);
      const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      if (project.repoPath) {
        const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, backlog.items);
        if (parsed.length > 0) {
          backlog.releases = parsed;
          const releasesPath = path9.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
          try {
            if (!fs9.existsSync(path9.dirname(releasesPath))) fs9.mkdirSync(path9.dirname(releasesPath), { recursive: true });
            fs9.writeFileSync(releasesPath, JSON.stringify(backlog.releases, null, 2), "utf8");
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
    if (req.method === "GET" && url.startsWith("/api/sprints")) {
      const urlObj = new URL(url, "http://localhost");
      const projectId = urlObj.searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
      const project = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const backlog = readProjectBacklog(project);
      return sendJson(res, 200, { ok: true, sprints: backlog.sprints || [] });
    }
    if (req.method === "POST" && url === "/api/sprints") {
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
    if (req.method === "PUT" && url.startsWith("/api/sprints/")) {
      const sprintId = decodeURIComponent(url.replace("/api/sprints/", "").split("?")[0]);
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
              saveBacklogMdItem(project, it);
            }
          }
        });
      }
      if (body.retro) {
        try {
          const retrosDir = path9.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
          if (!fs9.existsSync(retrosDir)) {
            fs9.mkdirSync(retrosDir, { recursive: true });
          }
          const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const sprintKey = String(updatedSprint.id || newName).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
          const retroFile = path9.join(retrosDir, `${sprintKey}-retro.md`);
          const r = body.retro;
          const md = `# Retrospectiva \u2014 ${newName}

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
          fs9.writeFileSync(retroFile, md, "utf8");
        } catch (e) {
          console.warn("[Retro Save Error]", e.message);
        }
      }
      writeProjectBacklog(project, backlog);
      broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_updated", sprintId: updatedSprint.id, timestamp: Date.now() });
      return sendJson(res, 200, { ok: true, sprint: updatedSprint });
    }
    if (req.method === "GET" && url.startsWith("/api/retros")) {
      const urlObj = new URL(url, "http://localhost");
      const projectId = urlObj.searchParams.get("projectId");
      const project = registry.projects.find((p) => p.id === projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
      if (!project) return sendJson(res, 400, { error: "Project not found" });
      const retrosDir = path9.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
      if (!fs9.existsSync(retrosDir)) return sendJson(res, 200, { retros: [] });
      const files = fs9.readdirSync(retrosDir).filter((f) => f.endsWith(".md"));
      const retros = files.map((f) => {
        const full = path9.join(retrosDir, f);
        const raw = fs9.readFileSync(full, "utf8");
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
    if (req.method === "DELETE" && url.startsWith("/api/sprints/")) {
      const urlObj = new URL(url, "http://localhost");
      const sprintId = decodeURIComponent(url.replace("/api/sprints/", "").split("?")[0]);
      const projectId = urlObj.searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
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
            saveBacklogMdItem(project, it);
          }
        }
      });
      writeProjectBacklog(project, backlog);
      broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_deleted", sprintId, timestamp: Date.now() });
      return sendJson(res, 200, { ok: true, deleted: true });
    }
    if (req.method === "POST" && url === "/api/import") {
      try {
        const body = await getBody(req, res).catch(() => ({}));
        const projectId = body.projectId || registry.activeProjectId || registry.projects[0]?.id;
        const targetProject2 = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
        if (!targetProject2) {
          return sendJson(res, 404, { ok: false, error: "Proyecto no encontrado" });
        }
        const docsDir = body.docsPath || getProjectDocsPath(targetProject2);
        if (!docsDir || !fs9.existsSync(docsDir)) {
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
            saveBacklogMdItem(targetProject2, item);
            updatedCount++;
          }
          if (boardData.releases && boardData.releases.length > 0 && targetProject2.repoPath) {
            const releasesPath = path9.join(targetProject2.repoPath, targetProject2.backlogDir || "backlog", "releases.json");
            try {
              if (!fs9.existsSync(path9.dirname(releasesPath))) fs9.mkdirSync(path9.dirname(releasesPath), { recursive: true });
              fs9.writeFileSync(releasesPath, JSON.stringify(boardData.releases, null, 2), "utf8");
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

// server/plugin.ts
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
        server.listen = async (...args) => {
          const res = await origListen(...args);
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
        server.listen = async (...args) => {
          const res = await origListen(...args);
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
export {
  gripmApi
};
