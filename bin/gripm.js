#!/usr/bin/env node

/**
 * gripm CLI (Zero-Install Runner - DEV-015 / DEV-026 / DEV-144)
 * Usage: npx @gripm/board [--port 4100] [--repo <path>] [--no-open]
 *        npx -p @gripm/board gripm-mcp (starts the Model Context Protocol stdio server)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { loadRegistryFile, saveRegistryFile, getRegistryPath, resolveProjectIdentity } from '../scripts/registryConfig.js';
import { formatUpdateBanner, checkForUpdates, getCachedUpdateInfo, semverGreaterThan } from '../scripts/updateChecker.js';
import { runInitWizard } from '../scripts/initScaffold.js';
import { runUninstallCommand } from '../scripts/uninstall.js';
import { findAvailablePort } from '../scripts/portUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const pkgJson = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
const currentVersion = pkgJson.version || '1.0.0';

const args = process.argv.slice(2);

const isColorSupported = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
const c = {
  bold: (s) => (isColorSupported ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (isColorSupported ? `\x1b[2m${s}\x1b[0m` : s),
  green: (s) => (isColorSupported ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s) => (isColorSupported ? `\x1b[36m${s}\x1b[0m` : s),
  yellow: (s) => (isColorSupported ? `\x1b[33m${s}\x1b[0m` : s),
};

// Open browser helper
function openBrowser(url) {
  if (process.platform === 'darwin') {
    execFile('open', [url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  } else if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '""', url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  } else {
    execFile('xdg-open', [url], (err) => {
      if (err) console.log(`Para acceder abre tu navegador en: ${url}`);
    });
  }
}

function isHelpFlag(arg) {
  return arg === '--help' || arg === '-h' || arg === '--h' || arg === '-help';
}

function hasHelpFlag(argList) {
  return Array.isArray(argList) && argList.some(isHelpFlag);
}

function printMainHelp() {
  console.log(`
  gripm CLI - productos locales para backlog y trabajo con agentes

  Uso:
    gripm [opciones]               Abre Gripm Board en el navegador (por defecto)
    gripm <comando> [opciones]     Ejecuta un subcomando específico

  Comandos:
    gripm mcp                      Inicia el servidor MCP sobre stdio para agentes de IA
    gripm playbook sync            Sincroniza materiales de Gripm Playbook en el proyecto actual
    gripm import --file <ruta>     Importa tareas de Jira, Linear o CSV al backlog local

  Opciones de Cockpit:
    --port, -p <puerto>            Puerto para el servidor web (por defecto: 4100)
    --host <host>                  Host de enlace (por defecto: 127.0.0.1)
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --dev                          Inicia en modo desarrollo con Vite HMR (requiere devDependencies)
    --no-open                      No abrir el navegador automáticamente
    --single                       Forzar modo de proyecto único
    --hub, --multi                 Abrir en modo hub multi-proyecto

  Opciones de Inicialización y Gestión:
    --init                         Configura Gripm Board en el proyecto actual
    --minimal                      Inicialización ultraligera AI-First (Kanban puro, sin ceremonias)
    --full                         Inicialización con baterías incluidas (Scrum, Sprints, gobernanza)
    --language, --lang <es|en>     Idioma del proyecto para scaffolding y plantillas (por defecto: es)
    --with-playbook, --playbook    Instala también Gripm Playbook (@gripm/playbook) con roles de agentes
    --no-playbook                  Omite la instalación de Gripm Playbook (deja el repositorio limpio)
    --yes, -y                      Aceptar opciones por defecto sin preguntas (para CI / no interactivo)
    --uninstall, --clean           Desacoplar gripm de este repositorio (nunca borra backlog/)
    --global, --all                Con --uninstall: purga también el registro global del dispositivo
    --remove-agents                Con --uninstall: elimina la skill de agentes y AGENTS.md

  Opciones Generales:
    --version, -v                  Muestra la versión instalada
    --help, -h                     Muestra esta ayuda

  Integración con Agentes de IA (MCP):
    Para clientes como Cursor, Claude Desktop o Antigravity, también puedes configurar
    directamente el comando 'gripm-mcp' sobre stdio (incluido en @gripm/board).
`);
}

function printMcpHelp() {
  console.log(`
  gripm mcp - Servidor Model Context Protocol (MCP) para agentes de IA

  Uso:
    gripm mcp [opciones]
    gripm-mcp [opciones]

  Descripción:
    Inicia el servidor MCP de Gripm sobre stdio (JSON-RPC 2.0).
    Permite a agentes de IA (Cursor, Antigravity, Claude Code) consultar,
    crear, actualizar y sincronizar tareas del backlog.

  Opciones:
    --repo, -r <ruta>              Ruta al repositorio del proyecto (por defecto: directorio actual)
    --version, -v                  Muestra la versión instalada
    --help, -h                     Muestra esta ayuda
`);
}

function printPlaybookHelp() {
  console.log(`
  gripm playbook - Herramientas y sincronización de Gripm Playbook

  Uso:
    gripm playbook sync [opciones]

  Comandos:
    sync                           Sincroniza archivos y plantillas de Gripm Playbook en el proyecto actual

  Opciones:
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --branch, -b <rama>            Rama Git remota a sincronizar (por defecto: main)
    --remote <url>                 Repositorio remoto de Gripm Playbook
    --dry-run                      Simula los cambios sin escribir en disco
    --force                        Fuerza la sobrescritura de archivos existentes
    --help, -h                     Muestra esta ayuda

  Nota:
    Este comando sincroniza materiales de Gripm Playbook en un proyecto; no instala el producto Gripm Playbook como CLI independiente.
`);
}

function printImportHelp() {
  console.log(`
  gripm import - Importador universal de backlogs externos (Jira, Linear, CSV)

  Uso:
    gripm import --file <ruta> [opciones]
    gripm import -f <ruta> [opciones]

  Descripción:
    Procesa un archivo de exportación de Jira (JSON o CSV), Linear (CSV o JSON),
    o un CSV genérico, transformando cada ítem en una tarea Markdown individual
    en backlog/tasks/ de forma 100% local, con cero llamadas a la nube.

  Opciones:
    --file, -f <ruta>              Ruta al archivo a importar (JSON, CSV o MD) [Obligatorio]
    --repo, -r <ruta>              Repositorio de destino (por defecto: directorio actual)
    --prefix <prefijo>             Prefijo de código para las tareas (ej: DEV, TASK)
    --dry-run                      Simula la importación mostrando tareas detectadas sin escribir en disco
    --help, -h                     Muestra esta ayuda
`);
}

async function main() {
  const VALUE_FLAGS = new Set([
    '--port', '-p',
    '--host',
    '--repo', '-r',
    '--language', '--lang',
    '--branch', '-b',
    '--remote',
    '--file', '-f',
    '--prefix'
  ]);

  const nonFlagArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) {
      i++; // skip option value
      continue;
    }
    if (!args[i].startsWith('-')) {
      nonFlagArgs.push(args[i]);
    }
  }

  const command = nonFlagArgs[0];
  if (command && !['mcp', 'playbook', 'help', 'import'].includes(command)) {
    console.error(`Comando desconocido: "${command}". Ejecuta "gripm --help" para ver los comandos disponibles.`);
    process.exitCode = 1;
    return;
  }

  // Handle 'help' subcommand alias
  if (command === 'help') {
    const sub = nonFlagArgs[1];
    if (sub === 'mcp') {
      printMcpHelp();
      process.exit(0);
    }
    if (sub === 'playbook') {
      printPlaybookHelp();
      process.exit(0);
    }
    if (sub === 'import') {
      printImportHelp();
      process.exit(0);
    }
    printMainHelp();
    process.exit(0);
  }

  // DEV-150 / DEV-295: Handle 'mcp' subcommand directly without starting Vite (positional or non-positional)
  if (command === 'mcp' || (args.includes('mcp') && command !== 'help')) {
    if (hasHelpFlag(args)) {
      printMcpHelp();
      process.exit(0);
    }
    if (args.includes('--version') || args.includes('-v')) {
      console.log(currentVersion);
      process.exit(0);
    }
    await import('./gripm-mcp.js');
    return;
  }

  // Handle 'playbook' subcommand
  if (command === 'playbook' || (args.includes('playbook') && command !== 'help')) {
    if (hasHelpFlag(args)) {
      printPlaybookHelp();
      process.exit(0);
    }

    const playbookSub = nonFlagArgs[1] || (args[args.indexOf('playbook') + 1]);
    if (playbookSub !== 'sync') {
      console.error('Uso: gripm playbook sync [--repo <ruta>] [--dry-run] [--force]');
      console.error('Ejecuta "gripm playbook --help" para ver las opciones disponibles.');
      console.error('Este comando sincroniza materiales del Playbook en un proyecto; no instala Gripm Playbook.');
      process.exitCode = 1;
      return;
    }

    const { runPlaybookSync } = await import('../scripts/sync-playbook.mjs');
    const branchIdx = args.findIndex(a => a === '--branch' || a === '-b');
    const branch = branchIdx !== -1 ? args[branchIdx + 1] : undefined;
    const remoteIdx = args.findIndex(a => a === '--remote');
    const remote = remoteIdx !== -1 ? args[remoteIdx + 1] : undefined;
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');

    let targetRepo = process.cwd();
    const repoIdx = args.findIndex(a => a === '--repo' || a === '-r');
    if (repoIdx !== -1 && args[repoIdx + 1]) {
      targetRepo = path.resolve(args[repoIdx + 1]);
    }

    await runPlaybookSync(targetRepo, { branch, remote, dryRun, force });
    return;
  }

  // DEV-228: Handle 'import' subcommand
  if (command === 'import' || (args.includes('import') && command !== 'help')) {
    if (hasHelpFlag(args)) {
      printImportHelp();
      process.exit(0);
    }

    const fileIdx = args.findIndex(a => a === '--file' || a === '-f');
    const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
    if (!filePath) {
      console.error('Error: Debes especificar el archivo a importar con --file <ruta> o -f <ruta>.');
      console.error('Ejecuta "gripm import --help" para ver las opciones disponibles.');
      process.exitCode = 1;
      return;
    }

    const absoluteFilePath = path.resolve(filePath);
    if (!fs.existsSync(absoluteFilePath)) {
      console.error(`Error: El archivo "${filePath}" no existe.`);
      process.exitCode = 1;
      return;
    }

    const repoIdx = args.findIndex(a => a === '--repo' || a === '-r');
    const targetRepo = repoIdx !== -1 && args[repoIdx + 1] ? path.resolve(args[repoIdx + 1]) : process.cwd();
    const dryRun = args.includes('--dry-run');
    const prefixIdx = args.findIndex(a => a === '--prefix');
    const customPrefix = prefixIdx !== -1 ? args[prefixIdx + 1]?.toUpperCase() : undefined;

    const { pathToFileURL } = await import('node:url');
    const importerPath = path.resolve(PKG_ROOT, 'src/utils/universalImporter.ts');
    const { parseUniversalExport, formatTaskMarkdown } = await import(pathToFileURL(importerPath).href);

    const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const result = parseUniversalExport(fileContent);

    if (result.items.length === 0) {
      console.log(`\n  ${c.yellow('▲')}  No se detectaron tareas para importar en ${path.basename(filePath)} (${result.label}).`);
      return;
    }

    console.log(`\n  ${c.cyan('ℹ')}  ${c.bold(result.label)}`);

    const tasksDir = path.join(targetRepo, 'backlog/tasks');
    if (!dryRun && !fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Determine prefix and max numeric ID
    let prefix = customPrefix;
    let maxNum = 0;

    if (fs.existsSync(tasksDir)) {
      const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
      const prefixCounts = {};
      for (const f of taskFiles) {
        const m = f.match(/^([A-Za-z0-9_-]+)-(\d+)/);
        if (m) {
          const p = m[1].toUpperCase();
          const n = parseInt(m[2], 10);
          prefixCounts[p] = (prefixCounts[p] || 0) + 1;
          if (n > maxNum) maxNum = n;
        }
      }
      if (!prefix) {
        let bestPrefix = '';
        let maxCount = 0;
        for (const [p, count] of Object.entries(prefixCounts)) {
          if (count > maxCount) {
            maxCount = count;
            bestPrefix = p;
          }
        }
        if (bestPrefix) prefix = bestPrefix;
      }
    }

    if (!prefix) {
      const identity = resolveProjectIdentity(targetRepo);
      prefix = identity.codePrefix || 'TASK';
    }

    console.log(`  ${c.dim('Prefijo de tareas:')} ${c.bold(prefix)} (próximo correlativo: ${prefix}-${String(maxNum + 1).padStart(3, '0')})`);
    if (dryRun) {
      console.log(`  ${c.yellow('Modo simulación (--dry-run):')} Ningún archivo será modificado.\n`);
    }

    let importedCount = 0;
    for (const item of result.items) {
      maxNum++;
      const taskId = `${prefix}-${String(maxNum).padStart(3, '0')}`;
      const cleanTitle = (item.title || 'Sin título').replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
      const filename = `${taskId} - ${cleanTitle}.md`;
      const taskContent = formatTaskMarkdown(item, taskId);

      if (dryRun) {
        console.log(`  [SIMULADO] ${taskId} · ${item.title} (${item.status}, ${item.priority})`);
      } else {
        fs.writeFileSync(path.join(tasksDir, filename), taskContent, 'utf8');
      }
      importedCount++;
    }

    if (dryRun) {
      console.log(`\n  ${c.green('✔')}  Simulación completada: ${importedCount} tareas listas para importar.`);
    } else {
      console.log(`\n  ${c.green('✔')}  ${importedCount} tareas importadas con éxito en backlog/tasks/`);
      console.log(`  ${c.dim('Ejecuta "npm run backlog:sync" para consolidar BACKLOG.md.')}`);
    }
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(currentVersion);
    return;
  }

  if (hasHelpFlag(args)) {
    printMainHelp();
    process.exit(0);
  }

  // Parse options
  let port = 4100;
  const portIdx = args.findIndex(a => a === '--port' || a === '-p');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10) || 4100;
  }

  let host = '127.0.0.1';
  const hostIdx = args.findIndex(a => a === '--host');
  if (hostIdx !== -1 && args[hostIdx + 1]) {
    host = args[hostIdx + 1];
  }

  if (host === '0.0.0.0') {
    const crypto = await import('node:crypto');
    const token = process.env.GRIPM_TOKEN || crypto.randomBytes(16).toString('hex');
    process.env.GRIPM_TOKEN = token;
    console.warn('⚠️  ADVERTENCIA DE SEGURIDAD: Enlazando a 0.0.0.0 (red local).');
    console.log(`🔑 Token de autenticación efímero: ${token}`);
    console.log(`🌐 Acceso local seguro: http://localhost:4100/`);
    console.log(`📱 Acceso LAN con token: http://<IP-LAN>:4100/?token=${token}\n`);
  }

  let targetRepo = process.cwd();
  const repoIdx = args.findIndex(a => a === '--repo' || a === '-r');
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    targetRepo = path.resolve(args[repoIdx + 1]);
  }

  const shouldOpen = !args.includes('--no-open');

  // Set Single-Project or Multi-Project mode (DEV-041 / DEV-161 / DEV-240)
  const isHub = args.includes('--hub') || args.includes('--multi');
  const isSingle = args.includes('--single');
  if (isHub) {
    process.env.GRIPM_MODE = 'multi';
  } else if (isSingle) {
    process.env.GRIPM_MODE = 'single';
  } else {
    delete process.env.GRIPM_MODE;
  }
  process.env.GRIPM_TARGET_REPO = targetRepo;
  process.env.GRIPM_HOST = host;

  // DEV-042 & DEV-109 & DEV-219: Handle --init flag to bootstrap .gripm/, backlog/, skills, AGENTS.md, gitignore
  if (args.includes('--init')) {
    const isYes = args.includes('--yes') || args.includes('-y') || args.includes('--defaults');
    const isHubInit = args.includes('--hub') || args.includes('--multi');
    const isSingleInit = args.includes('--single');
    const langIdx = args.findIndex(a => a === '--language' || a === '--lang');
    const cliLang = langIdx !== -1 && args[langIdx + 1] ? args[langIdx + 1].toLowerCase() : undefined;
    const isMinimal = args.includes('--minimal');
    const isFull = args.includes('--full');
    const isWithPlaybook = args.includes('--with-playbook') || args.includes('--playbook');
    const isNoPlaybook = args.includes('--no-playbook');
    
    await runInitWizard(targetRepo, {
      yes: isYes,
      minimal: isMinimal,
      full: isFull,
      profile: isMinimal ? 'minimal' : (isFull ? 'full' : undefined),
      mode: isHubInit ? 'multi' : (isSingleInit ? 'single' : undefined),
      language: cliLang,
      playbook: isNoPlaybook ? false : (isWithPlaybook ? true : undefined),
      skill: args.includes('--no-skill') ? false : (args.includes('--skill') ? true : undefined),
      agentsMd: args.includes('--no-agents') ? false : (args.includes('--agents') ? true : undefined),
      packageJson: args.includes('--no-scripts') ? false : (args.includes('--scripts') ? true : undefined),
      gitignore: args.includes('--no-gitignore') ? false : (args.includes('--gitignore') ? true : undefined),
      force: args.includes('--force')
    });
    process.exit(0);
  }

  // DEV-115: Handle --uninstall / --clean before any other side effect.
  if (args.includes('--uninstall') || args.includes('--clean')) {
    const result = await runUninstallCommand(targetRepo, {
      yes: args.includes('--yes') || args.includes('-y'),
      global: args.includes('--global') || args.includes('--all'),
      removeAgentArtifacts: args.includes('--remove-agents')
    });
    process.exit(result && result.integrityWarning ? 2 : 0);
  }

  // Detect project storage
  const tasksDir = path.join(targetRepo, 'backlog/tasks');
  const gripmJson = path.join(targetRepo, '.gripm/backlog.json');
  let storageType = 'markdown';

  if (fs.existsSync(tasksDir)) {
    storageType = 'markdown';
  } else if (fs.existsSync(gripmJson)) {
    storageType = 'json';
  } else {
    // DEV-216: No crear carpetas preventivamente al vuelo; inicialización ocurre con --init o al crear ítems
    storageType = 'markdown';
  }

  // Register project in registry dynamically (DEV-104)
  // DEV-216: No auto-registrar el directorio home del usuario salvo petición explícita (--repo o --init)
  const isHomeDirectory = path.resolve(targetRepo).toLowerCase() === path.resolve(os.homedir()).toLowerCase();
  const isExplicitProject = args.includes('--repo') || args.includes('-r') || args.includes('--init');

  if (!isHomeDirectory || isExplicitProject) {
    try {
      const registry = loadRegistryFile(PKG_ROOT);
      
      const identity = resolveProjectIdentity(targetRepo);
      const projectName = identity.name;
      const projectId = identity.id;
      const codePrefix = identity.codePrefix;
      
      const existingIdx = registry.projects.findIndex(p => p.id === projectId || (p.repoPath && path.resolve(p.repoPath) === targetRepo));
      const projectMeta = {
        id: projectId,
        name: projectName,
        codePrefix,
        repoPath: targetRepo,
        storageType,
        backlogDir: 'backlog',
        createdAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...projectMeta };
      } else {
        registry.projects.unshift(projectMeta);
      }
      registry.activeProjectId = projectId;
      
      saveRegistryFile(registry, PKG_ROOT);
    } catch (err) {
      // Gracefully continue
    }
  }

  // DEV-290: Distinction between production static server (default) and development server (--dev)
  const isDev = args.includes('--dev');
  let server;
  let actualPort;
  let displayHost;
  let url;

  const resolvedPort = await findAvailablePort(port, host);
  if (resolvedPort !== port) {
    console.log(`\n  ${c.yellow('▲')}  Puerto ${port} ocupado en el sistema. Utilizando puerto disponible ${resolvedPort}...`);
  }

  if (isDev) {
    // Development mode: Start Vite HMR server
    const { createServer } = await import('vite');
    server = await createServer({
      root: PKG_ROOT,
      configFile: path.resolve(PKG_ROOT, 'vite.config.ts'),
      server: {
        port: resolvedPort,
        host,
        strictPort: false,
        open: false
      }
    });

    await server.listen();
    const address = server.httpServer?.address();
    actualPort = typeof address === 'object' && address?.port ? address.port : resolvedPort;
    displayHost = host === '127.0.0.1' ? 'localhost' : host;
    url = `http://${displayHost}:${actualPort}`;
  } else {
    // Production mode: Minimal native HTTP static server serving precompiled dist/ (DEV-290)
    const http = await import('node:http');

    let apiMiddleware = null;
    let closeWatchers = null;
    try {
      const serverBundle = path.join(PKG_ROOT, 'bin', 'server.js');
      let gripmApi;
      if (fs.existsSync(serverBundle)) {
        const { pathToFileURL } = await import('node:url');
        const mod = await import(pathToFileURL(serverBundle).href);
        gripmApi = mod.gripmApi;
      } else {
        const mod = await import('../server/plugin.ts');
        gripmApi = mod.gripmApi;
      }
      const plugin = gripmApi();
      closeWatchers = plugin.closeWatchers;
      plugin.configureServer({
        middlewares: {
          use: (fn) => { apiMiddleware = fn; }
        }
      });
    } catch {
      // In environments without TS loader / runtime support, static files are served directly
    }

    const distDir = path.resolve(PKG_ROOT, 'dist');
    const publicDir = path.resolve(PKG_ROOT, 'public');

    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.map': 'application/json',
      '.txt': 'text/plain; charset=utf-8'
    };

    function serveFile(filePath, req, res) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          const indexInDir = path.join(filePath, 'index.html');
          if (fs.existsSync(indexInDir) && fs.statSync(indexInDir).isFile()) {
            return serveFile(indexInDir, req, res);
          }
          return false;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
        );

        if (req.method === 'HEAD') {
          res.statusCode = 200;
          res.end();
          return true;
        }

        res.statusCode = 200;
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
        stream.pipe(res);
        return true;
      } catch {
        return false;
      }
    }

    function handleStatic(req, res) {
      const rawUrl = req.url || '/';
      let pathname = rawUrl.split('?')[0];
      try {
        pathname = decodeURIComponent(pathname);
      } catch {
        res.statusCode = 400;
        res.end('Bad Request');
        return;
      }

      const safePath = path.normalize(path.join(distDir, pathname));
      if (!safePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      if (fs.existsSync(safePath) && safePath !== distDir) {
        if (serveFile(safePath, req, res)) return;
      }

      // Check public folder fallback
      const safePublicPath = path.normalize(path.join(publicDir, pathname));
      if (safePublicPath.startsWith(publicDir) && fs.existsSync(safePublicPath) && safePublicPath !== publicDir) {
        if (serveFile(safePublicPath, req, res)) return;
      }

      const indexPath = path.join(distDir, 'index.html');
      if (pathname === '/' || pathname === '') {
        if (fs.existsSync(indexPath)) {
          if (serveFile(indexPath, req, res)) return;
        }
        res.statusCode = 503;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>dist/index.html no encontrado</h1><p>Ejecuta <code>npm run build</code> antes de iniciar gripm en produccion.</p>');
        return;
      }

      // SPA fallback: non-asset routes fallback to index.html
      const hasExtension = path.extname(pathname).length > 0;
      if (!hasExtension && fs.existsSync(indexPath)) {
        if (serveFile(indexPath, req, res)) return;
      }

      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not Found');
    }

    server = http.createServer((req, res) => {
      if (apiMiddleware) {
        apiMiddleware(req, res, () => handleStatic(req, res));
      } else {
        handleStatic(req, res);
      }
    });

    if (closeWatchers) {
      server.on('close', () => {
        try { closeWatchers(); } catch {}
      });
    }

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(resolvedPort, host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });

    const address = server.address();
    actualPort = typeof address === 'object' && address?.port ? address.port : resolvedPort;
    displayHost = host === '127.0.0.1' ? 'localhost' : host;
    url = `http://${displayHost}:${actualPort}`;
  }

  console.log(`
  ${c.bold('gripm')} ${c.dim(`v${currentVersion}`)}  ${c.green('listo')}

  ${c.green('➜')}  ${c.bold('Tablero:')}     ${c.cyan(url)}
  ${c.dim('➜')}  ${c.dim('Proyecto:')}    ${targetRepo}
  ${c.dim('➜')}  ${c.dim('Modo:')}        ${storageType.toUpperCase()} ${c.dim('(tiempo real)')}
`);

  const cachedUpdate = getCachedUpdateInfo(currentVersion);
  if (cachedUpdate && cachedUpdate.hasUpdate) {
    console.log(formatUpdateBanner(currentVersion, cachedUpdate.latestVersion) + '\n');
  }

  // Non-blocking background check for newer releases (cached for 4h)
  checkForUpdates(currentVersion).then((res) => {
    const isNewerThanCached = cachedUpdate?.latestVersion && semverGreaterThan(res.latestVersion, cachedUpdate.latestVersion);
    if (res.hasUpdate && (!cachedUpdate?.hasUpdate || isNewerThanCached)) {
      console.log('\n' + formatUpdateBanner(currentVersion, res.latestVersion) + '\n');
    }
  }).catch(() => {});

  if (shouldOpen) {
    try {
      if (typeof server.openBrowser === 'function') {
        server.openBrowser();
      } else {
        openBrowser(url);
      }
    } catch {
      openBrowser(url);
    }
  }
}

main().catch((err) => {
  console.error('Error al iniciar gripm:', err);
  process.exit(1);
});
