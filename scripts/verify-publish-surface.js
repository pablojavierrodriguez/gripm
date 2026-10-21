#!/usr/bin/env node
/**
 * gripm - Publish Surface Guard
 *
 * Verifica que el tarball de npm NO contenga archivos de datos locales del usuario.
 *
 * CONTEXTO (por qué existe esto):
 * El campo `files` de package.json es una ALLOWLIST que tiene precedencia sobre
 * `.gitignore`. Eso significa que un archivo correctamente ignorado por Git puede
 * igual quedar publicado en npm. Esto ya causó una fuga real de datos personales
 * (ver DEV-118 AC #4 y DEV-151).
 *
 * Los dos canales de distribución tienen modelos de amenaza distintos:
 * - Git   → lo commiteado es público e inmutable.
 * - npm   → lo listado en `files` se publica, sin importar `.gitignore`.
 *
 * Este guard empaqueta de verdad y escanea el CONTENIDO (no solo el listado), que
 * es la única verificación que cubre ambos canales.
 *
 * CONTRATO: solo verifica. Nunca muta el repositorio ni el índice de Git.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const isColorSupported =
  !('NO_COLOR' in process.env) &&
  (process.env.FORCE_COLOR === '1' || (process.stdout?.isTTY && process.env.TERM !== 'dumb'));

const c = {
  bold: (s) => (isColorSupported ? `\x1b[1m${s}\x1b[22m` : s),
  dim: (s) => (isColorSupported ? `\x1b[2m${s}\x1b[22m` : s),
  cyan: (s) => (isColorSupported ? `\x1b[36m${s}\x1b[39m` : s),
  green: (s) => (isColorSupported ? `\x1b[32m${s}\x1b[39m` : s),
  yellow: (s) => (isColorSupported ? `\x1b[33m${s}\x1b[39m` : s),
  red: (s) => (isColorSupported ? `\x1b[31m${s}\x1b[39m` : s),
};

/** Nombres de archivo que nunca deben publicarse (datos locales del usuario). */
const FORBIDDEN_BASENAMES = ['projects-registry.json', 'dev-board.json'];

/** Archivos del framework Gripm Playbook que nunca deben empaquetarse en Gripm Board (DEV-250). */
const FORBIDDEN_PLAYBOOK_ENTRIES = [
  '.agents/TEAM_PLAYBOOK.md',
  '.agents/STATE_MACHINE.md',
  '.agents/rules/git-workflow.md',
  '.agents/skills/principal-engineer/SKILL.md',
  '.agents/skills/qa-auditor/SKILL.md',
  '.agents/skills/pm-orchestrator/SKILL.md',
  '.agents/skills/product-designer/SKILL.md',
  '.agents/skills/code-level-ux-auditor/SKILL.md',
  '.agents/skills/market-researcher/SKILL.md',
];

/** Patrones de contenido que revelan entorno local o proyectos privados (SEC-08: soporte multiplataforma sin hardcoding personal). */
const CONTENT_PATTERNS = [
  { label: 'ruta absoluta de home de usuario (macOS)', re: /\/Users\/[a-zA-Z0-9_-]+\//i },
  { label: 'ruta absoluta de home de usuario (Linux)', re: /\/home\/[a-zA-Z0-9_-]+\//i },
  { label: 'ruta absoluta de home de usuario (Windows)', re: /[a-zA-Z]:(?:\\|\/|\\\\)Users(?:\\|\/|\\\\)[a-zA-Z0-9_-]+(?:\\|\/|\\\\)/i },
];

/** Allowlist explícita: todo lo que SÍ debe estar en el tarball (DEV-307). */
const REQUIRED_ENTRIES = [
  'bin/gripm.js',
  'bin/gripm-mcp.js',
  'bin/server.js',
  'bin/gripm-cli.js',
  'dist/index.html',
  'public/logo.png',
  'data/demo-backlog.json',
  'package.json',
  'README.md',
  'README.es.md',
  'LICENSE',
  '.agents/skills/gripm/SKILL.md',
  '.agents/skills/gripm/SKILL.en.md',
  '.agents/skills/gripm/SKILL.es.md',
];

function run(cmd, args, opts = {}) {
  const isWin = process.platform === 'win32';
  const cleanEnv = { ...process.env, ...(opts.env || {}) };
  delete cleanEnv.npm_config_dry_run;
  return execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, shell: isWin, ...opts, env: cleanEnv });
}

console.log(`\n  ${c.bold('gripm')} ${c.dim('·')} Verificando superficie de publicación...\n`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-publish-guard-'));
let tarballPath = null;
let failed = false;

try {
  // 1. Empaquetar de verdad (sin publicar ni disparar scripts que muten git config, DEV-235 / GATE-10).
  const out = run('npm', ['pack', '--ignore-scripts', '--pack-destination', tmp, '--json']);
  const parsed = JSON.parse(out);
  const filename = parsed[0].filename;
  tarballPath = path.join(tmp, filename);

  // 2. Extraer para poder escanear contenido real, no solo nombres.
  const extractDir = path.join(tmp, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });
  run('tar', ['-xzf', tarballPath, '-C', extractDir]);
  const pkgRoot = path.join(extractDir, 'package');

  // 3. Recorrer todos los archivos del tarball.
  /** @type {string[]} */
  const allFiles = [];
  (function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else allFiles.push(rel);
    }
  })(pkgRoot);

  console.log(`  Archivos en el tarball: ${c.bold(String(allFiles.length))}\n`);

  // 3a. El paquete no debe introducirse a sí mismo como dependencia.
  const packedPackage = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
  if (packedPackage.dependencies?.[packedPackage.name]) {
    console.error(`  ${c.red('✖')} DEPENDENCIA CIRCULAR: ${packedPackage.name} depende de sí mismo.`);
    failed = true;
  }

  // 4. Chequeo A - archivos prohibidos por nombre.
  for (const file of allFiles) {
    const base = path.basename(file);
    if (FORBIDDEN_BASENAMES.includes(base)) {
      console.error(`  ${c.red('✖')} ARCHIVO PROHIBIDO PUBLICADO: ${file}`);
      console.error(`    ${c.yellow('▲')} Contiene datos locales del usuario. Debe excluirse del campo "files".`);
      failed = true;
    }
  }

  // 4b. Chequeo A2 - archivos del framework Gripm Playbook prohibidos en Gripm Board (DEV-250).
  for (const forbidden of FORBIDDEN_PLAYBOOK_ENTRIES) {
    if (allFiles.includes(forbidden)) {
      console.error(`  ${c.red('✖')} CONTENIDO DE PLAYBOOK FILTRADO EN GRIPM BOARD: ${forbidden}`);
      console.error(`    ${c.yellow('▲')} Gripm Playbook es un paquete independiente (@gripm/playbook). No debe empaquetarse en @gripm/board.`);
      failed = true;
    }
  }

  // 4c. Chequeo A3 - exclusión estricta de código fuente, scripts de test y baselines (DEV-307).
  const FORBIDDEN_DIRS = ['src/', 'server/', 'scripts/', '.githooks/'];
  const FORBIDDEN_DEV_FILES = [
    'audit-ux-baseline.json',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'index.html',
  ];

  for (const file of allFiles) {
    if (FORBIDDEN_DIRS.some((dir) => file.startsWith(dir))) {
      console.error(`  ${c.red('✖')} DIRECTORIO DE DESARROLLO EN TARBALL: ${file}`);
      console.error(`    ${c.yellow('▲')} Los directorios src/, server/, scripts/ y .githooks/ deben excluirse del paquete de producción (DEV-307).`);
      failed = true;
    }
    if (FORBIDDEN_DEV_FILES.includes(file)) {
      console.error(`  ${c.red('✖')} ARTEFACTO DE CONFIGURACIÓN INTERNA PUBLICADO: ${file}`);
      console.error(`    ${c.yellow('▲')} Archivos de tooling o baselines internos no deben empaquetarse en npm (DEV-307).`);
      failed = true;
    }
    if (/\.(ts|tsx)$/i.test(file)) {
      console.error(`  ${c.red('✖')} ARCHIVO TYPESCRIPT SIN COMPILAR EN TARBALL: ${file}`);
      console.error(`    ${c.yellow('▲')} El paquete de producción debe distribuir únicamente artefactos precompilados en bin/ y dist/ (DEV-307).`);
      failed = true;
    }
  }

  // 5. Chequeo B - contenido que revela entorno privado (solo texto).
  for (const file of allFiles) {
    if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|zip|gz)$/i.test(file)) continue;
    const abs = path.join(pkgRoot, file);
    if (!fs.statSync(abs).isFile() || fs.statSync(abs).size > 5 * 1024 * 1024) continue;

    const content = fs.readFileSync(abs, 'utf8');
    for (const { label, re } of CONTENT_PATTERNS) {
      if (re.test(content)) {
        const line = content.split('\n').find((l) => re.test(l)) ?? '';
        console.error(`  ${c.red('✖')} FUGA DE CONTENIDO en ${file}: ${label}`);
        console.error(`    ${line.trim().slice(0, 100)}`);
        failed = true;
      }
    }
  }

  // 6. Chequeo C - allowlist: lo esencial debe estar presente.
  for (const required of REQUIRED_ENTRIES) {
    if (!allFiles.includes(required)) {
      console.error(`  ${c.red('✖')} FALTA EN EL TARBALL (esperado por allowlist): ${required}`);
      failed = true;
    }
  }

  if (failed) {
    console.error(`\n  ${c.red('✖')} La superficie de publicación está comprometida. NO publiques.\n`);
    process.exit(1);
  }

  console.log(`  ${c.green('✔')} Sin archivos de datos locales en el tarball`);
  console.log(`  ${c.green('✔')} Sin rutas absolutas personales en el contenido`);
  console.log(`  ${c.green('✔')} Allowlist completa (binarios, dist, assets, demo, docs legales)\n`);
  console.log(`  ${c.green('✔')} Publish Surface Guard: la superficie pública está limpia.\n`);
} catch (err) {
  console.error(`\n  ${c.red('✖')} Publish Surface Guard falló durante la verificación:`);
  console.error(`    ${err.message}\n`);
  process.exit(1);
} finally {
  if (tarballPath && fs.existsSync(tarballPath)) fs.rmSync(tarballPath, { force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}