#!/usr/bin/env node

/**
 * scripts/prepare-hooks.js
 * DEV-174 / DEV-339: Configuración de githooks multiplataforma (Windows, macOS, Linux).
 * Agnostico de shell: configura core.hooksPath y permisos de ejecución en .githooks.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GITHOOKS_DIR = path.join(ROOT, '.githooks');

try {
  execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT, stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { cwd: ROOT, stdio: 'ignore' });

  // Ensure hooks are executable on POSIX platforms
  if (fs.existsSync(GITHOOKS_DIR)) {
    const hooks = fs.readdirSync(GITHOOKS_DIR);
    for (const hook of hooks) {
      const hookPath = path.join(GITHOOKS_DIR, hook);
      try {
        fs.chmodSync(hookPath, 0o755);
      } catch {}
    }
  }
} catch {
  // Ignora de forma segura si no está en un repositorio git de trabajo
}
