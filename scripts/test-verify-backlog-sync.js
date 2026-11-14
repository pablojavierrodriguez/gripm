#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFY_SCRIPT = path.join(ROOT, 'scripts', 'verify-backlog-sync.js');

function makeTaskContent({ id, status, sprintId = null, acChecked = status === 'done' }) {
  const box = acChecked ? 'x' : ' ';
  const sprintLine = sprintId ? `\nsprint_id: ${sprintId}` : '';
  return [
    '---',
    `id: ${id}`,
    `title: "Task ${id}"`,
    `status: ${status}`,
    "created_date: '2026-11-14'",
    "updated_date: '2026-11-14'",
    'labels: ["test"]',
    'dependencies: []',
    `priority: medium${sprintLine}`,
    '---',
    '',
    '## Description',
    '<!-- SECTION:DESCRIPTION:BEGIN -->',
    `Test task ${id}.`,
    '<!-- SECTION:DESCRIPTION:END -->',
    '',
    '## Acceptance Criteria',
    '<!-- AC:BEGIN -->',
    `- [${box}] #1 Verified`,
    '<!-- AC:END -->',
    '',
  ].join('\n');
}

function createSandbox(tasks = {}, sprints = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-verify-sync-'));
  fs.mkdirSync(path.join(dir, 'backlog', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'backlog', 'sprints.json'), JSON.stringify(sprints, null, 2), 'utf8');
  for (const [filename, content] of Object.entries(tasks)) {
    fs.writeFileSync(path.join(dir, 'backlog', 'tasks', filename), content, 'utf8');
  }
  // Generate valid BACKLOG.md so final export --check verifies clean backlog generation too.
  runVerify(dir, ['--fix']);
  return dir;
}

function runVerify(dir, args = []) {
  const res = spawnSync(process.execPath, [VERIFY_SCRIPT, ...args], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: res.status ?? 1, output: `${res.stdout || ''}${res.stderr || ''}` };
}

console.log('Running verify-backlog-sync duplicate ID tests (DEV-370)...');

// 1. Historical done/dismissed duplicates outside active sprint warn without blocking
{
  const dir = createSandbox({
    'DEV-001 - First.md': makeTaskContent({ id: 'DEV-001', status: 'done' }),
    'DEV-001 - Second.md': makeTaskContent({ id: 'DEV-001', status: 'dismissed' }),
    'DEV-002 - Active Valid.md': makeTaskContent({ id: 'DEV-002', status: 'doing' }),
  });
  try {
    const res = runVerify(dir);
    assert.equal(res.code, 0, `Expected historical duplicates to pass with warning:\n${res.output}`);
    assert.match(res.output, /\[Advertencia Histórica\] El ID duplicado "DEV-001"/);

    // 2. --strict escalates historical duplicates into a blocking failure
    const strictRes = runVerify(dir, ['--strict']);
    assert.equal(strictRes.code, 1, 'Expected --strict to fail on historical duplicates');
    assert.match(strictRes.output, /\[Error de Unicidad\] El ID de tarea "DEV-001"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 3. Duplicate ID with non-historical status (e.g., doing + done) blocks immediately
{
  const dir = createSandbox({
    'DEV-010 - Old.md': makeTaskContent({ id: 'DEV-010', status: 'done' }),
    'DEV-010 - Active.md': makeTaskContent({ id: 'DEV-010', status: 'doing' }),
  });
  try {
    const res = runVerify(dir);
    assert.equal(res.code, 1, 'Expected active-status duplicate to fail');
    assert.match(res.output, /\[Error de Unicidad\] El ID de tarea "DEV-010"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 4. Duplicate ID attached to an active sprint in backlog/sprints.json blocks even when done
{
  const dir = createSandbox(
    {
      'DEV-020 - First.md': makeTaskContent({ id: 'DEV-020', status: 'done', sprintId: 'sprint-9' }),
      'DEV-020 - Second.md': makeTaskContent({ id: 'DEV-020', status: 'done', sprintId: 'sprint-9' }),
    },
    [{ id: 'sprint-9', name: 'Sprint 9', status: 'active' }],
  );
  try {
    const res = runVerify(dir);
    assert.equal(res.code, 1, 'Expected active-sprint duplicate to fail');
    assert.match(res.output, /\[Error de Unicidad\] El ID de tarea "DEV-020"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('verify-backlog-sync duplicate ID tests passed (4/4).');
