import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { loadRegistryFile, saveRegistryFile, getRegistryPath } from './registryConfig.js';

/**
 * scripts/uninstall.js
 * DEV-115: Desacople seguro de DevBoard de un repositorio, con discriminación
 * de alcance entre "sólo este proyecto" y "purgado global del dispositivo".
 *
 * GARANTÍA ESTRUCTURAL DE NO DESTRUCCIÓN
 * --------------------------------------
 * El dato de negocio de DevBoard es el backlog: `backlog/` y `BACKLOG.md`. Este
 * módulo **nunca** los borra ni los modifica. Eso no depende de tener cuidado en
 * cada rama del código, sino de que la lista de rutas eliminables es explícita y
 * `backlog/` no está en ella por construcción.
 *
 * El mecanismo es una lista blanca de rutas relativas: `removeIfExists` sólo
 * borra algo si la ruta resuelta está dentro del repo y no colisiona con las
 * rutas protegidas. Cualquier ruta inesperada se reporta y se conserva.
 */

/** Rutas que nunca deben tocarse, ni en modo local ni en purga global. */
export const PROTECTED_PATHS = ['backlog', 'BACKLOG.md'];

/** Scripts de npm que inyecta el asistente de init y que este comando sabe revertir. */
export const MANAGED_SCRIPTS = ['board', 'mcp'];

/** Reglas que el init añade a .gitignore y que se sabe quitar. */
const MANAGED_GITIGNORE_MARKERS = [
  '.gripm/update-cache.json',
  '.gripm/*.tmp',
  '.devboard/update-cache.json',
  '.devboard/*.tmp'
];

/**
 * Encabezados de comentario que el init escribe junto a esas reglas.
 */
const MANAGED_GITIGNORE_HEADERS = [
  '# gripm local cache',
  '# DevBoard local cache'
];

function isProtected(relPath) {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  return PROTECTED_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`)
  );
}

/**
 * Borra una ruta solo si es segura: relativa al repo, no fuera de él, y no
 * protegida. Devuelve un motivo si se abstuvo.
 */
function removeIfExists(repoPath, relPath) {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '');

  if (isProtected(normalized)) {
    return { removed: false, reason: 'protegido', path: normalized };
  }

  const target = path.resolve(repoPath, normalized);
  const root = path.resolve(repoPath);

  if (target !== root && !target.startsWith(root + path.sep)) {
    // Path traversal: la ruta se sale del repo. Nunca se borra.
    return { removed: false, reason: 'fuera-del-repo', path: normalized };
  }

  if (!fs.existsSync(target)) {
    return { removed: false, reason: 'no-existe', path: normalized };
  }

  fs.rmSync(target, { recursive: true, force: true });
  return { removed: true, path: normalized };
}

/**
 * Revierte únicamente los scripts de npm que DevBoard gestiona.
 * No toca ningún otro script del usuario: se comparan contra las formas
 * canónicas que el init inyectó, y si el valor actual difiere se preserva.
 */
export function revertManagedScripts(repoPath) {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { modified: false, removed: [], preserved: [] };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    // Un package.json ilegible es del usuario: no se intenta adivinar.
    return { modified: false, removed: [], preserved: MANAGED_SCRIPTS, error: 'package.json ilegible' };
  }

  const removed = [];
  const preserved = [];

  for (const name of MANAGED_SCRIPTS) {
    const value = pkg.scripts?.[name];
    if (value === undefined) continue;

    // Sólo se revierte si el valor actual es una forma inyectada por gripm / DevBoard.
    // Un script propio del usuario que se llame "board" se conserva.
    const isManaged =
      value === 'gripm' ||
      value === 'gripm-mcp' ||
      value === 'devboard' ||
      value === 'devboard-mcp' ||
      value === 'dev-board' ||
      value === 'dev-board-mcp' ||
      value.includes('@gripm/board') ||
      value.includes('github:pablojavierrodriguez/gripm') ||
      value.includes('github:pablojavierrodriguez/dev-board');

    if (isManaged) {
      delete pkg.scripts[name];
      removed.push(name);
    } else {
      preserved.push(name);
    }
  }

  if (Object.keys(pkg.scripts || {}).length === 0 && pkg.scripts) {
    delete pkg.scripts;
  }

  if (removed.length > 0) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  return { modified: removed.length > 0, removed, preserved };
}

/** Quita del .gitignore únicamente las líneas que DevBoard agregó. */
export function revertGitignoreRules(repoPath) {
  const gitignorePath = path.join(repoPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { modified: false, removedLines: 0 };
  }

  const original = fs.readFileSync(gitignorePath, 'utf8');
  const lines = original.split('\n');

  // Primero se localizan los encabezados gestionados, para retirarlos junto con sus
  // reglas y no dejar un comentario huérfano.
  const headerIndices = lines
    .map((l, idx) => (MANAGED_GITIGNORE_HEADERS.includes(l.trim()) ? idx : -1))
    .filter((idx) => idx !== -1);

  const kept = lines.filter((line, idx) => {
    if (headerIndices.includes(idx)) return false;
    return !MANAGED_GITIGNORE_MARKERS.includes(line.trim());
  });

  if (kept.length === lines.length) {
    return { modified: false, removedLines: 0 };
  }

  // Preserva la estructura del archivo: sólo se colapsan los blancos finales.
  const result = kept.join('\n').replace(/\n{3,}$/, '\n');
  fs.writeFileSync(gitignorePath, result, 'utf8');
  return { modified: true, removedLines: lines.length - kept.length };
}

/**
 * Desacopla DevBoard de un único repositorio.
 * Nunca toca `backlog/`, `BACKLOG.md`, ni registro global.
 */
export function uninstallLocalProject(repoPath, options = {}) {
  const result = {
    scope: 'local',
    repoPath,
    removed: [],
    skipped: [],
    scripts: { removed: [], preserved: [] },
    agentArtifacts: null,
  };

  // Artefactos de agente: opcionales porque puede que el usuario quiera seguir
  // colaborando con agentes de IA en este repo.
  if (options.removeAgentArtifacts) {
    for (const rel of ['.agents/skills/gripm', '.agents/skills/devboard', 'AGENTS.md']) {
      const r = removeIfExists(repoPath, rel);
      (r.removed ? result.removed : result.skipped).push(
        r.removed ? r.path : `${r.path} (${r.reason})`
      );
    }
  } else {
    result.agentArtifacts = 'preservados (skill y AGENTS.md conservados)';
  }

  // Configuración local de gripm y DevBoard. Nótese que NO se borra `backlog/`.
  for (const dir of ['.gripm', '.devboard']) {
    const localConfig = removeIfExists(repoPath, dir);
    if (localConfig.removed) {
      result.removed.push(localConfig.path);
    } else if (localConfig.reason !== 'no-existe') {
      result.skipped.push(`${localConfig.path} (${localConfig.reason})`);
    }
  }

  result.scripts = revertManagedScripts(repoPath);
  result.gitignore = revertGitignoreRules(repoPath);

  // Verificación explícita: si algo protegido tocara, es un bug de este módulo.
  for (const p of PROTECTED_PATHS) {
    if (!fs.existsSync(path.join(repoPath, p))) {
      result.integrityWarning = `ATENCIÓN: ${p} no existe. El módulo nunca lo borra; revisá que el repositorio esté completo.`;
    }
  }

  return result;
}

/**
 * Purga global: desacopla el repo actual y limpia el registro central.
 * `backlog/` de este repo se preserva, igual que en el modo local.
 */
export function purgeGlobalDevBoard(repoPath, options = {}) {
  const result = {
    scope: 'global',
    repoPath,
    local: null,
    registry: null,
    unlinkedRepos: [],
    removed: [],
    skipped: [],
  };

  result.local = uninstallLocalProject(repoPath, options);

  // Desregistrar el repo actual y cualquier otro que haya muerto en disco.
  const registryPath = getRegistryPath();
  if (fs.existsSync(registryPath)) {
    let registry;
    try {
      registry = loadRegistryFile();
    } catch {
      registry = null;
    }

    if (registry && Array.isArray(registry.projects)) {
      const surviving = [];
      for (const p of registry.projects) {
        const isCurrent = p.repoPath && path.resolve(p.repoPath) === path.resolve(repoPath);
        const isDead = p.repoPath && !fs.existsSync(p.repoPath);

        if (isCurrent) {
          result.removed.push(`registro: ${p.id}`);
        } else if (isDead) {
          // Se ofrece en el flujo interactivo; en no interactivo también se
          // limpia porque el repo ya no existe y el registro no tiene sentido.
          result.unlinkedRepos.push({ id: p.id, repoPath: p.repoPath, reason: 'ruta inexistente' });
        } else {
          surviving.push(p);
        }
      }

      registry.projects = surviving;
      if (!surviving.some((p) => p.id === registry.activeProjectId)) {
        registry.activeProjectId = surviving[0]?.id || null;
      }

      try {
        saveRegistryFile(registry);
        result.registry = 'actualizado';
      } catch (err) {
        result.registry = `error: ${err.message}`;
      }
    }
  } else {
    result.registry = 'no-existe';
  }

  return result;
}

async function askYesNo(question, rl) {
  const answer = (await rl.question(`${question} (s/N): `)).trim().toLowerCase();
  return answer === 's' || answer === 'si' || answer === 'sí' || answer === 'y';
}

function printPlan(repoPath, registryInfo) {
  const lines = [
    '',
    '┌────────────────────────────────────────────────────────────┐',
    '│  🧹 DevBoard - Desacople Seguro                            │',
    '│                                                            │'
  ];
  if (registryInfo && registryInfo.otherProjects > 0) {
    lines.push(
      `│  🌐 Hub: ${String(registryInfo.otherProjects).padEnd(10)}│   ` +
      'otros proyectos registrados      │'
    );
  }
  lines.push(
    `│  📁 Repositorio: ${repoPath.slice(0, 40).padEnd(41)}│`,
    '│                                                            │',
    '│  🔒 Se preservan SIEMPRE:                                  │',
    '│     • backlog/  (tareas, releases.json, retro/)            │',
    '│     • BACKLOG.md                                           │',
    '│                                                            │',
    '│  Alcance:                                                 │',
    '│    [1] Desacoplar sólo este proyecto (Recomendado)         │',
    '│    [2] Erradicar de todas las instancias locales           │',
    '│                                                            │',
    '│  Selecciona opción [1]: '
  );
  return lines.join('\n');
}

function detectScope(repoPath) {
  let mode = 'single';
  const gripmCfg = path.join(repoPath, '.gripm', 'config.json');
  const devboardCfg = path.join(repoPath, '.devboard', 'config.json');
  const configPath = fs.existsSync(gripmCfg) ? gripmCfg : devboardCfg;
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg && (cfg.mode === 'multi' || cfg.mode === 'hub')) mode = 'multi';
    } catch {
      // Config ilegible: se asume single, que es el modo menos invasivo.
    }
  }

  let otherProjects = 0;
  try {
    const registry = loadRegistryFile();
    if (registry && Array.isArray(registry.projects)) {
      otherProjects = registry.projects.filter(
        (p) => !p.repoPath || path.resolve(p.repoPath) !== path.resolve(repoPath)
      ).length;
    }
  } catch {
    otherProjects = 0;
  }

  return { mode, otherProjects };
}

function printResult(result) {
  console.log('\n  Resultado:');
  for (const item of result.removed || []) {
    console.log(`    ✅ eliminado: ${item}`);
  }
  for (const item of result.skipped || []) {
    console.log(`    ℹ️  sin cambios: ${item}`);
  }
  if (result.scripts) {
    if (result.scripts.removed.length > 0) {
      console.log(`    ✅ scripts de npm revertidos: ${result.scripts.removed.join(', ')}`);
    }
    if (result.scripts.preserved.length > 0) {
      console.log(`    🔒 scripts propios del usuario preservados: ${result.scripts.preserved.join(', ')}`);
    }
  }
  if (result.integrityWarning) {
    console.log(`    ⚠️  ${result.integrityWarning}`);
  }
  if (result.unlinkedRepos && result.unlinkedRepos.length > 0) {
    console.log(`    🧹 registros huérfanos quitados: ${result.unlinkedRepos.map((r) => r.id).join(', ')}`);
  }
  console.log('\n  🔒 Tu backlog está intacto: backlog/ y BACKLOG.md no se tocan nunca.');
}

/**
 * Punto de entrada del comando. `yes` fuerza el modo local, `global` fuerza la
 * purga total: ambos existen para uso no interactivo en CI.
 */
export async function runUninstallCommand(repoPath, options = {}) {
  const { mode, otherProjects } = detectScope(repoPath);

  let scope = 'local';
  let removeAgentArtifacts = options.removeAgentArtifacts === true;

  const isInteractive = process.stdin.isTTY && !options.yes && !options.global;

  if (isInteractive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log(printPlan(repoPath, { otherProjects }));
      const answer = (await rl.question('')).trim();
      if (answer === '2') scope = 'global';

      if (await askYesNo('\n  ¿Eliminar también la skill de agentes (.agents/skills/gripm) y AGENTS.md?', rl)) {
        removeAgentArtifacts = true;
      } else {
        console.log('  ℹ️  Se conservarán la skill y AGENTS.md para seguir colaborando con agentes.');
      }

      if (scope === 'global' && otherProjects > 0) {
        const confirmed = await askYesNo(
          `  ⚠️  Esto desregistrará ${otherProjects} proyecto(s) más de este dispositivo. ¿Continuar?`,
          rl
        );
        if (!confirmed) {
          scope = 'local';
          console.log('  ℹ️  Se continúa con el desacople local solamente.');
        }
      }
    } finally {
      rl.close();
    }
  } else {
    scope = options.global ? 'global' : 'local';
    console.log(
      options.global
        ? '\n  🧹 Modo no interactivo: purga global (--global).'
        : `\n  🧹 Modo no interactivo: desacople local del proyecto (modo detectado: ${mode}).`
    );
  }

  const result =
    scope === 'global'
      ? purgeGlobalDevBoard(repoPath, { removeAgentArtifacts })
      : uninstallLocalProject(repoPath, { removeAgentArtifacts });

  result.scope = scope;
  printResult(result);

  if (scope === 'global') {
    console.log(
      '\n  Para quitar el binario global (si lo instalaste):\n    npm uninstall -g gripm (o dev-board)'
    );
  }

  return result;
}
