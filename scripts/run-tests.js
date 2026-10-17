#!/usr/bin/env node

/**
 * scripts/run-tests.js - runs the verification suite with per-step timing.
 *
 * The suite used to be a single `a && b && c` chain inside one CI step, which
 * cost diagnosability: when the job stalled nobody could tell which script was
 * responsible, and the only symptom was the whole job hitting its timeout.
 *
 * This runner keeps the exact same order and the same fail-fast semantics, and
 * adds what was missing:
 * - a line per step, so a slow or hanging script is visible while it happens
 * - a summary table sorted by duration at the end
 * - a per-step timeout, so a stuck step fails with its name instead of
 *     burning the entire job budget
 * - hard CI hygiene: git must never block waiting for credentials, which is
 *     how an interactive `git commit` turns into a silent hang on a runner
 *
 * Usage:
 *   node scripts/run-tests.js [--timeout <seconds>] [--bail]
 */

import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  ['parser', 'scripts/test-parser.js'],
  ['integration', 'scripts/verify-integration.js'],
  ['backlog-service', 'scripts/test-backlog-service.js'],
  ['api-security', 'scripts/test-api-security.js'],
  ['package-smoke', 'scripts/test-package-smoke.js'],
  ['optimistic-locking', 'scripts/verify-optimistic-locking.js'],
  ['json-sprint-persistence', 'scripts/verify-json-sprint-persistence.js'],
  ['sse', 'scripts/verify-sse.js'],
  ['legacy-import', 'scripts/verify-legacy-import.js'],
  ['mcp-binary', 'scripts/verify-mcp-binary.js'],
  ['resilience-cli', 'scripts/verify-resilience-and-cli.js'],
  ['audit-ux-baseline', 'scripts/verify-audit-ux-baseline.js'],
  ['status-contrast', 'scripts/verify-status-contrast.js'],
  ['ui-logic', 'scripts/test-ui-logic.js'],
  ['focus-trap', 'scripts/verify-focus-trap.js'],
  ['kanban-reorder', 'scripts/verify-kanban-reorder.js'],
  ['port-probe', 'scripts/verify-port-probe.js'],
  ['sandbox', 'scripts/verify-sandbox.js'],
  ['dist', 'scripts/verify-dist.js'],
];

const DEFAULT_TIMEOUT_SECONDS = 180;

const args = process.argv.slice(2);
const timeoutArg = args.indexOf('--timeout');
let TIMEOUT_SECONDS = DEFAULT_TIMEOUT_SECONDS;
if (timeoutArg !== -1) {
  const val = Number(args[timeoutArg + 1]);
  if (!Number.isFinite(val) || val <= 0) {
    console.error(`❌ Valor inválido para --timeout: "${args[timeoutArg + 1]}". Debe ser un número de segundos positivo.`);
    process.exit(1);
  }
  TIMEOUT_SECONDS = val;
}
const shouldBail = !args.includes('--no-bail');

const env = {
  ...process.env,
  // Any git command that would prompt for credentials must fail instead. On a
  // runner there is no TTY, so the prompt never resolves and the script hangs
  // until the job timeout, with no output to explain it.
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: 'echo',
  GIT_PAGER: 'cat',
};

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const supportsStripTypes = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 6);

let node20LoaderUrl = null;
if (!supportsStripTypes) {
  try {
    const esbuildMain = path.resolve(ROOT, 'node_modules/esbuild/lib/main.js');
    if (fs.existsSync(esbuildMain)) {
      const loaderContent = `
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from ${JSON.stringify(pathToFileURL(esbuildMain).href)};

export function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { code } = esbuild.transformSync(raw, {
      loader: 'ts',
      format: 'esm',
      sourcefile: filePath,
      target: 'node20'
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: code
    };
  }
  return nextLoad(url, context);
}
`;
      const loaderPath = path.join(os.tmpdir(), `gripm-ts-loader-${process.pid}.mjs`);
      fs.writeFileSync(loaderPath, loaderContent, 'utf8');
      node20LoaderUrl = pathToFileURL(loaderPath).href;
      process.on('exit', () => {
        try { fs.unlinkSync(loaderPath); } catch {}
      });
    }
  } catch {}
}

const runStep = ([name, script]) =>
  new Promise((resolve) => {
    const started = Date.now();
    const stepArgs = [
      // The watchdog preload turns a hang into a diagnosis: it names the
      // handles that are keeping the loop alive. Its timer is unref'd, so it
      // never delays a healthy step.
      '--import',
      './scripts/watchdog.js',
    ];
    if (supportsStripTypes) {
      stepArgs.push('--experimental-strip-types');
    } else if (node20LoaderUrl) {
      stepArgs.push('--loader', node20LoaderUrl);
    }
    stepArgs.push(script);

    const child = spawn(
      process.execPath,
      stepArgs,
      {
        cwd: ROOT,
        env: { ...env, GRIPM_WATCHDOG_MS: String(TIMEOUT_SECONDS * 1000) },
        stdio: 'inherit',
      },
    );

    let timedOut = false;
    // Backstop only. The watchdog normally reports first, from inside the child.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      console.error(
        `\n⛔ ${name}: superó ${TIMEOUT_SECONDS}s y SIGKILL no lo detuvo. ` +
          'El watchdog deberia haber reportado los handles.',
      );
    }, (TIMEOUT_SECONDS + 30) * 1000);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ name, script, code, signal, timedOut, ms: Date.now() - started });
    });
  });

const results = [];
let failed = null;

for (const step of STEPS) {
  if (failed && shouldBail) {
    // Preserve the original fail-fast chain: once something fails, the rest does
    // not run, unless --no-bail is passed.
    results.push({ ...step, code: null, signal: null, timedOut: false, ms: 0, skipped: true });
    continue;
  }

  process.stdout.write(`\n▶ ${step[0]}\n`);
  const result = await runStep(step);
  results.push(result);

  if (result.timedOut || result.code !== 0) {
    failed = {
      name: result.name,
      code: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
    };
  }
}

const ran = results.filter((r) => !r.skipped);
const totalMs = ran.reduce((sum, r) => sum + r.ms, 0);

console.log('\n─────────────────────────────────────────────────────────');
console.log('Verificación por paso');
console.log('─────────────────────────────────────────────────────────');
for (const r of [...ran].sort((a, b) => b.ms - a.ms)) {
  const status = r.timedOut ? '⛔ TIMEOUT' : r.code === 0 ? '✅' : '❌';
  console.log(`  ${status} ${r.name.padEnd(22)} ${String(r.ms).padStart(6)}ms  ${r.script}`);
}
console.log('─────────────────────────────────────────────────────────');
console.log(`  ${ran.length} pasos · ${(totalMs / 1000).toFixed(1)}s en total`);
if (failed) {
  console.log(`  ⛔ falló: ${failed.name}${failed.timedOut ? ' (timeout)' : ''}`);
}
console.log('─────────────────────────────────────────────────────────');

if (failed) {
  process.exit(failed.timedOut ? 124 : failed.code ?? 1);
}