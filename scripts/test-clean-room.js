#!/usr/bin/env node

/**
 * scripts/test-clean-room.js - DEV-336 Clean-Room Packaging & Boot Verification
 *
 * Verifies that the production tarball (@gripm/board packaged as an end-user receives it)
 * installs cleanly in a fresh project, executes CLI commands, initializes backlog structure,
 * creates and persists tasks via MCP stdio, boots the server on an available port,
 * and advertises a clean npm scripts surface where every script resolves.
 *
 * Acceptance Criteria covered:
 * - AC #1: Installs tarball in an isolated temporary project without source repo resolution.
 * - AC #2: Verifies --version (matches package.json, empty stderr) and --help.
 * - AC #3: Boots server, verifies port in LISTEN state via system socket (no HTTP), clean stderr, kills process.
 * - AC #4: Creates task via MCP stdio, asserts .md on disk with valid frontmatter (id, title, status) and matching slug.
 * - AC #5: Runs gripm --init --yes --minimal --no-playbook, verifies all CLI-declared creation promises exist on disk.
 * - AC #6: Verifies all npm scripts announced by packaged package.json resolve their target files.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert';
import { findAvailablePort, isPortAvailable } from './portUtils.js';

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

console.log(`\n  ${c.bold('gripm')} ${c.dim('·')} [DEV-336] Clean-Room Tarball Verification...\n`);

const cleanRoomRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-cleanroom-'));
const packDir = path.join(cleanRoomRoot, 'pack');
const projDir = path.join(cleanRoomRoot, 'consumer-project');
const homeDir = path.join(cleanRoomRoot, 'isolated-home');

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(projDir, { recursive: true });
fs.mkdirSync(homeDir, { recursive: true });

let serverChild = null;

async function run() {
  try {
    // 0. Ensure build artifacts exist in repository
    if (!fs.existsSync(path.join(ROOT_DIR, 'dist/index.html')) || !fs.existsSync(path.join(ROOT_DIR, 'bin/server.js'))) {
      console.log(`  ${c.dim('➜')} Compilando bundle de producción (dist/ y bin/)...`);
      execSync('npm run build', { cwd: ROOT_DIR, stdio: 'pipe' });
    }

    // 1. AC #1: Pack tarball
    console.log(`  ${c.cyan('•')} AC #1: Empaquetando tarball de producción...`);
    const packOutput = execSync(`npm pack --pack-destination "${packDir}"`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const tarballFileName = packOutput.split('\n').pop()?.trim();
    assert.ok(tarballFileName && tarballFileName.endsWith('.tgz'), `El archivo empaquetado debe ser un tarball .tgz, recibido: ${tarballFileName}`);
    const tarballPath = path.join(packDir, tarballFileName);
    assert.ok(fs.existsSync(tarballPath), `El tarball empaquetado debe existir: ${tarballPath}`);

    // Create consumer project package.json
    fs.writeFileSync(
      path.join(projDir, 'package.json'),
      JSON.stringify({ name: 'consumer-project', version: '1.0.0', private: true }, null, 2)
    );

    // Install tarball in consumer project
    console.log(`  ${c.cyan('•')} AC #1: Instalando tarball en proyecto temporal aislado...`);
    execSync(`npm install "${tarballPath}" --no-audit --no-fund --prefer-offline`, {
      cwd: projDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const installedPkgDir = path.join(projDir, 'node_modules', '@gripm', 'board');
    assert.ok(fs.existsSync(installedPkgDir), 'El paquete @gripm/board debe estar instalado en node_modules');

    const installedPkgJson = JSON.parse(fs.readFileSync(path.join(installedPkgDir, 'package.json'), 'utf8'));
    const installedBin = path.join(installedPkgDir, 'bin', 'gripm.js');
    assert.ok(fs.existsSync(installedBin), 'El binario instalado bin/gripm.js debe existir');

    const shimBin = path.join(projDir, 'node_modules', '.bin', 'gripm');
    const shimCmd = shimBin + '.cmd';
    const hasShim = fs.existsSync(shimBin) || fs.existsSync(shimCmd);
    assert.ok(hasShim, 'El shim node_modules/.bin/gripm debe existir');
    console.log(`  ${c.green('✔')} AC #1 PASS: Instalación clean-room completada.`);

    // 2. AC #2: Verify --version and --help
    console.log(`  ${c.cyan('•')} AC #2: Verificando --version y --help desde el binario instalado...`);
    const versionRes = spawnSync(process.execPath, [installedBin, '--version'], {
      cwd: projDir,
      encoding: 'utf8',
      timeout: 15000
    });
    assert.strictEqual(versionRes.status, 0, `--version debe salir con código 0, recibido status ${versionRes.status}`);
    assert.strictEqual(versionRes.stdout.trim(), installedPkgJson.version, `--version debe imprimir exactamente "${installedPkgJson.version}"`);
    assert.strictEqual(versionRes.stderr.trim(), '', `--version no debe escribir en stderr, recibido: ${versionRes.stderr}`);

    const helpRes = spawnSync(process.execPath, [installedBin, '--help'], {
      cwd: projDir,
      encoding: 'utf8',
      timeout: 15000
    });
    assert.strictEqual(helpRes.status, 0, `--help debe salir con código 0, recibido status ${helpRes.status}`);
    assert.ok(helpRes.stdout.toLowerCase().includes('gripm'), '--help debe documentar gripm');
    assert.strictEqual(helpRes.stderr.trim(), '', `--help no debe escribir en stderr, recibido: ${helpRes.stderr}`);
    console.log(`  ${c.green('✔')} AC #2 PASS: --version y --help verificados exitosamente.`);

    // 3. AC #5: Execute gripm --init --yes --minimal --no-playbook and assert declarations
    console.log(`  ${c.cyan('•')} AC #5: Inicializando proyecto con gripm --init y validando declaraciones...`);
    const initRes = spawnSync(process.execPath, [
      installedBin,
      '--init',
      '--yes',
      '--minimal',
      '--no-playbook'
    ], {
      cwd: projDir,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        GRIPM_HOME: homeDir,
        GRIPM_NO_UPDATE_CHECK: '1',
        NO_COLOR: '1'
      }
    });
    assert.strictEqual(initRes.status, 0, `--init debe salir con código 0, recibido: ${initRes.status}\n${initRes.stderr}`);

    const initLines = initRes.stdout.split('\n').map((l) => l.trim());
    const declarationLines = initLines.filter((l) => l.startsWith('✅') || l.includes('✅'));
    assert.ok(declarationLines.length >= 3, `Se esperaban al menos 3 declaraciones con ✅, encontradas: ${declarationLines.length}`);

    // Map each declaration line to filesystem checks
    for (const line of declarationLines) {
      if (line.includes('.gripm/config.json saved') || line.includes('.gripm/config.json guardado')) {
        assert.ok(fs.existsSync(path.join(projDir, '.gripm', 'config.json')), 'Declaración incumplida: .gripm/config.json no existe');
      } else if (line.includes('backlog/tasks/ directory created') || line.includes('Directorio backlog/tasks/ creado')) {
        assert.ok(fs.existsSync(path.join(projDir, 'backlog', 'tasks')), 'Declaración incumplida: backlog/tasks/ no existe');
      } else if (line.includes('.agents/skills/gripm/SKILL.md')) {
        assert.ok(fs.existsSync(path.join(projDir, '.agents', 'skills', 'gripm', 'SKILL.md')), 'Declaración incumplida: SKILL.md no existe');
      } else if (line.includes('package.json')) {
        const p = JSON.parse(fs.readFileSync(path.join(projDir, 'package.json'), 'utf8'));
        assert.ok(p.scripts?.board && p.scripts?.mcp, 'Declaración incumplida: scripts board y mcp ausentes en package.json');
      } else if (line.includes('.gitignore')) {
        assert.ok(fs.existsSync(path.join(projDir, '.gitignore')), 'Declaración incumplida: .gitignore no existe');
      } else {
        throw new Error(`Declaración ✅ no reconocida por el gate: "${line}". Cada promesa debe verificarse explícitamente.`);
      }
    }
    // DEV-337: Confirm minimal init delivers clean backlog (0 mock tasks seeded)
    const tasksAfterInit = fs.readdirSync(path.join(projDir, 'backlog', 'tasks'));
    assert.strictEqual(tasksAfterInit.length, 0, `El backlog tras --init minimal debe nacer limpio sin tareas mock (DEV-337), encontradas: ${tasksAfterInit.length}`);
    console.log(`  ${c.green('✔')} AC #5 PASS: ${declarationLines.length} promesas declarativas de --init verificadas en disco (backlog limpio).`);

    // 4. AC #4: Create task via MCP stdio and verify persistence & frontmatter
    console.log(`  ${c.cyan('•')} AC #4: Creando tarea mediante MCP sobre stdio y verificando persistencia en disco...`);
    const mcpBin = path.join(installedPkgDir, 'bin', 'gripm-mcp.js');
    assert.ok(fs.existsSync(mcpBin), 'El binario bin/gripm-mcp.js debe existir');

    const mcpProc = spawn(process.execPath, [mcpBin], {
      cwd: projDir,
      env: {
        ...process.env,
        GRIPM_HOME: homeDir,
        GRIPM_NO_UPDATE_CHECK: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let mcpOut = '';
    mcpProc.stdout.on('data', (chunk) => {
      mcpOut += chunk.toString();
    });

    // Send initialize request
    mcpProc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cleanroom-test', version: '1.0' } }
    }) + '\n');

    // Wait briefly then call gripm_create_task
    await new Promise((resolve) => setTimeout(resolve, 400));
    mcpProc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'gripm_create_task',
        arguments: {
          title: 'Verificar persistencia limpia de tarea',
          status: 'draft'
        }
      }
    }) + '\n');

    // Wait for tool execution
    await new Promise((resolve) => setTimeout(resolve, 600));
    mcpProc.stdin.end();
    mcpProc.kill();

    const tasksOnDisk = fs.readdirSync(path.join(projDir, 'backlog', 'tasks')).filter((f) => f.endsWith('.md'));
    assert.strictEqual(tasksOnDisk.length, 1, `Debe existir exactamente 1 tarea en backlog/tasks/, encontradas: ${tasksOnDisk.length}`);

    const taskFilename = tasksOnDisk[0];
    const matchSlug = taskFilename.match(/^([A-Z0-9]+-\d+)\s+-\s+(.+)\.md$/);
    assert.ok(matchSlug, `El slug del archivo debe tener formato "<ID> - <slug>.md", recibido: ${taskFilename}`);

    const taskIdFromFilename = matchSlug[1];
    const taskContent = fs.readFileSync(path.join(projDir, 'backlog', 'tasks', taskFilename), 'utf8');

    // Parse frontmatter
    const frontmatterMatch = taskContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatterMatch, 'La tarea debe tener un frontmatter YAML delimitado por ---');

    const fmLines = frontmatterMatch[1].split('\n').map((l) => l.trim());
    const idLine = fmLines.find((l) => l.startsWith('id:'));
    const titleLine = fmLines.find((l) => l.startsWith('title:'));
    const statusLine = fmLines.find((l) => l.startsWith('status:'));

    assert.ok(idLine && idLine.includes(taskIdFromFilename), `El ID en frontmatter (${idLine}) debe coincidir con el slug (${taskIdFromFilename})`);
    assert.ok(titleLine && titleLine.includes('Verificar persistencia limpia de tarea'), 'El title en frontmatter debe coincidir');
    assert.ok(statusLine && statusLine.includes('draft'), 'El status en frontmatter debe ser draft');
    console.log(`  ${c.green('✔')} AC #4 PASS: Tarea ${taskIdFromFilename} persistida con frontmatter válido y slug coincidente.`);

    // 5. AC #3: Boot server, verify port in LISTEN state via system socket, verify no stderr, kill process
    console.log(`  ${c.cyan('•')} AC #3: Arrancando servidor instalado y verificando socket en escucha (sin HTTP)...`);
    const serverPort = await findAvailablePort(4150, '127.0.0.1');

    serverChild = spawn(process.execPath, [
      installedBin,
      '--port',
      String(serverPort),
      '--no-open',
      '--repo',
      projDir
    ], {
      cwd: projDir,
      env: {
        ...process.env,
        GRIPM_HOME: homeDir,
        GRIPM_NO_UPDATE_CHECK: '1',
        NO_COLOR: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverStdout = '';
    let serverStderr = '';
    serverChild.stdout.on('data', (d) => {
      serverStdout += d.toString();
    });
    serverChild.stderr.on('data', (d) => {
      serverStderr += d.toString();
    });

    // Wait until server outputs "listo" or timeout
    const startTime = Date.now();
    while (!serverStdout.includes('listo') && Date.now() - startTime < 15000) {
      if (serverChild.exitCode !== null) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.strictEqual(serverChild.exitCode, null, `El servidor terminó prematuramente con código ${serverChild.exitCode}`);
    assert.ok(serverStdout.includes('listo'), `El servidor debe reportar estado "listo", salida: ${serverStdout}`);

    // System-level socket check (consulting OS listening state via TCP connect probe without HTTP, per gotcha 9)
    const portFree = await isPortAvailable(serverPort, '127.0.0.1');
    assert.strictEqual(portFree, false, `El puerto ${serverPort} debe estar ocupado y en escucha en el sistema`);
    assert.strictEqual(serverStderr.trim(), '', `El servidor no debe emitir errores en stderr, recibido: ${serverStderr}`);

    // Terminate server cleanly
    serverChild.kill();
    await new Promise((r) => setTimeout(r, 300));
    console.log(`  ${c.green('✔')} AC #3 PASS: Servidor arrancó en puerto ${serverPort}, socket verificado sin HTTP, stderr limpio.`);

    // 6. AC #6: Verify npm scripts announced in packaged package.json resolve
    console.log(`  ${c.cyan('•')} AC #6: Verificando resolución de scripts npm en paquete instalado...`);
    const packagedScripts = installedPkgJson.scripts || {};
    const scriptKeys = Object.keys(packagedScripts);
    assert.ok(scriptKeys.length > 0, 'El paquete instalado debe definir al menos los scripts de ejecución');

    for (const [scriptName, scriptCmd] of Object.entries(packagedScripts)) {
      // Extract target file from commands like "node bin/gripm.js"
      const match = String(scriptCmd).match(/node\s+([^\s]+)/);
      if (match && match[1]) {
        const targetRel = match[1].replace(/^[./]+/, '');
        const targetAbs = path.join(installedPkgDir, targetRel);
        assert.ok(
          fs.existsSync(targetAbs),
          `AC #6 FAIL: El script npm "${scriptName}" anuncia comando "${scriptCmd}", pero su archivo objetivo "${targetRel}" no existe en el paquete instalado.`
        );
      }
    }
    console.log(`  ${c.green('✔')} AC #6 PASS: Los ${scriptKeys.length} scripts npm del paquete instalado resuelven sus archivos objetivos.`);

    console.log(`\n  ${c.green('✔')} Todos los criterios de DEV-336 verificados exitosamente en clean room.\n`);
  } finally {
    if (serverChild && serverChild.exitCode === null) {
      try {
        serverChild.kill();
      } catch {}
    }
    // Clean up temporary cleanroom directory
    try {
      fs.rmSync(cleanRoomRoot, { recursive: true, force: true });
    } catch {}
  }
}

await run();
