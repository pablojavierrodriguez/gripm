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

async function waitForTask() {
  const tasksDir = path.join(repoPath, 'backlog', 'tasks');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const file of fs.readdirSync(tasksDir)) {
      const fullPath = path.join(tasksDir, file);
      if (fs.statSync(fullPath).isFile() && fs.readFileSync(fullPath, 'utf8').includes(taskTitle)) {
        return fullPath;
      }
    }
    await delay(200);
  }
  throw new Error(`Created task was not persisted in ${tasksDir}`);
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

  await page.goto(url, { waitUntil: 'networkidle' });
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
  assert.strictEqual(await page.getByText(/Error al inicializar la interfaz de gripm|Rendered more hooks than during the previous render/).count(), 0,
    'The fatal-render ErrorBoundary must not be shown');
  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('; ')}`);

  console.log('✅ UI smoke: logo loads, task modal opens, task persists, and browser reports no fatal errors');
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
