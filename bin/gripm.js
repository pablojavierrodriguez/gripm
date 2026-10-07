#!/usr/bin/env node

/**
 * gripm CLI (Zero-Install Runner - DEV-015 / DEV-026 / DEV-144)
 * Usage: npx @gripm/board [--port 4100] [--repo <path>] [--no-open]
 *        npx -p @gripm/board gripm-mcp (starts the Model Context Protocol stdio server)
 */

import fs from 'node:fs';
import path from 'node:path';
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

async function main() {
  // DEV-150: Handle 'mcp' subcommand directly without starting Vite
  if (args[0] === 'mcp') {
    await import('./gripm-mcp.js');
    return;
  }

  // Handle 'playbook' subcommand
  if (args[0] === 'playbook') {
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

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  🚀 gripm CLI - Agile Engineering & Product Management Cockpit
  
  Uso:
    npx @gripm/board [opciones]
    gripm [opciones]
    gripm mcp             Inicia el servidor Model Context Protocol (MCP) en stdio
    gripm playbook sync   Sincroniza la última versión canónica del Playbook preservando AGENTS.md

  Opciones:
    --port, -p <puerto>   Puerto para el servidor web (por defecto: 4100)
    --host <host>         Host de enlace (por defecto: localhost)
    --repo, -r <ruta>     Ruta del repositorio a gestionar (por defecto: process.cwd())
    --no-open             No abrir el navegador automáticamente
    --init                Iniciar asistente interactivo de configuración y scaffolding
    --language, --lang <es|en> Idioma del proyecto para scaffolding y plantillas (por defecto: es)
    --uninstall, --clean   Desacoplar gripm de este repositorio (nunca borra backlog/)
    --global              Con --uninstall: purga también el registro global del dispositivo
    --remove-agents       Con --uninstall: elimina la skill de agentes y AGENTS.md (por defecto se preservan)
    --yes, -y             Aceptar opciones por defecto sin preguntas (para CI / no interactivo)
    --version, -v         Muestra la versión instalada
    --help, -h            Muestra esta ayuda
    `);
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
    // Initialize minimal distributed markdown structure if not present
    try {
      fs.mkdirSync(tasksDir, { recursive: true });
      storageType = 'markdown';
    } catch (err) {
      // Ignore if readonly or sandbox
    }
  }

  // Register project in registry dynamically (DEV-104)
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

  console.log(`
┌────────────────────────────────────────────────────────────┐
│  🚀 gripm - Tablero Ágil de Ingeniería y Producto con IA    │
│                                                            │
│  📁 Repositorio:  ${targetRepo.slice(0, 39).padEnd(41)}│
│  📦 Almacén:      ${storageType.toUpperCase().padEnd(41)}│
│  🌐 Interfaz Web: ${url.padEnd(41)}│
│  ⚡ En Tiempo Real: Activo (SSE y observador de archivos)   │
└────────────────────────────────────────────────────────────┘
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
