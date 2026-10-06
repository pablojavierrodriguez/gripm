#!/usr/bin/env node

/**
 * scripts/verify-audit-ux-baseline.js
 * Regression suite for the audit:ux baseline gate (DEV-166).
 *
 * The baseline is only useful if it is both stable and honest:
 *   - a known finding must stay silent after the file is edited elsewhere,
 *   - a genuinely new finding must surface with file and line,
 *   - an ERROR must never be absorbed by the baseline.
 *
 * Each case runs the real auditor against a throwaway project so the suite
 * never mutates the repository it is auditing.
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDITOR = path.join(ROOT, 'scripts', 'audit-ux-code.cjs');
const RULES = path.join(ROOT, 'scripts', 'ux-rules.json');
// Upstream anchors the snapshot at the project root (DEV-188), not next to the script.
const BASELINE = path.join(ROOT, 'audit-ux-baseline.json');

/**
 * UX-010 residuals that are known to be false positives.
 *
 * `hasVisibleText` upstream only recognises literal text nodes, not JSX expression
 * children. Every label in this project is a `{t('...')}` expression, so the rule
 * cannot see them and reports the button as icon-only. The genuine findings were
 * fixed; what is left is the defect.
 */
const KNOWN_UX010_FALSE_POSITIVES = 12;

/**
 * The auditor resolves the baseline next to itself, so a scratch copy of the
 * script (plus an empty baseline) is required to exercise custom snapshots.
 */
/**
 * Copies the auditor into a scratch directory together with its rule catalog.
 *
 * The snapshot is NOT written here: upstream anchors it at the audited project
 * root, so each fixture project carries its own `audit-ux-baseline.json`.
 */
function auditorFor() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ux-baseline-'));
  const scriptPath = path.join(dir, 'audit-ux-code.cjs');
  fs.copyFileSync(AUDITOR, scriptPath);
  fs.copyFileSync(RULES, path.join(dir, 'ux-rules.json'));
  return { dir, scriptPath };
}

/** The snapshot path for a fixture project. */
const baselineOf = (project) => path.join(project, 'audit-ux-baseline.json');

function runAuditor(scriptPath, projectDir, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, AUDIT_UX_ROOT: projectDir },
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/**
 * A valid index.css, so fixtures only exercise the rules under test.
 * ENV-001 is an ERROR raised when src/index.css is absent or lacks the
 * scrollbar-gutter contract; case 4 deletes it on purpose.
 */
const HEALTHY_CSS = 'html {\n  overflow-y: scroll;\n  scrollbar-gutter: stable;\n}\n';

function makeProject(files, { withCss = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ux-project-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"fixture"}');
  if (withCss) {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'index.css'), HEALTHY_CSS);
  }
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

// --- 1. The committed baseline silences the repository's known findings ----

{
  const committed = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  assert.equal(committed.version, 1, 'baseline format version must be 1');
  // Upstream's payload does not carry a `total`; it is derived from the counts.
  const committedTotal = Object.values(committed.entries).reduce((sum, n) => sum + n, 0);
  assert.ok(committedTotal > 0, 'committed baseline must not be empty');

  const result = spawnSync(process.execPath, [AUDITOR, '--format', 'json'], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  assert.equal(
    result.status,
    0,
    `audit:ux must exit 0 against the committed baseline:\n${result.stdout}${result.stderr}`,
  );

  const report = JSON.parse(result.stdout);

  // UX-010 is re-enabled (DEV-188). Its 12 remaining findings are false positives
  // from a known upstream defect: `hasVisibleText` does not read a JSX expression
  // child, and every label in this project is a `{t('...')}` expression. They are
  // deliberately left visible instead of being suppressed, because suppressing
  // them is what hid the real `role="button"` gap in the first place.
  const residual = report.findings.filter((f) => f.rule === 'UX-010');
  assert.equal(
    residual.length,
    KNOWN_UX010_FALSE_POSITIVES,
    `UX-010 residuals changed. Expected ${KNOWN_UX010_FALSE_POSITIVES} known false positives ` +
      '(upstream hasVisibleText defect); investigate any change before updating this number.',
  );

  const others = report.findings.filter((f) => f.rule !== 'UX-010');
  assert.deepEqual(
    others.map((f) => `${f.rule} ${f.file}:${f.line}`),
    [],
    'no finding outside the documented UX-010 false positives may reach the gate',
  );

  console.log(
    `✅ DEV-166: baseline committed with ${committedTotal} known observations; ` +
      `gate surfaces only ${residual.length} documented UX-010 false positives`,
  );
}

// --- 2. A known finding survives unrelated edits above it ------------------

{
  const project = makeProject({
    'src/Widget.tsx': [
      'export const A = () => <span className="text-[10px]">a</span>;',
      'export const B = () => <span className="text-[11px]">b</span>;',
    ].join('\n'),
  });

  const first = auditorFor();
  execFileSync(process.execPath, [first.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });
  const snapshot = JSON.parse(
    fs.readFileSync(baselineOf(project), 'utf8'),
  );
  const snapshotTotal = Object.values(snapshot.entries).reduce((sum, n) => sum + n, 0);
  assert.equal(snapshotTotal, 2, 'both micro-typography findings must be baselined');
  assert.equal(
    Object.keys(snapshot.entries).length,
    2,
    'distinct sources must produce distinct fingerprints',
  );

  // Insert noise above both findings: line numbers shift, code does not.
  fs.writeFileSync(
    path.join(project, 'src', 'Widget.tsx'),
    ['// comment 1', '// comment 2', 'export const A = () => <span className="text-[10px]">a</span>;', 'export const B = () => <span className="text-[11px]">b</span>;'].join('\n'),
  );

  const after = runAuditor(first.scriptPath, project, ['--format', 'json']);
  assert.equal(after.code, 0, `line shifts must not break the baseline:\n${after.stdout}`);
  assert.equal(
    JSON.parse(after.stdout).findings.length,
    0,
    'shifted known findings must stay silent',
  );

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(first.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: fingerprint is invariant to line shifts, sensitive to source changes');
}

// --- 3. A new regression surfaces with file and line -----------------------

{
  const project = makeProject({
    'src/Widget.tsx': 'export const A = () => <span className="text-[10px]">a</span>;\n',
  });

  const scratch = auditorFor();
  execFileSync(process.execPath, [scratch.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });

  fs.appendFileSync(
    path.join(project, 'src', 'Widget.tsx'),
    'export const B = () => <span className="text-[13px]">b</span>;\n',
  );

  const after = runAuditor(scratch.scriptPath, project, ['--format', 'json']);
  assert.equal(after.code, 0, 'an INFO regression alone must not fail the build');
  // UX-011 is the canonical id for an arbitrary font size outside the scale.
  const findings = JSON.parse(after.stdout).findings;
  assert.equal(findings.length, 1, 'exactly the new observation must be reported');
  assert.equal(findings[0].rule, 'UX-011', 'regression must carry the canonical rule id');
  assert.equal(findings[0].file, 'src/Widget.tsx', 'regression must report the file');
  assert.equal(findings[0].line, 2, 'regression must report the line');

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(scratch.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: uncatalogued regressions surface with precise file and line');
}

// --- 4. ERROR findings are never silenced by the baseline ------------------

{
  const project = makeProject({
    // UX-001 (regional decimal comma) is an ERROR in the canonical catalog.
    'src/Widget.tsx': 'export const A = () => <input type="number" />;\n',
  });

  const scratch = auditorFor();
  execFileSync(process.execPath, [scratch.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });

  // UX-001 is ERROR severity, so `--update-baseline` must not have absorbed it.
  const snapshot = JSON.parse(fs.readFileSync(baselineOf(project), 'utf8'));
  assert.ok(
    !Object.keys(snapshot.entries).some((key) => key.startsWith('UX-001|')),
    'el baseline no debe absorber una regla ERROR',
  );

  const after = runAuditor(scratch.scriptPath, project, ['--format', 'json']);
  assert.equal(after.code, 1, 'un ERROR debe cortar la corrida');
  const findings = JSON.parse(after.stdout).findings;
  assert.equal(findings.length, 1, 'el ERROR debe seguir visible');
  assert.equal(findings[0].rule, 'UX-001', 'el baseline nunca debe absorber un ERROR');

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(scratch.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: ERROR findings bypass the baseline and keep failing the build');
}

console.log('🎉 All audit:ux baseline tests passed successfully!');