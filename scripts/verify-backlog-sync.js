#!/usr/bin/env node

/**
 * gripm Backlog Live Synchronization & Pre-commit Guard
 * 
 * Verifica la coherencia entre el estado del código fuente y las tareas en backlog/.
 * Impide commits con tareas desactualizadas o sin reflejo en el backlog (Dogfooding).
 */

import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

const isFixMode = process.argv.includes('--fix') || process.argv.includes('--auto-sync');
const isHookMode = process.argv.includes('--hook');

console.log(`\n  ${c.bold('gripm')} ${c.dim('·')} Verificando sincronización del Backlog...`);

const cwd = process.cwd();
const currentRepoDir = fs.existsSync(path.join(cwd, 'backlog/tasks')) ? cwd : ROOT_DIR;
const tasksDir = path.join(currentRepoDir, 'backlog/tasks');
if (!fs.existsSync(tasksDir)) {
  console.log(`  ${c.dim('ℹ')} No se encontró carpeta backlog/tasks. Omitiendo verificación.\n`);
  process.exit(0);
}

/**
 * Obtiene la lista de archivos actualmente staged en el índice de Git.
 * Usa -z para evitar escapes octales y comillas en nombres con espacios o caracteres especiales.
 */
function getStagedFiles(repoDir) {
  try {
    const isGit = execSync('git rev-parse --is-inside-work-tree', {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim() === 'true';

    if (!isGit) return [];

    const out = execSync('git diff --cached --name-only -z', {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return out ? out.split('\0').filter(Boolean) : [];
  } catch {
    return [];
  }
}

// DEV-159: Validación condicional en pre-commit:
// El hook solo opera si el commit incluye archivos de backlog (BACKLOG.md o tareas en backlog/tasks/).
// Si el commit solo toca código o documentación ajena al backlog, se omite con código 0.
if (isHookMode) {
  const staged = getStagedFiles(currentRepoDir);
  const stagedTasks = staged.filter(f => f.startsWith('backlog/tasks/') && f.endsWith('.md'));
  const isBacklogStaged = staged.includes('BACKLOG.md');
  const hasBacklogInStage = stagedTasks.length > 0 || isBacklogStaged;

  if (!hasBacklogInStage) {
    console.log(`  ${c.dim('ℹ')} Sin cambios de backlog en este commit. Verificación omitida.\n`);
    process.exit(0);
  }

  // 1. Si hay tareas en el stage, BACKLOG.md debe estar incluido en el stage
  if (stagedTasks.length > 0 && !isBacklogStaged) {
    console.error(`\n  ${c.red('✖')} Commit rechazado: Se detectaron tareas modificadas en el commit pero "BACKLOG.md" no está incluido en el índice:`);
    stagedTasks.forEach(t => console.error(`    ${c.dim('•')} ${t}`));
    console.error(`\n    ${c.yellow('▲')} Para mantener la coherencia del consolidado con el árbol de tareas:`);
    console.error('      1. npm run backlog:sync    # Sincroniza y actualiza BACKLOG.md');
    console.error('      2. git add BACKLOG.md      # Incluye el consolidado en el commit\n');
    process.exit(1);
  }

  // 2. Si BACKLOG.md está en el stage, verificar que no referencie tareas no trackeadas (archivos fantasma)
  // o tareas excluidas por commit selectivo con pathspec.
  if (isBacklogStaged) {
    try {
      const untrackedOut = execSync('git status --porcelain -z backlog/tasks/', {
        cwd: currentRepoDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const entries = untrackedOut.split('\0').filter(Boolean);
      const untrackedFiles = [];
      for (const entry of entries) {
        if (entry.startsWith('?? ')) {
          untrackedFiles.push(entry.slice(3));
        }
      }

      if (untrackedFiles.length > 0) {
        const stagedBacklogContent = execSync('git show :BACKLOG.md', {
          cwd: currentRepoDir,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Obtener status contra el índice principal si Git está ejecutando un commit por pathspec
        // (en ese caso Git define GIT_INDEX_FILE apuntando a un archivo temporal como .git/next-index-*.lock)
        const isPathspecCommit = Boolean(process.env.GIT_INDEX_FILE);
        let mainIndexStatusMap = new Map();

        if (isPathspecCommit) {
          try {
            const mainEnv = { ...process.env };
            delete mainEnv.GIT_INDEX_FILE;
            const mainStatusOut = execSync('git status --porcelain -z backlog/tasks/', {
              cwd: currentRepoDir,
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe'],
              env: mainEnv
            });
            const mainEntries = mainStatusOut.split('\0').filter(Boolean);
            for (const mEntry of mainEntries) {
              const statusCode = mEntry.slice(0, 2);
              const filePath = mEntry.slice(3);
              mainIndexStatusMap.set(filePath, statusCode);
            }
          } catch {
            // Si falla la consulta al índice principal, se procesará defensivamente
          }
        }

        const realGhostTasks = [];
        const pathspecExcludedStagedTasks = [];

        for (const uf of untrackedFiles) {
          const base = path.basename(uf);
          const taskIdMatch = base.match(/^([A-Za-z0-9_-]+)/);
          if (taskIdMatch) {
            const taskId = taskIdMatch[1];
            if (stagedBacklogContent.includes(taskId)) {
              const mainStatus = mainIndexStatusMap.get(uf);
              // Si en el índice principal está stageado (ej. 'A ', 'M ', 'AM', etc.), es un pathspec commit
              if (isPathspecCommit && mainStatus && (mainStatus[0] === 'A' || mainStatus[0] === 'M')) {
                pathspecExcludedStagedTasks.push({ id: taskId, file: uf, statusInMainIndex: mainStatus });
              } else {
                realGhostTasks.push({ id: taskId, file: uf });
              }
            }
          }
        }

        if (pathspecExcludedStagedTasks.length > 0) {
          console.error(`\n  ${c.red('✖')} Commit rechazado: El commit por pathspec excluye tarea(s) stageadas en el índice principal que están referenciadas en "BACKLOG.md":`);
          pathspecExcludedStagedTasks.forEach(g => console.error(`    ${c.dim('•')} ${g.id} (stageada en índice principal con '${g.statusInMainIndex}': ${g.file})`));
          console.error(`\n    ${c.yellow('▲')} Causa:`);
          console.error('      El commit se ejecutó con un pathspec selectivo (ej. "git commit -- <paths>"). Git aisló el commit');
          console.error('      en un índice temporal donde las tareas stageadas en el índice principal quedaron excluidas.');
          console.error(`\n    ${c.yellow('▲')} Para resolverlo legítimamente sin arrastrar trabajo ajeno:`);
          console.error('      1. Incluir los archivos en el pathspec del commit si corresponden a esta entrega, o');
          console.error('      2. Commitear previamente los archivos stageados en su respectiva rama/tarea antes de este commit.\n');
          process.exit(1);
        }

        if (realGhostTasks.length > 0) {
          console.error(`\n  ${c.red('✖')} Commit rechazado: BACKLOG.md referencia tarea(s) que no están trackeadas en Git (archivos fantasma reales):`);
          realGhostTasks.forEach(g => console.error(`    ${c.dim('•')} ${g.id} (archivo sin trackear: ${g.file})`));
          console.error(`\n    ${c.yellow('▲')} Para resolverlo:`);
          console.error('      git add ' + realGhostTasks.map(g => `"${g.file}"`).join(' '));
          console.error('      O regenera BACKLOG.md sin esas tareas antes de commitear.\n');
          process.exit(1);
        }
      }
    } catch (e) {
      if (e && e.status) {
        process.exit(e.status);
      }
      // Ignorar fallas de lectura de status en entornos restringidos
    }
  }
}

const stagedTasksList = isHookMode ? getStagedFiles(currentRepoDir).filter(f => f.startsWith('backlog/tasks/') && f.endsWith('.md')) : [];

const taskEntries = isHookMode
  ? stagedTasksList.map(relPath => {
      try {
        return {
          file: path.basename(relPath),
          filePath: path.join(currentRepoDir, relPath),
          content: execFileSync('git', ['show', `:${relPath}`], { cwd: currentRepoDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
        };
      } catch {
        return {
          file: path.basename(relPath),
          filePath: path.join(currentRepoDir, relPath),
          content: fs.existsSync(path.join(currentRepoDir, relPath)) ? fs.readFileSync(path.join(currentRepoDir, relPath), 'utf8') : ''
        };
      }
    })
  : fs.readdirSync(tasksDir).filter(f => f.endsWith('.md')).map(f => ({
      file: f,
      filePath: path.join(tasksDir, f),
      content: fs.readFileSync(path.join(tasksDir, f), 'utf8')
    }));

let errorsFound = 0;
let fixedCount = 0;
const malformedAcFiles = [];

for (const { file, filePath, content } of taskEntries) {
  // REGLA 0 (DEV-132): Detección de marcadores de sección duplicados
  const lines = content.split(/\r?\n/);
  const seenBeginMarkers = new Map();

  lines.forEach((line, lineIdx) => {
    const beginMatch = line.match(/<!--\s*([A-Za-z0-9_:-]+:BEGIN)\s*-->/);
    if (beginMatch) {
      const markerKey = beginMatch[1].toUpperCase();
      const lineNum = lineIdx + 1;
      if (seenBeginMarkers.has(markerKey)) {
        const prev = seenBeginMarkers.get(markerKey);
        console.error(`  ${c.red('✖')} [Marcador Duplicado] ${file}:${lineNum}:`);
        console.error(`    El marcador '${beginMatch[0]}' aparece más de una vez en el archivo (primera aparición en línea ${prev.lineNum}).`);
        console.error(`    ${c.yellow('▲')} Esto corrompe silenciosamente el parsing de secciones. Escapalo como '<!\\-- ${beginMatch[1]} -->' o eliminalo.`);
        errorsFound++;
      } else {
        seenBeginMarkers.set(markerKey, { lineNum, markerText: beginMatch[0] });
      }
    }
  });

  // Parse frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) continue;

  const fm = fmMatch[1];
  const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
  const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);

  const rawStatus = (statusMatch ? statusMatch[1] : '').toLowerCase();
  const taskId = idMatch ? idMatch[1] : file.split(' - ')[0];

  // Parse Acceptance Criteria
  const acBlockMatch = content.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
  if (!acBlockMatch) {
    // Un `continue` silencioso acá convertía un marcador malformado en "todo bien": el
    // archivo se saltaba TODAS las invariantes de ACs y `backlog:check` reportaba 100%
    // sincronizado sobre datos que nunca leyó. Si el archivo abre un bloque de ACs y no
    // lo cierra, eso es un defecto del archivo, no una ausencia de ACs.
    if (content.includes('<!-- AC:BEGIN -->')) {
      const f = path.basename(file);
      console.error(`\n  ${c.yellow('▲')} [Marcador AC Malformado] ${f}:`);
      console.error(`    Abre <!-- AC:BEGIN --> pero no cierra <!-- AC:END -->.`);
      console.error(`    Sus criterios de aceptación NO se están validando y tampoco llegan a BACKLOG.md.`);
      console.error(`    Suele ser un <!-- SECTION:DESCRIPTION:END --> donde debía ir <!-- AC:END -->.`);
      malformedAcFiles.push(f);
      errorsFound++;
    }
    continue;
  }

  const acBlock = acBlockMatch[1];
  const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
  const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];

  const totalAcs = allAcs.length;
  const totalChecked = checkedAcs.length;

  // REGLA 1 (DEV-293): Si tiene criterios definidos y todos están marcados (- [x]), se advierte
  // si sigue en 'draft' o 'doing'. En ningún caso el modo --fix debe auto-promocionar a 'ready'
  // (la certificación formal es potestad exclusiva del rol QA tras la Pirámide de Verificación).
  if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === 'draft' || rawStatus === 'doing')) {
    if (rawStatus === 'draft') {
      console.warn(`  ${c.yellow('▲')} [Inconsistencia de Backlog] ${taskId} (${file}):`);
      console.warn(`    Está en 'draft' pero tiene todos sus criterios tildados (${totalChecked}/${totalAcs} AC).`);
    } else {
      console.warn(`  ${c.yellow('▲')} [Aviso de Ciclo de Vida] ${taskId} (${file}):`);
      console.warn(`    Tiene todos los criterios de aceptación cumplidos (${totalChecked}/${totalAcs} AC) pero continúa en 'doing'.`);
      console.warn(`    ${c.yellow('▲')} Si la implementación concluyó, avanza a 'review' para auditoría de QA. No se auto-promociona a 'ready' para preservar la State Machine.`);
    }
  }

  // REGLA 2 (DEV-293): Si el estado es 'done', no debería tener ACs pendientes sin tildar.
  // Erradicación de fabricación de ACs (SEC-02): el modo --fix NUNCA altera '- [ ]' por '- [x]'.
  if (rawStatus === 'done' && totalAcs > 0 && totalChecked < totalAcs) {
    console.warn(`  ${c.yellow('▲')} [Advertencia de Calidad] ${taskId} (${file}):`);
    console.warn(`    El estado es 'done' pero tiene ${totalAcs - totalChecked} de ${totalAcs} criterios de aceptación sin tildar (- [ ]).`);
    console.warn(`    ${c.yellow('▲')} Prohibida la fabricación automática de ACs (SEC-02). Exige verificación real o reclasificación del estado.`);
  }
}

// REGLA 3: Verificación de coherencia de documentación y releases
const readmePath = path.join(currentRepoDir, 'README.md');
const pkgPath = path.join(currentRepoDir, 'package.json');
const releasesJsonPath = path.join(currentRepoDir, 'backlog/releases.json');

if (fs.existsSync(readmePath) && fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Validar versión de features overview contra package.json
    const featOverviewMatch = readmeContent.match(/## ✨ Features Overview \(v(\d+\.\d+\.\d+)\)/);
    if (featOverviewMatch) {
      const docVersion = featOverviewMatch[1];
      if (docVersion !== pkg.version) {
        console.error(`  ${c.red('✖')} [Documentación Desfasada] README.md menciona 'Features Overview (v${docVersion})', pero package.json está en 'v${pkg.version}'.`);
        errorsFound++;
      }
    }

    // Validar conteo de herramientas MCP en README
    const mcpToolsMatch = readmeContent.match(/Available MCP Tools \((\d+)\s+Tools\)/i);
    if (mcpToolsMatch) {
      const toolsInDoc = parseInt(mcpToolsMatch[1], 10);
      const mcpBinPath = path.join(ROOT_DIR, 'bin/gripm-mcp.js');
      if (fs.existsSync(mcpBinPath)) {
        const mcpBinContent = fs.readFileSync(mcpBinPath, 'utf8');
        const toolDefs = (mcpBinContent.match(/name:\s*['"]gripm_[a-z0-9_]+['"]/g) || []).length;
        if (toolDefs > 0 && toolsInDoc < toolDefs) {
          console.warn(`  ${c.yellow('▲')} [Documentación Desfasada] README.md declara ${toolsInDoc} herramientas MCP, pero gripm-mcp expone ${toolDefs} herramientas.`);
        }
      }
    }

    // Validar que no existan referencias a archivos obsoletos en documentación crítica
    const docsToCheck = [
      readmePath,
      path.join(currentRepoDir, 'docs/ARCHITECTURE.md'),
      path.join(currentRepoDir, 'AGENTS.md')
    ].filter(f => fs.existsSync(f));

    for (const docFile of docsToCheck) {
      const docText = fs.readFileSync(docFile, 'utf8');
      if (docText.includes('legacyParser.ts')) {
        console.error(`  ${c.red('✖')} [Error de Documentación] ${path.basename(docFile)} hace referencia al archivo obsoleto 'legacyParser.ts' (debe ser 'scripts/backlogMdParser.ts').`);
        errorsFound++;
      }
    }
  } catch (docErr) {
    console.error(`  ${c.red('✖')} [Error de Documentación] Falló la verificación de documentación: ${docErr.message}`);
    errorsFound++;
  }
}

// REGLA 4: Verificación de Alcance 100% en Releases liberados (Regla de Producción)
if (fs.existsSync(releasesJsonPath)) {
  try {
    const releases = JSON.parse(fs.readFileSync(releasesJsonPath, 'utf8'));
    for (const rel of releases) {
      if (rel.status === 'released' && Array.isArray(rel.itemCodes)) {
        for (const code of rel.itemCodes) {
          const entry = taskEntries.find(e => e.file.toLowerCase().startsWith(code.toLowerCase() + ' ') || e.file.toLowerCase().startsWith(code.toLowerCase() + '-'));
          if (entry) {
            const statusMatch = entry.content.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
            const status = (statusMatch ? statusMatch[1] : '').toLowerCase();
            if (status !== 'done') {
              console.error(`  ${c.red('✖')} [Error de Release] Tarea ${code} pertenece al release publicado v${rel.version}, pero su estado en el archivo es '${status}' (debe ser 'done').`);
              errorsFound++;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`  ${c.red('✖')} [Error de Release] No se pudo leer o parsear '${releasesJsonPath}': ${e.message}`);
    errorsFound++;
  }
}

// REGLA 5: Validación de IDs de Sprint canónicos (DEV-192)
const sprintJsonPath = path.join(currentRepoDir, 'backlog/sprints.json');
if (fs.existsSync(sprintJsonPath)) {
  try {
    const sprints = JSON.parse(fs.readFileSync(sprintJsonPath, 'utf8'));
    if (Array.isArray(sprints)) {
      for (const sp of sprints) {
        if (!/^sprint-\d+$/.test(sp.id || '')) {
          console.error(`  ${c.red('✖')} [Error de Sprint] Sprint "${sp.name}" tiene ID no canónico '${sp.id}' (debe seguir el patrón sprint-<n>).`);
          errorsFound++;
        }
      }
    }
  } catch (e) {
    console.error(`  ${c.red('✖')} [Error de Sprint] No se pudo leer o parsear '${sprintJsonPath}': ${e.message}`);
    errorsFound++;
  }
}


if (errorsFound > 0) {
  console.error(`\n  ${c.red('✖')} El commit fue bloqueado para evitar desactualización del backlog.`);
  console.error(`    Se detectaron ${errorsFound} tarea(s) desfasadas respecto al código.`);
  console.error(`    ${c.yellow('▲')} Para solucionarlo automáticamente ejecuta: npm run backlog:sync\n`);
  process.exit(1);
}

// Regenerar BACKLOG.md consolidado.
//
// Este bloque se ejecuta SOLO si las verificaciones de arriba pasaron, de modo
// que un commit rechazado nunca deja el consolidado reescrito como efecto
// secundario.
//
// IMPORTANTE (contrato del hook): el hook NO escribe en el índice de git.
// Anteriormente ejecutaba `git add BACKLOG.md backlog/`, lo que stageaba
// TODO el directorio backlog/ e arrastraba tareas sin trackear de otras
// temáticas a cualquier commit, haciendo imposible componer commits
// selectivos. Un hook verifica, no muta. Si BACKLOG.md quedo desfasado, el
// propio commit lo dejara modificado y el usuario decide si lo incluye.
try {
  const exportScript = path.join(ROOT_DIR, 'scripts/gripm-cli.ts');
  if (fs.existsSync(exportScript)) {
    if (isFixMode) {
      // DEV-293: Verificar si BACKLOG.md ya está al día para evitar churn diario de git por fecha en cabecera
      let isAlreadySynced = false;
      try {
        execSync(`node --experimental-strip-types "${exportScript}" export --check`, { cwd: currentRepoDir, stdio: 'pipe' });
        isAlreadySynced = true;
      } catch {
        isAlreadySynced = false;
      }

      if (isAlreadySynced) {
        console.log(`  ${c.green('✔')} BACKLOG.md ya se encuentra sincronizado (sin diffs artificiales de timestamp).`);
      } else {
        execSync(`node --experimental-strip-types "${exportScript}" export`, { cwd: currentRepoDir, stdio: 'inherit' });
      }
    } else if (isHookMode) {
      execSync(`node --experimental-strip-types "${exportScript}" export --check --staged`, { cwd: currentRepoDir, stdio: 'inherit' });
    } else {
      execSync(`node --experimental-strip-types "${exportScript}" export --check`, { cwd: currentRepoDir, stdio: 'inherit' });
    }
  }
} catch (exportErr) {
  process.exit(1);
}

if (fixedCount > 0) {
  console.log(`  ${c.green('✔')} Se auto-reconciliaron ${fixedCount} tarea(s) correctamente.`);
} else {
  console.log(`  ${c.green('✔')} Backlog 100% sincronizado y coherente con el código.\n`);
}

process.exit(0);
