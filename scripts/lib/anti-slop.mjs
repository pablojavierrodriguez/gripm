/**
 * scripts/lib/anti-slop.mjs
 *
 * Deterministic anti-slop inspection for type evasions and anti-patterns.
 * Scans git diff for chained casts (as unknown as / as any as) in production code files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const TYPE_EVASION_REGEX = /\bas\s+(?:unknown|any)\s+as\b/;
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export function isTestOrFixturePath(filePath) {
  if (!filePath) return false;
  const norm = `/${filePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()}`;
  return (
    norm.includes('/tests/') ||
    norm.includes('/test/') ||
    norm.includes('/__tests__/') ||
    norm.includes('/fixtures/') ||
    norm.includes('.test.') ||
    norm.includes('.spec.')
  );
}

export function isInspectableCodePath(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.has(ext) && !isTestOrFixturePath(filePath);
}

export function inspectDiffText(diffText) {
  const failures = [];
  if (!diffText || !diffText.trim()) return failures;

  let currentFile = null;
  const lines = diffText.split('\n');

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const parts = line.split(' ');
      currentFile = parts[3] ? parts[3].replace(/^b\//, '') : null;
      continue;
    }

    if (!currentFile || !isInspectableCodePath(currentFile)) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedText = line.slice(1);
      const match = addedText.match(TYPE_EVASION_REGEX);
      if (match) {
        failures.push(
          `anti-slop: type evasion "${match[0]}" detected in ${currentFile}. Chained casts through unknown/any violate type safety invariants.`,
        );
      }
    }
  }
  return failures;
}

export function checkDiffAntiSlop(projectRoot) {
  const failures = [];
  const warnings = [];

  try {
    const gitRes = spawnSync('git', ['diff', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 15000,
    });

    if (gitRes.error || gitRes.status !== 0) {
      return { passed: true, failures, warnings };
    }

    failures.push(...inspectDiffText(gitRes.stdout || ''));
  } catch (err) {
    warnings.push(`anti-slop: git diff inspection skipped (${err.message})`);
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

export function getModifiedFiles(repoPath) {
  try {
    const res = spawnSync('git', ['status', '--porcelain', '-z'], {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (res.error || res.status !== 0) return [];
    const items = (res.stdout || '').split('\0').filter(Boolean);
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.startsWith('R ') || item.startsWith('RM') || item.startsWith('RD')) {
        if (i + 1 < items.length) {
          files.push(items[++i].replace(/\\/g, '/'));
        }
      } else if (item.length > 3) {
        files.push(item.slice(3).trim().replace(/\\/g, '/'));
      }
    }
    return files;
  } catch {
    return [];
  }
}

export async function checkStructuralHealth(projectRoot, options = {}) {
  const failures = [];
  const warnings = [];

  const root = path.resolve(projectRoot || process.cwd());
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(root, 'scripts', 'audit-engine.mjs'),
    path.resolve(scriptDir, '..', 'audit-engine.mjs'),
  ];
  const enginePath = candidates.find((p) => fs.existsSync(p));
  if (!enginePath) {
    return { passed: true, failures, warnings };
  }

  let scanCodebase;
  try {
    const mod = await import(pathToFileURL(enginePath).href);
    scanCodebase = mod.scanCodebase;
  } catch (err) {
    warnings.push(`structural health: failed to load audit engine (${err.message})`);
    return { passed: true, failures, warnings };
  }

  if (typeof scanCodebase !== 'function') {
    return { passed: true, failures, warnings };
  }

  let enforceLocCeiling = false;
  try {
    const configPath = path.join(root, '.gripm', 'config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg?.guardrails?.enforceLocCeiling === true) {
        enforceLocCeiling = true;
      }
    }
  } catch {}

  const isStrict = Boolean(
    options.strict ||
    (process.argv && (process.argv.includes('--strict') || process.argv.includes('-s')))
  );

  const maxLines = options.maxLines || 1000;
  const report = await scanCodebase(root, { maxLines });

  const criticalLocViolations = (report?.loc?.violations || []).filter(
    (v) => v.status === 'error' || v.lines >= 1000,
  );
  const criticalSuppressions = (report?.quality?.suppressions || []).filter(
    (s) => s.type !== 'console.log',
  );

  const locCount = criticalLocViolations.length;
  const suppCount = criticalSuppressions.length;

  if (locCount > 0 || suppCount > 0) {
    if (options.force) {
      warnings.push(
        `Structural health bypassed (--force): ${locCount} LOC violation(s), ${suppCount} suppression(s) skipped by PO authority.`,
      );
    } else if (isStrict) {
      for (const v of criticalLocViolations) {
        failures.push(`file budget: "${v.file}" has ${v.lines} LOC, exceeding the 1000-line hard ceiling`);
      }
      for (const s of criticalSuppressions) {
        failures.push(`anti-slop: quality suppression "${s.type}" detected in ${s.file}:${s.line}`);
      }
    } else {
      if (enforceLocCeiling) {
        const modifiedFiles = getModifiedFiles(root);
        const modifiedViolations = criticalLocViolations.filter((v) =>
          modifiedFiles.includes(v.file)
        );
        for (const v of modifiedViolations) {
          failures.push(
            `file budget (guardrail): modified file "${v.file}" has ${v.lines} LOC, exceeding the 1000-line hard ceiling`,
          );
        }
      }
      for (const v of criticalLocViolations) {
        warnings.push(`file budget (advisory): "${v.file}" has ${v.lines} LOC, exceeding the 1000-line hard ceiling`);
      }
      for (const s of criticalSuppressions) {
        warnings.push(`anti-slop (advisory): quality suppression "${s.type}" detected in ${s.file}:${s.line}`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}
