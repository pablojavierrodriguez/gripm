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
const BASELINE = path.join(ROOT, 'scripts', 'audit-ux-baseline.json');

/**
 * The auditor resolves the baseline next to itself, so a scratch copy of the
 * script (plus an empty baseline) is required to exercise custom snapshots.
 */
function auditorFor(baselineEntries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ux-baseline-'));
  const scriptPath = path.join(dir, 'audit-ux-code.cjs');
  fs.copyFileSync(AUDITOR, scriptPath);
  fs.writeFileSync(
    path.join(dir, 'audit-ux-baseline.json'),
    JSON.stringify({ version: 1, generatedAt: 'test', entries: baselineEntries }),
  );
  return { dir, scriptPath };
}

function runAuditor(scriptPath, projectDir, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, AUDIT_UX_ROOT: projectDir },
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/**
 * A valid index.css, so fixtures only exercise the rules under test.
 * UX-010 is an ERROR raised when src/index.css is absent or lacks the
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
  assert.ok(committed.total > 0, 'committed baseline must not be empty');

  const result = spawnSync(process.execPath, [AUDITOR], { encoding: 'utf8', cwd: ROOT });
  assert.equal(
    result.status,
    0,
    `audit:ux must exit 0 against the committed baseline:\n${result.stdout}${result.stderr}`,
  );
  assert.match(result.stdout, /CERO observaciones nuevas/, 'audit:ux must report a clean delta');
  assert.match(
    result.stdout,
    new RegExp(`${committed.total} observaciones conocidas`),
    'audit:ux must disclose how many known observations it omitted',
  );
  console.log(`✅ DEV-166: baseline committed with ${committed.total} known observations, gate reports 0`);
}

// --- 2. A known finding survives unrelated edits above it ------------------

{
  const project = makeProject({
    'src/Widget.tsx': [
      'export const A = () => <span className="text-[10px]">a</span>;',
      'export const B = () => <span className="text-[11px]">b</span>;',
    ].join('\n'),
  });

  const first = auditorFor({});
  execFileSync(process.execPath, [first.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });
  const snapshot = JSON.parse(
    fs.readFileSync(path.join(first.dir, 'audit-ux-baseline.json'), 'utf8'),
  );
  assert.equal(snapshot.total, 2, 'both micro-typography findings must be baselined');
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

  const after = runAuditor(first.scriptPath, project);
  assert.equal(after.code, 0, `line shifts must not break the baseline:\n${after.stdout}`);
  assert.match(after.stdout, /CERO observaciones nuevas/, 'shifted known findings must stay silent');

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(first.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: fingerprint is invariant to line shifts, sensitive to source changes');
}

// --- 3. A new regression surfaces with file and line -----------------------

{
  const project = makeProject({
    'src/Widget.tsx': 'export const A = () => <span className="text-[10px]">a</span>;\n',
  });

  const scratch = auditorFor({});
  execFileSync(process.execPath, [scratch.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });

  fs.appendFileSync(
    path.join(project, 'src', 'Widget.tsx'),
    'export const B = () => <span className="text-[13px]">b</span>;\n',
  );

  const after = runAuditor(scratch.scriptPath, project);
  assert.equal(after.code, 0, 'an INFO regression alone must not fail the build');
  assert.match(after.stdout, /\[UX-006\] src\/Widget\.tsx:2/, 'regression must report file and line');
  assert.match(after.stdout, /1 sugerencias/, 'exactly the new observation must be reported');

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(scratch.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: uncatalogued regressions surface with precise file and line');
}

// --- 4. ERROR findings are never silenced by the baseline ------------------

{
  const project = makeProject({ 'src/Widget.tsx': 'export const A = 1;\n' }, { withCss: false });

  const scratch = auditorFor({});
  execFileSync(process.execPath, [scratch.scriptPath, '--update-baseline'], {
    env: { ...process.env, AUDIT_UX_ROOT: project },
    encoding: 'utf8',
  });

  // No index.css at all: UX-010 is an ERROR and must stay visible.
  const after = runAuditor(scratch.scriptPath, project);
  assert.equal(after.code, 1, 'an ERROR must fail the audit');
  assert.match(after.stdout, /\[UX-010\]/, 'the baseline must never absorb an ERROR');

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(scratch.dir, { recursive: true, force: true });
  console.log('✅ DEV-166: ERROR findings bypass the baseline and keep failing the build');
}

console.log('🎉 All audit:ux baseline tests passed successfully!');