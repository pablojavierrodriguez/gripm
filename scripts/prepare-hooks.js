#!/usr/bin/env node

/**
 * scripts/prepare-hooks.js
 * DEV-174: Configuración de githooks multiplataforma (Windows, macOS, Linux).
 * Agnostico de shell: reemplaza la sintaxis POSIX de redirección (/dev/null).
 */

import { execSync } from 'node:child_process';

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch {
  // Ignora de forma segura si no está en un repositorio git de trabajo
}
