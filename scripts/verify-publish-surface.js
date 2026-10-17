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

/** Nombres de archivo que nunca deben publicarse (datos locales del usuario). */
const FORBIDDEN_BASENAMES = ['projects-registry.json', 'dev-board.json'];

/** Archivos del framework Gripm Playbook que nunca deben empaquetarse en Gripm Board (DEV-250). */
const FORBIDDEN_PLAYBOOK_ENTRIES = [
  '.agents/TEAM_PLAYBOOK.md',
  '.agents/STATE_MACHINE.md',
  '.agents/rules/git-workflow.md',
  '.agents/skills/principal-engineer/SKILL.md',
  '.agents/skills/rigorous-qa-auditor/SKILL.md',
  '.agents/skills/pm-orchestrator/SKILL.md',
  '.agents/skills/worldclass-product-designer/SKILL.md',
  '.agents/skills/code-level-ux-auditor/SKILL.md',
  '.agents/skills/market-researcher/SKILL.md',
];

/** Patrones de contenido que revelan entorno local o proyectos privados (SEC-08: soporte multiplataforma sin hardcoding personal). */
const CONTENT_PATTERNS = [
  { label: 'ruta absoluta de home de usuario (macOS)', re: /\/Users\/[a-zA-Z0-9_-]+\//i },
  { label: 'ruta absoluta de home de usuario (Linux)', re: /\/home\/[a-zA-Z0-9_-]+\//i },
  { label: 'ruta absoluta de home de usuario (Windows)', re: /[a-zA-Z]:(?:\\|\/|\\\\)Users(?:\\|\/|\\\\)[a-zA-Z0-9_-]+(?:\\|\/|\\\\)/i },
];

/** Allowlist explícita: todo lo que SÍ debe estar en el tarball. */
const REQUIRED_ENTRIES = [
  'bin/gripm.js',
  'bin/gripm-mcp.js',
  'dist/index.html',
  'public/logo.png',
  'src/data/demo-backlog.json',
  'package.json',
  'README.md',
  'LICENSE',
  '.agents/skills/gripm/SKILL.md',
  '.agents/skills/gripm/SKILL.en.md',
  '.agents/skills/gripm/SKILL.es.md',
  'scripts/templates/AGENTS.en.md',
  'scripts/templates/AGENTS.es.md',
  '.githooks/pre-commit',
];

function run(cmd, args, opts = {}) {
  const isWin = process.platform === 'win32';
  const cleanEnv = { ...process.env, ...(opts.env || {}) };
  delete cleanEnv.npm_config_dry_run;
  return execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, shell: isWin, ...opts, env: cleanEnv });
}

console.log('📦 [Publish Surface Guard] Empaquetando y verificando la superficie pública...\n');

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

  console.log(`   Archivos en el tarball: ${allFiles.length}\n`);

  // 3a. El paquete no debe introducirse a sí mismo como dependencia.
  const packedPackage = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
  if (packedPackage.dependencies?.[packedPackage.name]) {
    console.error(`   ❌ DEPENDENCIA CIRCULAR: ${packedPackage.name} depende de sí mismo.`);
    failed = true;
  }

  // 4. Chequeo A - archivos prohibidos por nombre.
  for (const file of allFiles) {
    const base = path.basename(file);
    if (FORBIDDEN_BASENAMES.includes(base)) {
      console.error(`   ❌ ARCHIVO PROHIBIDO PUBLICADO: ${file}`);
      console.error(`      Contiene datos locales del usuario. Debe excluirse del campo "files".`);
      failed = true;
    }
  }

  // 4b. Chequeo A2 - archivos del framework Gripm Playbook prohibidos en Gripm Board (DEV-250).
  for (const forbidden of FORBIDDEN_PLAYBOOK_ENTRIES) {
    if (allFiles.includes(forbidden)) {
      console.error(`   ❌ CONTENIDO DE PLAYBOOK FILTRADO EN GRIPM BOARD: ${forbidden}`);
      console.error(`      Gripm Playbook es un paquete independiente (@gripm/playbook). No debe empaquetarse en @gripm/board.`);
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
        console.error(`   ❌ FUGA DE CONTENIDO en ${file}: ${label}`);
        console.error(`      ${line.trim().slice(0, 100)}`);
        failed = true;
      }
    }
  }

  // 6. Chequeo C - allowlist: lo esencial debe estar presente.
  for (const required of REQUIRED_ENTRIES) {
    if (!allFiles.includes(required)) {
      console.error(`   ❌ FALTA EN EL TARBALL (esperado por allowlist): ${required}`);
      failed = true;
    }
  }

  if (failed) {
    console.error('\n🛑 La superficie de publicación está comprometida. NO publiques.\n');
    process.exit(1);
  }

  console.log('   ✅ Sin archivos de datos locales en el tarball');
  console.log('   ✅ Sin rutas absolutas personales en el contenido');
  console.log('   ✅ Allowlist completa (binarios, dist, assets, demo, docs legales)\n');
  console.log('🎉 Publish Surface Guard: la superficie pública está limpia.\n');
} catch (err) {
  console.error('\n❌ Publish Surface Guard falló durante la verificación:');
  console.error(`   ${err.message}\n`);
  process.exit(1);
} finally {
  if (tarballPath && fs.existsSync(tarballPath)) fs.rmSync(tarballPath, { force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}