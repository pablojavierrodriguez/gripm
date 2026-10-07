#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-ui-smoke-'));
const repoPath = path.join(tempRoot, 'consumer-repo');
const homePath = path.join(tempRoot, 'gripm-home');
const taskTitle = `Browser smoke task ${Date.now()}`;
const editedTaskTitle = `${taskTitle} edited`;
const relatedTaskTitle = `Browser relation task ${Date.now()}`;
const serverOutput = [];
let serverProcess;
let browser;

async function reservePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Gripm server exited early (${serverProcess.exitCode}).\n${serverOutput.join('')}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(200);
    }
  }
  throw new Error(`Gripm server did not become ready.\n${serverOutput.join('')}`);
}

async function waitForTask(title = taskTitle) {
  const tasksDir = path.join(repoPath, 'backlog', 'tasks');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const file of fs.readdirSync(tasksDir)) {
      const fullPath = path.join(tasksDir, file);
      if (fs.statSync(fullPath).isFile() && fs.readFileSync(fullPath, 'utf8').includes(title)) {
        return fullPath;
      }
    }
    await delay(200);
  }
  throw new Error(`Created task "${title}" was not persisted in ${tasksDir}`);
}

async function expectRelationVisible(dialog, title) {
  await dialog.getByText(title, { exact: false }).first().waitFor({ state: 'visible' });
}

try {
  fs.mkdirSync(repoPath, { recursive: true });
  const port = await reservePort();
  const url = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, [
    path.join(ROOT, 'bin', 'gripm.js'),
    '--repo', repoPath,
    '--port', String(port),
    '--no-open'
  ], {
    cwd: ROOT,
    env: { ...process.env, GRIPM_HOME: homePath },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProcess.stdout.setEncoding('utf8').on('data', (chunk) => serverOutput.push(chunk));
  serverProcess.stderr.setEncoding('utf8').on('data', (chunk) => serverOutput.push(chunk));

  await waitForServer(url);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const logo = page.locator('header img[alt="gripm"]').first();
  await logo.waitFor({ state: 'visible' });
  assert.ok(await logo.evaluate((image) => image.complete && image.naturalWidth > 0), 'Brand logo must load successfully');

  await page.getByRole('button', { name: /^(New Task|Nueva Tarea)$/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByPlaceholder(/Describe the concrete goal|Describe el objetivo concreto/).fill(taskTitle);
  await dialog.getByRole('button', { name: /Save \(|Guardar \(/ }).click();
  await dialog.waitFor({ state: 'hidden' });

  const persistedTask = await waitForTask();
  assert.ok(fs.readFileSync(persistedTask, 'utf8').includes(taskTitle), 'Created task must be persisted to the consumer repo');
  await page.getByRole('button', { name: new RegExp(taskTitle) }).click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByPlaceholder(/Describe the concrete goal|Describe el objetivo concreto/).fill(editedTaskTitle);
  await dialog.getByRole('button', { name: /Save \(|Guardar \(/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: new RegExp(editedTaskTitle) }).first().waitFor({ state: 'visible' });
  assert.ok(fs.readFileSync(persistedTask, 'utf8').includes(editedTaskTitle), 'A newly created task must be editable immediately');

  await page.getByRole('button', { name: /^(New Task|Nueva Tarea)$/ }).click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByPlaceholder(/Describe the concrete goal|Describe el objetivo concreto/).fill(relatedTaskTitle);
  await dialog.getByRole('button', { name: /Relations|Relaciones/ }).click();
  const parentSelect = dialog.locator('select').filter({ hasText: /No parent|Sin padre/ });
  assert.equal(await parentSelect.count(), 1, 'The parent selector should be uniquely identifiable');
  const parentOption = parentSelect.locator('option').filter({ hasText: editedTaskTitle });
  await parentSelect.selectOption(await parentOption.getAttribute('value'));
  const relatedSelect = dialog.locator('select').filter({ hasText: /Link task conceptually|Vincular tarea conceptualmente/ });
  assert.equal(await relatedSelect.count(), 1, 'The related item should be available in the relationship selector');
  const relationOption = relatedSelect.locator('option').filter({ hasText: editedTaskTitle });
  await relatedSelect.selectOption(await relationOption.getAttribute('value'));
  await dialog.getByRole('button', { name: /Save \(|Guardar \(/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  const persistedRelatedTask = await waitForTask(relatedTaskTitle);
  const persistedRelations = fs.readFileSync(persistedRelatedTask, 'utf8');
  assert.ok(persistedRelations.includes('related_to:'), 'The selected relation must be persisted in Markdown');
  assert.ok(persistedRelations.includes('parent:'), 'The selected parent hierarchy must be persisted in Markdown');
  const relationCard = page.getByRole('button', { name: new RegExp(relatedTaskTitle) });
  await relationCard.getByText(editedTaskTitle, { exact: false }).waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'Sprints y Backlog' }).click();
  const backlogRow = page.locator('tr').filter({ hasText: relatedTaskTitle });
  await backlogRow.getByText(editedTaskTitle, { exact: false }).waitFor({ state: 'visible' });

  await page.getByRole('button', { name: /^(Board|Tablero|Kanban)$/ }).click();
  const relationItemCode = fs.readFileSync(persistedRelatedTask, 'utf8').match(/^id:\s*(.+)$/m)?.[1].trim();
  assert.ok(relationItemCode, 'The created Markdown task must have a canonical code');
  const unknownParentId = 'ORPHAN-PARENT-001';
  const unknownParentResponse = await fetch(`${url}/api/items/${encodeURIComponent(relationItemCode)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parentId: unknownParentId })
  });
  assert.equal(unknownParentResponse.status, 200, 'An unresolved parent identifier must remain editable');
  assert.ok(fs.readFileSync(persistedRelatedTask, 'utf8').includes(`parent: "${unknownParentId}"`),
    'An unresolved parent identifier must persist in Markdown');
  await page.reload({ waitUntil: 'domcontentloaded' });
  const unresolvedRelationCard = page.getByRole('button', { name: new RegExp(relatedTaskTitle) });
  await unresolvedRelationCard.getByText(unknownParentId, { exact: false }).waitFor({ state: 'visible' });

  await unresolvedRelationCard.click();
  await dialog.waitFor({ state: 'visible' });
  const relationsButton = dialog.getByRole('button', { name: /Relations|Relaciones/ });
  assert.equal(await relationsButton.getAttribute('aria-expanded'), 'true',
    'Relations should be expanded when reopening an item that has saved relationships');
  await expectRelationVisible(dialog, unknownParentId);
  await dialog.getByRole('button', { name: new RegExp(`Quitar relación:.*${unknownParentId}|Remove relation:.*${unknownParentId}`) }).click();
  await dialog.getByRole('button', { name: /Save \(|Guardar \(/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(!fs.readFileSync(persistedRelatedTask, 'utf8').includes('parent:'),
    'The relationship summary should remove a resolved or unresolved parent link with a single action');

  assert.strictEqual(await page.getByText(/Error al inicializar la interfaz de gripm|Rendered more hooks than during the previous render/).count(), 0,
    'The fatal-render ErrorBoundary must not be shown');
  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('; ')}`);

  console.log('✅ UI smoke: logo, immediate editing, quick relation removal, and resolved/unresolved hierarchy in Kanban and backlog all verified');
} finally {
  await browser?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await Promise.race([
      new Promise((resolve) => serverProcess.once('close', resolve)),
      delay(5_000)
    ]);
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
