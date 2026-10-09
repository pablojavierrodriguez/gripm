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
import { formatUpdateBanner, checkForUpdates, getCachedUpdateInfo } from '../scripts/updateChecker.js';
import { runInitWizard } from '../scripts/initScaffold.js';
import { runUninstallCommand } from '../scripts/uninstall.js';
import { findAvailablePort } from '../scripts/portUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const pkgJson = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
const currentVersion = pkgJson.version || '1.0.0';

const args = process.argv.slice(2);

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
  🚀 gripm CLI - productos locales para backlog y trabajo con agentes

  Uso:
    gripm [opciones]               Abre Gripm Board en el navegador (por defecto)
    gripm <comando> [opciones]     Ejecuta un subcomando específico

  Comandos:
    gripm mcp                      Inicia el servidor MCP sobre stdio para agentes de IA
    gripm playbook sync            Sincroniza materiales del Playbook en el proyecto actual

  Opciones de Cockpit:
    --port, -p <puerto>            Puerto para el servidor web (por defecto: 4100)
    --host <host>                  Host de enlace (por defecto: 127.0.0.1)
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --no-open                      No abrir el navegador automáticamente
    --single                       Forzar modo de proyecto único
    --hub, --multi                 Abrir en modo hub multi-proyecto

  Opciones de Inicialización y Gestión:
    --init                         Configura Gripm Board en el proyecto actual
    --language, --lang <es|en>     Idioma del proyecto para scaffolding y plantillas (por defecto: es)
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
  🚀 gripm mcp - Servidor Model Context Protocol (MCP) para agentes de IA

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
  📘 gripm playbook - Herramientas y sincronización del Playbook

  Uso:
    gripm playbook sync [opciones]

  Comandos:
    sync                           Sincroniza archivos y plantillas del Playbook en el proyecto actual

  Opciones:
    --repo, -r <ruta>              Proyecto destino (por defecto: carpeta actual)
    --branch, -b <rama>            Rama Git remota a sincronizar (por defecto: main)
    --remote <url>                 Repositorio remoto del Playbook
    --dry-run                      Simula los cambios sin escribir en disco
    --force                        Fuerza la sobrescritura de archivos existentes
    --help, -h                     Muestra esta ayuda

  Nota:
    Este comando sincroniza materiales del Playbook en un proyecto; no instala el producto Gripm Playbook.
`);
}

async function main() {
  const command = args[0];
  if (command && !command.startsWith('-') && !['mcp', 'playbook', 'help'].includes(command)) {
    console.error(`Comando desconocido: "${command}". Ejecuta "gripm --help" para ver los comandos disponibles.`);
    process.exitCode = 1;
    return;
  }

  // Handle 'help' subcommand alias
  if (command === 'help') {
    const sub = args[1];
    if (sub === 'mcp') {
      printMcpHelp();
      process.exit(0);
    }
    if (sub === 'playbook') {
      printPlaybookHelp();
      process.exit(0);
    }
    printMainHelp();
    process.exit(0);
  }

  // DEV-150: Handle 'mcp' subcommand directly without starting Vite
  if (args[0] === 'mcp') {
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
  if (args[0] === 'playbook') {
    if (hasHelpFlag(args)) {
      printPlaybookHelp();
      process.exit(0);
    }

    if (args[1] !== 'sync') {
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
    console.warn('⚠️  ADVERTENCIA DE SEGURIDAD: Enlazando a 0.0.0.0. La interfaz y el API están expuestos a la red local sin autenticación.');
  }

  let targetRepo = process.cwd();
  const repoIdx = args.findIndex(a => a === '--repo' || a === '-r');
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    targetRepo = path.resolve(args[repoIdx + 1]);
  }

  const shouldOpen = !args.includes('--no-open');

  // Set Single-Project or Multi-Project mode (DEV-041 / DEV-161)
  const isHub = args.includes('--hub') || args.includes('--multi');
  process.env.GRIPM_MODE = isHub ? 'multi' : 'single';
  process.env.GRIPM_TARGET_REPO = targetRepo;
  process.env.GRIPM_HOST = host;

  // DEV-042 & DEV-109: Handle --init flag to bootstrap .gripm/, backlog/, skills, AGENTS.md, gitignore
  if (args.includes('--init')) {
    const isYes = args.includes('--yes') || args.includes('-y') || args.includes('--defaults');
    const isHubInit = args.includes('--hub') || args.includes('--multi');
    const isSingleInit = args.includes('--single');
    const langIdx = args.findIndex(a => a === '--language' || a === '--lang');
    const cliLang = langIdx !== -1 && args[langIdx + 1] ? args[langIdx + 1].toLowerCase() : undefined;
    
    await runInitWizard(targetRepo, {
      yes: isYes,
      mode: isHubInit ? 'multi' : (isSingleInit ? 'single' : undefined),
      language: cliLang,
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
  const devboardJson = path.join(targetRepo, '.devboard/backlog.json');
  let storageType = 'markdown';

  if (fs.existsSync(tasksDir)) {
    storageType = 'markdown';
  } else if (fs.existsSync(gripmJson) || fs.existsSync(devboardJson)) {
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

  // Start Vite server
  const { createServer } = await import('vite');
  
  const resolvedPort = await findAvailablePort(port, host);
  if (resolvedPort !== port) {
    console.log(`ℹ️  Puerto ${port} ocupado en el sistema. Utilizando puerto disponible ${resolvedPort}...`);
  }

  const server = await createServer({
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
  const actualPort = typeof address === 'object' && address?.port ? address.port : resolvedPort;
  const displayHost = host === '127.0.0.1' ? 'localhost' : host;
  const url = `http://${displayHost}:${actualPort}`;

  const getVisualWidth = (str) => {
    let width = 0;
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if ((cp >= 0x1F300 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  };

  const formatBoxLine = (content, innerWidth) => {
    const contentWidth = getVisualWidth(content);
    const padding = Math.max(0, innerWidth - contentWidth);
    return '│  ' + content + ' '.repeat(padding) + '  │';
  };

  const innerWidth = 58;
  const repoDisplay = targetRepo.length > 38 ? '...' + targetRepo.slice(-35) : targetRepo;

  console.log(`
┌${'─'.repeat(innerWidth + 4)}┐
${formatBoxLine('🚀 gripm - Tablero Ágil de Ingeniería y Producto con IA', innerWidth)}
${formatBoxLine('', innerWidth)}
${formatBoxLine('📁 Repositorio:    ' + repoDisplay, innerWidth)}
${formatBoxLine('📦 Almacén:        ' + storageType.toUpperCase(), innerWidth)}
${formatBoxLine('🌐 Interfaz Web:   ' + url, innerWidth)}
${formatBoxLine('⚡ En Tiempo Real:  Activo (SSE y observador de archivos)', innerWidth)}
└${'─'.repeat(innerWidth + 4)}┘
  `);

  const cachedUpdate = getCachedUpdateInfo(currentVersion);
  if (cachedUpdate && cachedUpdate.hasUpdate) {
    console.log(formatUpdateBanner(currentVersion, cachedUpdate.latestVersion) + '\n');
  }

  // Non-blocking background check for newer releases (cached for 24h)
  checkForUpdates(currentVersion).then((res) => {
    if (res.hasUpdate && !cachedUpdate?.hasUpdate) {
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
