#!/usr/bin/env node
/**
 * gripm add - Captura rápida de tareas desde CLI sin abrir el board (DEV-329)
 * 
 * Permite registrar tareas directamente en el storage del proyecto activo
 * (Markdown en backlog/tasks/ o JSON en .gripm/backlog.json), sincronizando
 * BACKLOG.md y respetando todos los invariantes de dominio.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BacklogService } from '../server/services/backlogService.ts';
import { normalizePriority, normalizeType } from './backlogMdParser.ts';
import { loadRegistryFile, resolveProjectIdentity } from './registryConfig.js';
import type { ProjectMeta } from '../server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isColorSupported = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
const c = {
  bold: (s: string) => (isColorSupported ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s: string) => (isColorSupported ? `\x1b[2m${s}\x1b[0m` : s),
  green: (s: string) => (isColorSupported ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s: string) => (isColorSupported ? `\x1b[36m${s}\x1b[0m` : s),
  yellow: (s: string) => (isColorSupported ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s: string) => (isColorSupported ? `\x1b[31m${s}\x1b[0m` : s),
};

export interface AddCliOptions {
  title?: string;
  priority?: string;
  type?: string;
  due?: string;
  description?: string;
  estimate?: string | number;
  labels?: string[];
  sprint?: string;
  repo?: string;
  json?: boolean;
  help?: boolean;
}

export function printAddHelp(): void {
  console.log(`
  gripm add - Captura rápida de tareas desde la terminal sin abrir el navegador

  Uso:
    gripm add "<título>" [opciones]
    gripm add --title "<título>" [opciones]

  Descripción:
    Crea una nueva tarea en el proyecto de forma instantánea y local,
    utilizando el motor de almacenamiento configurado (Markdown o JSON).
    Sincroniza automáticamente BACKLOG.md si corresponde.

  Opciones:
    --title, -t <texto>            Título de la tarea (o como argumento posicional)
    --priority, -p <prioridad>     Prioridad: low, medium, high, urgent, p0, p1, p2, p3 (defecto: medium)
    --type <tipo>                  Tipo: feature, bug, spike, chore, task (defecto: feature)
    --due, --due-date <YYYY-MM-DD> Fecha de vencimiento
    --description, -d <texto>      Descripción o notas de la tarea
    --estimate, -e <valor>         Estimación (puntos de historia o valor libre)
    --labels, -l <etiquetas>       Etiquetas separadas por comas (ej: "cli,ux")
    --sprint, -s <sprint>          Nombre del sprint asignado (ej: "Sprint 1")
    --repo, -r <ruta>              Ruta al proyecto destino (defecto: directorio actual)
    --json                         Emite el resultado en formato JSON estructurado
    --help, -h                     Muestra esta ayuda
`);
}

export function parseAddArgs(rawArgs: string[]): AddCliOptions {
  const args = [...rawArgs];
  if (args[0] === 'add') {
    args.shift();
  }

  const opts: AddCliOptions = {};
  const positionalWords: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h' || arg === '-help') {
      opts.help = true;
      continue;
    }
    if (arg === '--json') {
      opts.json = true;
      continue;
    }
    if (arg === '--title' || arg === '-t') {
      opts.title = args[++i];
      continue;
    }
    if (arg === '--priority' || arg === '-p') {
      opts.priority = args[++i];
      continue;
    }
    if (arg === '--type') {
      opts.type = args[++i];
      continue;
    }
    if (arg === '--due' || arg === '--due-date') {
      opts.due = args[++i];
      continue;
    }
    if (arg === '--description' || arg === '-d' || arg === '--desc') {
      opts.description = args[++i];
      continue;
    }
    if (arg === '--estimate' || arg === '-e') {
      opts.estimate = args[++i];
      continue;
    }
    if (arg === '--labels' || arg === '--label' || arg === '-l') {
      const val = args[++i] || '';
      const split = val.split(',').map(s => s.trim()).filter(Boolean);
      opts.labels = [...(opts.labels || []), ...split];
      continue;
    }
    if (arg === '--sprint' || arg === '-s') {
      opts.sprint = args[++i];
      continue;
    }
    if (arg === '--repo' || arg === '-r') {
      opts.repo = args[++i];
      continue;
    }

    if (!arg.startsWith('-')) {
      positionalWords.push(arg);
    }
  }

  if (!opts.title && positionalWords.length > 0) {
    opts.title = positionalWords.join(' ');
  }

  return opts;
}

export function resolveProjectForCli(targetRepo: string): ProjectMeta | null {
  const hasTasks = fs.existsSync(path.join(targetRepo, 'backlog', 'tasks'));
  const hasJson = fs.existsSync(path.join(targetRepo, '.gripm', 'backlog.json'));
  const hasConfig = fs.existsSync(path.join(targetRepo, '.gripm', 'config.json'));
  const hasBacklogMd = fs.existsSync(path.join(targetRepo, 'BACKLOG.md'));

  const registry = loadRegistryFile(ROOT_DIR);
  const matched = (registry?.projects || []).find(
    (p: any) => p.repoPath && path.resolve(p.repoPath) === targetRepo
  );

  if (!hasTasks && !hasJson && !hasConfig && !hasBacklogMd && !matched) {
    return null;
  }

  const identity = resolveProjectIdentity(targetRepo);
  let storageType: 'markdown' | 'json' = (hasTasks || hasBacklogMd) ? 'markdown' : (hasJson ? 'json' : 'markdown');
  if (matched?.storageType) {
    storageType = matched.storageType;
  }

  return {
    id: identity.id || matched?.id || path.basename(targetRepo),
    name: identity.name || matched?.name || path.basename(targetRepo),
    codePrefix: identity.codePrefix || matched?.codePrefix || 'DEV',
    repoPath: targetRepo,
    storageType,
    backlogDir: 'backlog',
    createdAt: matched?.createdAt || new Date().toISOString()
  };
}

export async function runAddCommand(rawArgs: string[]): Promise<void> {
  const opts = parseAddArgs(rawArgs);

  if (opts.help) {
    printAddHelp();
    return;
  }

  if (!opts.title || !opts.title.trim()) {
    console.error(`\n  ${c.red('✖')} Error: Debes especificar el título de la tarea.`);
    console.error(`    Uso: gripm add "<título>" [--priority high] [--type bug] [--due YYYY-MM-DD]`);
    console.error(`    Ejecuta "gripm add --help" para ver todas las opciones disponibles.\n`);
    process.exitCode = 1;
    return;
  }

  if (opts.due) {
    const isFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(opts.due);
    const parsedTime = Date.parse(opts.due);
    if (!isFormatValid || isNaN(parsedTime)) {
      console.error(`\n  ${c.red('✖')} Error: Formato de fecha inválido para --due: "${opts.due}".`);
      console.error(`    Debe seguir el formato YYYY-MM-DD (ej: 2026-12-31).\n`);
      process.exitCode = 1;
      return;
    }
  }

  const targetRepo = opts.repo ? path.resolve(opts.repo) : process.cwd();
  if (!fs.existsSync(targetRepo)) {
    console.error(`\n  ${c.red('✖')} Error: El directorio especificado no existe: "${targetRepo}".\n`);
    process.exitCode = 1;
    return;
  }

  const project = resolveProjectForCli(targetRepo);
  if (!project) {
    console.error(`\n  ${c.red('✖')} Error: No se encontró un proyecto de gripm inicializado en "${targetRepo}".`);
    console.error(`    Ejecuta 'gripm --init' en este directorio para inicializarlo.\n`);
    process.exitCode = 1;
    return;
  }

  const taskPayload: any = {
    title: opts.title.trim(),
    priority: opts.priority ? normalizePriority(opts.priority) : 'medium',
    type: opts.type ? normalizeType(opts.type) : 'feature',
    status: 'draft',
    description: opts.description || '',
    estimate: opts.estimate,
    sprint: opts.sprint,
    labels: opts.labels || [],
    dueDate: opts.due
  };

  const result = BacklogService.createTask(project, taskPayload);
  if (!result.ok || !result.task) {
    console.error(`\n  ${c.red('✖')} Error: No se pudo crear la tarea en el storage.`);
    process.exitCode = 1;
    return;
  }

  // Si es un proyecto Markdown con BACKLOG.md, sincronizar BACKLOG.md para mantener coherencia (AC #2)
  if (project.storageType === 'markdown' && project.repoPath) {
    const backlogMdPath = path.join(project.repoPath, 'BACKLOG.md');
    if (fs.existsSync(backlogMdPath)) {
      try {
        BacklogService.exportBacklogMd(project);
      } catch (err: any) {
        console.warn(`  ${c.yellow('▲')} Aviso: No se pudo auto-sincronizar BACKLOG.md: ${err.message}`);
      }
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({
      ok: true,
      task: result.task,
      savedFile: result.savedFile
    }, null, 2));
    return;
  }

  const created = result.task;
  const code = created.code || created.id;
  const relFile = result.savedFile ? path.relative(targetRepo, result.savedFile) : '';

  console.log(`\n  ${c.green('✔')} Tarea creada exitosamente: ${c.bold(`[${code}]`)} ${c.dim(`(${created.priority} / ${created.type})`)}`);
  console.log(`    ${c.bold('Título:')}      ${created.title}`);
  if (created.dueDate) {
    console.log(`    ${c.bold('Vencimiento:')} ${created.dueDate}`);
  }
  if (created.estimate !== undefined && created.estimate !== null && created.estimate !== '') {
    console.log(`    ${c.bold('Estimación:')}  ${created.estimate}`);
  }
  if (created.labels && created.labels.length > 0) {
    console.log(`    ${c.bold('Etiquetas:')}   ${created.labels.join(', ')}`);
  }
  if (created.sprint) {
    console.log(`    ${c.bold('Sprint:')}      ${created.sprint}`);
  }
  if (relFile) {
    console.log(`    ${c.bold('Archivo:')}     ${relFile}`);
  }
  console.log('');
}
