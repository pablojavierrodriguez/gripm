#!/usr/bin/env node

/**
 * scripts/test-commit-msg.js
 * Verification test for commit-msg hook and validate-commit-msg.js (DEV-339).
 */

import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCommitMessage } from './validate-commit-msg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(ROOT, 'scripts/validate-commit-msg.js');

console.log('🧪 Iniciando verificación del validador de commit-msg (DEV-339)...');

// 1. Valid Conventional Commits in technical English
const validCases = [
  'feat(DEV-339): sanitize exceptions in BacklogService',
  'fix(parser): handle undefined task id in markdown serialization',
  'chore(deps): update dependency lockfile',
  'refactor(core)!: redesign item state machine',
  'docs(readme): add installation instructions',
  'test(api): add CSRF prevention regression tests',
  'perf(indexer): optimize task filtering loop',
  'build(bin): bundle production CLI artifacts',
  'ci(github): add windows matrix verification',
  'revert: drop deprecated legacy helper',
  'feat: simple valid commit without scope',
];

for (const msg of validCases) {
  const res = validateCommitMessage(msg);
  assert.strictEqual(res.valid, true, `Mensaje válido rechazado indebidamente: "${msg}". Razón: ${res.reason}`);
}
console.log(`✅ [1/6] ${validCases.length} mensajes válidos en inglés aprobados.`);

// 2. Git automated bypasses
const gitAutomated = [
  "Merge branch 'dev' of https://github.com/gripm/gripm into dev",
  'Merge pull request #42 from gripm/feat/task-sync',
  'Revert "feat(DEV-100): add something"',
  'fixup! feat(DEV-100): add something',
  'squash! feat(DEV-100): add something',
  '# This is a git comment\n# Another comment\n',
  '',
];

for (const msg of gitAutomated) {
  const res = validateCommitMessage(msg);
  assert.strictEqual(res.valid, true, `Commit automatizado de Git rechazado: "${msg}". Razón: ${res.reason}`);
}
console.log(`✅ [2/6] Commits de bypass de Git (Merge, Revert, squash/fixup, vacíos) aprobados.`);

// 3. Format errors (non-Conventional)
const formatErrors = [
  'Update readme',
  'random commit message without structure',
  'unknown(DEV-1): add feature',
  'feat',
  'feat:',
  'fix(): empty scope',
];

for (const msg of formatErrors) {
  const res = validateCommitMessage(msg);
  assert.strictEqual(res.valid, false, `Mensaje con formato incorrecto aceptado indebidamente: "${msg}"`);
}
console.log(`✅ [3/6] ${formatErrors.length} mensajes sin formato Conventional Commits rechazados.`);

// 4. Spanish rejection
const spanishCases = [
  'feat(DEV-339): agrega validación de commits en inglés',
  'fix(DEV-001): corrige error en el cálculo de estados',
  'chore(deps): actualiza paquetes de producción',
  'feat: saneamiento de excepciones en BacklogService',
  'fix: error al guardar tarea',
  'refactor(core): modificación estructural de servicios',
  'feat(DEV-123): nuevo componente para el dashboard',
  'chore: soporte para variables de entorno',
];

for (const msg of spanishCases) {
  const res = validateCommitMessage(msg);
  assert.strictEqual(res.valid, false, `Mensaje en español aceptado indebidamente: "${msg}"`);
  assert.ok(
    res.reason.includes('Spanish') || res.reason.includes('español'),
    `La razón de rechazo debe mencionar detección de español: "${res.reason}"`
  );
}
console.log(`✅ [4/6] ${spanishCases.length} mensajes en español detectados y rechazados.`);

// 5. Anti-Em-Dash / Anti-AI rejection
const dashCases = [
  'feat(DEV-339): sanitize exceptions \u2014 update hook',
  'fix(parser): resolve issue \u2013 update test',
];

for (const msg of dashCases) {
  const res = validateCommitMessage(msg);
  assert.strictEqual(res.valid, false, `Mensaje con guion largo aceptado indebidamente: "${msg}"`);
  assert.ok(res.reason.includes('em-dash') || res.reason.includes('en-dash'), `Debe mencionar em-dash: "${res.reason}"`);
}
console.log(`✅ [5/6] Mensajes con em-dash o en-dash rechazados según la norma de guion simple.`);

// 6. CLI execution via temporary file (simulating git commit-msg hook)
const tmpFile = path.join(os.tmpdir(), `gripm-commit-msg-test-${Date.now()}.txt`);
try {
  // Test 6a: Valid message via file -> exit 0
  fs.writeFileSync(tmpFile, 'feat(DEV-339): verify commit-msg hook execution\n\n# Git comment\n', 'utf8');
  const cliValid = spawnSync(process.execPath, [SCRIPT_PATH, tmpFile], { encoding: 'utf8' });
  assert.strictEqual(cliValid.status, 0, `CLI falló ante mensaje válido. Stderr: ${cliValid.stderr}`);

  // Test 6b: Spanish message via file -> exit 1
  fs.writeFileSync(tmpFile, 'feat(DEV-339): agrega hook de validación\n', 'utf8');
  const cliInvalid = spawnSync(process.execPath, [SCRIPT_PATH, tmpFile], { encoding: 'utf8' });
  assert.strictEqual(cliInvalid.status, 1, 'CLI debió salir con código 1 ante mensaje en español');
  assert.ok(cliInvalid.stderr.includes('Commit message rejected'), 'CLI debe emitir mensaje de rechazo');
  assert.ok(cliInvalid.stderr.includes('Spanish'), 'CLI debe indicar detección de español');

  console.log('✅ [6/6] Ejecución de CLI simulando el hook git commit-msg verificada.');
} finally {
  try {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  } catch {}
}

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE COMMIT-MSG PASARON EXITOSAMENTE!\n');
