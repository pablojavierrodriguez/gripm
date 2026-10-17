#!/usr/bin/env node
/**
 * gripm CLI
 * Herramienta de línea de comandos para consultar, analizar y mutar en lote tareas del backlog
 * de forma limpia, eficiente en tokens y agnóstica del almacenamiento (Markdown o JSON).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync, spawnSync } from 'node:child_process';
import { parseBacklogMd, normalizeStatus, normalizePriority, generateMonolithicBacklogMd } from './backlogMdParser.ts';
import { loadRegistryFile, resolveProjectIdentity } from './registryConfig.js';
import { BacklogService } from '../server/services/backlogService.ts';
import { atomicWriteFileSync } from '../server/services/atomicWrite.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function getRegistry(): { activeProjectId: string; projects: any[] } {
  const reg = loadRegistryFile(ROOT_DIR);
  if (!reg || !Array.isArray(reg.projects)) {
    return { activeProjectId: '', projects: [] };
  }
  return reg;
}

function getProject(projectId?: string) {
  const registry = getRegistry();
  if (projectId) {
    const found = registry.projects.find(p => p.id === projectId || p.codePrefix?.toLowerCase() === projectId.toLowerCase());
    if (found) return found;
  }

  // Si se ejecuta dentro de un repo con backlog, priorizar el directorio actual (estilo Git)
  const cwd = process.cwd();
  const matched = registry.projects.find(p => p.repoPath && path.normalize(p.repoPath) === path.normalize(cwd));
  if (matched) {
    const identity = resolveProjectIdentity(matched.repoPath || cwd);
    return {
      ...matched,
      id: identity.id || matched.id,
      name: identity.name || matched.name,
      codePrefix: identity.codePrefix || matched.codePrefix
    };
  }

  const hasMdBacklog = fs.existsSync(path.join(cwd, 'backlog/tasks'));
  const hasJsonBacklog = fs.existsSync(path.join(cwd, '.gripm/backlog.json'));
  if (hasMdBacklog || hasJsonBacklog) {
    const identity = resolveProjectIdentity(cwd);
    return {
      id: identity.id,
      name: identity.name,
      codePrefix: identity.codePrefix,
      repoPath: cwd,
      storageType: hasMdBacklog ? 'markdown' : 'json',
      backlogDir: 'backlog',
      createdAt: new Date().toISOString()
    };
  }

  if (registry.activeProjectId) {
    const active = registry.projects.find(p => p.id === registry.activeProjectId);
    if (active) return active;
  }

  return registry.projects[0];
}

function loadTasks(project: any, options: { staged?: boolean } = {}): any[] {
  if (!project) return [];

  // 1. Storage Markdown
  if (project.storageType === 'markdown' && project.repoPath) {
    if (options.staged) {
      try {
        const out = execSync('git ls-files -s -z backlog/tasks/', {
          cwd: project.repoPath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const entries: { sha: string; relPath: string; file: string }[] = [];
        for (const chunk of out.split('\0')) {
          if (!chunk.endsWith('.md')) continue;
          const tabIdx = chunk.indexOf('\t');
          if (tabIdx === -1) continue;
          const meta = chunk.slice(0, tabIdx).trim().split(/\s+/);
          const relPath = chunk.slice(tabIdx + 1);
          entries.push({ sha: meta[1], relPath, file: path.basename(relPath) });
        }
        entries.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));

        const res = spawnSync('git', ['cat-file', '--batch'], {
          cwd: project.repoPath,
          input: entries.map(e => e.sha).join('\n') + '\n',
          maxBuffer: 50 * 1024 * 1024
        });

        const buf = res.stdout;
        let offset = 0;
        const items: any[] = [];

        for (let i = 0; i < entries.length; i++) {
          const nlIdx = buf.indexOf(0x0a, offset);
          if (nlIdx === -1) break;
          const header = buf.slice(offset, nlIdx).toString('utf8');
          const size = parseInt(header.split(' ')[2], 10);
          const contentStart = nlIdx + 1;
          const contentEnd = contentStart + size;
          const raw = buf.slice(contentStart, contentEnd).toString('utf8');
          offset = contentEnd + 1;

          const entry = entries[i];
          const fallbackId = entry.file.split(' - ')[0] || entry.file.replace(/\.md$/, '');
          const task = parseBacklogMd(raw, fallbackId);
          items.push({
            id: task.id || fallbackId,
            code: task.id || fallbackId,
            title: task.title,
            status: normalizeStatus(task.status),
            priority: normalizePriority(task.priority),
            type: task.type,
            milestone: task.milestone,
            sprint: task.sprint || task.targetSprint || task.rawExtraFrontmatter?.sprint,
            targetSprint: task.targetSprint || task.sprint || task.rawExtraFrontmatter?.sprint || task.milestone,
            acceptanceCriteria: task.acceptanceCriteria || [],
            labels: task.labels || [],
            _file: entry.file,
            _relPath: entry.relPath,
            _raw: task
          });
        }
        return items.filter(t => !t._raw?.isDeleted && t._raw?.isDeleted !== 'true');
      } catch {
        // Fallback a lectura de disco si git falla
      }
    }
  }

  // Delegar lectura estándar al BacklogService unificado excluyendo tareas borradas (AC 2, AC 6)
  return BacklogService.listTasks(project, { includeDeleted: false });
}

const isColorSupported =
  !('NO_COLOR' in process.env) &&
  (process.env.FORCE_COLOR === '1' || (process.stdout?.isTTY && process.env.TERM !== 'dumb'));

const c = {
  bold: (s: string) => (isColorSupported ? `\x1b[1m${s}\x1b[22m` : s),
  dim: (s: string) => (isColorSupported ? `\x1b[2m${s}\x1b[22m` : s),
  cyan: (s: string) => (isColorSupported ? `\x1b[36m${s}\x1b[39m` : s),
  green: (s: string) => (isColorSupported ? `\x1b[32m${s}\x1b[39m` : s),
  yellow: (s: string) => (isColorSupported ? `\x1b[33m${s}\x1b[39m` : s),
  red: (s: string) => (isColorSupported ? `\x1b[31m${s}\x1b[39m` : s),
};

function printUsage() {
  console.log(`
  ${c.bold('gripm')} ${c.dim('·')} Gestión, Auditoría y Mutaciones de Backlog

${c.bold('Uso:')}
  gripm [comando] [opciones]
  npm run tasks -- [opciones]

${c.bold('Comandos / Modos:')}
  list                 (Por defecto) Lista las tareas con filtros aplicados
  --stats              Muestra un panel consolidado de métricas y agrupación por prefijo
  --update-status <s>  Actualiza masivamente el estado de todas las tareas filtradas

${c.bold('Filtros:')}
  --open, -o           Muestra solo tareas abiertas (excluye done, dismissed, released)
  --prefix <prefijo>   Filtra por prefijo de código (ej: FEAT, BUG, DEV)
  --ids <id1,id2>      Filtra por lista explícita de IDs separados por coma
  --status <estado>    Filtra por estado (draft, doing, review, ready, done)
  --priority <prio>    Filtra por prioridad (urgent, high, medium, low)
  --sprint <milestone> Filtra por sprint / milestone (ej: v1.1.0)
  --project <id>       ID del proyecto (por defecto el activo)
  --limit <n>          Cantidad máxima a mostrar (por defecto 30)
  --search <texto>     Filtra por texto en título o etiquetas
  --json               Emite la salida en formato JSON
  --help, -h           Muestra esta ayuda
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    printUsage();
    return;
  }

  const showStats = args.includes('--stats');
  const openOnly = args.includes('--open') || args.includes('-o') || args.includes('--active');
  const asJson = args.includes('--json');

  const getArgValue = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) ? args[idx + 1] : undefined;
  };

  const status = getArgValue('--status');
  const priority = getArgValue('--priority');
  const sprint = getArgValue('--sprint') || getArgValue('--milestone');
  const projectId = getArgValue('--project');
  const search = getArgValue('--search') || getArgValue('-s');
  const prefix = getArgValue('--prefix') || getArgValue('-p');
  const idsArg = getArgValue('--ids');
  const updateStatus = getArgValue('--update-status');
  const limitStr = getArgValue('--limit') || getArgValue('-n');
  const limit = limitStr ? parseInt(limitStr, 10) : (showStats ? 999999 : 30);

  const project = getProject(projectId);
  if (!project) {
    console.error(`  ${c.red('✖')} No se encontró ningún proyecto registrado en gripm.`);
    process.exit(1);
  }

  let tasks = loadTasks(project);

  // Modo Exportar a BACKLOG.md consolidado
  if (args[0] === 'export' || args.includes('--export')) {
    const isStaged = args.includes('--staged');
    const tasksToExport = isStaged ? loadTasks(project, { staged: true }) : tasks;
    const md = generateMonolithicBacklogMd(project.name, tasksToExport.map(t => t._raw || {
      id: t.id || t.code,
      title: t.title,
      status: t.status,
      type: t.type,
      priority: t.priority,
      milestone: t.milestone,
      description: t.description || '',
      acceptanceCriteria: t.acceptanceCriteria || []
    }));
    const exportPath = path.join(project.repoPath || process.cwd(), 'BACKLOG.md');
    
    if (args.includes('--check')) {
      let existing = '';
      if (isStaged) {
        try {
          existing = execFileSync('git', ['show', ':BACKLOG.md'], {
            cwd: project.repoPath || process.cwd(),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch {
          console.error(`  ${c.red('✖')} BACKLOG.md no está presente en el índice de Git (stage).`);
          process.exit(1);
        }
      } else {
        existing = fs.existsSync(exportPath) ? fs.readFileSync(exportPath, 'utf8') : '';
      }

      const normalizeLf = (s: string) => s.replace(/\r\n/g, '\n').trim();
      const stripDateHeader = (s: string) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, '');
      if (stripDateHeader(normalizeLf(existing)) !== stripDateHeader(normalizeLf(md))) {
        // Detectar tareas específicas cuya versión no coincide con el consolidado
        const differingFiles: string[] = [];
        for (const t of tasksToExport) {
          const taskId = String(t.id || t.code || '');
          const escapedId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`#### \\[${escapedId}\\][\\s\\S]*?\\n---`);
          const existingMatch = existing.match(regex);
          const genMatch = md.match(regex);
          if (!existingMatch || !genMatch || normalizeLf(existingMatch[0]) !== normalizeLf(genMatch[0])) {
            differingFiles.push(t._file ? `backlog/tasks/${t._file}` : taskId);
          }
        }

        if (differingFiles.length > 0) {
          console.error(`  ${c.red('✖')} BACKLOG.md ${isStaged ? 'en el índice de Git ' : ''}no coincide con el estado de las tareas:`);
          differingFiles.slice(0, 5).forEach(f => console.error(`    ${c.dim('•')} ${f}`));
          if (differingFiles.length > 5) {
            console.error(`    ${c.dim('...')} y ${differingFiles.length - 5} tarea(s) más.`);
          }
          console.error(`    ${c.yellow('▲')} Acción requerida: Regenera BACKLOG.md ${isStaged ? 'desde el índice y stagealo' : 'con npm run backlog:sync'}.\n`);
        } else {
          console.error(`  ${c.red('✖')} BACKLOG.md ${isStaged ? 'en el índice de Git ' : ''}está desactualizado respecto a las tareas en backlog/tasks/. Ejecuta: npm run backlog:sync`);
        }
        process.exit(1);
      }
      console.log(`  ${c.green('✔')} BACKLOG.md ${isStaged ? '(índice Git) ' : ''}100% sincronizado (modo solo lectura).`);
      return;
    }

    atomicWriteFileSync(exportPath, md, 'utf8');
    console.log(`  ${c.green('✔')} Backlog consolidado exportado exitosamente a: ${exportPath}`);
    return;
  }

  // Modo Estadísticas / Dashboard
  if (showStats) {
    const total = tasks.length;
    const closedStatuses = ['done', 'dismissed', 'cancelled', 'released'];
    let openCount = 0;
    let doneCount = 0;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byPrefix: Record<string, { total: number; open: number; done: number }> = {};

    for (const t of tasks) {
      const isClosed = closedStatuses.includes(t.status);
      if (isClosed) doneCount++; else openCount++;

      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

      const code = String(t.code || t.id || '');
      const parts = code.split('-');
      const pfx = parts.length > 2 ? `${parts[0]}-${parts[1]}` : (parts[0] || 'OTHER');

      if (!byPrefix[pfx]) {
        byPrefix[pfx] = { total: 0, open: 0, done: 0 };
      }
      byPrefix[pfx].total++;
      if (isClosed) byPrefix[pfx].done++; else byPrefix[pfx].open++;
    }

    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    if (asJson) {
      console.log(JSON.stringify({
        project: { id: project.id, name: project.name, storage: project.storageType },
        summary: { total, open: openCount, done: doneCount, completionRate: `${completionRate}%` },
        byStatus,
        byPriority,
        byPrefix
      }, null, 2));
      return;
    }

    console.log(`\n  ${c.bold('gripm')} ${c.dim('·')} Métricas de Backlog: ${c.bold(project.name)} ${c.dim(`[${project.storageType.toUpperCase()}]`)}\n`);
    console.log(`  Total Ítems:       ${c.bold(String(total))}`);
    console.log(`  Abiertos:          ${openCount} ${c.dim(`(${total > 0 ? Math.round((openCount / total) * 100) : 0}%)`)}`);
    console.log(`  Terminados:        ${doneCount} ${c.dim(`(${completionRate}%)`)}`);
    console.log(`  Tasa de Avance:    [${c.green('█'.repeat(Math.round(completionRate / 5)))}${c.dim('░'.repeat(20 - Math.round(completionRate / 5)))}] ${completionRate}%\n`);

    console.log(`  ${c.bold('Por Estado:')}`);
    for (const [st, cnt] of Object.entries(byStatus)) {
      console.log(`    ${c.dim('•')} ${st.padEnd(12, ' ')} : ${cnt}`);
    }

    console.log(`\n  ${c.bold('Agrupación por Prefijo de Tarea:')}`);
    console.log(`    Prefijo          Total      Abiertas   Terminadas`);
    console.log(`    ${c.dim('───────────────  ─────────  ─────────  ──────────')}`);
    for (const [pfx, data] of Object.entries(byPrefix)) {
      console.log(`    ${pfx.padEnd(15, ' ')}  ${String(data.total).padEnd(9, ' ')}  ${String(data.open).padEnd(9, ' ')}  ${data.done}`);
    }
    console.log('');
    return;
  }

  // Filtros aplicados
  if (openOnly) {
    const closed = ['done', 'dismissed', 'cancelled', 'released'];
    tasks = tasks.filter(t => !closed.includes(t.status));
  }
  if (prefix) {
    const pfxLower = prefix.toLowerCase();
    tasks = tasks.filter(t => 
      (t.code && t.code.toLowerCase().startsWith(pfxLower)) || 
      (t.id && t.id.toLowerCase().startsWith(pfxLower))
    );
  }
  if (idsArg) {
    const setIds = new Set(idsArg.split(',').map(s => s.trim().toLowerCase()));
    tasks = tasks.filter(t => 
      (t.code && setIds.has(t.code.toLowerCase())) || 
      (t.id && setIds.has(t.id.toLowerCase()))
    );
  }
  if (status) {
    const sNorm = normalizeStatus(status);
    tasks = tasks.filter(t => t.status === sNorm);
  }
  if (priority) {
    const pNorm = normalizePriority(priority);
    tasks = tasks.filter(t => t.priority === pNorm);
  }
  if (sprint) {
    const spLower = sprint.toLowerCase();
    tasks = tasks.filter(t => 
      (t.sprint && String(t.sprint).toLowerCase() === spLower) ||
      (t.targetSprint && String(t.targetSprint).toLowerCase() === spLower) ||
      (t.milestone && String(t.milestone).toLowerCase() === spLower)
    );
  }
  if (search) {
    const q = search.toLowerCase();
    tasks = tasks.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) || 
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.labels && t.labels.some((l: string) => l.toLowerCase().includes(q)))
    );
  }

  // Modo Actualización Masiva (CLI Bulk Update DEV-021 / DEV-299)
  if (updateStatus) {
    const newStatus = normalizeStatus(updateStatus);

    if (tasks.length === 0) {
      console.log(`  ${c.yellow('▲')} No hay tareas que coincidan con los filtros para actualizar.`);
      return;
    }

    const force = args.includes('--force') || args.includes('-f');
    const matchedIds = tasks.map(t => t.code || t.id);

    try {
      const res = BacklogService.bulkUpdateTasks(
        project,
        { taskIds: matchedIds },
        { status: newStatus },
        { force }
      );

      if (res.warning) {
        console.warn(`\n  ${c.yellow('▲')} ${res.warning}`);
      }

      console.log(`\n  ${c.green('✔')} Actualización masiva completada: ${res.updatedCount} tareas pasadas a estado '${newStatus}'.\n`);
    } catch (err: any) {
      console.error(`\n  ${c.red('✖')} Error al actualizar tareas: ${err.message}\n`);
      process.exit(1);
    }
    return;
  }

  const totalFiltered = tasks.length;
  const sliced = tasks.slice(0, limit);

  if (asJson) {
    console.log(JSON.stringify({
      project: { id: project.id, name: project.name, storage: project.storageType },
      total: totalFiltered,
      showing: sliced.length,
      items: sliced
    }, null, 2));
    return;
  }

  console.log(`\n  ${c.bold('gripm')} ${c.dim('·')} Backlog: ${project.name} ${c.dim(`(${project.storageType.toUpperCase()})`)}`);
  console.log(`  Mostrando ${sliced.length} de ${totalFiltered} tareas ${openOnly ? 'abiertas' : ''}:\n`);

  if (sliced.length === 0) {
    console.log('  (No hay tareas que coincidan con los filtros)\n');
    return;
  }

  sliced.forEach((t, i) => {
    const acList = t.acceptanceCriteria || t.acceptanceCriteriaList || [];
    const acProgress = acList.length > 0 
      ? ` [${acList.filter((ac: any) => ac.checked).length}/${acList.length} AC]` 
      : '';
    const sprintTag = t.milestone || t.targetSprint ? ` <${t.milestone || t.targetSprint}>` : '';
    const statusMarker = t.status === 'doing' ? c.cyan('●') : t.status === 'review' ? c.yellow('◐') : t.status === 'ready' ? c.green('◎') : t.status === 'done' ? c.green('✔') : c.dim('○');

    console.log(`  ${String(i + 1).padStart(2, ' ')}. ${statusMarker} [${t.code || t.id}] (${t.status.toUpperCase()} / ${t.priority})${sprintTag} - ${t.title}${acProgress}`);
  });

  if (totalFiltered > limit) {
    console.log(`\n  ... y ${totalFiltered - limit} tareas más (usa --limit ${totalFiltered} para ver todas)`);
  }
  console.log('');
}

main().catch(err => {
  console.error(`  ${c.red('✖')} Error:`, err.message);
  process.exit(1);
});
