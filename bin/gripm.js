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

// node_modules/@gripm/playbook/scripts/check-loc.mjs
import fs7 from "node:fs";
import path7 from "node:path";
import { fileURLToPath as fileURLToPath5 } from "node:url";
function parseIgnoreLines(lines) {
  return lines.map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((pattern) => {
    const isDirOnly = pattern.endsWith("/");
    const clean = pattern.replace(/\/$/, "");
    const escaped = clean.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return { pattern: clean, isDirOnly, regex: new RegExp(`(?:^|/)${escaped}(?:/|$)`) };
  });
}
function parseIgnoreFile(filePath) {
  if (!fs7.existsSync(filePath)) return [];
  try {
    const content = fs7.readFileSync(filePath, "utf8");
    return parseIgnoreLines(content.split(/\r?\n/));
  } catch {
    return [];
  }
}
function isIgnored(relPath, isDir, ignoreRules, ignoredDirs = DEFAULT_IGNORED_DIRS) {
  const norm = relPath.replace(/\\/g, "/");
  const parts = norm.split("/");
  for (const part of parts) {
    if (ignoredDirs.has(part)) return true;
  }
  const dirPart = isDir ? norm : parts.slice(0, -1).join("/");
  for (const rule of ignoreRules) {
    if (rule.isDirOnly) {
      if (isDir && rule.regex.test(norm)) return true;
      if (!isDir && dirPart && (rule.regex.test(dirPart) || parts.slice(0, -1).some((p) => rule.regex.test(p)))) {
        return true;
      }
    } else {
      if (rule.regex.test(norm)) return true;
    }
  }
  return false;
}
function countFileLines(filePath) {
  try {
    const content = fs7.readFileSync(filePath, "utf8");
    if (!content) return 0;
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      return lines.length - 1;
    }
    return lines.length;
  } catch {
    return 0;
  }
}
function checkFileBudget(options = {}) {
  const root = path7.resolve(options.root || options.cwd || options.path || process.cwd());
  const maxLines = Number(options.maxLines ?? options.max ?? DEFAULT_MAX_LINES);
  const warnLines = Number(options.warnLines ?? options.warn ?? DEFAULT_WARN_LINES);
  const customExts = options.extensions ? new Set(options.extensions) : DEFAULT_EXTENSIONS;
  const customIgnoredDirs = options.ignoredDirs ? new Set(options.ignoredDirs) : DEFAULT_IGNORED_DIRS;
  const gitignoreRules = parseIgnoreFile(path7.join(root, ".gitignore"));
  const gripmLocignoreNoDot = path7.join(root, ".gripm", "locignore");
  const gripmLocignoreDot = path7.join(root, ".gripm", ".locignore");
  const rootLocignore = path7.join(root, ".locignore");
  const locignorePath = fs7.existsSync(gripmLocignoreNoDot) ? gripmLocignoreNoDot : fs7.existsSync(gripmLocignoreDot) ? gripmLocignoreDot : rootLocignore;
  const locignoreRules = parseIgnoreFile(locignorePath);
  const extraExcludes = Array.isArray(options.exclude) ? parseIgnoreLines(options.exclude) : options.exclude ? parseIgnoreLines([options.exclude]) : [];
  const combinedRules = [...gitignoreRules, ...locignoreRules, ...extraExcludes];
  const violations = [];
  const warnings = [];
  let scanned = 0;
  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs7.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path7.join(currentDir, entry.name);
      const rel = path7.relative(root, full);
      if (entry.isDirectory()) {
        if (!isIgnored(rel, true, combinedRules, customIgnoredDirs)) {
          walk(full);
        }
      } else if (entry.isFile()) {
        const ext = path7.extname(entry.name).toLowerCase();
        if (customExts.has(ext) && !isIgnored(rel, false, combinedRules, customIgnoredDirs)) {
          scanned++;
          const lines = countFileLines(full);
          const item = {
            file: rel.replace(/\\/g, "/"),
            lines,
            maxLines,
            warnLines
          };
          if (lines >= maxLines) {
            violations.push(item);
          } else if (lines >= warnLines) {
            warnings.push(item);
          }
        }
      }
    }
  }
  if (options.src) {
    const target = path7.resolve(root, options.src);
    if (fs7.existsSync(target)) {
      const stat = fs7.statSync(target);
      if (stat.isDirectory()) {
        walk(target);
      } else if (stat.isFile()) {
        const lines = countFileLines(target);
        scanned = 1;
        const rel = path7.relative(root, target).replace(/\\/g, "/");
        const item = { file: rel, lines, maxLines, warnLines };
        if (lines >= maxLines) violations.push(item);
        else if (lines >= warnLines) warnings.push(item);
      }
    }
  } else {
    const detectedSrcDirs = CANDIDATE_SRC_DIRS.map((dir) => path7.join(root, dir)).filter((dir) => fs7.existsSync(dir) && fs7.statSync(dir).isDirectory());
    if (detectedSrcDirs.length > 0) {
      for (const dir of detectedSrcDirs) {
        walk(dir);
      }
    } else {
      walk(root);
    }
  }
  violations.sort((a, b) => b.lines - a.lines);
  warnings.sort((a, b) => b.lines - a.lines);
  const strict = Boolean(options.strict);
  return {
    root,
    scanned,
    maxLines,
    warnLines,
    violations,
    warnings,
    hasDebt: violations.length > 0,
    passed: strict ? violations.length === 0 : true,
    strict
  };
}
function runCli(argv = process.argv.slice(2)) {
  let targetPath = null;
  let maxLines = DEFAULT_MAX_LINES;
  let warnLines = DEFAULT_WARN_LINES;
  let formatJson = false;
  let strict = false;
  const excludes = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--max" || arg === "--max-lines") {
      maxLines = parseInt(argv[++i], 10);
    } else if (arg === "--warn" || arg === "--warn-lines") {
      warnLines = parseInt(argv[++i], 10);
    } else if (arg === "--path" || arg === "--src" || arg === "--root" || arg === "--cwd") {
      targetPath = argv[++i];
    } else if (arg.startsWith("--root=") || arg.startsWith("--cwd=") || arg.startsWith("--path=")) {
      targetPath = arg.split("=")[1];
    } else if (arg === "--exclude") {
      excludes.push(argv[++i]);
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--json") {
      formatJson = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node scripts/check-loc.mjs [options] [path]

Options:
  --max, --max-lines <n>   Ceiling lines limit (default: ${DEFAULT_MAX_LINES})
  --warn, --warn-lines <n> Soft warning threshold (default: ${DEFAULT_WARN_LINES})
  --path, --src <dir>      Directory or file to scan (default: auto-detect src/ or cwd)
  --exclude <pattern>      Exclude file or directory pattern (repeatable)
  --strict                 Exit 1 if any file reaches or exceeds limit (default: advisory exit 0)
  --json                   Output results as JSON
  --help, -h               Show this help message
`);
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      targetPath = arg;
    }
  }
  const result = checkFileBudget({
    path: targetPath,
    maxLines,
    warnLines,
    exclude: excludes,
    strict
  });
  if (formatJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  }
  console.log(`
  ${c.bold("gripm")} ${c.dim("\xB7")} File Budget & Modularity Checker
`);
  console.log(`  Target:    ${c.cyan(result.root)}`);
  console.log(`  Scanned:   ${result.scanned} source files`);
  console.log(`  Limits:    Ceiling < ${result.maxLines} LOC \xB7 Warning >= ${result.warnLines} LOC`);
  console.log(`  Mode:      ${result.strict ? c.red("Strict (blocking gate)") : c.dim("Advisory (PO sovereignty - non-blocking)")}
`);
  if (result.warnings.length > 0) {
    console.log(`  ${c.yellow("\u25B2 Warnings (modular refactoring recommended):")}`);
    for (const w of result.warnings) {
      console.log(`    ${c.yellow("\u26A0")} ${w.file.padEnd(55)} ${c.bold(w.lines)} LOC`);
    }
    console.log("");
  }
  if (result.violations.length > 0) {
    if (result.strict) {
      console.log(`  ${c.red("\u2716 Violations (strict mode enabled - hard ceiling breached):")}`);
      for (const v of result.violations) {
        console.log(`    ${c.red("\u2716")} ${v.file.padEnd(55)} ${c.bold(v.lines)} LOC (exceeds ${result.maxLines})`);
      }
      console.log(`
  ${c.red("\u2716 FILE BUDGET FAILED")} - ${result.violations.length} file(s) exceed ${result.maxLines} LOC.
`);
      process.exit(1);
    } else {
      console.log(`  ${c.yellow("\u25B2 Technical Debt Notice (files exceeding " + result.maxLines + " LOC):")}`);
      for (const v of result.violations) {
        console.log(`    ${c.yellow("\u26A0")} ${v.file.padEnd(55)} ${c.bold(v.lines)} LOC (exceeds ${result.maxLines})`);
      }
      console.log(`
  ${c.dim("\u2139 PO Advisory: Large files increase maintenance risk and single points of failure.")}`);
      console.log(`  ${c.dim("  Ensure a refactoring task is tracked and prioritized in the backlog (`backlog/tasks/`).")}`);
      console.log(`  ${c.dim("  The final release decision belongs to the PO.")}
`);
      process.exit(0);
    }
  }
  console.log(`  ${c.green("\u2714 All files within modular limits (< " + result.maxLines + " LOC).")}
`);
  process.exit(0);
}
var __filename5, __dirname4, DEFAULT_MAX_LINES, DEFAULT_WARN_LINES, DEFAULT_EXTENSIONS, DEFAULT_IGNORED_DIRS, CANDIDATE_SRC_DIRS, isColorSupported, c, isDirectEntry;
var init_check_loc = __esm({
  "node_modules/@gripm/playbook/scripts/check-loc.mjs"() {
    __filename5 = fileURLToPath5(import.meta.url);
    __dirname4 = path7.dirname(__filename5);
    DEFAULT_MAX_LINES = 1e3;
    DEFAULT_WARN_LINES = 500;
    DEFAULT_EXTENSIONS = /* @__PURE__ */ new Set([
      ".js",
      ".mjs",
      ".cjs",
      ".ts",
      ".tsx",
      ".jsx",
      ".py",
      ".go",
      ".rs",
      ".rb",
      ".php",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".cs",
      ".swift",
      ".kt",
      ".sh",
      ".bash",
      ".ps1",
      ".sql",
      ".graphql",
      ".proto"
    ]);
    DEFAULT_IGNORED_DIRS = /* @__PURE__ */ new Set([
      "node_modules",
      "dist",
      "build",
      "out",
      "bin",
      ".next",
      ".nuxt",
      ".turbo",
      ".svelte-kit",
      "coverage",
      ".git",
      ".vscode",
      ".idea",
      ".playbook-backups",
      ".gripm",
      ".agents",
      "docs",
      "tests",
      "__tests__",
      "fixtures"
    ]);
    CANDIDATE_SRC_DIRS = [
      "src",
      "app",
      "lib",
      "domain",
      "packages",
      "client",
      "frontend"
    ];
    isColorSupported = !("NO_COLOR" in process.env) && (process.env.FORCE_COLOR === "1" || process.stdout?.isTTY && process.env.TERM !== "dumb");
    c = {
      bold: (s) => isColorSupported ? `\x1B[1m${s}\x1B[22m` : s,
      dim: (s) => isColorSupported ? `\x1B[2m${s}\x1B[22m` : s,
      green: (s) => isColorSupported ? `\x1B[32m${s}\x1B[39m` : s,
      yellow: (s) => isColorSupported ? `\x1B[33m${s}\x1B[39m` : s,
      red: (s) => isColorSupported ? `\x1B[31m${s}\x1B[39m` : s,
      cyan: (s) => isColorSupported ? `\x1B[36m${s}\x1B[39m` : s
    };
    isDirectEntry = process.argv[1] && path7.resolve(process.argv[1]) === __filename5 && path7.basename(process.argv[1]).includes("check-loc");
    if (isDirectEntry) {
      runCli();
    }
  }
});

// node_modules/@gripm/playbook/scripts/audit-engine.mjs
import fs8 from "node:fs";
import path8 from "node:path";
import { fileURLToPath as fileURLToPath6 } from "node:url";
function detectStack(rootPath) {
  const root = path8.resolve(rootPath || process.cwd());
  const detected = /* @__PURE__ */ new Set();
  const candidateDirs = [root];
  const parent = path8.dirname(root);
  if (parent && parent !== root) candidateDirs.push(parent);
  for (const dir of candidateDirs) {
    const pkgPath = path8.join(dir, "package.json");
    if (fs8.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs8.readFileSync(pkgPath, "utf8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        detected.add("Node");
        if (deps.react || deps["react-dom"] || deps.next) detected.add("React");
        if (deps.vue || deps.nuxt) detected.add("Vue");
        if (deps.typescript) detected.add("TypeScript");
        break;
      } catch {
      }
    }
  }
  const exists = (file) => fs8.existsSync(path8.join(root, file));
  if (exists("tsconfig.json")) detected.add("TypeScript");
  if (["pyproject.toml", "requirements.txt", "setup.py", "Pipfile", "environment.yml"].some(exists)) detected.add("Python");
  if (exists("Cargo.toml")) detected.add("Rust");
  if (exists("go.mod")) detected.add("Go");
  if (fs8.existsSync(root) && fs8.statSync(root).isDirectory()) {
    try {
      const files = fs8.readdirSync(root);
      if (files.some((f) => f.endsWith(".py"))) detected.add("Python");
      if (files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) detected.add("TypeScript");
      if (files.some((f) => f.endsWith(".rs"))) detected.add("Rust");
      if (files.some((f) => f.endsWith(".go"))) detected.add("Go");
    } catch {
    }
  }
  return [...detected];
}
function detectTests(rootPath) {
  const root = path8.resolve(rootPath || process.cwd());
  let framework = null, verifyCommand = null, hasTests = false;
  const candidateDirs = [root];
  const parent = path8.dirname(root);
  if (parent && parent !== root) candidateDirs.push(parent);
  for (const dir of candidateDirs) {
    const pkgPath = path8.join(dir, "package.json");
    if (fs8.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs8.readFileSync(pkgPath, "utf8"));
        const testScript = pkg.scripts?.test;
        if (testScript && !/no test specified/i.test(testScript)) {
          hasTests = true;
          if (!verifyCommand) verifyCommand = "npm test";
          if (/vitest/i.test(testScript)) framework ??= "vitest";
          else if (/jest/i.test(testScript)) framework ??= "jest";
          else if (/node\s+(?:--test|scripts\/run-tests|scripts\/test)|node:test/i.test(testScript)) framework ??= "node:test";
          else if (/mocha/i.test(testScript)) framework ??= "mocha";
          else if (/playwright/i.test(testScript)) framework ??= "playwright";
        }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (!framework) {
          framework = deps.vitest ? "vitest" : deps.jest ? "jest" : deps.mocha ? "mocha" : deps["@playwright/test"] ? "playwright" : null;
        }
        if (deps.vitest || deps.jest || deps.mocha || deps["@playwright/test"]) hasTests = true;
      } catch {
      }
    }
    for (const cfg of TEST_CONFIG_MAP) {
      if (fs8.existsSync(path8.join(dir, cfg.file))) {
        if (!framework) framework = cfg.fw;
        if (!verifyCommand && cfg.cmd) verifyCommand = cfg.cmd;
        hasTests = true;
      }
    }
    const pyprojectPath = path8.join(dir, "pyproject.toml");
    if (fs8.existsSync(pyprojectPath)) {
      try {
        const content = fs8.readFileSync(pyprojectPath, "utf8");
        if (/tool\.pytest|pytest/i.test(content)) {
          if (!framework) framework = "pytest";
          if (!verifyCommand) verifyCommand = "pytest";
          hasTests = true;
        }
      } catch {
      }
    }
    for (const folder of ["test", "tests", "__tests__", "spec", "specs"]) {
      const p = path8.join(dir, folder);
      if (fs8.existsSync(p) && fs8.readdirSync(p).length > 0) hasTests = true;
    }
    if (framework && hasTests) break;
  }
  if (framework && !verifyCommand) verifyCommand = VERIFY_COMMAND_FALLBACKS[framework] || null;
  return { detected: Boolean(hasTests || framework), framework: framework || null, verifyCommand: verifyCommand || null, hasTests };
}
function computeHealthScore(params = {}) {
  const { totalFilesScanned = 0, locViolations = [], suppressions = [], todos = [], tests = { detected: false, hasTests: false }, rules = {} } = params;
  if (!totalFilesScanned || totalFilesScanned <= 0) return 100;
  const locActive = rules.loc !== false;
  const suppressionsActive = rules.suppressions !== false;
  const debtMarkersActive = rules.debtMarkers !== false;
  const testRunnerActive = rules.testRunner !== false;
  let score = 100;
  if (locActive) {
    const errorCount = locViolations.filter((v) => v.status === "error").length;
    const warnCount = locViolations.filter((v) => v.status === "warning").length;
    score -= Math.min(40, errorCount * 10);
    score -= Math.min(15, warnCount * 3);
  }
  if (suppressionsActive) {
    score -= Math.min(25, suppressions.length * 5);
  }
  if (debtMarkersActive) {
    let todoPenalty = 0;
    for (const item of todos) {
      if (item.type === "BUG" || item.type === "FIXME") todoPenalty += 3;
      else if (item.type === "HACK" || item.type === "XXX") todoPenalty += 2;
      else todoPenalty += 1;
    }
    score -= Math.min(15, todoPenalty);
  }
  if (testRunnerActive && !tests.detected && !tests.hasTests) {
    score -= 15;
  }
  if (Number.isNaN(score) || !Number.isFinite(score)) return 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}
function createEmptyReport(maxLines = DEFAULT_MAX_LINES, warnLines = DEFAULT_WARN_LINES, rules = {}) {
  return {
    score: 100,
    stack: [],
    summary: { totalFilesScanned: 0, locViolationsCount: 0, suppressionsCount: 0, todosCount: 0, testFramework: null, verifyCommand: null, stack: null },
    rules,
    loc: { maxLines, warnLines, violations: [] },
    quality: { suppressions: [] },
    todos: [],
    tests: { detected: false, framework: null, verifyCommand: null, hasTests: false }
  };
}
async function scanCodebase(targetPath, options = {}) {
  const root = path8.resolve(targetPath || options.cwd || options.root || process.cwd());
  let auditConfig = {};
  try {
    const parentDir = path8.dirname(root);
    const configCandidates = [path8.join(root, ".gripm", "config.json"), path8.join(root, ".devboard", "config.json")];
    if (parentDir && parentDir !== root) {
      configCandidates.push(path8.join(parentDir, ".gripm", "config.json"), path8.join(parentDir, ".devboard", "config.json"));
    }
    const configPath = configCandidates.find((p) => fs8.existsSync(p));
    if (configPath) {
      const parsed = JSON.parse(fs8.readFileSync(configPath, "utf8"));
      if (parsed?.audit && typeof parsed.audit === "object") auditConfig = parsed.audit;
    }
  } catch {
  }
  const rules = {
    loc: options.rules?.loc ?? auditConfig.rules?.loc ?? true,
    suppressions: options.rules?.suppressions ?? auditConfig.rules?.suppressions ?? true,
    debtMarkers: options.rules?.debtMarkers ?? auditConfig.rules?.debtMarkers ?? true,
    consoleLog: options.rules?.consoleLog ?? auditConfig.rules?.consoleLog ?? options.includeConsoleLog ?? auditConfig.includeConsoleLog ?? false,
    testRunner: options.rules?.testRunner ?? auditConfig.rules?.testRunner ?? true
  };
  const maxLines = Number(options.thresholds?.maxLines ?? options.maxLines ?? options.max ?? auditConfig.thresholds?.maxLines ?? auditConfig.maxLines ?? DEFAULT_MAX_LINES);
  const warnLines = Number(options.thresholds?.warnLines ?? options.warnLines ?? options.warn ?? auditConfig.thresholds?.warnLines ?? auditConfig.warnLines ?? DEFAULT_WARN_LINES);
  const customExts = options.extensions ? new Set(options.extensions) : DEFAULT_EXTENSIONS;
  const customIgnoredDirs = options.ignoredDirs ? new Set(options.ignoredDirs) : DEFAULT_IGNORED_DIRS;
  if (!fs8.existsSync(root)) return createEmptyReport(maxLines, warnLines, rules);
  const stat = fs8.statSync(root);
  const gitignoreRules = parseIgnoreFile(path8.join(root, ".gitignore"));
  const locignorePath = [
    path8.join(root, ".gripm", "locignore"),
    path8.join(root, ".gripm", ".locignore"),
    path8.join(root, ".locignore")
  ].find((p) => fs8.existsSync(p)) || path8.join(root, ".locignore");
  const locignoreRules = parseIgnoreFile(locignorePath);
  const configExcludes = Array.isArray(auditConfig.exclude) ? auditConfig.exclude : auditConfig.exclude ? [auditConfig.exclude] : [];
  const optExcludes = Array.isArray(options.exclude) ? options.exclude : options.exclude ? [options.exclude] : [];
  const extraExcludes = parseIgnoreLines([...configExcludes, ...optExcludes]);
  const combinedRules = [...gitignoreRules, ...locignoreRules, ...extraExcludes];
  const locViolations = [], suppressions = [], todos = [];
  let totalFilesScanned = 0;
  function scanSingleFile(filePath, relPath) {
    totalFilesScanned++;
    let content = "";
    try {
      content = fs8.readFileSync(filePath, "utf8");
    } catch {
      return;
    }
    const normRel = relPath.replace(/\\/g, "/");
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const lineCount = lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
    if (rules.loc) {
      if (lineCount >= maxLines) locViolations.push({ file: normRel, lines: lineCount, status: "error" });
      else if (lineCount >= warnLines) locViolations.push({ file: normRel, lines: lineCount, status: "warning" });
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], lineNum = i + 1, trimmed = line.trim();
      if (!trimmed) continue;
      if (rules.suppressions) {
        if (ANTI_SLOP_PATTERNS.tsIgnore.test(line)) {
          suppressions.push({ file: normRel, line: lineNum, type: "@ts-ignore", snippet: trimmed });
        } else if (ANTI_SLOP_PATTERNS.tsNocheck.test(line)) {
          suppressions.push({ file: normRel, line: lineNum, type: "@ts-nocheck", snippet: trimmed });
        } else if (ANTI_SLOP_PATTERNS.eslintDisable.test(line)) {
          suppressions.push({ file: normRel, line: lineNum, type: "eslint-disable", snippet: trimmed });
        } else if (rules.consoleLog && ANTI_SLOP_PATTERNS.consoleLog.test(line)) {
          suppressions.push({ file: normRel, line: lineNum, type: "console.log", snippet: trimmed });
        }
      }
      if (rules.debtMarkers) {
        const todoMatch = line.match(TODO_RE);
        if (todoMatch) {
          const type = (todoMatch[1] || todoMatch[2]).toUpperCase();
          const text = (todoMatch[3] || todoMatch[4] || "").replace(/\*\/$/, "").trim();
          todos.push({
            id: `${normRel}:${lineNum}`,
            file: normRel,
            line: lineNum,
            type,
            text,
            snippet: trimmed
          });
        }
      }
    }
  }
  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs8.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path8.join(currentDir, entry.name);
      const rel = path8.relative(root, full);
      if (entry.isDirectory()) {
        if (!isIgnored(rel, true, combinedRules, customIgnoredDirs)) walk(full);
      } else if (entry.isFile()) {
        const ext = path8.extname(entry.name).toLowerCase();
        if (customExts.has(ext) && !isIgnored(rel, false, combinedRules, customIgnoredDirs)) scanSingleFile(full, rel);
      }
    }
  }
  if (stat.isFile()) {
    if (customExts.has(path8.extname(root).toLowerCase())) scanSingleFile(root, path8.basename(root));
  } else if (stat.isDirectory()) {
    walk(root);
  }
  locViolations.sort((a, b) => b.lines - a.lines);
  const targetDir = stat.isDirectory() ? root : path8.dirname(root);
  const tests = rules.testRunner !== false ? detectTests(targetDir) : { detected: false, framework: null, verifyCommand: null, hasTests: false };
  const stack = detectStack(targetDir);
  const score = computeHealthScore({ totalFilesScanned, locViolations, suppressions, todos, tests, rules });
  return {
    score,
    stack,
    summary: {
      totalFilesScanned,
      locViolationsCount: locViolations.length,
      suppressionsCount: suppressions.length,
      todosCount: todos.length,
      testFramework: tests.framework,
      verifyCommand: tests.verifyCommand,
      stack: stack.join(", ") || null
    },
    rules,
    loc: { maxLines, warnLines, violations: locViolations },
    quality: { suppressions },
    todos,
    tests
  };
}
function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, "");
}
function makeBoxLine(label, value = "", width = 68) {
  const innerWidth = width - 4;
  const spaces = Math.max(1, innerWidth - (stripAnsi(label).length + stripAnsi(value).length));
  return `  \u2502 ${label}${" ".repeat(spaces)}${value} \u2502`;
}
async function runCli2(argv = process.argv.slice(2)) {
  if (Array.isArray(argv) && argv[0] === "audit") argv = argv.slice(1);
  let targetPath = null, maxLines = null, warnLines = null;
  let formatJson = false, isStrict = false, isQuiet = false;
  const excludes = [];
  const rules = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--max" || arg === "--max-lines") maxLines = parseInt(argv[++i], 10);
    else if (arg === "--warn" || arg === "--warn-lines") warnLines = parseInt(argv[++i], 10);
    else if (arg === "--path" || arg === "--src" || arg === "--root" || arg === "--cwd" || arg === "--repo" || arg === "-r") targetPath = argv[++i];
    else if (arg.startsWith("--root=") || arg.startsWith("--cwd=") || arg.startsWith("--path=") || arg.startsWith("--repo=")) targetPath = arg.split("=")[1];
    else if (arg === "--exclude") excludes.push(argv[++i]);
    else if (arg === "--no-loc") rules.loc = false;
    else if (arg === "--no-suppressions" || arg === "--no-slop") rules.suppressions = false;
    else if (arg === "--no-todos" || arg === "--no-debt") rules.debtMarkers = false;
    else if (arg === "--no-tests") rules.testRunner = false;
    else if (arg === "--console-log") rules.consoleLog = true;
    else if (arg === "--json" || arg === "--format=json" || arg === "--format" && argv[++i] === "json") formatJson = true;
    else if (arg === "--strict") isStrict = true;
    else if (arg === "--quiet" || arg === "-q") isQuiet = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: gripm audit [options] [path]
       node scripts/audit-engine.mjs [options] [path]

Options:
  --format json, --json    Output results strictly as structured JSON
  --strict                 Exit code 1 if critical violations (>= 1000 LOC or suppressions) exist
  --quiet, -q              Minimal one-line summary output
  --repo, -r <dir>         Directory to scan (default: current directory)
  --max, --max-lines <n>   Ceiling lines limit (default: ${DEFAULT_MAX_LINES})
  --warn, --warn-lines <n> Soft warning threshold (default: ${DEFAULT_WARN_LINES})
  --exclude <pattern>      Exclude pattern (repeatable)
  --no-loc                 Disable LOC modularity budget checks
  --no-suppressions        Disable anti-slop suppression checks
  --no-todos               Disable TODO and hidden debt checks
  --no-tests               Disable test runner check
  --console-log            Enable console.log suppression check
  --help, -h               Show this help message
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) targetPath = arg;
  }
  const scanOptions = { exclude: excludes };
  if (maxLines !== null) scanOptions.maxLines = maxLines;
  if (warnLines !== null) scanOptions.warnLines = warnLines;
  if (Object.keys(rules).length > 0) scanOptions.rules = rules;
  const report = await scanCodebase(targetPath, scanOptions);
  const resolvedMax = report.loc.maxLines || DEFAULT_MAX_LINES;
  const criticalLocViolations = report.loc.violations.filter((v) => v.status === "error" || v.lines >= resolvedMax);
  const criticalSuppressions = report.quality.suppressions;
  const hasCriticalViolations = criticalLocViolations.length > 0 || criticalSuppressions.length > 0;
  if (formatJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(isStrict && hasCriticalViolations ? 1 : 0);
  }
  if (isQuiet) {
    const statusTag = hasCriticalViolations ? "FAIL" : "PASS";
    console.log(`gripm audit: Health Score ${report.score}/100 - ${report.summary.totalFilesScanned} files - ${report.summary.locViolationsCount} LOC issues (${criticalLocViolations.length} critical) - ${criticalSuppressions.length} suppressions - ${report.summary.todosCount} TODOs [${statusTag}]`);
    process.exit(isStrict && hasCriticalViolations ? 1 : 0);
  }
  const scoreText = report.score >= 80 ? c2.green(report.score + "/100") : report.score >= 50 ? c2.yellow(report.score + "/100") : c2.red(report.score + "/100");
  const runnerText = report.summary.testFramework ? `${report.summary.testFramework} (verify: ${report.summary.verifyCommand || "npm test"})` : c2.dim("None detected");
  const locDetail = `${report.summary.locViolationsCount} (${criticalLocViolations.length} critical >= ${resolvedMax} LOC)`;
  const stackText = report.summary.stack ? report.summary.stack : c2.dim("Not detected");
  console.log("\n  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log(makeBoxLine(`${c2.bold("gripm")} ${c2.dim("\xB7")} Static Codebase Health Audit`, ""));
  console.log("  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
  console.log(makeBoxLine("Health Score:", scoreText));
  console.log(makeBoxLine("Files Scanned:", `${report.summary.totalFilesScanned} files`));
  console.log(makeBoxLine("Stack:", stackText));
  console.log(makeBoxLine("Test Runner:", runnerText));
  console.log(makeBoxLine("LOC Issues:", locDetail));
  console.log(makeBoxLine("Suppressions:", String(criticalSuppressions.length)));
  console.log(makeBoxLine("TODO / Debt:", `${report.summary.todosCount} markers`));
  const disabledRuleNames = [];
  if (report.rules?.loc === false) disabledRuleNames.push("loc: off");
  if (report.rules?.suppressions === false) disabledRuleNames.push("suppressions: off");
  if (report.rules?.debtMarkers === false) disabledRuleNames.push("todos: off");
  if (report.rules?.testRunner === false) disabledRuleNames.push("tests: off");
  if (report.rules?.consoleLog) disabledRuleNames.push("console.log: on");
  const rulesDisplay = disabledRuleNames.length > 0 ? disabledRuleNames.join(", ") : "Standard (all active)";
  console.log(makeBoxLine("Active Rules:", rulesDisplay));
  console.log("  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n");
  if (report.loc.violations.length > 0) {
    console.log(`  ${c2.yellow("\u25B2 LOC Violations & Warnings:")}`);
    for (const v of report.loc.violations) {
      const color = v.status === "error" ? c2.red : c2.yellow;
      console.log(`    ${color(v.status.padEnd(8))} ${v.file.padEnd(52)} ${c2.bold(v.lines)} LOC`);
    }
    console.log("");
  }
  if (report.quality.suppressions.length > 0) {
    console.log(`  ${c2.yellow("\u25B2 Quality Suppressions:")}`);
    for (const s of report.quality.suppressions) {
      console.log(`    ${c2.yellow(s.type.padEnd(16))} ${s.file}:${s.line} - ${c2.dim(s.snippet)}`);
    }
    console.log("");
  }
  if (report.todos.length > 0) {
    console.log(`  ${c2.dim("\u2139 Hidden Debt & Notes:")}`);
    for (const t of report.todos.slice(0, 10)) {
      console.log(`    ${c2.cyan(t.type.padEnd(8))} ${t.file}:${t.line} - ${t.text}`);
    }
    if (report.todos.length > 10) console.log(`    ${c2.dim(`... and ${report.todos.length - 10} more`)}`);
    console.log("");
  }
  if (isStrict && hasCriticalViolations) {
    console.error(`  ${c2.red("\u2716 Strict audit failed:")} ${criticalLocViolations.length} critical LOC violation(s) (>= ${resolvedMax} lines) and ${criticalSuppressions.length} suppression(s) detected.
`);
    process.exit(1);
  }
  process.exit(0);
}
var __filename6, COMMENT_PREFIX, TODO_RE, ANTI_SLOP_PATTERNS, TS_IGNORE_RE, TS_NOCHECK_RE, ESLINT_DISABLE_RE, CONSOLE_LOG_RE, TEST_CONFIG_MAP, VERIFY_COMMAND_FALLBACKS, isColorSupported2, c2, entryBase, isCli;
var init_audit_engine = __esm({
  "node_modules/@gripm/playbook/scripts/audit-engine.mjs"() {
    init_check_loc();
    __filename6 = fileURLToPath6(import.meta.url);
    COMMENT_PREFIX = "(?:\\/\\/|#|\\/\\*+|\\*)\\s*";
    TODO_RE = /(?:\/\/|#|\/\*+|\*)\s*(?:(TODO|FIXME|HACK|BUG|XXX)(?:(?:\([^)]*\))?[:\-]|(?!\s+(?:el|la|los|las|un|una|este|esta|ese|esa|del|al)\b)\s+|$)|(todo|fixme|hack|bug|xxx)(?:\([^)]*\))?[:\-])\s*(.*?)(?:\*\/|$)/;
    ANTI_SLOP_PATTERNS = {
      tsIgnore: new RegExp(COMMENT_PREFIX + "@ts-ignore\\b"),
      tsNocheck: new RegExp(COMMENT_PREFIX + "@ts-nocheck\\b"),
      eslintDisable: new RegExp(COMMENT_PREFIX + "eslint-disable(?:-next-line|-line)?\\b"),
      consoleLog: new RegExp("\\bconsole\\.log\\s*\\(")
    };
    TS_IGNORE_RE = ANTI_SLOP_PATTERNS.tsIgnore;
    TS_NOCHECK_RE = ANTI_SLOP_PATTERNS.tsNocheck;
    ESLINT_DISABLE_RE = ANTI_SLOP_PATTERNS.eslintDisable;
    CONSOLE_LOG_RE = ANTI_SLOP_PATTERNS.consoleLog;
    TEST_CONFIG_MAP = [
      { file: "vitest.config.ts", fw: "vitest" },
      { file: "vitest.config.js", fw: "vitest" },
      { file: "vitest.config.mjs", fw: "vitest" },
      { file: "vitest.workspace.ts", fw: "vitest" },
      { file: "jest.config.ts", fw: "jest" },
      { file: "jest.config.js", fw: "jest" },
      { file: "jest.config.mjs", fw: "jest" },
      { file: "jest.config.json", fw: "jest" },
      { file: "pytest.ini", fw: "pytest", cmd: "pytest" },
      { file: "conftest.py", fw: "pytest", cmd: "pytest" },
      { file: "Cargo.toml", fw: "cargo", cmd: "cargo test" },
      { file: "go.mod", fw: "go", cmd: "go test ./..." }
    ];
    VERIFY_COMMAND_FALLBACKS = {
      vitest: "npx vitest run",
      jest: "npx jest",
      "node:test": "node --test",
      pytest: "pytest",
      cargo: "cargo test",
      go: "go test ./..."
    };
    isColorSupported2 = !("NO_COLOR" in process.env) && (process.env.FORCE_COLOR === "1" || process.stdout?.isTTY && process.env.TERM !== "dumb");
    c2 = {
      bold: (s) => isColorSupported2 ? `\x1B[1m${s}\x1B[22m` : s,
      dim: (s) => isColorSupported2 ? `\x1B[2m${s}\x1B[22m` : s,
      green: (s) => isColorSupported2 ? `\x1B[32m${s}\x1B[39m` : s,
      yellow: (s) => isColorSupported2 ? `\x1B[33m${s}\x1B[39m` : s,
      red: (s) => isColorSupported2 ? `\x1B[31m${s}\x1B[39m` : s,
      cyan: (s) => isColorSupported2 ? `\x1B[36m${s}\x1B[39m` : s
    };
    entryBase = process.argv[1] ? path8.basename(process.argv[1]).replace(/\.[cm]?js$/, "") : "";
    isCli = process.argv[1] && (entryBase === "audit-repo" || entryBase === "audit-engine" || path8.resolve(process.argv[1]) === __filename6 && entryBase.includes("audit-engine"));
    if (isCli) {
      runCli2();
    }
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

// scripts/backlogMdSections.ts
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
var init_backlogMdSections = __esm({
  "scripts/backlogMdSections.ts"() {
    "use strict";
  }
});

// scripts/backlogMdSerializer.ts
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
  if (task.targetSprint) {
    frontmatterLines.push(`target_sprint: ${JSON.stringify(task.targetSprint)}`);
  } else if (task.sprint) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }
  if (task.estimate !== void 0 && task.estimate !== null && task.estimate !== "") {
    if (typeof task.estimate === "number") {
      frontmatterLines.push(`estimate: ${task.estimate}`);
    } else {
      const cleanEst = String(task.estimate).replace(/[\r\n]+/g, "").trim();
      if (!isNaN(Number(cleanEst))) {
        frontmatterLines.push(`estimate: ${Number(cleanEst)}`);
      } else {
        frontmatterLines.push(`estimate: ${JSON.stringify(cleanEst)}`);
      }
    }
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
  if (task.module) frontmatterLines.push(`module: ${JSON.stringify(task.module)}`);
  if (task.epic) frontmatterLines.push(`epic: ${JSON.stringify(task.epic)}`);
  if (task.category) frontmatterLines.push(`category: ${JSON.stringify(task.category)}`);
  if (task.impactedFile) frontmatterLines.push(`impacted_file: ${JSON.stringify(task.impactedFile)}`);
  if (task.risk) frontmatterLines.push(`risk: ${JSON.stringify(task.risk)}`);
  if (task.fix) frontmatterLines.push(`fix: ${JSON.stringify(task.fix)}`);
  if (task.rawStatus) frontmatterLines.push(`raw_status: ${JSON.stringify(task.rawStatus)}`);
  if (task.previousStatus && !task.isDeleted) frontmatterLines.push(`previous_status: ${JSON.stringify(task.previousStatus)}`);
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
var init_backlogMdSerializer = __esm({
  "scripts/backlogMdSerializer.ts"() {
    "use strict";
    init_backlogMdSections();
  }
});

// scripts/backlogMdParser.ts
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
var init_backlogMdParser = __esm({
  "scripts/backlogMdParser.ts"() {
    "use strict";
    init_backlogMdSections();
    init_backlogMdSerializer();
    init_backlogMdSections();
  }
});

// server/services/atomicWrite.ts
import fs11 from "node:fs";
import path11 from "node:path";
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
  const resolvedPath = path11.resolve(filePath);
  const dir = path11.dirname(resolvedPath);
  if (!fs11.existsSync(dir)) {
    fs11.mkdirSync(dir, { recursive: true });
  }
  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd;
  let renamed = false;
  try {
    fd = fs11.openSync(tempPath, "w", mode);
    if (typeof content === "string") {
      fs11.writeFileSync(fd, content, { encoding });
    } else {
      fs11.writeFileSync(fd, content);
    }
    fs11.fsyncSync(fd);
    fs11.closeSync(fd);
    fd = void 0;
    let attempts = 0;
    while (!renamed) {
      try {
        fs11.renameSync(tempPath, resolvedPath);
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
        fs11.closeSync(fd);
      } catch {
      }
    }
    if (!renamed && fs11.existsSync(tempPath)) {
      try {
        fs11.unlinkSync(tempPath);
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
  PKG_ROOT: () => PKG_ROOT4,
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
import fs12 from "node:fs";
import path12 from "node:path";
import { fileURLToPath as fileURLToPath8 } from "node:url";
function findPackageRoot3(startDir) {
  let curr = startDir;
  while (curr && curr !== path12.dirname(curr)) {
    const pkgPath = path12.join(curr, "package.json");
    if (fs12.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs12.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "@gripm/board" || pkg.name === "gripm") {
          return curr;
        }
      } catch {
      }
    }
    curr = path12.dirname(curr);
  }
  return fs12.existsSync(path12.resolve(startDir, "../package.json")) ? path12.resolve(startDir, "..") : path12.resolve(startDir, "../../");
}
function detectProjectStorage(repoPath) {
  if (!repoPath) return { storageType: "json", backlogDir: "backlog" };
  const normalized = path12.normalize(repoPath.trim());
  try {
    if (fs12.existsSync(path12.join(normalized, "backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs12.existsSync(path12.join(normalized, ".backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
    if (fs12.existsSync(path12.join(normalized, "backlog"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs12.existsSync(path12.join(normalized, ".backlog"))) {
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
  return path12.join(project.repoPath || "", dir, "tasks");
}
function getProjectDocsPath(project) {
  if (project.docsPath && fs12.existsSync(project.docsPath)) {
    return project.docsPath;
  }
  if (project.repoPath) {
    const defaultDocs = path12.join(project.repoPath, "docs");
    if (fs12.existsSync(defaultDocs)) {
      try {
        const files = fs12.readdirSync(defaultDocs);
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
  let reg = loadRegistryFile(PKG_ROOT4);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: "", projects: [] };
  }
  const cwd = process.cwd();
  const hasLocalGripm = fs12.existsSync(path12.join(cwd, ".gripm")) || fs12.existsSync(path12.join(cwd, "backlog"));
  if (hasLocalGripm) {
    const cwdResolved = path12.resolve(cwd);
    const existingLocal = reg.projects.find((p) => p.repoPath && path12.resolve(p.repoPath) === cwdResolved);
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
    if (p.repoPath && !fs12.existsSync(p.repoPath)) return false;
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
  saveRegistryFile(sanitized, PKG_ROOT4);
}
function getProjectBacklogPath(project) {
  if (project.isDemo) {
    return DEMO_FILE;
  }
  if (project.repoPath) {
    return path12.join(project.repoPath, ".gripm/backlog.json");
  }
  return path12.resolve(PKG_ROOT4, `data/${project.id}-backlog.json`);
}
function getConfigFilepath(project) {
  const repo = project?.repoPath || process.cwd();
  return path12.join(repo, ".gripm/config.json");
}
function readProjectConfig(project) {
  if (project?.isDemo || project?.id === "demo") {
    return { ...DEFAULT_CONFIG };
  }
  const configFile = getConfigFilepath(project);
  try {
    if (fs12.existsSync(configFile)) {
      const raw = fs12.readFileSync(configFile, "utf8");
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
  const configFile = path12.join(repo, ".gripm/config.json");
  const dir = path12.dirname(configFile);
  if (!fs12.existsSync(dir)) {
    fs12.mkdirSync(dir, { recursive: true });
  }
  const toSave = { ...config };
  delete toSave._filepath;
  atomicWriteFileSync2(configFile, JSON.stringify(toSave, null, 2), "utf8");
  return configFile;
}
var __filename8, __dirname6, PKG_ROOT4, DEMO_FILE, DEFAULT_CONFIG;
var init_registry = __esm({
  "server/services/registry.ts"() {
    "use strict";
    init_registryConfig();
    init_atomicWrite();
    __filename8 = fileURLToPath8(import.meta.url);
    __dirname6 = path12.dirname(__filename8);
    PKG_ROOT4 = findPackageRoot3(__dirname6);
    DEMO_FILE = fs12.existsSync(path12.resolve(PKG_ROOT4, "data/demo-backlog.json")) ? path12.resolve(PKG_ROOT4, "data/demo-backlog.json") : path12.resolve(PKG_ROOT4, "src/data/demo-backlog.json");
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

// server/utils/fs-lock.ts
import fs13 from "node:fs";
import path13 from "node:path";
function getLockFilePath(targetPath) {
  const resolved = path13.resolve(targetPath);
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
    const stat = fs13.statSync(lockFilePath);
    const age = Date.now() - stat.mtimeMs;
    let isStale = age > staleTimeoutMs;
    if (!isStale) {
      try {
        const content = fs13.readFileSync(lockFilePath, "utf8");
        const payload = JSON.parse(content);
        if (typeof payload.expiresAt === "number" && Date.now() > payload.expiresAt) {
          isStale = true;
        }
      } catch {
      }
    }
    if (isStale) {
      try {
        fs13.unlinkSync(lockFilePath);
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
  const dir = path13.dirname(lockFilePath);
  if (!fs13.existsSync(dir)) {
    fs13.mkdirSync(dir, { recursive: true });
  }
  const startTime = Date.now();
  let currentDelay = minDelay;
  while (true) {
    try {
      const fd = fs13.openSync(lockFilePath, "wx");
      const payload = {
        pid: process.pid,
        createdAt: Date.now(),
        expiresAt: Date.now() + staleTimeoutMs,
        metadata: options?.metadata
      };
      try {
        fs13.writeFileSync(fd, JSON.stringify(payload), "utf8");
      } finally {
        try {
          fs13.closeSync(fd);
        } catch {
        }
      }
      return {
        lockPath: lockFilePath,
        targetPath: path13.resolve(targetPath),
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
    if (fs13.existsSync(lockFilePath)) {
      fs13.unlinkSync(lockFilePath);
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

// server/services/taskCache.ts
import path14 from "node:path";
function getTaskCacheEntry(filePath) {
  return taskCache.get(filePath);
}
function setTaskCacheEntry(filePath, entry) {
  taskCache.set(filePath, entry);
}
function recordCacheHit() {
  cacheHits++;
}
function recordCacheMiss() {
  cacheMisses++;
}
function invalidateTaskCache(filePath) {
  if (filePath) {
    taskCache.delete(filePath);
  } else {
    taskCache.clear();
  }
}
function clearTaskCache() {
  taskCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}
function getTaskCacheStats() {
  return {
    size: taskCache.size,
    hits: cacheHits,
    misses: cacheMisses
  };
}
function pruneStaleCacheEntries(tasksDir, activeFilePaths) {
  const normalizedDir = path14.resolve(tasksDir);
  for (const cachedPath of taskCache.keys()) {
    if (path14.dirname(path14.resolve(cachedPath)) === normalizedDir && !activeFilePaths.has(cachedPath)) {
      taskCache.delete(cachedPath);
    }
  }
}
var taskCache, cacheHits, cacheMisses;
var init_taskCache = __esm({
  "server/services/taskCache.ts"() {
    "use strict";
    taskCache = /* @__PURE__ */ new Map();
    cacheHits = 0;
    cacheMisses = 0;
  }
});

// server/services/backlog/gatekeeperSecurity.ts
import fs14 from "node:fs";
import path15 from "node:path";
import { execSync } from "node:child_process";
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
    const pkgPath = path15.join(repoPath, "package.json");
    if (fs14.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs14.readFileSync(pkgPath, "utf8"));
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
function getModifiedFiles(repoPath) {
  try {
    const out = execSync("git status --porcelain -z", {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024
    });
    const items = out.split("\0").filter(Boolean);
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.startsWith("R ") || item.startsWith("RM") || item.startsWith("RD") || item.startsWith("C ") || item.startsWith("CM")) {
        files.push(item.slice(3).trim().replace(/\\/g, "/"));
        i++;
      } else if (item.length > 3) {
        files.push(item.slice(3).trim().replace(/\\/g, "/"));
      }
    }
    return files;
  } catch {
    try {
      let walk2 = function(dir) {
        const entries = fs14.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
          const full = path15.join(dir, entry.name);
          if (entry.isDirectory()) walk2(full);
          else if (entry.isFile()) files.push(path15.relative(repoPath, full));
        }
      };
      var walk = walk2;
      const files = [];
      walk2(repoPath);
      return files;
    } catch {
      return [];
    }
  }
}
function validateGatekeeperTransition(task, targetStatus, options, repoPath) {
  const normTarget = normalizeStatus(targetStatus);
  const isTransitionToTerminal = normTarget === "ready" || normTarget === "done";
  const result = {};
  if (normTarget === "ready") {
    const execCwd = repoPath || process.cwd();
    let enforceLocCeiling = false;
    let auditMaxLines = DEFAULT_MAX_LINES;
    let auditExcluded = [];
    try {
      const configPath = path15.join(execCwd, ".gripm", "config.json");
      if (fs14.existsSync(configPath)) {
        const cfg = JSON.parse(fs14.readFileSync(configPath, "utf8"));
        if (cfg?.guardrails?.enforceLocCeiling === true) {
          enforceLocCeiling = true;
        }
        if (cfg?.audit?.rules?.loc === false) {
          enforceLocCeiling = false;
        }
        if (cfg?.audit?.thresholds?.maxLines || cfg?.audit?.maxLines) {
          auditMaxLines = Number(cfg.audit.thresholds?.maxLines || cfg.audit.maxLines);
        }
        if (Array.isArray(cfg?.audit?.exclude)) {
          auditExcluded = cfg.audit.exclude;
        }
      }
    } catch {
    }
    if (enforceLocCeiling) {
      const gitignoreRules = parseIgnoreFile(path15.join(execCwd, ".gitignore"));
      const locignoreRules = parseIgnoreFile(path15.join(execCwd, ".locignore"));
      const gripmLocignore = parseIgnoreFile(path15.join(execCwd, ".gripm", "locignore"));
      const extraExcludes = parseIgnoreLines(auditExcluded);
      const combinedRules = [...gitignoreRules, ...locignoreRules, ...gripmLocignore, ...extraExcludes];
      const modified = getModifiedFiles(execCwd);
      const violations = [];
      for (const relFile of modified) {
        const fullPath = path15.join(execCwd, relFile);
        if (!fs14.existsSync(fullPath)) continue;
        try {
          const stat = fs14.statSync(fullPath);
          if (!stat.isFile()) continue;
        } catch {
          continue;
        }
        const ext = path15.extname(relFile).toLowerCase();
        if (!DEFAULT_EXTENSIONS.has(ext)) continue;
        if (isIgnored(relFile, false, combinedRules, DEFAULT_IGNORED_DIRS)) continue;
        const lines = countFileLines(fullPath);
        if (lines > auditMaxLines) {
          violations.push({ file: relFile.replace(/\\/g, "/"), lines });
        }
      }
      if (violations.length > 0) {
        result.locViolations = violations;
        if (!options?.force) {
          const taskId = task.code || task.id || "unknown";
          const violationsList = violations.map((v) => ` - ${v.file} (${v.lines} lines > ${auditMaxLines} ceiling)`).join("\n");
          throw new Error(
            `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because architectural guardrails are active (guardrails.enforceLocCeiling: true) and ${violations.length} modified file(s) exceed the ${auditMaxLines} LOC ceiling:
${violationsList}

Corrective action: Refactor and modularize large files to be under ${auditMaxLines} lines of code, or specify 'force: true' if explicitly authorized by the Product Owner.`
          );
        }
      }
    }
  }
  if (!options?.force && isTransitionToTerminal) {
    const acs = task.acceptanceCriteriaList || task.acceptanceCriteria || [];
    const unchecked = acs.filter((ac) => !ac.checked);
    if (unchecked.length > 0) {
      const taskId = task.code || task.id || "unknown";
      const uncheckedList = unchecked.map((ac) => ` - [ ] #${ac.index} ${ac.text}`).join("\n");
      throw new Error(
        `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because it has ${unchecked.length} uncompleted acceptance criteria:
${uncheckedList}

Corrective action: Complete the implementation of each pending criterion and mark it as completed (- [x]) before certifying the task as '${normTarget}'.`
      );
    }
    const verifyCmd = options?.verifyCommand;
    if (verifyCmd && typeof verifyCmd === "string") {
      const execCwd = repoPath || process.cwd();
      const validation = validateVerifyCommand(verifyCmd, execCwd);
      if (!validation.valid) {
        throw new Error(
          `[MCP Gatekeeper Security] Transition rejected: Verification command '${verifyCmd}' is not permitted when attempting to move '${task.code || task.id}' to '${normTarget}':
${validation.reason}

Corrective action: Use only scripts defined in package.json (e.g. 'npm test', 'npm run <script>') or authorized tools ('npx tsc --noEmit').`
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
          `[MCP Gatekeeper] Transition rejected: Verification command '${verifyCmd}' failed when attempting to move '${task.code || task.id}' to '${normTarget}':
${outMsg}

Corrective action: Check the verification script errors, fix the issues, and retry certifying the task.`
        );
      }
    }
  }
  return result;
}
var init_gatekeeperSecurity = __esm({
  "server/services/backlog/gatekeeperSecurity.ts"() {
    "use strict";
    init_backlogMdParser();
    init_check_loc();
  }
});

// server/services/backlog/backlogCycles.ts
import fs15 from "node:fs";
import path16 from "node:path";
function resolveJsonBacklogPath(project) {
  if (project.isDemo) return DEMO_FILE2;
  if (project.repoPath) {
    return path16.join(project.repoPath, ".gripm/backlog.json");
  }
  return path16.join(PKG_ROOT4, `data/${project.id}-backlog.json`);
}
function getProjectTasksDir(project) {
  if (!project.repoPath) return "";
  return path16.join(project.repoPath, project.backlogDir || "backlog", "tasks");
}
function getProjectSprintsPath(project) {
  if (!project.repoPath) return "";
  return path16.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
}
function getProjectReleasesPath(project) {
  if (!project.repoPath) return "";
  return path16.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
}
function getProjectRetrospectivesPath(project) {
  if (!project.repoPath) return "";
  return path16.join(project.repoPath, project.backlogDir || "backlog", "retrospectives.json");
}
function getProjectTaskAllocationLockPath(project) {
  if (project.repoPath) {
    const baseDir = path16.join(project.repoPath, project.backlogDir || "backlog");
    return path16.join(baseDir, ".task-allocation.lock");
  }
  return path16.join(PKG_ROOT4, `data/.${project.id}-task-allocation.lock`);
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
  if (fs15.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs15.readFileSync(sprintsPath, "utf8"));
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
    path16.join(repoPath, "docs/RELEASE_NOTES.md"),
    path16.join(repoPath, "docs/releasenotes.md"),
    path16.join(repoPath, "RELEASE_NOTES.md"),
    path16.join(repoPath, "releasenotes.md"),
    path16.join(repoPath, "docs/CHANGELOG.md"),
    path16.join(repoPath, "CHANGELOG.md"),
    path16.join(repoPath, "changelog.md")
  ];
  let notesContent = "";
  for (const p of possiblePaths) {
    if (fs15.existsSync(p)) {
      try {
        notesContent = fs15.readFileSync(p, "utf8");
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
function readReleases(project) {
  const filePath = getProjectReleasesPath(project);
  if (!filePath || !fs15.existsSync(filePath)) return [];
  return withFileLockSync(filePath, () => {
    try {
      if (!fs15.existsSync(filePath)) return [];
      const content = fs15.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}
function mutateReleases(project, mutator) {
  const filePath = getProjectReleasesPath(project);
  if (!filePath) return [];
  return withFileLockSync(filePath, () => {
    let current = [];
    if (fs15.existsSync(filePath)) {
      try {
        const content = fs15.readFileSync(filePath, "utf8");
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
function readRetrospectives(project) {
  const filePath = getProjectRetrospectivesPath(project);
  if (!filePath || !fs15.existsSync(filePath)) return [];
  return withFileLockSync(filePath, () => {
    try {
      if (!fs15.existsSync(filePath)) return [];
      const content = fs15.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}
function mutateRetrospectives(project, mutator) {
  const filePath = getProjectRetrospectivesPath(project);
  if (!filePath) return [];
  return withFileLockSync(filePath, () => {
    let current = [];
    if (fs15.existsSync(filePath)) {
      try {
        const content = fs15.readFileSync(filePath, "utf8");
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
var DEMO_FILE2;
var init_backlogCycles = __esm({
  "server/services/backlog/backlogCycles.ts"() {
    "use strict";
    init_registry();
    init_atomicWrite();
    init_fs_lock();
    DEMO_FILE2 = fs15.existsSync(path16.resolve(PKG_ROOT4, "data/demo-backlog.json")) ? path16.resolve(PKG_ROOT4, "data/demo-backlog.json") : path16.resolve(PKG_ROOT4, "src/data/demo-backlog.json");
  }
});

// server/services/backlog/backlogStats.ts
function computeBacklogStats(tasks) {
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
var init_backlogStats = __esm({
  "server/services/backlog/backlogStats.ts"() {
    "use strict";
    init_backlogMdParser();
  }
});

// server/services/backlog/taskNormalizer.ts
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
var ConflictError;
var init_taskNormalizer = __esm({
  "server/services/backlog/taskNormalizer.ts"() {
    "use strict";
    init_backlogMdParser();
    init_backlogCycles();
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
  }
});

// server/services/backlog/backlogSyncEngine.ts
import fs16 from "node:fs";
import path17 from "node:path";
function exportBacklogMd(project, tasks, options) {
  const mdTasks = tasks.map((t) => ({
    id: t.code || t.id,
    title: t.title,
    status: normalizeStatus(t.status),
    type: t.type,
    priority: formatPriorityForMd(t.priority),
    milestone: t.milestone || t.targetSprint,
    description: t.description || "",
    acceptanceCriteria: t.acceptanceCriteriaList || t.acceptanceCriteria || []
  }));
  const content = generateMonolithicBacklogMd(project.name, mdTasks);
  let savedPath;
  if (options?.save !== false && project.repoPath) {
    savedPath = path17.join(project.repoPath, "BACKLOG.md");
    atomicWriteFileSync2(savedPath, content, "utf8");
  }
  return {
    ok: true,
    content,
    savedPath,
    taskCount: tasks.length
  };
}
function syncBacklog(project, tasks, options) {
  let fixedCount = 0;
  const errors = [];
  const warnings = [];
  const autoFix = options?.autoFix === true;
  if (isBacklogMdProject(project) && project.repoPath) {
    const tasksDir = getProjectTasksDir(project);
    if (fs16.existsSync(tasksDir)) {
      const files = fs16.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const filePath = path17.join(tasksDir, file);
        const content2 = fs16.readFileSync(filePath, "utf8");
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
  const exportRes = exportBacklogMd(project, tasks, { save: false });
  const content = exportRes.content;
  let backlogPath = null;
  let changesWritten = false;
  if (project.repoPath) {
    backlogPath = path17.join(project.repoPath, "BACKLOG.md");
    let existingContent = "";
    if (fs16.existsSync(backlogPath)) {
      try {
        existingContent = fs16.readFileSync(backlogPath, "utf8");
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
var init_backlogSyncEngine = __esm({
  "server/services/backlog/backlogSyncEngine.ts"() {
    "use strict";
    init_backlogMdParser();
    init_registry();
    init_atomicWrite();
    init_backlogCycles();
  }
});

// server/services/backlog/backlogStorageEngine.ts
import fs17 from "node:fs";
import path18 from "node:path";
function findTaskFile(project, id) {
  if (!project.repoPath) return null;
  const tasksDir = getProjectTasksDir(project);
  if (!fs17.existsSync(tasksDir)) return null;
  const cleanId = id.toLowerCase();
  const files = fs17.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  let found = files.find((f) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });
  if (!found) {
    for (const f of files) {
      try {
        const fullPath = path18.join(tasksDir, f);
        const stat = fs17.statSync(fullPath);
        const cached = getTaskCacheEntry(fullPath);
        let parsed;
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
          recordCacheHit();
          parsed = cached.parsed;
        } else {
          recordCacheMiss();
          const raw = fs17.readFileSync(fullPath, "utf8");
          const fallbackId = f.split("-")[0] || f.replace(/\.md$/, "");
          parsed = parseBacklogMd(raw, fallbackId);
          const canonical = mapMarkdownTaskToCanonical(parsed, project, f, stat);
          setTaskCacheEntry(fullPath, {
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            parsed,
            canonical: { ...canonical }
          });
        }
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          found = f;
          break;
        }
      } catch {
      }
    }
  }
  if (!found) return null;
  const filePath = path18.join(tasksDir, found);
  try {
    const stat = fs17.statSync(filePath);
    const cached = getTaskCacheEntry(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      recordCacheHit();
      return { filePath, filename: found, task: structuredClone(cached.parsed) };
    }
    recordCacheMiss();
    const raw = fs17.readFileSync(filePath, "utf8");
    const fallbackId = found.split("-")[0] || found.replace(/\.md$/, "");
    const task = parseBacklogMd(raw, fallbackId);
    const canonical = mapMarkdownTaskToCanonical(task, project, found, stat);
    setTaskCacheEntry(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      parsed: structuredClone(task),
      canonical: { ...canonical }
    });
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
function readProjectBacklog(project, listTasksFn) {
  if (isBacklogMdProject(project)) {
    const tasksDir = getProjectTasksDir(project);
    try {
      if (!fs17.existsSync(tasksDir)) {
        return {
          project: { ...project, storageType: "markdown" },
          items: [],
          releases: [],
          sprints: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const items = listTasksFn(project, { includeDeleted: true });
      let releases = [];
      const releasesPath = getProjectReleasesPath(project);
      if (fs17.existsSync(releasesPath)) {
        try {
          releases = JSON.parse(fs17.readFileSync(releasesPath, "utf8"));
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
          const existingCodes = new Set((rel.itemCodes || []).map((c5) => c5.toUpperCase()));
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
      if (fs17.existsSync(sprintsPath)) {
        try {
          sprints = JSON.parse(fs17.readFileSync(sprintsPath, "utf8"));
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
    if (!fs17.existsSync(filePath)) {
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
    const jsonStat = fs17.statSync(filePath);
    const jsonMtime = Math.round(jsonStat.mtimeMs);
    const raw = fs17.readFileSync(filePath, "utf8");
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
function writeProjectBacklog(project, data) {
  if (isBacklogMdProject(project)) {
    if (project.repoPath) {
      try {
        const dir = path18.join(project.repoPath, project.backlogDir || "backlog");
        if (!fs17.existsSync(dir)) fs17.mkdirSync(dir, { recursive: true });
        const releasesPath = path18.join(dir, "releases.json");
        withFileLockSync(releasesPath, () => {
          let releasesToWrite = data.releases || [];
          if (fs17.existsSync(releasesPath)) {
            try {
              const diskReleases = JSON.parse(fs17.readFileSync(releasesPath, "utf8"));
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
          atomicWriteFileSync2(path18.join(dir, "sprints.json"), JSON.stringify(data.sprints || [], null, 2), "utf8");
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
function saveTask(project, item) {
  if (!project.repoPath && isBacklogMdProject(project)) return;
  if (isBacklogMdProject(project)) {
    const tasksDir = getProjectTasksDir(project);
    if (!fs17.existsSync(tasksDir)) fs17.mkdirSync(tasksDir, { recursive: true });
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
            if (fs17.existsSync(releasesPath)) {
              try {
                const relsData = JSON.parse(fs17.readFileSync(releasesPath, "utf8"));
                const taskCode = (taskData.id || "").toUpperCase();
                let changed = false;
                const targetVersion = (rVal || (relArray[0] || "")).replace(/^v/i, "");
                let versionFound = false;
                for (const rel of relsData) {
                  const vClean = (rel.version || "").replace(/^v/i, "");
                  if (!rel.itemCodes) rel.itemCodes = [];
                  const idx2 = rel.itemCodes.findIndex((c5) => c5.toUpperCase() === taskCode);
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
                console.warn("[gripm BacklogService] Error syncing releases.json when saving task:", syncErr.message);
              }
            }
          });
        }
      }
    }
    if (item.order !== void 0) taskData.rawExtraFrontmatter.order = item.order;
    const content = serializeBacklogMd(taskData);
    const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
    const targetFilePath = path18.join(tasksDir, targetFilename);
    atomicWriteFileSync2(targetFilePath, content, "utf8");
    invalidateTaskCache(targetFilePath);
    return;
  }
  const jsonPath = resolveJsonBacklogPath(project);
  let currentBacklog = { project, items: [] };
  if (fs17.existsSync(jsonPath)) {
    try {
      currentBacklog = JSON.parse(fs17.readFileSync(jsonPath, "utf8"));
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
var init_backlogStorageEngine = __esm({
  "server/services/backlog/backlogStorageEngine.ts"() {
    "use strict";
    init_backlogMdParser();
    init_registry();
    init_atomicWrite();
    init_fs_lock();
    init_taskCache();
    init_backlogCycles();
  }
});

// server/services/backlog/taskMutations.ts
import fs18 from "node:fs";
import path19 from "node:path";
function createTask(project, data, listTasksFn, computeNextTaskIdFn) {
  const lockPath = getProjectTaskAllocationLockPath(project);
  return withFileLockSync(lockPath, () => {
    const allTasks = listTasksFn(project, { includeDeleted: true });
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : computeNextTaskIdFn(project);
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
      startDate: data.startDate || data.start_date || void 0,
      dueDate: data.dueDate || data.due_date || data.targetDate || data.target_date || void 0,
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
      if (!fs18.existsSync(tasksDir)) fs18.mkdirSync(tasksDir, { recursive: true });
      const filename = generateTaskFilename(code, taskData.title);
      const filepath = path19.join(tasksDir, filename);
      const serialized = serializeBacklogMd(taskData);
      atomicWriteFileSync2(filepath, serialized, "utf8");
      invalidateTaskCache(filepath);
      const fileStat = fs18.existsSync(filepath) ? fs18.statSync(filepath) : void 0;
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
    if (fs18.existsSync(jsonPath)) {
      try {
        existingData = JSON.parse(fs18.readFileSync(jsonPath, "utf8"));
      } catch {
      }
    }
    if (!Array.isArray(existingData.items)) existingData.items = [];
    existingData.items.push(newItem);
    existingData.lastUpdated = now;
    atomicWriteFileSync2(jsonPath, JSON.stringify(existingData, null, 2), "utf8");
    const jsonStat = fs18.existsSync(jsonPath) ? fs18.statSync(jsonPath) : void 0;
    newItem.mtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    return { ok: true, task: newItem, savedFile: jsonPath };
  });
}
function updateTask(project, taskId, updates, options) {
  if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
    throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const norm = normalizeTaskUpdates(project, updates);
  if (isBacklogMdProject(project) && project.repoPath) {
    const fileInfo = findTaskFile(project, taskId);
    if (!fileInfo) {
      throw new Error(`Task ${taskId} not found to update.`);
    }
    const { filePath, filename, task: current2 } = fileInfo;
    const fileStat = fs18.existsSync(filePath) ? fs18.statSync(filePath) : void 0;
    const currentMtime2 = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();
    if (!options?.force && typeof options?.expectedMtime === "number") {
      if (currentMtime2 > options.expectedMtime) {
        const canonicalCurrent = mapMarkdownTaskToCanonical(current2, project, filename, fileStat);
        throw new ConflictError(
          `Task "${current2.id}" was modified on disk by another process or agent.`,
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
        throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
      }
      const acList = current2.acceptanceCriteria || [];
      const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
      if (!foundAc) {
        throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current2.id}'.`);
      }
      current2.acceptanceCriteria = acList.map(
        (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
      );
    }
    const targetStatus2 = norm.status || current2.status;
    const gateResult2 = validateGatekeeperTransition(current2, targetStatus2, options, project.repoPath);
    if (current2.rawExtraFrontmatter) {
      delete current2.rawExtraFrontmatter.verifyCommand;
      delete current2.rawExtraFrontmatter.verify_command;
      delete current2.rawExtraFrontmatter.verifyCmd;
    }
    const serialized = serializeBacklogMd(current2);
    atomicWriteFileSync2(filePath, serialized, "utf8");
    invalidateTaskCache(filePath);
    const freshStat = fs18.existsSync(filePath) ? fs18.statSync(filePath) : void 0;
    const canonical = mapMarkdownTaskToCanonical(current2, project, filename, freshStat);
    const resp2 = { ok: true, updatedTask: canonical, filePath };
    if (norm.usedUpdatesObject) {
      resp2.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
    }
    if (options?.force) {
      let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current2.id}', bypassing Gatekeeper validations.`;
      if (gateResult2 && typeof gateResult2 === "object" && gateResult2.locViolations && gateResult2.locViolations.length > 0) {
        forceWarning += ` Bypassed LOC ceiling guardrail: ${gateResult2.locViolations.map((v) => `${v.file} (${v.lines} lines)`).join(", ")}.`;
      }
      resp2.warning = resp2.warning ? `${resp2.warning} ${forceWarning}` : forceWarning;
      resp2.audit = {
        bypassedGatekeeper: true,
        timestamp: now
      };
    }
    return resp2;
  }
  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs18.existsSync(jsonPath)) {
    throw new Error(`JSON backlog file not found at ${jsonPath}.`);
  }
  const data = JSON.parse(fs18.readFileSync(jsonPath, "utf8"));
  const cleanId = String(taskId).toLowerCase();
  const idx = (data.items || []).findIndex(
    (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
  );
  if (idx < 0) {
    throw new Error(`Task ${taskId} not found to update.`);
  }
  const current = data.items[idx];
  const jsonStat = fs18.existsSync(jsonPath) ? fs18.statSync(jsonPath) : void 0;
  const currentMtime = typeof current.mtime === "number" ? current.mtime : jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
  if (!options?.force && typeof options?.expectedMtime === "number") {
    if (currentMtime > options.expectedMtime) {
      throw new ConflictError(
        `Task "${current.code || current.id}" was modified on disk by another process or agent.`,
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
      throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
    }
    const acList = current.acceptanceCriteriaList || [];
    const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
    if (!foundAc) {
      throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id || current.code}'.`);
    }
    current.acceptanceCriteriaList = acList.map(
      (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
    );
  }
  const targetStatus = norm.status || current.status;
  const gateResult = validateGatekeeperTransition(current, targetStatus, options, project.repoPath);
  delete current.verifyCommand;
  data.items[idx] = current;
  data.lastUpdated = now;
  atomicWriteFileSync2(jsonPath, JSON.stringify(data, null, 2), "utf8");
  const freshJsonStat = fs18.existsSync(jsonPath) ? fs18.statSync(jsonPath) : void 0;
  current.mtime = freshJsonStat ? Math.round(freshJsonStat.mtimeMs) : Date.now();
  const resp = { ok: true, updatedTask: current, filePath: jsonPath };
  if (norm.usedUpdatesObject) {
    resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
  }
  if (options?.force) {
    let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id || current.code}', bypassing Gatekeeper validations.`;
    if (gateResult && typeof gateResult === "object" && gateResult.locViolations && gateResult.locViolations.length > 0) {
      forceWarning += ` Bypassed LOC ceiling guardrail: ${gateResult.locViolations.map((v) => `${v.file} (${v.lines} lines)`).join(", ")}.`;
    }
    resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
    resp.audit = {
      bypassedGatekeeper: true,
      timestamp: now
    };
  }
  return resp;
}
function bulkUpdateTasks(project, targetFilter, updates, options, listTasksFn) {
  if (Array.isArray(targetFilter.items)) {
    const updatedIds2 = [];
    const failedUpdates2 = [];
    let updatedCount2 = 0;
    for (const patch of targetFilter.items) {
      if (!patch || !patch.id && !patch.code) continue;
      const targetId = patch.code || patch.id;
      try {
        const res = updateTask(project, targetId, patch, options);
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
      ...failedUpdates2.length > 0 ? { failedUpdates: failedUpdates2, error: `${failedUpdates2.length} task(s) failed to update.` } : {}
    };
    if (options?.force) {
      resp2.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
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
  const allTasks = listTasksFn ? listTasksFn(project, { includeDeleted: false }) : [];
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
  let bulkLocViolations = [];
  if (norm.status) {
    for (const t of matchedTasks) {
      const gRes = validateGatekeeperTransition(t, norm.status, options, project.repoPath);
      if (gRes && typeof gRes === "object" && gRes.locViolations && gRes.locViolations.length > 0) {
        bulkLocViolations = gRes.locViolations;
      }
    }
  }
  const updatedIds = [];
  const failedUpdates = [];
  let updatedCount = 0;
  for (const t of matchedTasks) {
    try {
      const res = updateTask(project, t.id || t.code, updates, options);
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
    ...failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {}
  };
  if (options?.force) {
    let forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
    if (bulkLocViolations.length > 0) {
      forceWarning += ` Bypassed LOC ceiling guardrail: ${bulkLocViolations.map((v) => `${v.file} (${v.lines} lines)`).join(", ")}.`;
    }
    resp.warning = forceWarning;
    resp.audit = {
      bypassedGatekeeper: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return resp;
}
function deleteTask(project, taskId, options) {
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
      const archiveDir = path19.join(project.repoPath, project.backlogDir || "backlog", "archive");
      if (!fs18.existsSync(archiveDir)) fs18.mkdirSync(archiveDir, { recursive: true });
      fs18.renameSync(filePath, path19.join(archiveDir, filename));
      invalidateTaskCache(filePath);
      return { ok: true, id: taskId, purged: true };
    }
    const previousStatus = task.status || "draft";
    const raw = fs18.readFileSync(filePath, "utf8");
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
    invalidateTaskCache(filePath);
    return { ok: true, id: taskId, softDeleted: true };
  }
  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs18.existsSync(jsonPath)) return { ok: false, id: taskId };
  const data = JSON.parse(fs18.readFileSync(jsonPath, "utf8"));
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
function restoreTask(project, taskId) {
  if (isBacklogMdProject(project) && project.repoPath) {
    const fileInfo = findTaskFile(project, taskId);
    if (!fileInfo) return false;
    const { filePath } = fileInfo;
    let raw = fs18.readFileSync(filePath, "utf8");
    const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
    const restoreStatus2 = prevMatch ? prevMatch[1].trim() : "draft";
    if (/^status:.*$/m.test(raw)) {
      raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus2}`);
    }
    raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
    raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
    raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
    atomicWriteFileSync2(filePath, raw, "utf8");
    invalidateTaskCache(filePath);
    return true;
  }
  const jsonPath = resolveJsonBacklogPath(project);
  if (!fs18.existsSync(jsonPath)) return false;
  const data = JSON.parse(fs18.readFileSync(jsonPath, "utf8"));
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
var init_taskMutations = __esm({
  "server/services/backlog/taskMutations.ts"() {
    "use strict";
    init_backlogMdParser();
    init_registry();
    init_atomicWrite();
    init_fs_lock();
    init_taskCache();
    init_backlogStorageEngine();
    init_gatekeeperSecurity();
    init_backlogCycles();
    init_taskNormalizer();
  }
});

// server/services/backlogService.ts
import fs19 from "node:fs";
import path20 from "node:path";
var BacklogService;
var init_backlogService = __esm({
  "server/services/backlogService.ts"() {
    "use strict";
    init_backlogMdParser();
    init_registry();
    init_fs_lock();
    init_taskCache();
    init_taskCache();
    init_gatekeeperSecurity();
    init_backlogCycles();
    init_backlogStats();
    init_taskNormalizer();
    init_backlogSyncEngine();
    init_backlogStorageEngine();
    init_taskMutations();
    init_backlogCycles();
    init_backlogStats();
    init_backlogSyncEngine();
    init_backlogStorageEngine();
    init_taskMutations();
    BacklogService = class _BacklogService {
      /**
       * Reads all tasks for a project with optional filters.
       * By default, soft-deleted tasks (isDeleted: true) are EXCLUDED (AC 6).
       */
      static listTasks(project, options) {
        let items = [];
        if (isBacklogMdProject(project) && project.repoPath) {
          const tasksDir = getProjectTasksDir(project);
          if (fs19.existsSync(tasksDir)) {
            const files = fs19.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
            files.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
            const activePaths = /* @__PURE__ */ new Set();
            let orderIdx = 1;
            for (const file of files) {
              try {
                const fullPath = path20.join(tasksDir, file);
                activePaths.add(fullPath);
                const stat = fs19.statSync(fullPath);
                const cached = getTaskCacheEntry(fullPath);
                let canonical;
                if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
                  recordCacheHit();
                  canonical = { ...cached.canonical };
                } else {
                  recordCacheMiss();
                  const raw = fs19.readFileSync(fullPath, "utf8");
                  const fallbackId = file.split("-")[0] || file.replace(/\.md$/, "");
                  const parsed = parseBacklogMd(raw, fallbackId);
                  canonical = mapMarkdownTaskToCanonical(parsed, project, file, stat);
                  setTaskCacheEntry(fullPath, {
                    mtimeMs: stat.mtimeMs,
                    size: stat.size,
                    parsed,
                    canonical: { ...canonical }
                  });
                }
                if (canonical.order === 0) canonical.order = orderIdx++;
                items.push(canonical);
              } catch {
              }
            }
            pruneStaleCacheEntries(tasksDir, activePaths);
          }
        } else {
          const jsonPath = resolveJsonBacklogPath(project);
          if (fs19.existsSync(jsonPath)) {
            try {
              const raw = fs19.readFileSync(jsonPath, "utf8");
              const data = JSON.parse(raw);
              const jsonStat = fs19.statSync(jsonPath);
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
          throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
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
        throw new Error(`Task ${taskId} not found.`);
      }
      /**
       * Calculates dashboard / metrics statistics over active tasks (excluding isDeleted).
       */
      static getStats(project) {
        const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
        return computeBacklogStats(tasks);
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
          if (fs19.existsSync(tasksDir)) {
            const diskFiles = fs19.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
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
      static createTask = (project, data) => createTask(project, data, _BacklogService.listTasks, _BacklogService.computeNextTaskId);
      /**
       * Updates an existing task by ID with Gatekeeper validation.
       */
      static updateTask = updateTask;
      /**
       * Bulk updates tasks with Gatekeeper validation applied to ALL matching tasks (AC 3).
       */
      static bulkUpdateTasks = (project, targetFilter, updates, options) => bulkUpdateTasks(project, targetFilter, updates, options, _BacklogService.listTasks);
      /**
       * Soft deletes or purges a task. Protected done tasks cannot be soft-deleted.
       */
      static deleteTask = deleteTask;
      /**
       * Restores a soft-deleted task to active state.
       */
      static restoreTask = restoreTask;
      /**
       * Exports monolithic BACKLOG.md excluding soft-deleted items (AC 6).
       */
      static exportBacklogMd = (project, options) => {
        const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
        return exportBacklogMd(project, tasks, options);
      };
      /**
       * Synchronizes backlog tasks and BACKLOG.md.
       * DEV-293 / AC 4: Does NOT auto-promote tasks to ready! Only emits quality warnings,
       * and writes BACKLOG.md strictly when real changes exist or autoFix is true.
       */
      static syncBacklog = (project, options) => {
        const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
        return syncBacklog(project, tasks, options);
      };
      /**
       * Reads full project backlog (items, releases, sprints) with ZERO disk mutations (AC 5).
       * Does NOT auto-close sprints, does NOT auto-write releases.json or sprints.json.
       */
      static readProjectBacklog = (project) => {
        return readProjectBacklog(project, _BacklogService.listTasks);
      };
      /**
       * Reads releases from disk guarded by atomic file lock.
       */
      static readReleases = readReleases;
      /**
       * Mutates releases on disk guarded by atomic file lock.
       */
      static mutateReleases = mutateReleases;
      /**
       * Reads retrospectives from disk guarded by atomic file lock.
       */
      static readRetrospectives = readRetrospectives;
      /**
       * Mutates retrospectives on disk guarded by atomic file lock.
       */
      static mutateRetrospectives = mutateRetrospectives;
      /**
       * Writes releases and sprints to disk atomically (markdown) or updates backlog.json (JSON).
       */
      static writeProjectBacklog = writeProjectBacklog;
      /**
       * Saves or creates a single task item (used by legacy and HTTP adapters).
       */
      static saveTask = saveTask;
      static getTaskCacheStats = getTaskCacheStats;
      static clearTaskCache = clearTaskCache;
      static invalidateTaskCache = invalidateTaskCache;
      static loadProjectBacklog = (project) => _BacklogService.readProjectBacklog(project);
    };
  }
});

// server/sse/sseManager.ts
import fs21 from "node:fs";
import path22 from "node:path";
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
  const dataDir = path22.resolve(PKG_ROOT4, "data");
  if (fs21.existsSync(dataDir)) dirsToWatch.add(dataDir);
  for (const p of registry.projects) {
    try {
      if (p.repoPath && fs21.existsSync(p.repoPath)) {
        const backlogDir = path22.join(p.repoPath, p.backlogDir || "backlog");
        if (fs21.existsSync(backlogDir)) dirsToWatch.add(backlogDir);
        const gripmDir = path22.join(p.repoPath, ".gripm");
        if (fs21.existsSync(gripmDir)) dirsToWatch.add(gripmDir);
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
      const watcher = fs21.watch(dir, { recursive: true }, (_eventType, filename) => {
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
    if (req.body !== void 0 && req.body !== null) {
      if (typeof req.body === "string") {
        try {
          return resolve(JSON.parse(req.body));
        } catch (e) {
          return resolve({});
        }
      }
      return resolve(req.body);
    }
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

// server/services/storage.ts
function readProjectBacklog2(project) {
  return BacklogService.readProjectBacklog(project);
}
function writeProjectBacklog2(project, data) {
  BacklogService.writeProjectBacklog(project, data);
}
var init_storage = __esm({
  "server/services/storage.ts"() {
    "use strict";
    init_backlogService();
    init_backlogService();
  }
});

// server/services/auditService.ts
async function scanCodebase2(targetPath, options) {
  const result = await scanCodebase(targetPath, options);
  const violations = (result.loc?.violations || []).map(
    (v) => ({
      file: v.file,
      lines: v.lines,
      status: v.status === "error" ? "error" : "warning"
    })
  );
  const todos = (result.todos || []).map(
    (t) => ({
      id: t.id,
      file: t.file,
      line: t.line,
      type: t.type === "FIXME" || t.type === "HACK" || t.type === "BUG" || t.type === "XXX" ? t.type : "TODO",
      text: t.text,
      snippet: t.snippet
    })
  );
  return {
    score: result.score,
    ...Array.isArray(result.stack) ? { stack: result.stack } : {},
    summary: {
      totalFilesScanned: result.summary.totalFilesScanned,
      locViolationsCount: result.summary.locViolationsCount,
      suppressionsCount: result.summary.suppressionsCount,
      todosCount: result.summary.todosCount,
      testFramework: result.summary.testFramework ?? null,
      verifyCommand: result.summary.verifyCommand ?? null,
      ...result.summary.stack !== void 0 ? { stack: result.summary.stack } : {}
    },
    rules: result.rules,
    loc: {
      maxLines: result.loc.maxLines,
      warnLines: result.loc.warnLines,
      violations
    },
    quality: {
      suppressions: result.quality.suppressions || []
    },
    todos,
    tests: {
      detected: Boolean(result.tests.detected),
      framework: result.tests.framework ?? null,
      verifyCommand: result.tests.verifyCommand ?? null,
      hasTests: Boolean(result.tests.hasTests)
    }
  };
}
var init_auditService = __esm({
  "server/services/auditService.ts"() {
    "use strict";
    init_audit_engine();
  }
});

// server/services/fsExplorer.ts
import fs22 from "node:fs";
import path23 from "node:path";
import os2 from "node:os";
function getAllowedBrowseRoots() {
  const roots = [];
  const homedir = os2.homedir();
  if (homedir) {
    roots.push(path23.resolve(homedir));
    try {
      roots.push(fs22.realpathSync(homedir));
    } catch {
    }
  }
  const cwd = process.cwd();
  if (cwd) {
    roots.push(path23.resolve(cwd));
    try {
      roots.push(fs22.realpathSync(cwd));
    } catch {
    }
  }
  const tmpdir = os2.tmpdir();
  if (tmpdir) {
    roots.push(path23.resolve(tmpdir));
    try {
      roots.push(fs22.realpathSync(tmpdir));
    } catch {
    }
  }
  try {
    const reg = getRegistry();
    if (reg && Array.isArray(reg.projects)) {
      for (const p of reg.projects) {
        if (p.repoPath) {
          roots.push(path23.resolve(p.repoPath));
          try {
            roots.push(fs22.realpathSync(p.repoPath));
          } catch {
          }
        }
      }
    }
  } catch {
  }
  const extra = process.env.GRIPM_ALLOWED_PATHS;
  if (extra) {
    for (const p of extra.split(path23.delimiter)) {
      if (p.trim()) {
        roots.push(path23.resolve(p.trim()));
        try {
          roots.push(fs22.realpathSync(p.trim()));
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
    const resolved = path23.resolve(targetPath);
    const parsed = path23.parse(resolved);
    if (resolved.toLowerCase() === parsed.root.toLowerCase()) return true;
    const tmp = os2.tmpdir();
    if (tmp) {
      if (isPathContained(resolved, path23.resolve(tmp))) return false;
      try {
        const realTmp = fs22.realpathSync(tmp);
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
    return restrictedPrefixes.some((p) => lower === p || lower.startsWith(p + path23.sep));
  } catch {
    return true;
  }
}
function isPathContained(targetPath, rootDir) {
  const relative = path23.relative(rootDir, targetPath);
  return !relative.startsWith("..") && !path23.isAbsolute(relative);
}
function isAllowedBrowsePath(targetPath, extraRoots = []) {
  if (!targetPath || typeof targetPath !== "string") return false;
  try {
    const normalized = path23.resolve(path23.normalize(targetPath));
    if (isSystemRootDir(normalized)) return false;
    const baseRoots = getAllowedBrowseRoots();
    const roots = [...baseRoots];
    for (const er of extraRoots) {
      if (er) {
        roots.push(path23.resolve(er));
        try {
          roots.push(fs22.realpathSync(er));
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
        const resolvedAncestor = fs22.realpathSync(current);
        realPath = remainingSegments.length > 0 ? path23.join(resolvedAncestor, ...remainingSegments) : resolvedAncestor;
        break;
      } catch (err) {
        if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) {
          const parent = path23.dirname(current);
          if (parent === current) {
            realPath = current;
            break;
          }
          remainingSegments.unshift(path23.basename(current));
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
    path23.resolve(process.cwd(), ".."),
    process.cwd(),
    os2.homedir()
  ];
  for (const candidate of candidates) {
    try {
      if (candidate && fs22.existsSync(candidate) && isAllowedBrowsePath(candidate)) {
        fs22.readdirSync(candidate);
        return candidate;
      }
    } catch {
    }
  }
  return path23.resolve(os2.homedir() || process.cwd());
}
var init_fsExplorer = __esm({
  "server/services/fsExplorer.ts"() {
    "use strict";
    init_registry();
  }
});

// server/routes/audit.ts
import path24 from "node:path";
function clearAuditCache(repoPath) {
  if (repoPath) {
    auditCache.delete(path24.resolve(repoPath));
  } else {
    auditCache.clear();
  }
}
function getCachedAudit(repoPath) {
  const key = path24.resolve(repoPath);
  const entry = auditCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS2) {
    return entry.report;
  }
  return null;
}
function setCachedAudit(repoPath, report) {
  const key = path24.resolve(repoPath);
  auditCache.set(key, {
    report,
    timestamp: Date.now()
  });
}
function resolveAuditProject(req, activeProject, registry, body) {
  const urlObj = new URL(req.url || "", "http://localhost");
  const projectId = urlObj.searchParams.get("projectId") || body?.projectId;
  const customPath = urlObj.searchParams.get("path") || body?.path || body?.targetPath;
  let project = activeProject;
  if (projectId && registry?.projects) {
    const found = registry.projects.find((p) => p.id === projectId);
    if (found) project = found;
  }
  let repoPath;
  if (customPath && typeof customPath === "string") {
    if (!isAllowedBrowsePath(customPath)) {
      return { error: "Target path is outside allowed repository paths", statusCode: 400 };
    }
    repoPath = path24.resolve(customPath);
    if (!project || project.repoPath && path24.resolve(project.repoPath) !== repoPath) {
      project = {
        id: projectId || "custom-audit-project",
        name: "Custom Audit Project",
        repoPath,
        storageType: "markdown",
        backlogDir: "backlog",
        codePrefix: "DEV",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  } else {
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;
    repoPath = project?.repoPath || (targetRepoEnv ? path24.resolve(targetRepoEnv) : path24.resolve(process.cwd()));
    repoPath = path24.resolve(repoPath);
  }
  const finalProject = project || {
    id: "default",
    name: "Default Project",
    repoPath,
    storageType: "markdown",
    backlogDir: "backlog",
    codePrefix: "DEV",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return { project: finalProject, repoPath };
}
async function handleAuditRoutes(req, res, pathname, activeProject, registry) {
  const method = (req.method || "GET").toUpperCase();
  if (pathname === "/api/audit") {
    if (method !== "GET") {
      sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
      return true;
    }
    try {
      const resolved = resolveAuditProject(req, activeProject, registry);
      if ("error" in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }
      const { repoPath } = resolved;
      const cached = getCachedAudit(repoPath);
      if (cached) {
        sendJson(res, 200, { ok: true, data: cached, cached: true });
        return true;
      }
      const report = await scanCodebase2(repoPath);
      setCachedAudit(repoPath, report);
      sendJson(res, 200, { ok: true, data: report, cached: false });
      return true;
    } catch (err) {
      console.error("[gripm Audit API] Error in GET /api/audit:", err);
      sendJson(res, 500, { ok: false, error: err.message || "Internal server error" });
      return true;
    }
  }
  if (pathname === "/api/audit/refresh") {
    if (method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
      return true;
    }
    try {
      let body = {};
      try {
        body = await getBody(req, res);
      } catch (bodyErr) {
        if (bodyErr?.statusCode === 413) return true;
      }
      const resolved = resolveAuditProject(req, activeProject, registry, body);
      if ("error" in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }
      const { repoPath } = resolved;
      clearAuditCache(repoPath);
      const report = await scanCodebase2(repoPath);
      setCachedAudit(repoPath, report);
      sendJson(res, 200, { ok: true, data: report });
      return true;
    } catch (err) {
      console.error("[gripm Audit API] Error in POST /api/audit/refresh:", err);
      sendJson(res, 500, { ok: false, error: err.message || "Internal server error" });
      return true;
    }
  }
  if (pathname === "/api/audit/import-todos") {
    if (method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
      return true;
    }
    try {
      let body;
      try {
        body = await getBody(req, res);
      } catch (bodyErr) {
        if (bodyErr?.statusCode === 413) return true;
        sendJson(res, 400, { ok: false, error: "Invalid JSON payload: " + (bodyErr?.message || "Malformed body") });
        return true;
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        sendJson(res, 400, { ok: false, error: "Invalid payload: body must be a JSON object" });
        return true;
      }
      if (body.all !== true && !Array.isArray(body.items)) {
        sendJson(res, 400, { ok: false, error: 'Invalid payload: expected "items" array or "all: true"' });
        return true;
      }
      const resolved = resolveAuditProject(req, activeProject, registry, body);
      if ("error" in resolved) {
        sendJson(res, resolved.statusCode, { ok: false, error: resolved.error });
        return true;
      }
      const { project, repoPath } = resolved;
      let itemsToImport = [];
      if (body.all === true) {
        const report = await scanCodebase2(repoPath);
        itemsToImport = (report.todos || []).map((t) => ({
          file: t.file,
          line: t.line,
          type: t.type,
          text: t.text,
          snippet: t.snippet
        }));
      } else {
        itemsToImport = body.items;
      }
      for (let i = 0; i < itemsToImport.length; i++) {
        const item = itemsToImport[i];
        if (!item || typeof item !== "object") {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: must be an object` });
          return true;
        }
        if (typeof item.text !== "string" || !item.text.trim()) {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: "text" must be a non-empty string` });
          return true;
        }
        if (typeof item.file !== "string" || !item.file.trim()) {
          sendJson(res, 400, { ok: false, error: `Invalid item at index ${i}: "file" must be a non-empty string` });
          return true;
        }
      }
      if (itemsToImport.length === 0) {
        sendJson(res, 200, { ok: true, importedCount: 0, taskIds: [] });
        return true;
      }
      const projectConfig = readProjectConfig(project);
      const isSpanish = (projectConfig?.language || "").toLowerCase().startsWith("es");
      const existingTasks = BacklogService.listTasks(project, { includeDeleted: false });
      const existingTitles = new Set(existingTasks.map((t) => (t.title || "").trim().toLowerCase()));
      const existingLocRefs = /* @__PURE__ */ new Set();
      for (const t of existingTasks) {
        if (Array.isArray(t.acceptanceCriteria)) {
          for (const ac of t.acceptanceCriteria) {
            if (ac.text) {
              const m = ac.text.match(/([a-zA-Z0-9_\-\.\/]+):(\d+)/);
              if (m) existingLocRefs.add(`${m[1]}:${m[2]}`);
            }
          }
        }
        if (t.description) {
          const m = t.description.match(/`([a-zA-Z0-9_\-\.\/]+)`[\s\S]*?(?:Línea|Line):\s*(\d+)/i);
          if (m) existingLocRefs.add(`${m[1]}:${m[2]}`);
        }
      }
      const taskIds = [];
      for (const item of itemsToImport) {
        const cleanType = (item.type || "TODO").trim().toUpperCase();
        let cleanText = (item.text || "").trim();
        if (cleanText.toUpperCase().startsWith(`${cleanType}:`)) {
          cleanText = cleanText.substring(cleanType.length + 1).trim();
        }
        const title = `${cleanType}: ${cleanText}`;
        const fileLocKey = `${item.file}:${item.line || 1}`;
        if (existingTitles.has(title.toLowerCase()) || existingLocRefs.has(fileLocKey)) {
          continue;
        }
        const descLines = isSpanish ? [
          `Deuda t\xE9cnica identificada autom\xE1ticamente por el motor de auditor\xEDa est\xE1tica.`,
          ``,
          `- **Archivo de origen:** \`${item.file}\``,
          `- **L\xEDnea:** ${item.line || 1}`,
          `- **Tipo:** \`${cleanType}\``
        ] : [
          `Technical debt automatically identified by the static audit engine.`,
          ``,
          `- **Source file:** \`${item.file}\``,
          `- **Line:** ${item.line || 1}`,
          `- **Type:** \`${cleanType}\``
        ];
        if (item.snippet && typeof item.snippet === "string" && item.snippet.trim()) {
          descLines.push(``, isSpanish ? `### Fragmento de C\xF3digo:` : `### Code Snippet:`, "```", item.snippet.trim(), "```");
        }
        const description = descLines.join("\n");
        const acText = isSpanish ? `Resolver ${cleanType} en ${item.file}:${item.line || 1}` : `Resolve ${cleanType} in ${item.file}:${item.line || 1}`;
        const taskData = {
          title,
          status: "draft",
          type: "tech_debt",
          labels: ["todo-import", "tech_debt"],
          priority: "medium",
          description,
          acceptanceCriteria: [
            { index: 1, text: acText, checked: false }
          ]
        };
        const createRes = BacklogService.createTask(project, taskData);
        if (!createRes.ok || !createRes.task) {
          throw new Error(`Failed to create task for TODO: "${title}"`);
        }
        const newId = createRes.task.code || createRes.task.id;
        taskIds.push(newId);
        existingTitles.add(title.toLowerCase());
        existingLocRefs.add(fileLocKey);
      }
      if (taskIds.length > 0) {
        BacklogService.syncBacklog(project, { autoFix: false });
        broadcastSse("backlog_changed", {
          projectId: project.id,
          action: "todos_imported",
          count: taskIds.length,
          taskIds,
          timestamp: Date.now()
        });
        clearAuditCache(repoPath);
      }
      sendJson(res, 200, {
        ok: true,
        importedCount: taskIds.length,
        taskIds
      });
      return true;
    } catch (err) {
      console.error("[gripm Audit API] Error in POST /api/audit/import-todos:", err);
      sendJson(res, 500, { ok: false, error: err.message || "Failed to import todos" });
      return true;
    }
  }
  return false;
}
var auditCache, CACHE_TTL_MS2;
var init_audit = __esm({
  "server/routes/audit.ts"() {
    "use strict";
    init_auditService();
    init_security();
    init_backlogService();
    init_sseManager();
    init_fsExplorer();
    init_registry();
    auditCache = /* @__PURE__ */ new Map();
    CACHE_TTL_MS2 = 30 * 1e3;
  }
});

// scripts/import-docs.js
import fs23 from "node:fs";
import path25 from "node:path";
import { fileURLToPath as fileURLToPath10 } from "node:url";
function runMigration(docsDir = M3_DOCS_DIR, targetFile = OUT_FILE, projectMeta = null) {
  console.log(`[gripm Migrator] Starting migration from: ${docsDir}`);
  if (!fs23.existsSync(docsDir)) {
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
  const qualityLogPath = path25.join(docsDir, "QUALITY_LOG.md");
  if (fs23.existsSync(qualityLogPath)) {
    const content = fs23.readFileSync(qualityLogPath, "utf8");
    parseQualityLog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: QUALITY_LOG.md not found at ${qualityLogPath}`);
  }
  const backlogPath = path25.join(docsDir, "BACKLOG.md");
  if (fs23.existsSync(backlogPath)) {
    const content = fs23.readFileSync(backlogPath, "utf8");
    parseBacklog(content, itemsMap, ctx);
  } else {
    console.warn(`[gripm Migrator] Warning: BACKLOG.md not found at ${backlogPath}`);
  }
  const specsDir = path25.join(docsDir, "specs");
  if (fs23.existsSync(specsDir)) {
    parseSpecs(specsDir, itemsMap, ctx);
  }
  const releases = [];
  const releaseNotesPath = path25.join(docsDir, "RELEASE_NOTES.md");
  if (fs23.existsSync(releaseNotesPath)) {
    const content = fs23.readFileSync(releaseNotesPath, "utf8");
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
    if (!fs23.existsSync(path25.dirname(targetFile))) {
      fs23.mkdirSync(path25.dirname(targetFile), { recursive: true });
    }
    fs23.writeFileSync(targetFile, JSON.stringify(boardData, null, 2), "utf8");
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
      const cols = trimmed.split("|").map((c5) => c5.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
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
  const files = fs23.readdirSync(specsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path25.join(specsDir, file);
    const content = fs23.readFileSync(filePath, "utf8");
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
var __filename10, __dirname8, M3_DOCS_DIR, DATA_DIR, OUT_FILE;
var init_import_docs = __esm({
  "scripts/import-docs.js"() {
    "use strict";
    __filename10 = fileURLToPath10(import.meta.url);
    __dirname8 = path25.dirname(__filename10);
    M3_DOCS_DIR = process.env.M3_DOCS_DIR || "";
    DATA_DIR = path25.join(__dirname8, "../data");
    OUT_FILE = path25.join(DATA_DIR, "gripm-board.json");
    if (process.argv[1] && fileURLToPath10(import.meta.url) === process.argv[1]) {
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

// server/routes/projectsRoutes.ts
import fs24 from "node:fs";
import path26 from "node:path";
function getVisibleProjects(projects, activeProject) {
  return projects.filter((p) => {
    if (p.isDemo || p.id === "demo") return true;
    if (activeProject && (p.id === activeProject.id || p.repoPath && activeProject.repoPath && path26.resolve(p.repoPath) === path26.resolve(activeProject.repoPath))) {
      return true;
    }
    if (p.repoPath) {
      const cfg = readProjectConfig(p);
      if (cfg?.mode === "single") return false;
    }
    return true;
  });
}
async function handleProjectsRoutes(req, res, pathname, _url, searchParams, activeProject, registry, isSingleMode) {
  if (req.method === "POST" && pathname === "/api/import/legacy-md") {
    const body = await getBody(req, res);
    const projectId = body.projectId || registry.projects[0]?.id;
    const project = registry.projects.find((p) => p.id === projectId);
    if (!project) {
      sendJson(res, 404, { error: "Proyecto no encontrado" });
      return true;
    }
    let itemsToImport = [];
    if (Array.isArray(body.items) && body.items.length > 0) {
      itemsToImport = body.items.filter((it) => it.selected !== false);
    } else if (body.content) {
      itemsToImport = parseLegacyMarkdown(body.content, body.defaultMilestone);
    }
    if (itemsToImport.length === 0) {
      sendJson(res, 400, { error: "No se encontraron tareas seleccionadas para importar" });
      return true;
    }
    const currentBacklog = readProjectBacklog2(project);
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
      writeProjectBacklog2(project, currentBacklog);
    }
    broadcastSse("backlog_changed", {
      projectId: project.id,
      action: "imported",
      count: createdItems.length,
      timestamp: Date.now()
    });
    sendJson(res, 200, {
      ok: true,
      importedCount: createdItems.length,
      items: createdItems
    });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/projects") {
    const body = await getBody(req, res);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = (body.id || body.codePrefix || body.name || `proj-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    let storageType = body.storageType;
    let backlogDir = body.backlogDir || "backlog";
    if (body.backlogDir) {
      const normBacklog = path26.normalize(body.backlogDir);
      if (path26.isAbsolute(normBacklog) || normBacklog.startsWith("..") || normBacklog.includes(`..${path26.sep}`)) {
        sendJson(res, 400, { ok: false, error: "Invalid backlogDir: must be a relative directory inside the repository" });
        return true;
      }
    }
    const normalizedRepoPath = body.repoPath ? path26.normalize(body.repoPath.trim()) : void 0;
    if (normalizedRepoPath && !isAllowedBrowsePath(normalizedRepoPath)) {
      sendJson(res, 403, { error: "Forbidden: repoPath is outside allowed roots" });
      return true;
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
      readProjectBacklog2(newProject);
    }
    sendJson(res, 201, { ok: true, project: newProject });
    return true;
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
    sendJson(res, 200, { ok: true, projects: visible, activeProjectId: "demo" });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/projects/detect-path") {
    const body = await getBody(req, res);
    const inputPath = body.repoPath ? path26.normalize(body.repoPath.trim()) : "";
    if (!inputPath) {
      sendJson(res, 400, { error: "repoPath required" });
      return true;
    }
    if (!isAllowedBrowsePath(inputPath)) {
      sendJson(res, 403, { error: "Forbidden: repoPath is outside allowed roots" });
      return true;
    }
    const exists = fs24.existsSync(inputPath);
    const isGit = exists && fs24.existsSync(path26.join(inputPath, ".git"));
    const detection = detectProjectStorage(inputPath);
    sendJson(res, 200, {
      ok: true,
      exists,
      isGit,
      normalizedPath: inputPath,
      ...detection
    });
    return true;
  }
  if (req.method === "DELETE" && pathname.startsWith("/api/projects/")) {
    const id = decodeURIComponent(pathname.replace("/api/projects/", ""));
    const initialLen = registry.projects.length;
    registry.projects = registry.projects.filter((p) => p.id !== id);
    if (registry.projects.length === initialLen) {
      sendJson(res, 404, { error: "Project not found in registry" });
      return true;
    }
    if (registry.activeProjectId === id) {
      registry.activeProjectId = registry.projects[0]?.id || "";
    }
    saveRegistry(registry);
    const visible = isSingleMode ? activeProject ? [activeProject] : [] : getVisibleProjects(registry.projects, activeProject);
    sendJson(res, 200, { ok: true, id, remainingProjects: visible });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/projects/active") {
    const body = await getBody(req, res);
    const { projectId } = body || {};
    if (isSingleMode) {
      sendJson(res, 200, { ok: true, activeProjectId: activeProject?.id, singleProject: true });
      return true;
    }
    const visibleProjects = getVisibleProjects(registry.projects, activeProject);
    if (projectId && visibleProjects.some((p) => p.id === projectId)) {
      registry.activeProjectId = projectId;
      saveRegistry(registry);
      sendJson(res, 200, { ok: true, activeProjectId: projectId });
      return true;
    }
    sendJson(res, 400, { error: "Invalid or missing projectId" });
    return true;
  }
  if (req.method === "GET" && (pathname === "/api/fs/browse" || pathname.startsWith("/api/fs/browse"))) {
    let rawDir = searchParams.get("dir") || "";
    let targetDir = rawDir.trim();
    if (!targetDir) {
      targetDir = getSafeInitialBrowseDir();
    } else {
      targetDir = path26.resolve(path26.normalize(targetDir));
      if (!isAllowedBrowsePath(targetDir)) {
        sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        return true;
      }
    }
    try {
      if (!fs24.existsSync(targetDir)) {
        targetDir = getSafeInitialBrowseDir();
      }
      const stat = fs24.statSync(targetDir);
      if (!stat.isDirectory()) {
        targetDir = path26.dirname(targetDir);
      }
      if (!isAllowedBrowsePath(targetDir)) {
        sendJson(res, 403, { error: "Forbidden: Path is outside allowed roots" });
        return true;
      }
      const parent = path26.dirname(targetDir);
      const parentPath = parent !== targetDir && isAllowedBrowsePath(parent) ? parent : null;
      let entries = [];
      let dirWarning = void 0;
      try {
        entries = fs24.readdirSync(targetDir, { withFileTypes: true });
      } catch (readErr) {
        console.warn(`[gripm FS] Cannot scan ${targetDir}: ${readErr.message}`);
        dirWarning = readErr.code === "EPERM" || readErr.code === "EACCES" ? `Permiso restringido por el sistema al explorar esta carpeta (${readErr.message}). Puedes escribir o pegar la ruta exacta manualmente.` : `No se pudieron leer subcarpetas: ${readErr.message}`;
      }
      const folders = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".") && entry.name !== ".backlog") continue;
        if (["node_modules", "dist", "build", ".git", "$RECYCLE.BIN", "System Volume Information"].includes(entry.name)) continue;
        const fullPath = path26.join(targetDir, entry.name);
        let isGit = false;
        let hasBacklog = false;
        try {
          isGit = fs24.existsSync(path26.join(fullPath, ".git"));
          hasBacklog = fs24.existsSync(path26.join(fullPath, "backlog")) || fs24.existsSync(path26.join(fullPath, ".backlog"));
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
        isCurrentGit = fs24.existsSync(path26.join(targetDir, ".git"));
        hasCurrentBacklog = fs24.existsSync(path26.join(targetDir, "backlog")) || fs24.existsSync(path26.join(targetDir, ".backlog"));
        hasCurrentGripm = fs24.existsSync(path26.join(targetDir, ".gripm"));
      } catch {
      }
      sendJson(res, 200, {
        ok: true,
        currentPath: targetDir,
        parentPath,
        folders,
        isGit: isCurrentGit,
        hasBacklog: hasCurrentBacklog,
        hasGripm: hasCurrentGripm,
        warning: dirWarning
      });
      return true;
    } catch (browseErr) {
      const safeDir = getSafeInitialBrowseDir();
      const parent = path26.dirname(safeDir);
      const parentPath = parent !== safeDir && isAllowedBrowsePath(parent) ? parent : null;
      sendJson(res, 200, {
        ok: true,
        currentPath: safeDir,
        parentPath,
        folders: [],
        warning: `No se pudo acceder a la ruta solicitada (${browseErr.message}). Se carg\xF3 una ruta segura.`
      });
      return true;
    }
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/detect-storage$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/detect-storage$/)[1]);
    const p = registry.projects.find((proj) => proj.id === id);
    if (!p) {
      sendJson(res, 404, { error: "Project not found" });
      return true;
    }
    const detection = detectProjectStorage(p.repoPath);
    sendJson(res, 200, { ok: true, ...detection });
    return true;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/convert-to-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-md$/)[1]);
    const project = registry.projects.find((proj) => proj.id === id);
    if (!project || !project.repoPath) {
      sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      return true;
    }
    const currentBacklog = readProjectBacklog2(project);
    const tasksDir = path26.join(project.repoPath, "backlog/tasks");
    if (!fs24.existsSync(tasksDir)) {
      fs24.mkdirSync(tasksDir, { recursive: true });
    }
    let converted = 0;
    for (const item of currentBacklog.items) {
      BacklogService.saveTask({ ...project, storageType: "markdown", backlogDir: "backlog" }, item);
      converted++;
    }
    project.storageType = "markdown";
    project.backlogDir = "backlog";
    saveRegistry(registry);
    sendJson(res, 200, {
      ok: true,
      message: `Convertidos ${converted} items a Backlog.md en ${tasksDir}`,
      convertedCount: converted,
      tasksDir
    });
    return true;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/convert-to-json$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/convert-to-json$/)[1]);
    const project = registry.projects.find((proj) => proj.id === id);
    if (!project || !project.repoPath) {
      sendJson(res, 400, { error: "Project not found or lacks repoPath" });
      return true;
    }
    const currentBacklog = readProjectBacklog2(project);
    const jsonPath = path26.join(project.repoPath, ".gripm/backlog.json");
    const gripmDir = path26.dirname(jsonPath);
    if (!fs24.existsSync(gripmDir)) {
      fs24.mkdirSync(gripmDir, { recursive: true });
    }
    atomicWriteFileSync2(jsonPath, JSON.stringify(currentBacklog, null, 2), "utf8");
    project.storageType = "json";
    saveRegistry(registry);
    sendJson(res, 200, {
      ok: true,
      message: `Unificadas ${currentBacklog.items.length} tareas en ${jsonPath}`,
      savedPath: jsonPath
    });
    return true;
  }
  if (req.method === "GET" && /^\/api\/projects\/[^/]+\/export-json$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-json$/)[1]);
    const project = registry.projects.find((proj) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    sendJson(res, 200, {
      ok: true,
      project,
      data: backlog
    });
    return true;
  }
  if (req.method === "GET" && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)[1]);
    const project = registry.projects.find((proj) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: "Project not found" });
      return true;
    }
    const result = BacklogService.exportBacklogMd(project, { save: false });
    sendJson(res, 200, {
      ok: true,
      content: result.content
    });
    return true;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/export-monolithic-md$/.test(pathname)) {
    const id = decodeURIComponent(pathname.match(/^\/api\/projects\/([^/]+)\/export-monolithic-md$/)[1]);
    const project = registry.projects.find((proj) => proj.id === id);
    if (!project) {
      sendJson(res, 404, { error: "Project not found" });
      return true;
    }
    if (!project.repoPath) {
      sendJson(res, 400, { error: "Project lacks repoPath" });
      return true;
    }
    await getBody(req, res).catch(() => ({}));
    const result = BacklogService.exportBacklogMd(project, { save: true });
    sendJson(res, 200, {
      ok: true,
      content: result.content,
      savedPath: result.savedPath
    });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/import") {
    try {
      const body = await getBody(req, res).catch(() => ({}));
      const projectId = body.projectId || registry.activeProjectId || registry.projects[0]?.id;
      const targetProject = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
      if (!targetProject) {
        sendJson(res, 404, { ok: false, error: "Proyecto no encontrado" });
        return true;
      }
      const docsDir = body.docsPath || getProjectDocsPath(targetProject);
      if (body.docsPath && !isAllowedBrowsePath(body.docsPath)) {
        sendJson(res, 403, { ok: false, error: "Forbidden: docsPath is outside allowed roots" });
        return true;
      }
      if (!docsDir || !fs24.existsSync(docsDir)) {
        sendJson(res, 400, {
          ok: false,
          error: `El proyecto "${targetProject.name}" no tiene una carpeta de documentaci\xF3n vinculada (/docs) v\xE1lida o existente.`
        });
        return true;
      }
      if (isBacklogMdProject(targetProject)) {
        const boardData = runMigration(docsDir, null, targetProject);
        let updatedCount = 0;
        for (const item of boardData.items || []) {
          item.projectId = targetProject.id;
          BacklogService.saveTask(targetProject, item);
          updatedCount++;
        }
        if (boardData.releases && boardData.releases.length > 0 && targetProject.repoPath) {
          const releasesPath = path26.join(targetProject.repoPath, targetProject.backlogDir || "backlog", "releases.json");
          try {
            if (!fs24.existsSync(path26.dirname(releasesPath))) fs24.mkdirSync(path26.dirname(releasesPath), { recursive: true });
            atomicWriteFileSync2(releasesPath, JSON.stringify(boardData.releases, null, 2), "utf8");
          } catch (relErr) {
            console.warn("[gripm] Error saving releases during import:", relErr.message);
          }
        }
        sendJson(res, 200, {
          ok: true,
          projectId: targetProject.id,
          projectName: targetProject.name,
          importedCount: updatedCount,
          releasesCount: boardData.releases?.length || 0,
          storageType: "markdown"
        });
        return true;
      } else {
        const targetFile = (await Promise.resolve().then(() => (init_registry(), registry_exports))).getProjectBacklogPath(targetProject);
        const boardData = runMigration(docsDir, targetFile, targetProject);
        sendJson(res, 200, {
          ok: true,
          projectId: targetProject.id,
          projectName: targetProject.name,
          importedCount: boardData.items?.length || 0,
          releasesCount: boardData.releases?.length || 0,
          storageType: "json"
        });
        return true;
      }
    } catch (importErr) {
      console.error("[gripm API] Error in /api/import:", importErr);
      sendJson(res, 500, { ok: false, error: importErr.message });
      return true;
    }
  }
  return false;
}
var init_projectsRoutes = __esm({
  "server/routes/projectsRoutes.ts"() {
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
  }
});

// server/routes/cyclesRoutes.ts
import fs25 from "node:fs";
import path27 from "node:path";
async function handleCyclesRoutes(req, res, pathname, searchParams, registry) {
  if (req.method === "POST" && pathname === "/api/releases") {
    const body = await getBody(req, res);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
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
    const itemCodeSet = new Set((release.itemCodes || []).map((c5) => c5.toUpperCase()));
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
    writeProjectBacklog2(project, backlog);
    sendJson(res, 201, { ok: true, release });
    return true;
  }
  if (req.method === "DELETE" && pathname.startsWith("/api/releases/")) {
    const releaseId = decodeURIComponent(pathname.replace("/api/releases/", ""));
    const project = registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    const initialCount = backlog.releases.length;
    backlog.releases = (backlog.releases || []).filter((r) => r.id !== releaseId && r.version !== releaseId);
    writeProjectBacklog2(project, backlog);
    sendJson(res, 200, { ok: true, deleted: initialCount > backlog.releases.length });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/releases/sync-legacy") {
    const body = await getBody(req, res);
    const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    if (project.repoPath) {
      const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, backlog.items);
      if (parsed.length > 0) {
        backlog.releases = parsed;
        const releasesPath = path27.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
        try {
          if (!fs25.existsSync(path27.dirname(releasesPath))) fs25.mkdirSync(path27.dirname(releasesPath), { recursive: true });
          atomicWriteFileSync2(releasesPath, JSON.stringify(backlog.releases, null, 2), "utf8");
        } catch (err) {
          console.warn(`[gripm API] Error saving synced releases:`, err.message);
        }
        broadcastSse("backlog_changed", { projectId: project.id, action: "releases_synced", timestamp: Date.now() });
      }
    }
    sendJson(res, 200, {
      ok: true,
      releases: backlog.releases,
      count: backlog.releases.length
    });
    return true;
  }
  if (req.method === "GET" && (pathname === "/api/sprints" || pathname.startsWith("/api/sprints"))) {
    const projectId = searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
    const project = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    sendJson(res, 200, { ok: true, sprints: backlog.sprints || [] });
    return true;
  }
  if (req.method === "POST" && pathname === "/api/sprints") {
    const body = await getBody(req, res);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
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
    writeProjectBacklog2(project, backlog);
    broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_created", sprintId: newSprint.id, timestamp: Date.now() });
    sendJson(res, 201, { ok: true, sprint: newSprint });
    return true;
  }
  if (req.method === "PUT" && pathname.startsWith("/api/sprints/")) {
    const sprintId = decodeURIComponent(pathname.replace("/api/sprints/", ""));
    const body = await getBody(req, res);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const project = registry.projects.find((p) => p.id === body.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    backlog.sprints = backlog.sprints || [];
    const sIdx = backlog.sprints.findIndex((s) => s.id === sprintId || s.name === sprintId);
    if (sIdx === -1) {
      sendJson(res, 404, { error: "Sprint no encontrado" });
      return true;
    }
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
        const retrosDir = path27.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
        if (!fs25.existsSync(retrosDir)) {
          fs25.mkdirSync(retrosDir, { recursive: true });
        }
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const sprintKey = String(updatedSprint.id || newName).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        const retroFile = path27.join(retrosDir, `${sprintKey}-retro.md`);
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
    writeProjectBacklog2(project, backlog);
    broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_updated", sprintId: updatedSprint.id, timestamp: Date.now() });
    sendJson(res, 200, { ok: true, sprint: updatedSprint });
    return true;
  }
  if (req.method === "GET" && (pathname === "/api/retros" || pathname.startsWith("/api/retros"))) {
    const projectId = searchParams.get("projectId");
    const project = registry.projects.find((p) => p.id === projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const retrosDir = path27.join(project.repoPath || "", project.backlogDir || "backlog", "retros");
    if (!fs25.existsSync(retrosDir)) {
      sendJson(res, 200, { retros: [] });
      return true;
    }
    const files = fs25.readdirSync(retrosDir).filter((f) => f.endsWith(".md"));
    const retros = files.map((f) => {
      const full = path27.join(retrosDir, f);
      const raw = fs25.readFileSync(full, "utf8");
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
    sendJson(res, 200, { retros });
    return true;
  }
  if (req.method === "DELETE" && pathname.startsWith("/api/sprints/")) {
    const sprintId = decodeURIComponent(pathname.replace("/api/sprints/", ""));
    const projectId = searchParams.get("projectId") || registry.activeProjectId || registry.projects[0]?.id;
    const project = registry.projects.find((p) => p.id === projectId) || registry.projects[0];
    if (!project) {
      sendJson(res, 400, { error: "Project not found" });
      return true;
    }
    const backlog = readProjectBacklog2(project);
    backlog.sprints = backlog.sprints || [];
    const sIdx = backlog.sprints.findIndex((s) => s.id === sprintId || s.name === sprintId);
    if (sIdx === -1) {
      sendJson(res, 404, { error: "Sprint no encontrado" });
      return true;
    }
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
    writeProjectBacklog2(project, backlog);
    broadcastSse("backlog_changed", { projectId: project.id, action: "sprint_deleted", sprintId, timestamp: Date.now() });
    sendJson(res, 200, { ok: true, deleted: true });
    return true;
  }
  return false;
}
var init_cyclesRoutes = __esm({
  "server/routes/cyclesRoutes.ts"() {
    "use strict";
    init_storage();
    init_backlogService();
    init_registry();
    init_atomicWrite();
    init_sseManager();
    init_security();
  }
});

// server/routes/api.ts
import fs26 from "node:fs";
import path28 from "node:path";
async function handleApiRequest(req, res) {
  const url = req.url || "";
  const urlObj = new URL(url, "http://localhost");
  const pathname = decodeURIComponent(urlObj.pathname);
  const searchParams = urlObj.searchParams;
  try {
    const registry = getRegistry();
    const targetRepoEnv = process.env.GRIPM_TARGET_REPO;
    const targetRepo = targetRepoEnv ? path28.resolve(targetRepoEnv) : path28.resolve(process.cwd());
    const targetProject = registry.projects.find((p) => p.repoPath && path28.resolve(p.repoPath) === targetRepo);
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
    if (pathname.startsWith("/api/audit")) {
      const handled = await handleAuditRoutes(req, res, pathname, activeProject, registry);
      if (handled) return;
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
      clearAuditCache(project?.repoPath);
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
        const backlog = readProjectBacklog2(p);
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
          if (err?.message && (err.message.includes("not found") || err.message.includes("no encontrada"))) {
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
          return sendJson(res, 400, { error: err.message });
        }
      }
      return sendJson(res, 404, { error: "Item not found in any registered project" });
    }
    const handledProjects = await handleProjectsRoutes(req, res, pathname, url, searchParams, activeProject, registry, isSingleMode);
    if (handledProjects) return;
    const handledCycles = await handleCyclesRoutes(req, res, pathname, searchParams, registry);
    if (handledCycles) return;
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
    init_sseManager();
    init_security();
    init_registryConfig();
    init_updateChecker();
    init_audit();
    init_projectsRoutes();
    init_cyclesRoutes();
    appVersion = "1.0.0";
    try {
      const pkg = JSON.parse(fs26.readFileSync(path28.resolve(PKG_ROOT4, "package.json"), "utf8"));
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
import fs27 from "node:fs";
import path29 from "node:path";
import os3 from "node:os";
import { fileURLToPath as fileURLToPath11 } from "node:url";
import { execFile } from "node:child_process";

// scripts/initScaffold.js
init_registryConfig();
import fs9 from "node:fs";
import path9 from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath as fileURLToPath7 } from "node:url";

// scripts/init/catalog.js
import fs3 from "node:fs";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
function findPackageRoot(startDir) {
  let curr = startDir;
  while (curr && curr !== path3.dirname(curr)) {
    if (fs3.existsSync(path3.join(curr, "package.json"))) {
      return curr;
    }
    curr = path3.dirname(curr);
  }
  return path3.resolve(startDir, "../..");
}
var PKG_ROOT = findPackageRoot(__dirname2);
var PRESETS = {
  minimal: {
    id: "minimal",
    nameEn: "Minimalist AI-First",
    nameEs: "Minimalista AI-First",
    descriptionEn: "Pure Kanban, no timeboxes or ceremonies, agent skill & clean backlog",
    descriptionEs: "Kanban puro, sin timeboxes ni ceremonias, skill de agente y backlog limpio",
    methodology: "kanban",
    defaultView: "kanban",
    mode: "single",
    modules: {
      sprint: false,
      release: true,
      timeline: false,
      metrics: false,
      calendar: false
    },
    enabledTabs: {
      kanban: true,
      sprint: false,
      release: true,
      timeline: false,
      metrics: false
    },
    kanban: {
      showIdeasByDefault: false,
      showDoneHistoryByDefault: false,
      wipLimits: {
        "col-doing": 0,
        "col-review": 0,
        "col-ready": 0
      }
    },
    estimation: {
      enabled: false,
      method: "fibonacci"
    },
    assets: {
      skill: true,
      agentsMd: false,
      packageJson: true,
      gitignore: true
    }
  },
  full: {
    id: "full",
    nameEn: "Batteries Included",
    nameEs: "Baterias Incluidas",
    descriptionEn: "Full Scrum with Sprints, Releases, Timeline, Metrics and AGENTS.md",
    descriptionEs: "Scrum completo con Sprints, Releases, Timeline, Metricas y AGENTS.md",
    methodology: "scrum",
    defaultView: "kanban",
    mode: "single",
    modules: {
      sprint: true,
      release: true,
      timeline: true,
      metrics: true,
      calendar: true
    },
    enabledTabs: {
      kanban: true,
      sprint: true,
      release: true,
      timeline: true,
      metrics: true
    },
    kanban: {
      showIdeasByDefault: true,
      showDoneHistoryByDefault: false,
      wipLimits: {
        "col-doing": 0,
        "col-review": 0,
        "col-ready": 0
      }
    },
    estimation: {
      enabled: true,
      method: "fibonacci"
    },
    assets: {
      skill: true,
      agentsMd: true,
      packageJson: true,
      gitignore: true
    }
  }
};
var COCKPIT_MODULES = [
  { key: "release", nameEn: "Releases (Version management & changelog)", nameEs: "Releases (Gestion de versiones y changelog)", defaultOn: true },
  { key: "sprint", nameEn: "Sprints (Timeboxes & active iterations)", nameEs: "Sprints (Timeboxes e iteraciones activas)", defaultOn: false },
  { key: "timeline", nameEn: "Timeline / Roadmap (Schedule & milestone view)", nameEs: "Timeline / Roadmap (Planificacion temporal)", defaultOn: false },
  { key: "metrics", nameEn: "Metrics / Analytics (Velocity & throughput)", nameEs: "Metricas / Analitica (Velocidad y flujo)", defaultOn: false },
  { key: "calendar", nameEn: "Calendar Export (.ics integration)", nameEs: "Exportacion de Calendario (.ics)", defaultOn: false },
  { key: "estimation", nameEn: "Estimation (Fibonacci story points)", nameEs: "Estimacion (Puntos de historia Fibonacci)", defaultOn: false },
  { key: "ideas", nameEn: "Ideas / Discovery column in Kanban", nameEs: "Columna de Ideas / Descubrimiento en Kanban", defaultOn: false }
];
var REPO_ASSETS = [
  { key: "skill", nameEn: "Agent skill (.agents/skills/gripm/SKILL.md)", nameEs: "Skill de agente (.agents/skills/gripm/SKILL.md)", defaultOn: true },
  { key: "agentsMd", nameEn: "AGENTS.md guide (AI contribution rules)", nameEs: "Guia AGENTS.md (Reglas de contribucion para agentes)", defaultOn: true },
  { key: "packageJson", nameEn: 'package.json start scripts ("board", "mcp")', nameEs: 'Scripts de inicio en package.json ("board", "mcp")', defaultOn: true },
  { key: "gitignore", nameEn: ".gitignore rules for local cache & temporary files", nameEs: "Reglas en .gitignore para cache local y temporales", defaultOn: true }
];
function renderManifest(plan, isEn = true) {
  const on = "[ON] ";
  const off = "[OFF]";
  const rows = [
    { label: isEn ? "Methodology" : "Metodologia", state: `${plan.methodology || "kanban"}` },
    { label: isEn ? "Mode" : "Modo", state: plan.mode === "multi" ? isEn ? "Multi-Project Hub" : "Hub Multi-Proyecto" : isEn ? "Single-Project" : "Mono-Proyecto" },
    { label: isEn ? "Kanban board" : "Tablero Kanban", state: on },
    { label: isEn ? "Releases module" : "Modulo Releases", state: plan.modules?.release ? on : off },
    { label: isEn ? "Sprints module" : "Modulo Sprints", state: plan.modules?.sprint ? on : off },
    { label: isEn ? "Timeline / Roadmap" : "Timeline / Roadmap", state: plan.modules?.timeline ? on : off },
    { label: isEn ? "Metrics / Analytics" : "Metricas / Analitica", state: plan.modules?.metrics ? on : off },
    { label: isEn ? "Calendar export (.ics)" : "Exportacion Calendario", state: plan.modules?.calendar ? on : off },
    { label: isEn ? "Estimation (Story points)" : "Estimacion de puntos", state: plan.estimation?.enabled ? `${on} (${plan.estimation?.method || "fibonacci"})` : off },
    { label: isEn ? "Ideas / Discovery column" : "Columna Ideas / Descubrimiento", state: plan.kanban?.showIdeasByDefault ? on : off },
    { label: isEn ? "Agent skill (.agents/skills/gripm)" : "Skill de agente (.agents/skills/gripm)", state: plan.assets?.skill ? on : off },
    { label: isEn ? "AGENTS.md governance guide" : "Guia AGENTS.md de gobernanza", state: plan.assets?.agentsMd ? on : off },
    { label: isEn ? 'package.json scripts ("board", "mcp")' : 'Scripts en package.json ("board", "mcp")', state: plan.assets?.packageJson ? on : off },
    { label: isEn ? ".gitignore cache rules" : "Reglas de cache en .gitignore", state: plan.assets?.gitignore ? on : off },
    { label: isEn ? "Gripm Playbook framework" : "Framework Gripm Playbook", state: plan.playbook ? on : off }
  ];
  const header = isEn ? "  Capability Manifest ([ON] active, [OFF] available in Settings):\n  " + "-".repeat(60) : "  Manifiesto de Capacidades ([ON] activo, [OFF] disponible en Configuracion):\n  " + "-".repeat(60);
  const lines = rows.map((r) => `  ${r.state.padEnd(6)} ${r.label}`);
  return `${header}
${lines.join("\n")}
  ${"-".repeat(60)}`;
}
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
  console.warn(`[gripm init] WARNING: Could not find canonical skill template in "${sourceGripmSkill}". Generating basic stub.`);
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

// scripts/init/prompts.js
function parseMultiSelectInput(input, totalCount, defaultIndices = []) {
  if (input === void 0 || input === null || input.trim() === "") {
    return [...defaultIndices];
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === "all" || normalized === "todos" || normalized === "*") {
    return Array.from({ length: totalCount }, (_, i) => i);
  }
  if (normalized === "none" || normalized === "ninguno" || normalized === "0") {
    return [];
  }
  const tokens = input.split(/[, \t]+/).filter(Boolean);
  const selected = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    const num = parseInt(token, 10);
    if (!Number.isNaN(num)) {
      const idx = num - 1;
      if (idx >= 0 && idx < totalCount) {
        selected.add(idx);
      }
    }
  }
  return Array.from(selected).sort((a, b) => a - b);
}
async function promptMultiSelect(rl, title, items, defaultIndices, isEn = true) {
  console.log(`
  ${title}`);
  const defaultSet = new Set(defaultIndices);
  items.forEach((item, index) => {
    const isChecked = defaultSet.has(index);
    const mark = isChecked ? "[x]" : "[ ]";
    const label = isEn ? item.nameEn || item.name : item.nameEs || item.name || item.nameEn;
    console.log(`     ${index + 1}. ${mark} ${label}`);
  });
  const promptText = isEn ? "     Select items (e.g. 1,3,5 | all | none | Enter for default): " : "     Selecciona items (ej. 1,3,5 | all | none | Enter para default): ";
  const answer = await rl.question(promptText);
  const selectedIndices = parseMultiSelectInput(answer, items.length, defaultIndices);
  return selectedIndices.map((idx) => items[idx]);
}
async function promptChoice(rl, title, choices, defaultValue, isEn = true) {
  const defaultIndex = Math.max(0, choices.findIndex((choice) => choice.value === defaultValue));
  console.log(`
  ${title}`);
  choices.forEach((choice, index) => {
    const marker = index === defaultIndex ? isEn ? " [Default]" : " [Predeterminado]" : "";
    console.log(`     ${index + 1}. ${choice.label}${marker}`);
  });
  const answer = await rl.question(
    isEn ? `     Select option [${defaultIndex + 1}]: ` : `     Selecciona opci\xF3n [${defaultIndex + 1}]: `
  );
  const selectedIndex = Number.parseInt(answer.trim(), 10) - 1;
  return choices[selectedIndex]?.value || choices[defaultIndex].value;
}
async function promptPlaybookOptions(rl, choices, defaults = {}, isEn = true) {
  const listOptions = ["harnesses", "skills", "rules", "scripts", "docs"];
  const selected = {};
  for (const key of listOptions) {
    const listTitle = isEn ? `Playbook ${key}:` : `${key === "harnesses" ? "Harnesses" : key} de Playbook:`;
    const options = choices[key].map((choice) => ({
      ...choice,
      key: choice.value,
      name: choice.label,
      nameEn: choice.label,
      nameEs: choice.label
    }));
    const values = defaults[key] ?? choices[key].map((choice) => choice.value);
    const selectedItems = await promptMultiSelect(
      rl,
      listTitle,
      options,
      options.flatMap((option, index) => values.includes(option.value) ? [index] : []),
      isEn
    );
    selected[key] = selectedItems.map((item) => item.value);
  }
  selected.preset = await promptChoice(
    rl,
    isEn ? "Playbook rigor:" : "Rigor de Playbook:",
    choices.presets,
    defaults.preset || "pragmatic",
    isEn
  );
  selected.automation = await promptChoice(
    rl,
    isEn ? "Playbook automation:" : "Automatizaci\xF3n de Playbook:",
    choices.automation,
    defaults.automation || "automated",
    isEn
  );
  return selected;
}
async function promptLanguage(rl) {
  const answer = await rl.question(
    "  1. Language / Idioma:\n     [1] English (en) [Default]\n     [2] Espa\xF1ol (es)\n     Select option / Selecciona opci\xF3n [1]: "
  );
  const trimmed = answer.trim().toLowerCase();
  return trimmed === "2" || trimmed === "es" ? "es" : "en";
}
async function promptSuite(rl, isEn = true) {
  const promptText = isEn ? "\n  2. Suite Products to configure:\n     [1] Gripm Board & MCP (Kanban board, MCP server & Cockpit) [Default]\n     [2] Gripm Playbook (Multi-agent agile framework & UX auditor)\n     [3] Both (Gripm Board + Gripm Playbook)\n     [4] None (Cancel)\n     Select option [1]: " : "\n  2. Productos de la Suite a configurar:\n     [1] Gripm Board & MCP (Tablero Kanban, servidor MCP y Cockpit) [Default]\n     [2] Gripm Playbook (Framework agil multi-agente y auditor UX)\n     [3] Ambos (Gripm Board + Gripm Playbook)\n     [4] Ninguno (Cancelar)\n     Selecciona opci\xF3n [1]: ";
  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === "2") return "playbook";
  if (trimmed === "3") return "both";
  if (trimmed === "4") return "none";
  return "board";
}
async function promptIdentity(rl, defaultName, defaultPrefix, isEn = true) {
  const namePrompt = isEn ? `
  3. Project name [${defaultName}]: ` : `
  3. Nombre del proyecto [${defaultName}]: `;
  const nameAnswer = await rl.question(namePrompt);
  const projectName = nameAnswer.trim() || defaultName;
  let suggestedPrefix = defaultPrefix;
  if (nameAnswer.trim()) {
    suggestedPrefix = projectName.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "PROJ";
  }
  const prefixPrompt = isEn ? `     Task code prefix [${suggestedPrefix}] (2-10 alphanumeric chars): ` : `     Prefijo de c\xF3digo para tareas [${suggestedPrefix}] (2-10 caracteres alfanum\xE9ricos): `;
  const prefixAnswer = await rl.question(prefixPrompt);
  let codePrefix = prefixAnswer.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (codePrefix.length < 2) {
    codePrefix = suggestedPrefix;
  } else if (codePrefix.length > 10) {
    codePrefix = codePrefix.substring(0, 10);
  }
  const projectId = projectName.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9_-]/g, "-");
  return { projectName, projectId, codePrefix };
}
async function promptSpeed(rl, isEn = true) {
  const promptText = isEn ? "\n  4. Configuration Speed:\n     [1] Quick Mode (Presets: Minimalist AI-First or Batteries Included) [Default]\n     [2] Component-by-Component (Full granular control)\n     Select option [1]: " : "\n  4. Velocidad de Configuraci\xF3n:\n     [1] Modo R\xE1pido (Presets: Minimalista AI-First o Bater\xEDas Incluidas) [Default]\n     [2] Componente por Componente (Control granular total)\n     Selecciona opci\xF3n [1]: ";
  const answer = await rl.question(promptText);
  return answer.trim() === "2" ? "granular" : "quick";
}
async function promptPreset(rl, isEn = true, recommendedPreset = "minimal") {
  const isFullRecommended = recommendedPreset === "full";
  const defaultOption = isFullRecommended ? "2" : "1";
  const recBadge1 = !isFullRecommended ? isEn ? " [Recommended]" : " [Recomendado]" : "";
  const recBadge2 = isFullRecommended ? isEn ? " [Recommended]" : " [Recomendado]" : "";
  const promptText = isEn ? `
  4.1 Select Preset:
      [1] Minimalist AI-First (Pure Kanban, no timeboxes, skill & clean backlog)${recBadge1}
      [2] Batteries Included (Full Scrum with Sprints, Releases, Timeline & Metrics)${recBadge2}
      Select option [${defaultOption}]: ` : `
  4.1 Seleccionar Preset:
      [1] Minimalista AI-First (Kanban puro, sin timeboxes, skill y backlog limpio)${recBadge1}
      [2] Bater\xEDas Incluidas (Scrum completo con Sprints, Releases, Timeline y M\xE9tricas)${recBadge2}
      Selecciona opci\xF3n [${defaultOption}]: `;
  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === "1") return "minimal";
  if (trimmed === "2") return "full";
  return defaultOption === "2" ? "full" : "minimal";
}
async function promptMethodology(rl, isEn = true) {
  const promptText = isEn ? "\n  4.1 Methodology:\n      [1] Pure Kanban (Continuous flow, no sprint timeboxes) [Default]\n      [2] Scrum (Timeboxes and active sprints)\n      [3] Scrumban (Mixed flow with sprint planning & continuous board)\n      Select option [1]: " : "\n  4.1 Metodolog\xEDa:\n      [1] Kanban puro (Flujo continuo, sin timeboxes de sprint) [Default]\n      [2] Scrum (Timeboxes y sprints activos)\n      [3] Scrumban (Flujo mixto con planificaci\xF3n de sprint y tablero continuo)\n      Selecciona opci\xF3n [1]: ";
  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === "2") return "scrum";
  if (trimmed === "3") return "scrumban";
  return "kanban";
}
async function promptMode(rl, isEn = true) {
  const promptText = isEn ? "\n  4.2 Instantiation Mode:\n      [1] Single-Project (Recommended: isolated, self-contained board) [Default]\n      [2] Multi-Project (Register in global Hub to view alongside other repositories)\n      Select option [1]: " : "\n  4.2 Modo de Instanciaci\xF3n:\n      [1] Mono-Proyecto (Recomendado: tablero aislado y autocontenido) [Default]\n      [2] Multi-Proyecto (Registrar en el Hub global para verlo junto a otros repositorios)\n      Selecciona opci\xF3n [1]: ";
  const answer = await rl.question(promptText);
  return answer.trim() === "2" ? "multi" : "single";
}
async function promptConfirm(rl, question, defaultYes = true) {
  const suffix = defaultYes ? " (Y/n) [Y]: " : " (y/N) [N]: ";
  const answer = await rl.question(`
  ${question}${suffix}`);
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return defaultYes;
  return trimmed === "y" || trimmed === "yes" || trimmed === "s" || trimmed === "si" || trimmed === "s\xED";
}
function printDiagnosticSnapshot(report, { hasTypeScript, recommendedProfile, isEn }) {
  const isColorSupported5 = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
  const c5 = {
    bold: (s) => isColorSupported5 ? `\x1B[1m${s}\x1B[0m` : s,
    dim: (s) => isColorSupported5 ? `\x1B[2m${s}\x1B[0m` : s,
    green: (s) => isColorSupported5 ? `\x1B[32m${s}\x1B[0m` : s,
    cyan: (s) => isColorSupported5 ? `\x1B[36m${s}\x1B[0m` : s,
    yellow: (s) => isColorSupported5 ? `\x1B[33m${s}\x1B[0m` : s,
    red: (s) => isColorSupported5 ? `\x1B[31m${s}\x1B[0m` : s
  };
  const stripAnsi2 = (str) => String(str).replace(/\x1b\[[0-9;]*m/g, "");
  const makeLine = (label, val = "", width = 68) => {
    const innerWidth = width - 4;
    const pLabel = stripAnsi2(label);
    const pVal = stripAnsi2(val);
    const sp = Math.max(1, innerWidth - (pLabel.length + pVal.length));
    return `  \u2502 ${label}${" ".repeat(sp)}${val} \u2502`;
  };
  const score = report?.score ?? 100;
  const scoreColor = score >= 80 ? c5.green : score >= 50 ? c5.yellow : c5.red;
  const filesCount = report?.summary?.totalFilesScanned ?? 0;
  const tsText = hasTypeScript ? isEn ? "Detected" : "Detectado" : isEn ? "None" : "No detectado";
  const testFw = report?.tests?.framework ? `${report.tests.framework} (${report.tests.verifyCommand || "npm test"})` : report?.tests?.hasTests ? isEn ? "Detected" : "Detectado" : isEn ? "None" : "No detectado";
  const locIssues = report?.summary?.locViolationsCount ?? 0;
  const criticalLoc = report?.loc?.violations?.filter((v) => v.status === "error" || v.lines >= 1e3)?.length ?? 0;
  const suppressions = report?.summary?.suppressionsCount ?? 0;
  const todosCount = report?.summary?.todosCount ?? 0;
  const recText = recommendedProfile === "full" ? isEn ? "Batteries-Included (Scrum / Sprints)" : "Bater\xEDas Incluidas (Scrum / Sprints)" : isEn ? "Minimalist AI-First (Kanban)" : "Minimalista AI-First (Kanban)";
  console.log(`  ${c5.bold(isEn ? "Codebase Health & Diagnostic Snapshot:" : "Radiograf\xEDa Inicial y Diagn\xF3stico del Repositorio:")}`);
  console.log("  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log(makeLine(isEn ? "Health Score:" : "Salud de C\xF3digo:", scoreColor(`${score}/100`)));
  console.log(makeLine(isEn ? "Files Scanned:" : "Archivos Escaneados:", `${filesCount} ${isEn ? "files" : "archivos"}`));
  console.log(makeLine("TypeScript:", tsText));
  console.log(makeLine(isEn ? "Test Runner:" : "Infraestructura Tests:", testFw));
  console.log(makeLine(isEn ? "LOC Issues:" : "L\xEDmites LOC:", `${locIssues} (${criticalLoc} ${isEn ? "critical >= 1000" : "cr\xEDticos >= 1000"})`));
  console.log(makeLine(isEn ? "Suppressions:" : "Supresiones Calidad:", String(suppressions)));
  console.log(makeLine(isEn ? "TODO / Debt:" : "Deuda Oculta:", `${todosCount} ${isEn ? "markers" : "marcadores"}`));
  console.log(makeLine(isEn ? "Recommended Profile:" : "Perfil Recomendado:", c5.cyan(recText)));
  console.log("  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n");
}

// scripts/init/writers.js
init_registryConfig();
import fs4 from "node:fs";
import path4 from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path4.dirname(__filename3);
function findPackageRoot2(startDir) {
  let curr = startDir;
  while (curr && curr !== path4.dirname(curr)) {
    if (fs4.existsSync(path4.join(curr, "package.json"))) {
      return curr;
    }
    curr = path4.dirname(curr);
  }
  return path4.resolve(startDir, "../..");
}
var PKG_ROOT2 = findPackageRoot2(__dirname3);
function writeConfig(targetRepo, configData, isEn = true) {
  const gripmDir = path4.join(targetRepo, ".gripm");
  if (!fs4.existsSync(gripmDir)) {
    fs4.mkdirSync(gripmDir, { recursive: true });
  }
  const configFile = path4.join(gripmDir, "config.json");
  let existing = {};
  if (fs4.existsSync(configFile)) {
    try {
      existing = JSON.parse(fs4.readFileSync(configFile, "utf8"));
    } catch {
    }
  }
  const explicitConfig = {
    projectName: configData.projectName || existing.projectName,
    projectId: configData.projectId || existing.projectId,
    codePrefix: configData.codePrefix || existing.codePrefix,
    language: configData.language || existing.language || "en",
    theme: configData.theme || existing.theme || "dark",
    density: configData.density || existing.density || "comfortable",
    autoSave: configData.autoSave !== void 0 ? configData.autoSave : existing.autoSave !== void 0 ? existing.autoSave : true,
    mode: configData.mode || existing.mode || "single",
    preset: configData.preset || existing.preset,
    automation: configData.automation || existing.automation,
    methodology: configData.methodology || existing.methodology || "kanban",
    defaultView: configData.defaultView || existing.defaultView || "kanban",
    modules: {
      sprint: Boolean(configData.modules?.sprint ?? existing.modules?.sprint),
      release: configData.modules?.release !== void 0 ? Boolean(configData.modules.release) : existing.modules?.release !== void 0 ? Boolean(existing.modules.release) : true,
      timeline: Boolean(configData.modules?.timeline ?? existing.modules?.timeline),
      metrics: Boolean(configData.modules?.metrics ?? existing.modules?.metrics),
      calendar: Boolean(configData.modules?.calendar ?? existing.modules?.calendar)
    },
    enabledTabs: {
      kanban: configData.enabledTabs?.kanban !== void 0 ? Boolean(configData.enabledTabs.kanban) : existing.enabledTabs?.kanban !== void 0 ? Boolean(existing.enabledTabs.kanban) : true,
      sprint: Boolean(configData.enabledTabs?.sprint ?? configData.modules?.sprint ?? existing.enabledTabs?.sprint ?? existing.modules?.sprint),
      release: configData.enabledTabs?.release !== void 0 ? Boolean(configData.enabledTabs.release) : configData.modules?.release !== void 0 ? Boolean(configData.modules.release) : existing.enabledTabs?.release !== void 0 ? Boolean(existing.enabledTabs.release) : true,
      timeline: Boolean(configData.enabledTabs?.timeline ?? configData.modules?.timeline ?? existing.enabledTabs?.timeline ?? existing.modules?.timeline),
      metrics: Boolean(configData.enabledTabs?.metrics ?? configData.modules?.metrics ?? existing.enabledTabs?.metrics ?? existing.modules?.metrics)
    },
    kanban: {
      showIdeasByDefault: Boolean(configData.kanban?.showIdeasByDefault ?? existing.kanban?.showIdeasByDefault),
      showDoneHistoryByDefault: Boolean(configData.kanban?.showDoneHistoryByDefault ?? existing.kanban?.showDoneHistoryByDefault),
      wipLimits: configData.kanban?.wipLimits || existing.kanban?.wipLimits || {
        "col-doing": 0,
        "col-review": 0,
        "col-ready": 0
      }
    },
    estimation: {
      enabled: Boolean(configData.estimation?.enabled ?? existing.estimation?.enabled),
      method: configData.estimation?.method || existing.estimation?.method || "fibonacci"
    },
    version: "1.0.0"
  };
  if (configData.verifyCommand || existing.verifyCommand) {
    explicitConfig.verifyCommand = configData.verifyCommand || existing.verifyCommand;
  }
  if (configData.audit || existing.audit) {
    explicitConfig.audit = configData.audit || existing.audit;
  }
  if (configData.guardrails || existing.guardrails) {
    explicitConfig.guardrails = configData.guardrails || existing.guardrails;
  }
  fs4.writeFileSync(configFile, JSON.stringify(explicitConfig, null, 2) + "\n", "utf8");
  console.log(
    isEn ? `  \u2705 .gripm/config.json saved (Project: ${explicitConfig.projectName}, Language: ${explicitConfig.language}, Mode: ${explicitConfig.mode === "single" ? "Single-Project" : "Multi-Project Hub"}${explicitConfig.verifyCommand ? `, verify: ${explicitConfig.verifyCommand}` : ""})` : `  \u2705 .gripm/config.json guardado (Proyecto: ${explicitConfig.projectName}, Idioma: ${explicitConfig.language}, Modo: ${explicitConfig.mode === "single" ? "Mono-Proyecto" : "Multi-Proyecto Hub"}${explicitConfig.verifyCommand ? `, verify: ${explicitConfig.verifyCommand}` : ""})`
  );
  return explicitConfig;
}
function ensureTasksDir(targetRepo, isEn = true) {
  const tasksDir = path4.join(targetRepo, "backlog/tasks");
  if (!fs4.existsSync(tasksDir)) {
    fs4.mkdirSync(tasksDir, { recursive: true });
    console.log(isEn ? "  \u2705 backlog/tasks/ directory created for Markdown tasks" : "  \u2705 Directorio backlog/tasks/ creado para tareas Markdown");
    return { created: true };
  }
  console.log(isEn ? "  \u2139\uFE0F  Existing backlog/tasks/ directory preserved" : "  \u2139\uFE0F  Directorio backlog/tasks/ existente preservado");
  return { created: false };
}
function registerInHub(targetRepo, meta, isEn = true) {
  try {
    const registry = loadRegistryFile(PKG_ROOT2);
    const existingIdx = registry.projects.findIndex((p) => p.id === meta.projectId || p.repoPath && path4.resolve(p.repoPath) === path4.resolve(targetRepo));
    const projectEntry = {
      id: meta.projectId,
      name: meta.projectName,
      codePrefix: meta.codePrefix,
      repoPath: path4.resolve(targetRepo),
      storageType: "markdown",
      backlogDir: "backlog",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIdx !== -1) {
      registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...projectEntry };
    } else {
      registry.projects.unshift(projectEntry);
    }
    registry.activeProjectId = meta.projectId;
    saveRegistryFile(registry, PKG_ROOT2);
    console.log(isEn ? "  \u2705 Project registered in global Hub (~/.gripm/registry.json)" : "  \u2705 Proyecto registrado en el Hub global (~/.gripm/registry.json)");
    return true;
  } catch (err) {
    console.warn(isEn ? "  \u26A0\uFE0F Could not register in global Hub:" : "  \u26A0\uFE0F No se pudo registrar en el Hub global:", err.message);
    return false;
  }
}
function writeSkill(targetRepo, language, isEn = true) {
  const skillContent = getSkillTemplate(language);
  const gripmSkillDir = path4.join(targetRepo, ".agents/skills/gripm");
  if (!fs4.existsSync(gripmSkillDir)) {
    fs4.mkdirSync(gripmSkillDir, { recursive: true });
  }
  fs4.writeFileSync(path4.join(gripmSkillDir, "SKILL.md"), skillContent, "utf8");
  console.log(
    isEn ? `  \u2705 Agent skill installed at .agents/skills/gripm/SKILL.md (${language})` : `  \u2705 Skill para agentes instalada en .agents/skills/gripm/SKILL.md (${language})`
  );
  return true;
}
function writeAgentsMd(targetRepo, projectName, language, force = false, isEn = true) {
  const agentsMdPath = path4.join(targetRepo, "AGENTS.md");
  if (!fs4.existsSync(agentsMdPath) || force) {
    fs4.writeFileSync(agentsMdPath, getAgentsMdTemplate(projectName, language), "utf8");
    console.log(
      isEn ? `  \u2705 Governance guide generated at AGENTS.md (${language})` : `  \u2705 Gu\xEDa de gobernanza generada en AGENTS.md (${language})`
    );
    return true;
  }
  console.log(isEn ? "  \u2139\uFE0F  Existing AGENTS.md preserved" : "  \u2139\uFE0F  AGENTS.md existente preservado");
  return true;
}
function writePackageJsonScripts(targetRepo, isEn = true) {
  const hostPkgPath = path4.join(targetRepo, "package.json");
  if (!fs4.existsSync(hostPkgPath)) return false;
  try {
    const pkg = JSON.parse(fs4.readFileSync(hostPkgPath, "utf8"));
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
      fs4.writeFileSync(hostPkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      console.log(isEn ? '  \u2705 Scripts "board" and "mcp" added to package.json' : '  \u2705 Scripts "board" y "mcp" agregados a package.json');
    } else {
      console.log(isEn ? "  \u2139\uFE0F  package.json scripts were already configured" : "  \u2139\uFE0F  Scripts de package.json ya estaban configurados");
    }
    return true;
  } catch (err) {
    console.warn(isEn ? "  \u26A0\uFE0F Could not update package.json:" : "  \u26A0\uFE0F No se pudo actualizar package.json:", err.message);
    return false;
  }
}
function writeGitignore(targetRepo, isEn = true) {
  const gitignorePath = path4.join(targetRepo, ".gitignore");
  const ignoreLines = [
    "",
    "# gripm local cache",
    ".gripm/update-cache.json",
    ".gripm/*.tmp"
  ].join("\n");
  if (fs4.existsSync(gitignorePath)) {
    const content = fs4.readFileSync(gitignorePath, "utf8");
    if (!content.includes(".gripm/update-cache.json")) {
      fs4.appendFileSync(gitignorePath, ignoreLines + "\n", "utf8");
      console.log(isEn ? "  \u2705 gripm rules added to .gitignore" : "  \u2705 Reglas de gripm a\xF1adidas a .gitignore");
    } else {
      console.log(isEn ? "  \u2139\uFE0F  .gitignore already contained gripm rules" : "  \u2139\uFE0F  .gitignore ya conten\xEDa las reglas de gripm");
    }
  } else {
    fs4.writeFileSync(gitignorePath, ignoreLines.trim() + "\n", "utf8");
    console.log(isEn ? "  \u2705 .gitignore file created with gripm rules" : "  \u2705 Archivo .gitignore creado con reglas de gripm");
  }
  return true;
}
function importTodosAsTasks(targetRepo, todos = [], options = {}) {
  const isEn = options.isEn !== false;
  const tasksDir = path4.join(targetRepo, "backlog/tasks");
  if (!fs4.existsSync(tasksDir)) {
    fs4.mkdirSync(tasksDir, { recursive: true });
  }
  const codePrefix = (options.codePrefix || "DEV").toUpperCase();
  let maxNum = 0;
  try {
    const existingFiles = fs4.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
    for (const f of existingFiles) {
      const match = f.match(new RegExp(`^${codePrefix}-(\\d+)`, "i"));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  } catch {
  }
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let importedCount = 0;
  const createdFiles = [];
  for (const todo of todos) {
    maxNum++;
    const taskId = `${codePrefix}-${String(maxNum).padStart(3, "0")}`;
    const cleanTitle = (todo.text || `Resolver ${todo.type} en ${todo.file}:${todo.line}`).replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 100) || `Resolver ${todo.type}`;
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "todo";
    const filename = `${taskId} - ${slug}.md`;
    const fullPath = path4.join(tasksDir, filename);
    const priority = todo.type === "BUG" ? "urgent" : todo.type === "FIXME" ? "high" : "medium";
    const itemType = todo.type === "BUG" || todo.type === "FIXME" ? "bug" : "tech_debt";
    const content = `---
id: ${taskId}
title: ${JSON.stringify(cleanTitle)}
status: draft
created_date: '${now}'
updated_date: '${now}'
labels:
  - "todo"
  - "code-audit"
  - ${JSON.stringify(todo.type.toLowerCase())}
priority: ${priority}
type: ${itemType}
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detectado autom\xE1ticamente por el esc\xE1ner est\xE1tico de c\xF3digo en \`${todo.file}:${todo.line}\`:

\`\`\`
${todo.snippet || todo.text}
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Resolver el marcador ${todo.type} identificado en ${todo.file}:${todo.line}
<!-- AC:END -->
`;
    fs4.writeFileSync(fullPath, content, "utf8");
    createdFiles.push(fullPath);
    importedCount++;
  }
  try {
    const cliBin = path4.join(PKG_ROOT2, "bin", "gripm-cli.js");
    const cliTs = path4.join(PKG_ROOT2, "scripts", "gripm-cli.ts");
    const syncScript = path4.join(PKG_ROOT2, "scripts", "verify-backlog-sync.js");
    if (fs4.existsSync(cliBin)) {
      execFileSync(process.execPath, [cliBin, "export"], { cwd: targetRepo, stdio: "pipe" });
    } else if (fs4.existsSync(cliTs)) {
      execFileSync(process.execPath, ["--experimental-strip-types", cliTs, "export"], { cwd: targetRepo, stdio: "pipe" });
    }
    if (fs4.existsSync(syncScript)) {
      execFileSync(process.execPath, [syncScript, "--fix"], { cwd: targetRepo, stdio: "pipe" });
    }
  } catch {
  }
  console.log(
    isEn ? `  \u2705 ${importedCount} TODOs imported as draft tasks in backlog/tasks/ and synced with BACKLOG.md` : `  \u2705 ${importedCount} TODOs importados como tareas borrador en backlog/tasks/ y sincronizados en BACKLOG.md`
  );
  return { importedCount, createdFiles };
}

// scripts/init/playbookDelegate.js
import fs6 from "node:fs";
import path6 from "node:path";
import { spawnSync } from "node:child_process";

// node_modules/@gripm/playbook/scripts/lib/adapters.mjs
var HARNESS_CHOICES = [
  { value: "antigravity", label: "Antigravity  -  AGENTS.md + .agents/ skills (installed by the sync)" },
  { value: "cursor", label: "Cursor       -  .cursor/rules/*.mdc" },
  { value: "claude", label: "Claude Code  -  CLAUDE.md" }
];
var NON_NEGOTIABLES = [
  '**No commit and no push without explicit verbal authorization.** "Looks good", "ok" and "proceed" mean implement code only.',
  "**Every change maps to a task in `backlog/tasks/`.** Dev moves `draft` to `doing` to `review`; only a clean-context QA sub-agent moves `review` to `ready` via `gate-qa <ID>` or `playbook gate <ID>` (or `node scripts/gate-qa.mjs <ID>`, exit code 0).",
  "**Never mark `done` during development.** `done` is reserved for a real release deploy.",
  "**Run the Verification Pyramid before any promotion:** repo consistency, headless tests, spec and backlog consistency, static UX audit, build.",
  "**No browser sub-agent for logic, state, API or persistence.** Those are audited headlessly in milliseconds."
].map((item, index) => `${index + 1}. ${item}`).join("\n");
var GIT_RULES = [
  "Never commit or push without explicit verbal authorization for **each** action.",
  "Commits, branches, and PRs must be 100% in imperative English (Conventional Commits), translating from Spanish tickets if necessary.",
  "One task, one consolidated commit: the code and the task file.",
  "Never run `git checkout` or `git restore` in the primary working tree while another agent works here.",
  "A `doing` item carrying a foreign `claimed_by` owns the tree: never revert or clean it.",
  "Foreign uncommitted changes in `git status --porcelain` (files `A ` or `M ` not created by the active session) mandate immediate worktree isolation: do not struggle with the dirty index or revert foreign work, isolate via worktree instead.",
  "Parallel work runs in isolated worktrees: `git worktree add -b <branch> ../<repo>-<task>`."
].map((item) => `- ${item}`).join("\n");

// node_modules/@gripm/playbook/scripts/lib/selection.mjs
import fs5 from "node:fs";
import path5 from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";
var __filename4 = fileURLToPath4(import.meta.url);
var PACKAGE_ROOT = path5.resolve(path5.dirname(__filename4), "..", "..");
var DEFAULT_CORE_SKILLS = [
  "pm-orchestrator",
  "market-researcher",
  "product-designer",
  "principal-engineer",
  "qa-auditor",
  "code-level-ux-auditor"
];
var VALID_SCRIPTS = [
  "gate:qa",
  "gate:review",
  "audit:ux",
  "audit:ux:strict",
  "audit:repo",
  "audit:repo:strict",
  "check:loc",
  "validate:commit"
];
var VALID_DOCS = [
  "domain",
  "sprint-spec"
];
var VALID_RULES = [
  "team-playbook",
  "state-machine",
  "git-workflow"
];
var PRESET_CHOICES = [
  { value: "pragmatic", label: "Pragmatic - Critical engineering & a11y checks (ignores cosmetic style warnings)" },
  { value: "strict", label: "Strict    - Full catalog enforcement (touch ergonomics, anti-slop, typography)" }
];
var AUTOMATION_CHOICES = [
  { value: "automated", label: "Automated - Delivery state flow (draft -> doing -> review -> ready -> done) managed by sub-agents" },
  { value: "manual", label: "Manual    - Human-driven state transitions with agent assistance" }
];
var SKILL_LABELS = {
  "pm-orchestrator": "pm-orchestrator      - Orchestration, Refinement Interview, Modes",
  "principal-engineer": "principal-engineer   - Architecture, typed implementation, blast radius",
  "qa-auditor": "qa-auditor           - Quality assurance, Verification Pyramid",
  "product-designer": "product-designer     - UI/UX design, design system, tokens, touch",
  "market-researcher": "market-researcher    - Market benchmarks, competitive analysis",
  "code-level-ux-auditor": "code-level-ux-auditor- Static UX auditing, a11y, layout collision"
};
var SCRIPT_LABELS = {
  "gate:qa": "gate:qa           - playbook gate (QA gatekeeper)",
  "gate:review": "gate:review       - playbook review (review items check)",
  "audit:ux": "audit:ux          - playbook audit (static UX auditor)",
  "audit:ux:strict": "audit:ux:strict   - playbook audit --strict",
  "audit:repo": "audit:repo        - playbook audit-repo (codebase health & anti-slop)",
  "audit:repo:strict": "audit:repo:strict - playbook audit-repo --strict",
  "check:loc": "check:loc         - playbook check-loc (file budget & modularity)",
  "validate:commit": "validate:commit   - playbook validate-commit (Conventional Commits)"
};
var DOC_LABELS = {
  domain: "domain      - docs/DOMAIN_TEMPLATE.md (domain glossary template)",
  "sprint-spec": "sprint-spec - docs/sprints/SPRINT_SPEC_TEMPLATE.md (sprint spec template)"
};
var RULE_LABELS = {
  "team-playbook": "team-playbook - .agents/TEAM_PLAYBOOK.md (roles and sub-agent contracts)",
  "state-machine": "state-machine - .agents/STATE_MACHINE.md (delivery status lifecycle: draft -> done)",
  "git-workflow": "git-workflow  - .agents/rules/git-workflow.md (Git discipline, worktrees, commits)"
};
function loadCatalogFromManifest(manifestOrRoot = null) {
  let manifest = null;
  if (typeof manifestOrRoot === "object" && manifestOrRoot !== null && !Array.isArray(manifestOrRoot)) {
    manifest = manifestOrRoot;
  } else {
    const root = typeof manifestOrRoot === "string" ? manifestOrRoot : PACKAGE_ROOT;
    const manifestPath = path5.join(root, ".playbook-manifest.json");
    if (fs5.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs5.readFileSync(manifestPath, "utf8"));
      } catch {
      }
    }
  }
  const skills = Array.isArray(manifest?.coreSkills) ? manifest.coreSkills : DEFAULT_CORE_SKILLS;
  return {
    skills,
    scripts: VALID_SCRIPTS,
    docs: VALID_DOCS,
    rules: VALID_RULES
  };
}
function parseSelectionList(input, validItems, itemType = "item") {
  if (input === null || input === void 0) return null;
  if (Array.isArray(input)) {
    const trimmed = input.map((s) => String(s).trim()).filter(Boolean);
    validateListItems(trimmed, validItems, itemType);
    return trimmed;
  }
  const str = String(input).trim();
  if (str === "all") return [...validItems];
  if (str === "none" || str === "") return [];
  const items = str.split(",").map((s) => s.trim()).filter(Boolean);
  validateListItems(items, validItems, itemType);
  return items;
}
function validateListItems(items, validItems, itemType) {
  for (const item of items) {
    if (!validItems.includes(item)) {
      const err = new Error(`Unknown ${itemType} "${item}". Available: ${validItems.join(", ")}`);
      err.code = "INVALID_SELECTION";
      throw err;
    }
  }
}
function getSkillChoices(availableSkills = DEFAULT_CORE_SKILLS) {
  return availableSkills.map((value) => ({
    value,
    label: SKILL_LABELS[value] || value
  }));
}
function getScriptChoices() {
  return VALID_SCRIPTS.map((value) => ({
    value,
    label: SCRIPT_LABELS[value] || value
  }));
}
function getDocChoices() {
  return VALID_DOCS.map((value) => ({
    value,
    label: DOC_LABELS[value] || value
  }));
}
function getRuleChoices() {
  return VALID_RULES.map((value) => ({
    value,
    label: RULE_LABELS[value] || value
  }));
}

// scripts/init/playbookOptions.js
var catalog = loadCatalogFromManifest();
var PLAYBOOK_INIT_CHOICES = {
  harnesses: HARNESS_CHOICES,
  skills: getSkillChoices(catalog.skills),
  rules: getRuleChoices(),
  scripts: getScriptChoices(),
  docs: getDocChoices(),
  presets: PRESET_CHOICES,
  automation: AUTOMATION_CHOICES
};
var selectionCatalog = {
  harnesses: HARNESS_CHOICES.map(({ value }) => value),
  skills: catalog.skills,
  rules: catalog.rules,
  scripts: catalog.scripts,
  docs: catalog.docs
};
var selectionType = {
  harnesses: "harness",
  skills: "skill",
  rules: "rule",
  scripts: "script",
  docs: "doc"
};
var choiceCatalog = {
  preset: PRESET_CHOICES.map(({ value }) => value),
  automation: AUTOMATION_CHOICES.map(({ value }) => value)
};
var DEFAULT_PLAYBOOK_SELECTION = {
  harnesses: selectionCatalog.harnesses,
  preset: "pragmatic",
  automation: "automated"
};
var DEFAULT_GRANULAR_PLAYBOOK_SELECTION = {
  ...DEFAULT_PLAYBOOK_SELECTION,
  skills: selectionCatalog.skills,
  rules: selectionCatalog.rules,
  scripts: selectionCatalog.scripts,
  docs: selectionCatalog.docs
};
function normalizePlaybookOptions(options = {}) {
  const normalized = {};
  for (const [key, validValues] of Object.entries(selectionCatalog)) {
    if (options[key] === void 0) continue;
    normalized[key] = [...new Set(parseSelectionList(options[key], validValues, selectionType[key]))];
  }
  if (normalized.harnesses && normalized.harnesses.length === 0) {
    throw new Error("Select at least one Playbook harness.");
  }
  for (const [key, validValues] of Object.entries(choiceCatalog)) {
    const value = options[key];
    if (value === void 0) continue;
    if (!validValues.includes(value)) {
      throw new Error(`Unknown Playbook ${key} "${value}". Available: ${validValues.join(", ")}`);
    }
    normalized[key] = value;
  }
  return normalized;
}
function parsePlaybookCliOptions(args2) {
  const parsed = {};
  const listFlags = {
    "--playbook-harness": "harnesses",
    "--playbook-skills": "skills",
    "--playbook-rules": "rules",
    "--playbook-scripts": "scripts",
    "--playbook-docs": "docs"
  };
  const valueFlags = {
    "--playbook-preset": "preset",
    "--playbook-automation": "automation"
  };
  for (let index = 0; index < args2.length; index += 1) {
    const flag = args2[index];
    const key = listFlags[flag] || valueFlags[flag];
    if (!key) {
      if (flag.startsWith("--playbook-")) {
        throw new Error(`Unknown Playbook option "${flag}".`);
      }
      continue;
    }
    const value = args2[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Option "${flag}" requires a value.`);
    }
    index += 1;
    if (listFlags[flag]) {
      if (parsed[key] === void 0) parsed[key] = [];
      if (value === "all" || value === "none") {
        if (parsed[key].length > 0 || parsed[`${key}Mode`] !== void 0) {
          throw new Error(`Option "${flag}" cannot combine "${value}" with other selections.`);
        }
        parsed[`${key}Mode`] = value;
      } else {
        if (parsed[`${key}Mode`] !== void 0) {
          throw new Error(`Option "${flag}" cannot combine "${parsed[`${key}Mode`]}" with other selections.`);
        }
        parsed[key].push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      }
    } else {
      if (parsed[key] !== void 0) {
        throw new Error(`Option "${flag}" can only be provided once.`);
      }
      parsed[key] = value;
    }
  }
  for (const key of Object.keys(selectionCatalog)) {
    if (parsed[`${key}Mode`] === "all") parsed[key] = selectionCatalog[key];
    if (parsed[`${key}Mode`] === "none") parsed[key] = [];
    delete parsed[`${key}Mode`];
  }
  return parsed;
}

// scripts/init/playbookDelegate.js
function resolvePlaybookCommand(targetRepo = process.cwd()) {
  const isWin = process.platform === "win32";
  if (process.env.GRIPM_PLAYBOOK_CLI) {
    const raw = process.env.GRIPM_PLAYBOOK_CLI.trim();
    if (raw.endsWith(".js") || raw.endsWith(".mjs") || raw.endsWith(".cjs")) {
      return {
        command: process.execPath,
        baseArgs: [path6.resolve(raw)],
        shell: false
      };
    }
    return {
      command: raw,
      baseArgs: [],
      shell: isWin
    };
  }
  const localBin = path6.join(targetRepo, "node_modules/.bin", isWin ? "playbook.cmd" : "playbook");
  if (fs6.existsSync(localBin)) {
    return {
      command: localBin,
      baseArgs: [],
      shell: isWin
    };
  }
  const npxCmd = isWin ? "npx.cmd" : "npx";
  return {
    command: npxCmd,
    baseArgs: ["-y", "@gripm/playbook@^2.9.1"],
    shell: isWin
  };
}
function delegatePlaybookInit(targetRepo, options = {}, isEn = true) {
  const { command, baseArgs, shell } = resolvePlaybookCommand(targetRepo);
  console.log(
    isEn ? "\n  \u{1F4E6} Delegating to Gripm Playbook CLI (@gripm/playbook init)..." : "\n  \u{1F4E6} Delegando al CLI de Gripm Playbook (@gripm/playbook init)..."
  );
  const initArgs = ["init", "--repo", path6.resolve(targetRepo)];
  if (options.language || options.lang) {
    initArgs.push("--lang", options.language || options.lang);
  }
  if (options.name || options.projectName) {
    initArgs.push("--name", options.name || options.projectName);
  }
  if (options.board !== false) {
    initArgs.push("--no-board");
  }
  if (options.yes) {
    initArgs.push("--yes");
  }
  if (options.mode) {
    initArgs.push("--mode", options.mode);
  }
  const playbookOptions = normalizePlaybookOptions(options.playbookOptions);
  for (const harness of playbookOptions.harnesses || []) {
    initArgs.push("--harness", harness);
  }
  for (const key of ["skills", "rules", "scripts", "docs"]) {
    if (playbookOptions[key] !== void 0) {
      initArgs.push(`--${key}`, playbookOptions[key].length ? playbookOptions[key].join(",") : "none");
    }
  }
  if (playbookOptions.preset) {
    initArgs.push("--preset", playbookOptions.preset);
  }
  if (playbookOptions.automation) {
    initArgs.push("--automation", playbookOptions.automation);
  }
  const allArgs = [...baseArgs, ...initArgs];
  const result = spawnSync(command, allArgs, {
    cwd: targetRepo,
    stdio: "inherit",
    shell
  });
  if (result.error) {
    console.warn(
      isEn ? `  \u26A0\uFE0F Could not spawn Gripm Playbook CLI: ${result.error.message}` : `  \u26A0\uFE0F No se pudo ejecutar el CLI de Gripm Playbook: ${result.error.message}`
    );
    return false;
  }
  if (result.status !== 0) {
    console.warn(
      isEn ? `  \u26A0\uFE0F Gripm Playbook initialization exited with code ${result.status}.` : `  \u26A0\uFE0F La inicializaci\xF3n de Gripm Playbook finaliz\xF3 con c\xF3digo ${result.status}.`
    );
    return false;
  }
  console.log(
    isEn ? "  \u2705 Gripm Playbook initialized successfully." : "  \u2705 Gripm Playbook inicializado con \xE9xito."
  );
  return true;
}

// scripts/initScaffold.js
init_audit_engine();
var __filename7 = fileURLToPath7(import.meta.url);
var __dirname5 = path9.dirname(__filename7);
var PKG_ROOT3 = path9.resolve(__dirname5, "..");
async function runInitWizard(targetRepo = process.cwd(), options = {}) {
  const isInteractive = options.isInteractive !== false && Boolean(process.stdin.isTTY) && !options.yes;
  const detectedIdentity = resolveProjectIdentity(targetRepo);
  let auditReport = null;
  try {
    auditReport = await scanCodebase(targetRepo);
  } catch {
  }
  let hasTypeScript = fs9.existsSync(path9.join(targetRepo, "tsconfig.json"));
  const pkgJsonPath = path9.join(targetRepo, "package.json");
  if (!hasTypeScript && fs9.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs9.readFileSync(pkgJsonPath, "utf8"));
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        hasTypeScript = true;
      }
    } catch {
    }
  }
  const hasTests = Boolean(auditReport?.tests?.hasTests || auditReport?.tests?.detected);
  const detectedVerifyCommand = auditReport?.tests?.verifyCommand || (hasTests ? "npm test" : null);
  const recommendedProfile = hasTypeScript && hasTests ? "full" : "minimal";
  let projectName = options.name || detectedIdentity.name;
  let projectId = options.id || detectedIdentity.id;
  let codePrefix = options.codePrefix || detectedIdentity.codePrefix;
  let language = (options.language || options.lang || "en").toLowerCase();
  if (language !== "es") language = "en";
  let isEn = language === "en";
  console.log(`
  ${isEn ? "gripm \xB7 Repository Initialization Wizard" : "gripm \xB7 Asistente de Inicializaci\xF3n"}

  \u279C  ${isEn ? "Repository:" : "Repositorio:"}  ${targetRepo}
  \u279C  ${isEn ? "Project:" : "Proyecto:"}     ${projectName}
`);
  if (!isInteractive) {
    printDiagnosticSnapshot(auditReport, { hasTypeScript, recommendedProfile, isEn });
  }
  let installBoard = options.board !== void 0 ? Boolean(options.board) : options.noBoard ? false : true;
  let installPlaybook = options.playbook !== void 0 ? Boolean(options.playbook) : options.withPlaybook ? true : options.noPlaybook ? false : false;
  let profile = options.profile || (options.minimal ? "minimal" : options.full ? "full" : null);
  let speedMode = options.speedMode || (profile ? "quick" : null);
  const basePreset = PRESETS[profile || "minimal"] || PRESETS.minimal;
  let mode = options.mode || (options.hub || options.multi ? "multi" : options.single ? "single" : basePreset.mode);
  let methodology = options.methodology || basePreset.methodology;
  let modules = { ...basePreset.modules, ...options.modules || {} };
  let enabledTabs = {
    ...basePreset.enabledTabs,
    ...options.enabledTabs || {}
  };
  if (options.enabledTabs?.sprint !== void 0) modules.sprint = options.enabledTabs.sprint;
  if (options.modules?.sprint !== void 0) enabledTabs.sprint = options.modules.sprint;
  let estimation = options.estimation || { ...basePreset.estimation };
  let kanban = options.kanban || { ...basePreset.kanban };
  let installSkill = options.skill !== void 0 ? options.skill : basePreset.assets.skill;
  let installAgentsMd = options.agentsMd !== void 0 ? options.agentsMd : profile === "minimal" ? false : true;
  let updatePkgJson = options.packageJson !== void 0 ? options.packageJson : basePreset.assets.packageJson;
  let updateGitignore = options.gitignore !== void 0 ? options.gitignore : basePreset.assets.gitignore;
  let shouldImportTodos = false;
  let playbookOptions = { ...options.playbookOptions || {} };
  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      console.log(isEn ? "  Initial configuration:\n" : "  Configuraci\xF3n inicial:\n");
      language = await promptLanguage(rl);
      isEn = language === "en";
      const suiteChoice = await promptSuite(rl, isEn);
      if (suiteChoice === "board") {
        installBoard = true;
        installPlaybook = false;
      } else if (suiteChoice === "playbook") {
        installBoard = false;
        installPlaybook = true;
      } else if (suiteChoice === "both") {
        installBoard = true;
        installPlaybook = true;
      } else if (suiteChoice === "none") {
        installBoard = false;
        installPlaybook = false;
        console.log(isEn ? "\n  \u2139\uFE0F  Initialization cancelled." : "\n  \u2139\uFE0F  Inicializaci\xF3n cancelada.");
        return {
          projectName,
          projectId,
          codePrefix,
          mode,
          language,
          profile: "none",
          cancelled: true
        };
      }
      const identity = await promptIdentity(rl, projectName, codePrefix, isEn);
      projectName = identity.projectName;
      projectId = identity.projectId;
      codePrefix = identity.codePrefix;
      printDiagnosticSnapshot(auditReport, { hasTypeScript, recommendedProfile, isEn });
      if (auditReport?.todos && auditReport.todos.length > 0) {
        const todoPrompt = isEn ? `Do you want to import the ${auditReport.todos.length} detected TODOs as draft tasks?` : `\xBFDeseas importar los ${auditReport.todos.length} TODOs detectados como tareas borrador?`;
        shouldImportTodos = await promptConfirm(rl, todoPrompt, true);
      }
      if (installBoard) {
        speedMode = await promptSpeed(rl, isEn);
        if (speedMode === "quick") {
          profile = await promptPreset(rl, isEn, recommendedProfile);
          const chosenPreset = PRESETS[profile] || PRESETS.minimal;
          methodology = chosenPreset.methodology;
          mode = chosenPreset.mode;
          modules = { ...chosenPreset.modules };
          enabledTabs = { ...chosenPreset.enabledTabs };
          estimation = { ...chosenPreset.estimation };
          kanban = { ...chosenPreset.kanban };
          installSkill = chosenPreset.assets.skill;
          installAgentsMd = chosenPreset.assets.agentsMd;
          updatePkgJson = chosenPreset.assets.packageJson;
          updateGitignore = chosenPreset.assets.gitignore;
          console.log("\n" + renderManifest({
            methodology,
            mode,
            modules,
            estimation,
            kanban,
            assets: {
              skill: installSkill,
              agentsMd: installAgentsMd && !installPlaybook,
              packageJson: updatePkgJson,
              gitignore: updateGitignore
            },
            playbook: installPlaybook
          }, isEn));
          const confirmed = await promptConfirm(
            rl,
            isEn ? "Proceed with this configuration?" : "\xBFProceder con esta configuraci\xF3n?",
            true
          );
          if (!confirmed) {
            console.log(isEn ? "  \u2139\uFE0F  Switching to Component-by-Component mode...\n" : "  \u2139\uFE0F  Cambiando a modo Componente por Componente...\n");
            speedMode = "granular";
          }
        }
        if (speedMode === "granular") {
          profile = "custom";
          mode = await promptMode(rl, isEn);
          methodology = await promptMethodology(rl, isEn);
          const defaultModuleIndices = [0];
          if (methodology === "scrum" || methodology === "scrumban") {
            defaultModuleIndices.push(1);
          }
          const selectedModules = await promptMultiSelect(
            rl,
            isEn ? "4.3 Cockpit Modules:" : "4.3 M\xF3dulos del Cockpit:",
            COCKPIT_MODULES,
            defaultModuleIndices,
            isEn
          );
          const selectedKeys = new Set(selectedModules.map((m) => m.key));
          modules = {
            release: selectedKeys.has("release"),
            sprint: selectedKeys.has("sprint"),
            timeline: selectedKeys.has("timeline"),
            metrics: selectedKeys.has("metrics"),
            calendar: selectedKeys.has("calendar")
          };
          enabledTabs = {
            kanban: true,
            release: modules.release,
            sprint: modules.sprint,
            timeline: modules.timeline,
            metrics: modules.metrics
          };
          estimation = {
            enabled: selectedKeys.has("estimation"),
            method: "fibonacci"
          };
          kanban = {
            showIdeasByDefault: selectedKeys.has("ideas"),
            showDoneHistoryByDefault: false,
            wipLimits: {
              "col-doing": 0,
              "col-review": 0,
              "col-ready": 0
            }
          };
          const defaultAssetIndices = [0, 2, 3];
          if (!installPlaybook) {
            defaultAssetIndices.push(1);
          }
          const selectedAssets = await promptMultiSelect(
            rl,
            isEn ? "4.4 Repository Assets:" : "4.4 Artefactos en el Repositorio:",
            REPO_ASSETS,
            defaultAssetIndices,
            isEn
          );
          const assetKeys = new Set(selectedAssets.map((a) => a.key));
          installSkill = assetKeys.has("skill");
          installAgentsMd = assetKeys.has("agentsMd");
          updatePkgJson = assetKeys.has("packageJson");
          updateGitignore = assetKeys.has("gitignore");
          if (installPlaybook) {
            playbookOptions = await promptPlaybookOptions(
              rl,
              PLAYBOOK_INIT_CHOICES,
              playbookOptions,
              isEn
            );
          }
        }
      }
    } finally {
      rl.close();
    }
  } else {
    if (options.importTodos) {
      shouldImportTodos = true;
    }
    if (!profile) {
      profile = recommendedProfile || "minimal";
      speedMode = options.speedMode || "quick";
      const chosenPreset = PRESETS[profile] || PRESETS.minimal;
      methodology = options.methodology || chosenPreset.methodology;
      mode = options.mode || (options.hub || options.multi ? "multi" : options.single ? "single" : chosenPreset.mode);
      modules = { ...chosenPreset.modules, ...options.modules || {} };
      enabledTabs = { ...chosenPreset.enabledTabs, ...options.enabledTabs || {} };
      estimation = options.estimation || { ...chosenPreset.estimation };
      kanban = options.kanban || { ...chosenPreset.kanban };
      if (options.skill === void 0) installSkill = chosenPreset.assets.skill;
      if (options.agentsMd === void 0) installAgentsMd = options.minimal ? chosenPreset.assets.agentsMd : true;
      if (options.packageJson === void 0) updatePkgJson = chosenPreset.assets.packageJson;
      if (options.gitignore === void 0) updateGitignore = chosenPreset.assets.gitignore;
    }
  }
  let normalizedPlaybookOptions = {};
  let playbookMode;
  if (!installPlaybook && Object.keys(playbookOptions).length > 0) {
    throw new Error("Playbook options require Playbook initialization.");
  }
  if (installPlaybook) {
    if (installBoard) {
      const isGranular = speedMode === "granular";
      const defaults = isGranular ? DEFAULT_GRANULAR_PLAYBOOK_SELECTION : DEFAULT_PLAYBOOK_SELECTION;
      normalizedPlaybookOptions = normalizePlaybookOptions({
        ...defaults,
        ...playbookOptions
      });
      playbookMode = isGranular ? "custom" : "quick";
    } else if (options.yes) {
      normalizedPlaybookOptions = normalizePlaybookOptions({
        harnesses: DEFAULT_PLAYBOOK_SELECTION.harnesses,
        ...playbookOptions
      });
    } else {
      normalizedPlaybookOptions = normalizePlaybookOptions(playbookOptions);
    }
  }
  const verifyCommand = options.verifyCommand || detectedVerifyCommand || void 0;
  const results = {
    projectName,
    projectId,
    codePrefix,
    mode,
    language,
    profile,
    methodology,
    modules,
    enabledTabs,
    verifyCommand: verifyCommand || null,
    recommendedProfile,
    auditReport: auditReport ? { score: auditReport.score, summary: auditReport.summary } : null,
    importedTodosCount: 0,
    gripmConfig: false,
    tasksDir: false,
    tasksDirCreated: false,
    tasksSeeded: false,
    skill: false,
    agentsMd: false,
    playbook: false,
    packageJson: false,
    gitignore: false,
    registeredInHub: false,
    success: true
  };
  const isEnOutput = language === "en";
  console.log(isEnOutput ? "\n  \u2699\uFE0F  Applying configuration...\n" : "\n  \u2699\uFE0F  Aplicando configuraci\xF3n elegida...\n");
  if (installBoard) {
    const savedConfig = writeConfig(targetRepo, {
      projectName,
      projectId,
      codePrefix,
      language,
      mode,
      methodology,
      modules,
      enabledTabs,
      kanban,
      estimation,
      verifyCommand,
      preset: installPlaybook ? normalizedPlaybookOptions.preset : void 0,
      automation: installPlaybook ? normalizedPlaybookOptions.automation : void 0
    }, isEnOutput);
    results.gripmConfig = true;
    results.enabledTabs = savedConfig.enabledTabs;
    results.modules = savedConfig.modules;
    results.verifyCommand = savedConfig.verifyCommand || null;
    const dirResult = ensureTasksDir(targetRepo, isEnOutput);
    results.tasksDir = true;
    results.tasksDirCreated = dirResult.created;
    if (shouldImportTodos && auditReport?.todos && auditReport.todos.length > 0) {
      const todoRes = importTodosAsTasks(targetRepo, auditReport.todos, {
        codePrefix,
        isEn: isEnOutput
      });
      results.importedTodosCount = todoRes.importedCount;
    }
    if (mode === "multi") {
      results.registeredInHub = registerInHub(targetRepo, {
        projectId,
        projectName,
        codePrefix
      }, isEnOutput);
    } else {
      console.log(
        isEnOutput ? "  \u{1F512} Single-Project mode active: Self-contained execution without external dependencies" : "  \u{1F512} Modo Mono-Proyecto activo: Ejecuci\xF3n autocontenida sin dependencias externas"
      );
    }
    if (installSkill) {
      writeSkill(targetRepo, language, isEnOutput);
      results.skill = true;
    }
    if (installAgentsMd && !installPlaybook) {
      writeAgentsMd(targetRepo, projectName, language, options.force, isEnOutput);
      results.agentsMd = true;
    } else if (installPlaybook) {
      console.log(
        isEnOutput ? "  \u2139\uFE0F  AGENTS.md generation delegated to Gripm Playbook" : "  \u2139\uFE0F  Generaci\xF3n de AGENTS.md delegada a Gripm Playbook"
      );
    }
    if (updatePkgJson) {
      results.packageJson = writePackageJsonScripts(targetRepo, isEnOutput);
    }
    if (updateGitignore) {
      results.gitignore = writeGitignore(targetRepo, isEnOutput);
    }
  }
  if (installPlaybook) {
    const playbookSuccess = delegatePlaybookInit(targetRepo, {
      language,
      projectName,
      yes: options.yes || installBoard,
      board: installBoard,
      mode: playbookMode,
      playbookOptions: normalizedPlaybookOptions
    }, isEnOutput);
    results.playbook = playbookSuccess;
    if (!playbookSuccess) {
      results.success = false;
      console.error(
        isEnOutput ? "  \u274C Gripm initialization is incomplete because Playbook failed. Board files were preserved." : "  \u274C La inicializaci\xF3n de Gripm qued\xF3 incompleta porque fall\xF3 Playbook. Se conservaron los archivos de Board."
      );
      return results;
    }
  } else {
    console.log(
      isEnOutput ? "  \u2728 Clean repository: Gripm Board configured without Playbook." : "  \u2728 Repositorio limpio: Gripm Board configurado sin Playbook."
    );
  }
  if (installBoard) {
    if (isEnOutput) {
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
    (o: npx -p @gripm/board gripm-mcp)

  Consejo: Ejecuta 'npm install -g @gripm/board'
  para usar el comando global directo 'gripm'.
`);
    }
  } else {
    console.log(
      isEnOutput ? "\n  \u2714 Gripm Playbook initialized successfully!" : "\n  \u2714 \xA1Gripm Playbook inicializado con \xE9xito!"
    );
  }
  return results;
}

// scripts/uninstall.js
init_registryConfig();
import fs10 from "node:fs";
import path10 from "node:path";
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
  const target = path10.resolve(repoPath, normalized);
  const root = path10.resolve(repoPath);
  if (target !== root && !target.startsWith(root + path10.sep)) {
    return { removed: false, reason: "fuera-del-repo", path: normalized };
  }
  if (!fs10.existsSync(target)) {
    return { removed: false, reason: "no-existe", path: normalized };
  }
  fs10.rmSync(target, { recursive: true, force: true });
  return { removed: true, path: normalized };
}
function revertManagedScripts(repoPath) {
  const pkgPath = path10.join(repoPath, "package.json");
  if (!fs10.existsSync(pkgPath)) {
    return { modified: false, removed: [], preserved: [] };
  }
  let pkg;
  try {
    pkg = JSON.parse(fs10.readFileSync(pkgPath, "utf8"));
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
    fs10.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }
  return { modified: removed.length > 0, removed, preserved };
}
function revertGitignoreRules(repoPath) {
  const gitignorePath = path10.join(repoPath, ".gitignore");
  if (!fs10.existsSync(gitignorePath)) {
    return { modified: false, removedLines: 0 };
  }
  const original = fs10.readFileSync(gitignorePath, "utf8");
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
  fs10.writeFileSync(gitignorePath, result, "utf8");
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
    if (!fs10.existsSync(path10.join(repoPath, p))) {
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
  if (fs10.existsSync(registryPath)) {
    let registry;
    try {
      registry = loadRegistryFile();
    } catch {
      registry = null;
    }
    if (registry && Array.isArray(registry.projects)) {
      const surviving = [];
      for (const p of registry.projects) {
        const isCurrent = p.repoPath && path10.resolve(p.repoPath) === path10.resolve(repoPath);
        const isDead = p.repoPath && !fs10.existsSync(p.repoPath);
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
  const configPath = path10.join(repoPath, ".gripm", "config.json");
  if (fs10.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs10.readFileSync(configPath, "utf8"));
      if (cfg && (cfg.mode === "multi" || cfg.mode === "hub")) mode = "multi";
    } catch {
    }
  }
  let otherProjects = 0;
  try {
    const registry = loadRegistryFile();
    if (registry && Array.isArray(registry.projects)) {
      otherProjects = registry.projects.filter(
        (p) => !p.repoPath || path10.resolve(p.repoPath) !== path10.resolve(repoPath)
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

// src/utils/importers/importerHelpers.ts
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

// src/utils/importers/jsonImporters.ts
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

// src/utils/importers/csvImporters.ts
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

// src/utils/universalImporter.ts
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

// scripts/cliAdd.ts
init_backlogService();
init_backlogMdParser();
init_registryConfig();
import fs20 from "node:fs";
import path21 from "node:path";
import { fileURLToPath as fileURLToPath9 } from "node:url";
var __filename9 = fileURLToPath9(import.meta.url);
var __dirname7 = path21.dirname(__filename9);
var ROOT_DIR = path21.resolve(__dirname7, "..");
var isColorSupported3 = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
var c3 = {
  bold: (s) => isColorSupported3 ? `\x1B[1m${s}\x1B[0m` : s,
  dim: (s) => isColorSupported3 ? `\x1B[2m${s}\x1B[0m` : s,
  green: (s) => isColorSupported3 ? `\x1B[32m${s}\x1B[0m` : s,
  cyan: (s) => isColorSupported3 ? `\x1B[36m${s}\x1B[0m` : s,
  yellow: (s) => isColorSupported3 ? `\x1B[33m${s}\x1B[0m` : s,
  red: (s) => isColorSupported3 ? `\x1B[31m${s}\x1B[0m` : s
};
function printAddHelp() {
  console.log(`
  gripm add - Captura r\xE1pida de tareas desde la terminal sin abrir el navegador

  Uso:
    gripm add "<t\xEDtulo>" [opciones]
    gripm add --title "<t\xEDtulo>" [opciones]

  Descripci\xF3n:
    Crea una nueva tarea en el proyecto de forma instant\xE1nea y local,
    utilizando el motor de almacenamiento configurado (Markdown o JSON).
    Sincroniza autom\xE1ticamente BACKLOG.md si corresponde.

  Opciones:
    --title, -t <texto>            T\xEDtulo de la tarea (o como argumento posicional)
    --priority, -p <prioridad>     Prioridad: low, medium, high, urgent, p0, p1, p2, p3 (defecto: medium)
    --type <tipo>                  Tipo: feature, bug, spike, chore, task (defecto: feature)
    --due, --due-date <YYYY-MM-DD> Fecha de vencimiento
    --description, -d <texto>      Descripci\xF3n o notas de la tarea
    --estimate, -e <valor>         Estimaci\xF3n (puntos de historia o valor libre)
    --labels, -l <etiquetas>       Etiquetas separadas por comas (ej: "cli,ux")
    --sprint, -s <sprint>          Nombre del sprint asignado (ej: "Sprint 1")
    --repo, -r <ruta>              Ruta al proyecto destino (defecto: directorio actual)
    --json                         Emite el resultado en formato JSON estructurado
    --help, -h                     Muestra esta ayuda
`);
}
function parseAddArgs(rawArgs) {
  const args2 = [...rawArgs];
  if (args2[0] === "add") {
    args2.shift();
  }
  const opts = {};
  const positionalWords = [];
  for (let i = 0; i < args2.length; i++) {
    const arg = args2[i];
    if (arg === "--help" || arg === "-h" || arg === "-help") {
      opts.help = true;
      continue;
    }
    if (arg === "--json") {
      opts.json = true;
      continue;
    }
    if (arg === "--title" || arg === "-t") {
      opts.title = args2[++i];
      continue;
    }
    if (arg === "--priority" || arg === "-p") {
      opts.priority = args2[++i];
      continue;
    }
    if (arg === "--type") {
      opts.type = args2[++i];
      continue;
    }
    if (arg === "--due" || arg === "--due-date") {
      opts.due = args2[++i];
      continue;
    }
    if (arg === "--description" || arg === "-d" || arg === "--desc") {
      opts.description = args2[++i];
      continue;
    }
    if (arg === "--estimate" || arg === "-e") {
      opts.estimate = args2[++i];
      continue;
    }
    if (arg === "--labels" || arg === "--label" || arg === "-l") {
      const val = args2[++i] || "";
      const split = val.split(",").map((s) => s.trim()).filter(Boolean);
      opts.labels = [...opts.labels || [], ...split];
      continue;
    }
    if (arg === "--sprint" || arg === "-s") {
      opts.sprint = args2[++i];
      continue;
    }
    if (arg === "--repo" || arg === "-r") {
      opts.repo = args2[++i];
      continue;
    }
    if (!arg.startsWith("-")) {
      positionalWords.push(arg);
    }
  }
  if (!opts.title && positionalWords.length > 0) {
    opts.title = positionalWords.join(" ");
  }
  return opts;
}
function resolveProjectForCli(targetRepo) {
  const hasTasks = fs20.existsSync(path21.join(targetRepo, "backlog", "tasks"));
  const hasJson = fs20.existsSync(path21.join(targetRepo, ".gripm", "backlog.json"));
  const hasConfig = fs20.existsSync(path21.join(targetRepo, ".gripm", "config.json"));
  const hasBacklogMd = fs20.existsSync(path21.join(targetRepo, "BACKLOG.md"));
  const registry = loadRegistryFile(ROOT_DIR);
  const matched = (registry?.projects || []).find(
    (p) => p.repoPath && path21.resolve(p.repoPath) === targetRepo
  );
  if (!hasTasks && !hasJson && !hasConfig && !hasBacklogMd && !matched) {
    return null;
  }
  const identity = resolveProjectIdentity(targetRepo);
  let storageType = hasTasks || hasBacklogMd ? "markdown" : hasJson ? "json" : "markdown";
  if (matched?.storageType) {
    storageType = matched.storageType;
  }
  return {
    id: identity.id || matched?.id || path21.basename(targetRepo),
    name: identity.name || matched?.name || path21.basename(targetRepo),
    codePrefix: identity.codePrefix || matched?.codePrefix || "DEV",
    repoPath: targetRepo,
    storageType,
    backlogDir: "backlog",
    createdAt: matched?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function runAddCommand(rawArgs) {
  const opts = parseAddArgs(rawArgs);
  if (opts.help) {
    printAddHelp();
    return;
  }
  if (!opts.title || !opts.title.trim()) {
    console.error(`
  ${c3.red("\u2716")} Error: Debes especificar el t\xEDtulo de la tarea.`);
    console.error(`    Uso: gripm add "<t\xEDtulo>" [--priority high] [--type bug] [--due YYYY-MM-DD]`);
    console.error(`    Ejecuta "gripm add --help" para ver todas las opciones disponibles.
`);
    process.exitCode = 1;
    return;
  }
  if (opts.due) {
    const isFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(opts.due);
    const parsedTime = Date.parse(opts.due);
    if (!isFormatValid || isNaN(parsedTime)) {
      console.error(`
  ${c3.red("\u2716")} Error: Formato de fecha inv\xE1lido para --due: "${opts.due}".`);
      console.error(`    Debe seguir el formato YYYY-MM-DD (ej: 2026-12-31).
`);
      process.exitCode = 1;
      return;
    }
  }
  const targetRepo = opts.repo ? path21.resolve(opts.repo) : process.cwd();
  if (!fs20.existsSync(targetRepo)) {
    console.error(`
  ${c3.red("\u2716")} Error: El directorio especificado no existe: "${targetRepo}".
`);
    process.exitCode = 1;
    return;
  }
  const project = resolveProjectForCli(targetRepo);
  if (!project) {
    console.error(`
  ${c3.red("\u2716")} Error: No se encontr\xF3 un proyecto de gripm inicializado en "${targetRepo}".`);
    console.error(`    Ejecuta 'gripm --init' en este directorio para inicializarlo.
`);
    process.exitCode = 1;
    return;
  }
  const taskPayload = {
    title: opts.title.trim(),
    priority: opts.priority ? normalizePriority(opts.priority) : "medium",
    type: opts.type ? normalizeType(opts.type) : "feature",
    status: "draft",
    description: opts.description || "",
    estimate: opts.estimate,
    sprint: opts.sprint,
    labels: opts.labels || [],
    dueDate: opts.due
  };
  const result = BacklogService.createTask(project, taskPayload);
  if (!result.ok || !result.task) {
    console.error(`
  ${c3.red("\u2716")} Error: No se pudo crear la tarea en el storage.`);
    process.exitCode = 1;
    return;
  }
  if (project.storageType === "markdown" && project.repoPath) {
    const backlogMdPath = path21.join(project.repoPath, "BACKLOG.md");
    if (fs20.existsSync(backlogMdPath)) {
      try {
        BacklogService.exportBacklogMd(project);
      } catch (err) {
        console.warn(`  ${c3.yellow("\u25B2")} Aviso: No se pudo auto-sincronizar BACKLOG.md: ${err.message}`);
      }
    }
  }
  if (opts.json) {
    console.log(JSON.stringify({
      ok: true,
      task: result.task,
      savedFile: result.savedFile
    }, null, 2));
    return;
  }
  const created = result.task;
  const code = created.code || created.id;
  const relFile = result.savedFile ? path21.relative(targetRepo, result.savedFile) : "";
  console.log(`
  ${c3.green("\u2714")} Tarea creada exitosamente: ${c3.bold(`[${code}]`)} ${c3.dim(`(${created.priority} / ${created.type})`)}`);
  console.log(`    ${c3.bold("T\xEDtulo:")}      ${created.title}`);
  if (created.dueDate) {
    console.log(`    ${c3.bold("Vencimiento:")} ${created.dueDate}`);
  }
  if (created.estimate !== void 0 && created.estimate !== null && created.estimate !== "") {
    console.log(`    ${c3.bold("Estimaci\xF3n:")}  ${created.estimate}`);
  }
  if (created.labels && created.labels.length > 0) {
    console.log(`    ${c3.bold("Etiquetas:")}   ${created.labels.join(", ")}`);
  }
  if (created.sprint) {
    console.log(`    ${c3.bold("Sprint:")}      ${created.sprint}`);
  }
  if (relFile) {
    console.log(`    ${c3.bold("Archivo:")}     ${relFile}`);
  }
  console.log("");
}

// scripts/gripm-runner.js
init_audit_engine();
var __filename11 = fileURLToPath11(import.meta.url);
var __dirname9 = path29.dirname(__filename11);
var PKG_ROOT5 = path29.resolve(__dirname9, "..");
var pkgJson = JSON.parse(fs27.readFileSync(path29.join(PKG_ROOT5, "package.json"), "utf8"));
var currentVersion = pkgJson.version || "1.0.0";
var args = process.argv.slice(2);
var isColorSupported4 = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
var c4 = {
  bold: (s) => isColorSupported4 ? `\x1B[1m${s}\x1B[0m` : s,
  dim: (s) => isColorSupported4 ? `\x1B[2m${s}\x1B[0m` : s,
  green: (s) => isColorSupported4 ? `\x1B[32m${s}\x1B[0m` : s,
  cyan: (s) => isColorSupported4 ? `\x1B[36m${s}\x1B[0m` : s,
  yellow: (s) => isColorSupported4 ? `\x1B[33m${s}\x1B[0m` : s
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
function printAuditHelp() {
  console.log(`
  gripm audit - Auditor\xEDa est\xE1tica de salud de c\xF3digo y calidad

  Uso:
    gripm audit [opciones] [ruta]

  Descripci\xF3n:
    Ejecuta un diagn\xF3stico est\xE1tico del repositorio analizando presupuestos de l\xEDneas (LOC),
    supresiones de calidad (@ts-ignore, eslint-disable), infraestructura de pruebas y marcadores TODO.

  Opciones:
    --format json, --json          Emite exclusivamente el reporte en formato JSON estructurado
    --strict                       Falla con c\xF3digo 1 si existen violaciones cr\xEDticas (>= 1000 LOC o supresiones)
    --quiet, -q                    Modo silencioso con resumen m\xEDnimo de una l\xEDnea
    --repo, -r <ruta>              Directorio a inspeccionar (por defecto: directorio actual)
    --max, --max-lines <n>         L\xEDmite estricto de l\xEDneas por archivo (por defecto: 1000)
    --warn, --warn-lines <n>       Umbral de advertencia de l\xEDneas (por defecto: 500)
    --exclude <patr\xF3n>             Patr\xF3n de exclusi\xF3n adicional
    --help, -h                     Muestra esta ayuda
`);
}
function printMainHelp() {
  console.log(`
  gripm CLI - productos locales para backlog y trabajo con agentes

  Uso:
    gripm [opciones]               Abre Gripm Board en el navegador (por defecto)
    gripm <comando> [opciones]     Ejecuta un subcomando espec\xEDfico

  Comandos:
    gripm add "<t\xEDtulo>" [opciones] Captura r\xE1pida de tareas sin abrir el navegador
    gripm audit [opciones]         Auditor\xEDa est\xE1tica de salud, l\xEDmites LOC y calidad del c\xF3digo
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
    --playbook-harness <id>        Harness de Playbook; repetible
    --playbook-skills <lista>      Selecci\xF3n separada por comas, "all" o "none"
    --playbook-rules <lista>       Selecci\xF3n de reglas de Playbook
    --playbook-scripts <lista>     Selecci\xF3n de scripts de Playbook
    --playbook-docs <lista>        Selecci\xF3n de documentos de Playbook
    --playbook-preset <valor>      Rigor: pragmatic o strict
    --playbook-automation <valor>  Entrega automatizada o manual
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
    "--prefix",
    "--title",
    "-t",
    "--priority",
    "--type",
    "--due",
    "--due-date",
    "--description",
    "-d",
    "--desc",
    "--estimate",
    "-e",
    "--labels",
    "--label",
    "-l",
    "--sprint",
    "-s",
    "--name",
    "--id",
    "--mode",
    "--playbook-harness",
    "--playbook-skills",
    "--playbook-rules",
    "--playbook-scripts",
    "--playbook-docs",
    "--playbook-preset",
    "--playbook-automation",
    "--format",
    "--max",
    "--max-lines",
    "--warn",
    "--warn-lines",
    "--exclude"
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
  if (command && !["mcp", "playbook", "help", "import", "add", "audit"].includes(command)) {
    console.error(`Comando desconocido: "${command}". Ejecuta "gripm --help" para ver los comandos disponibles.`);
    process.exitCode = 1;
    return;
  }
  if (command === "help") {
    const sub = nonFlagArgs[1];
    if (sub === "audit") {
      printAuditHelp();
      process.exit(0);
    }
    if (sub === "add") {
      printAddHelp();
      process.exit(0);
    }
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
  if (command === "audit") {
    if (hasHelpFlag(args)) {
      printAuditHelp();
      process.exit(0);
    }
    const auditArgs = args.filter((a) => a !== "audit");
    await runCli2(auditArgs);
    return;
  }
  if (command === "add") {
    if (hasHelpFlag(args)) {
      printAddHelp();
      process.exit(0);
    }
    await runAddCommand(args);
    return;
  }
  if (command === "mcp") {
    if (hasHelpFlag(args)) {
      printMcpHelp();
      process.exit(0);
    }
    if (args.includes("--version") || args.includes("-v")) {
      console.log(currentVersion);
      process.exit(0);
    }
    const mcpBinary = path29.join(PKG_ROOT5, "bin", "gripm-mcp.js");
    const { pathToFileURL } = await import("node:url");
    await import(pathToFileURL(mcpBinary).href);
    return;
  }
  if (command === "playbook") {
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
    const syncScript = path29.join(PKG_ROOT5, "scripts", "sync-playbook.mjs");
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
      targetRepo2 = path29.resolve(args[repoIdx2 + 1]);
    }
    if (fs27.existsSync(syncScript)) {
      const { pathToFileURL } = await import("node:url");
      const { runPlaybookSync } = await import(pathToFileURL(syncScript).href);
      await runPlaybookSync(targetRepo2, { branch, remote, source, dryRun, force });
    } else {
      const { execFileSync: execFileSync2 } = await import("node:child_process");
      const syncArgs = ["-y", "@gripm/playbook", "sync", "--repo", targetRepo2];
      if (branch) syncArgs.push("--branch", branch);
      if (remote) syncArgs.push("--remote", remote);
      if (source) syncArgs.push("--source", source);
      if (dryRun) syncArgs.push("--dry-run");
      if (force) syncArgs.push("--force");
      const isWin = process.platform === "win32";
      execFileSync2(isWin ? "npx.cmd" : "npx", syncArgs, { stdio: "inherit", shell: isWin });
    }
    return;
  }
  if (command === "import") {
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
    const absoluteFilePath = path29.resolve(filePath);
    if (!fs27.existsSync(absoluteFilePath)) {
      console.error(`Error: El archivo "${filePath}" no existe.`);
      process.exitCode = 1;
      return;
    }
    const repoIdx2 = args.findIndex((a) => a === "--repo" || a === "-r");
    const targetRepo2 = repoIdx2 !== -1 && args[repoIdx2 + 1] ? path29.resolve(args[repoIdx2 + 1]) : process.cwd();
    const dryRun = args.includes("--dry-run");
    const prefixIdx = args.findIndex((a) => a === "--prefix");
    const customPrefix = prefixIdx !== -1 ? args[prefixIdx + 1]?.toUpperCase() : void 0;
    const fileContent = fs27.readFileSync(absoluteFilePath, "utf8");
    const result = parseUniversalExport(fileContent);
    if (result.items.length === 0) {
      console.log(`
  ${c4.yellow("\u25B2")}  No se detectaron tareas para importar en ${path29.basename(filePath)} (${result.label}).`);
      return;
    }
    console.log(`
  ${c4.cyan("\u2139")}  ${c4.bold(result.label)}`);
    const tasksDir2 = path29.join(targetRepo2, "backlog/tasks");
    if (!dryRun && !fs27.existsSync(tasksDir2)) {
      fs27.mkdirSync(tasksDir2, { recursive: true });
    }
    let prefix = customPrefix;
    let maxNum = 0;
    if (fs27.existsSync(tasksDir2)) {
      const taskFiles = fs27.readdirSync(tasksDir2).filter((f) => f.endsWith(".md"));
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
    console.log(`  ${c4.dim("Prefijo de tareas:")} ${c4.bold(prefix)} (pr\xF3ximo correlativo: ${prefix}-${String(maxNum + 1).padStart(3, "0")})`);
    if (dryRun) {
      console.log(`  ${c4.yellow("Modo simulaci\xF3n (--dry-run):")} Ning\xFAn archivo ser\xE1 modificado.
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
        fs27.writeFileSync(path29.join(tasksDir2, filename), taskContent, "utf8");
      }
      importedCount++;
    }
    if (dryRun) {
      console.log(`
  ${c4.green("\u2714")}  Simulaci\xF3n completada: ${importedCount} tareas listas para importar.`);
    } else {
      console.log(`
  ${c4.green("\u2714")}  ${importedCount} tareas importadas con \xE9xito en backlog/tasks/`);
      console.log(`  ${c4.dim('Ejecuta "npm run backlog:sync" para consolidar BACKLOG.md.')}`);
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
  ${c4.yellow("\u25B2")}  ${c4.yellow("Advertencia de seguridad: Enlazando a 0.0.0.0 (red local).")}`);
    console.log(`  ${c4.dim("\u279C")}  ${c4.dim("Token de acceso:")}  ${token}`);
    console.log(`  ${c4.dim("\u279C")}  ${c4.dim("Acceso local:")}    ${c4.cyan("http://localhost:4100/")}`);
    console.log(`  ${c4.dim("\u279C")}  ${c4.dim("Acceso en LAN:")}    ${c4.cyan(`http://<IP-LAN>:4100/?token=${token}`)}
`);
  }
  let targetRepo = process.cwd();
  const repoIdx = args.findIndex((a) => a === "--repo" || a === "-r");
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    targetRepo = path29.resolve(args[repoIdx + 1]);
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
    const isNoBoard = args.includes("--no-board");
    const isBoard = args.includes("--board");
    const prefixIdx = args.findIndex((a) => a === "--prefix");
    const cliPrefix = prefixIdx !== -1 && args[prefixIdx + 1] ? args[prefixIdx + 1].toUpperCase() : void 0;
    const nameIdx = args.findIndex((a) => a === "--name");
    const cliName = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : void 0;
    const idIdx = args.findIndex((a) => a === "--id");
    const cliId = idIdx !== -1 && args[idIdx + 1] ? args[idIdx + 1] : void 0;
    const modeIdx = args.findIndex((a) => a === "--mode");
    const rawMode = modeIdx !== -1 && args[modeIdx + 1] ? args[modeIdx + 1].toLowerCase() : void 0;
    const cliSpeedMode = rawMode === "quick" || rawMode === "granular" ? rawMode : void 0;
    const cliInstMode = rawMode === "single" || rawMode === "multi" ? rawMode : void 0;
    const initResult = await runInitWizard(targetRepo, {
      yes: isYes,
      minimal: isMinimal,
      full: isFull,
      profile: isMinimal ? "minimal" : isFull ? "full" : void 0,
      mode: isHubInit ? "multi" : isSingleInit ? "single" : cliInstMode,
      speedMode: cliSpeedMode,
      language: cliLang,
      name: cliName,
      id: cliId,
      codePrefix: cliPrefix,
      board: isNoBoard ? false : isBoard ? true : void 0,
      playbook: isNoPlaybook ? false : isWithPlaybook ? true : void 0,
      skill: args.includes("--no-skill") ? false : args.includes("--skill") ? true : void 0,
      agentsMd: args.includes("--no-agents") ? false : args.includes("--agents") ? true : void 0,
      packageJson: args.includes("--no-scripts") ? false : args.includes("--scripts") ? true : void 0,
      gitignore: args.includes("--no-gitignore") ? false : args.includes("--gitignore") ? true : void 0,
      importTodos: args.includes("--import-todos") || args.includes("--todos") ? true : void 0,
      playbookOptions: parsePlaybookCliOptions(args),
      force: args.includes("--force")
    });
    if (initResult.success === false) {
      process.exitCode = 1;
      return;
    }
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
  const tasksDir = path29.join(targetRepo, "backlog/tasks");
  const gripmJson = path29.join(targetRepo, ".gripm/backlog.json");
  let storageType = "markdown";
  if (fs27.existsSync(tasksDir)) {
    storageType = "markdown";
  } else if (fs27.existsSync(gripmJson)) {
    storageType = "json";
  } else {
    storageType = "markdown";
  }
  const isHomeDirectory = path29.resolve(targetRepo).toLowerCase() === path29.resolve(os3.homedir()).toLowerCase();
  const isExplicitProject = args.includes("--repo") || args.includes("-r") || args.includes("--init");
  if (!isHomeDirectory || isExplicitProject) {
    try {
      const registry = loadRegistryFile(PKG_ROOT5);
      const identity = resolveProjectIdentity(targetRepo);
      const projectName = identity.name;
      const projectId = identity.id;
      const codePrefix = identity.codePrefix;
      const existingIdx = registry.projects.findIndex((p) => p.id === projectId || p.repoPath && path29.resolve(p.repoPath) === targetRepo);
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
      saveRegistryFile(registry, PKG_ROOT5);
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
  ${c4.yellow("\u25B2")}  Puerto ${port} ocupado en el sistema. Utilizando puerto disponible ${resolvedPort}...`);
  }
  if (isDev) {
    const { createServer } = await import("vite");
    server = await createServer({
      root: PKG_ROOT5,
      configFile: path29.resolve(PKG_ROOT5, "vite.config.ts"),
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
        const stat = fs27.statSync(filePath);
        if (stat.isDirectory()) {
          const indexInDir = path29.join(filePath, "index.html");
          if (fs27.existsSync(indexInDir) && fs27.statSync(indexInDir).isFile()) {
            return serveFile2(indexInDir, req, res);
          }
          return false;
        }
        const ext = path29.extname(filePath).toLowerCase();
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
        const stream = fs27.createReadStream(filePath);
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
      const safePath = path29.normalize(path29.join(distDir, pathname));
      if (!safePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }
      if (fs27.existsSync(safePath) && safePath !== distDir) {
        if (serveFile2(safePath, req, res)) return;
      }
      const safePublicPath = path29.normalize(path29.join(publicDir, pathname));
      if (safePublicPath.startsWith(publicDir) && fs27.existsSync(safePublicPath) && safePublicPath !== publicDir) {
        if (serveFile2(safePublicPath, req, res)) return;
      }
      const indexPath = path29.join(distDir, "index.html");
      if (pathname === "/" || pathname === "") {
        if (fs27.existsSync(indexPath)) {
          if (serveFile2(indexPath, req, res)) return;
        }
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<h1>dist/index.html no encontrado</h1><p>Ejecuta <code>npm run build</code> antes de iniciar gripm en produccion.</p>");
        return;
      }
      const hasExtension = path29.extname(pathname).length > 0;
      if (!hasExtension && fs27.existsSync(indexPath)) {
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
      const serverBundle = path29.join(PKG_ROOT5, "bin", "server.js");
      let gripmApi2;
      if (fs27.existsSync(serverBundle)) {
        const { pathToFileURL } = await import("node:url");
        const mod = await import(pathToFileURL(serverBundle).href);
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
    const distDir = path29.resolve(PKG_ROOT5, "dist");
    const publicDir = path29.resolve(PKG_ROOT5, "public");
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
  ${c4.bold("gripm")} ${c4.dim(`v${currentVersion}`)}  ${c4.green("listo")}

  ${c4.green("\u279C")}  ${c4.bold("Tablero:")}     ${c4.cyan(url)}
  ${c4.dim("\u279C")}  ${c4.dim("Proyecto:")}    ${targetRepo}
  ${c4.dim("\u279C")}  ${c4.dim("Modo:")}        ${storageType.toUpperCase()} ${c4.dim("(tiempo real)")}
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
