#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') {
  console.log('ℹ Exit-code propagation is verified inside the Linux test container only.');
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(scriptDir, 'run-and-propagate-exit-code.sh');

for (const expectedExitCode of [0, 23]) {
  const result = spawnSync('bash', [runner, 'node', '-e', `process.exit(${expectedExitCode})`], {
    encoding: 'utf8'
  });
  assert.ifError(result.error);
  assert.equal(result.status, expectedExitCode, `Suite exit code ${expectedExitCode} must be preserved`);
  assert.ok(result.stdout.includes(`SUITE_EXIT=${expectedExitCode}`), 'Runner must report the suite exit code');
}

console.log('✅ Linux suite runner preserves both successful and failed exit codes');
