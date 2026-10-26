/**
 * scripts/test-deploy-prod.js
 *
 * Unit tests for mechanical production deployment guardrail (DEV-340)
 */

import assert from 'node:assert';
import test from 'node:test';
import { validateDeployEnvironment, runDeploy } from './deploy-prod.js';

test('validateDeployEnvironment rejects deployment from dev branch', () => {
  const mockExec = (cmd) => {
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'dev\n';
    if (cmd.includes('status --porcelain')) return '';
    throw new Error('Unexpected command: ' + cmd);
  };

  const result = validateDeployEnvironment({ exec: mockExec });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.branch, 'dev');
  assert.match(result.error, /Anti-Dev-Production Guardrail Violation/);
  assert.match(result.error, /Current git branch: "dev"/);
});

test('validateDeployEnvironment rejects deployment from feature branches', () => {
  const mockExec = (cmd) => {
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feat/DEV-123\n';
    if (cmd.includes('status --porcelain')) return '';
    throw new Error('Unexpected command: ' + cmd);
  };

  const result = validateDeployEnvironment({ exec: mockExec });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.branch, 'feat/DEV-123');
  assert.match(result.error, /Anti-Dev-Production Guardrail Violation/);
});

test('validateDeployEnvironment rejects deployment when working tree is dirty', () => {
  const mockExec = (cmd) => {
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main\n';
    if (cmd.includes('status --porcelain')) return ' M package.json\n?? untracked.js\n';
    throw new Error('Unexpected command: ' + cmd);
  };

  const result = validateDeployEnvironment({ exec: mockExec });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.branch, 'main');
  assert.match(result.error, /Dirty Working Tree Detected/);
  assert.match(result.error, /untracked\.js/);
});

test('validateDeployEnvironment accepts deployment when branch is main and tree is clean', () => {
  const mockExec = (cmd) => {
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main\n';
    if (cmd.includes('status --porcelain')) return '';
    throw new Error('Unexpected command: ' + cmd);
  };

  const result = validateDeployEnvironment({ exec: mockExec });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.branch, 'main');
  assert.strictEqual(result.error, undefined);
});

test('runDeploy dry-run executes cleanly on valid environment', () => {
  const executedCommands = [];
  const mockExec = (cmd, opts) => {
    executedCommands.push(cmd);
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main\n';
    if (cmd.includes('status --porcelain')) return '';
    return '';
  };

  runDeploy(['--dry-run', '--skip-build'], { exec: mockExec });

  assert.ok(executedCommands.some(cmd => cmd.includes('rev-parse')));
  assert.ok(executedCommands.some(cmd => cmd.includes('status')));
  // Should not execute vercel deploy because of dry-run
  assert.ok(!executedCommands.some(cmd => cmd.includes('vercel')));
});
