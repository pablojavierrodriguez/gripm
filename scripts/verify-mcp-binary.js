import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('🧪 Iniciando prueba de bin/gripm-mcp.js y catálogo canónico de 12 tools gripm_* (DEV-154 / DEV-160 / DEV-161)...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const binaryPath = path.resolve(__dirname, '../bin/gripm-mcp.js');
const backlogPath = path.resolve(__dirname, '../BACKLOG.md');
const originalBacklogContent = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, 'utf8') : null;
const testTaskPath = path.resolve(__dirname, '../backlog/tasks/DEV-998 - Gatekeeper Test Task.md');
fs.writeFileSync(
  testTaskPath,
  '---\nid: DEV-998\ntitle: "Gatekeeper Test Task"\nstatus: doing\n---\n\n## Acceptance Criteria\n\n<!-- AC:BEGIN -->\n- [x] #1 AC uno\n- [ ] #2 AC dos\n<!-- AC:END -->\n',
  'utf8'
);

const child = spawn(process.execPath, [binaryPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let stdoutData = '';

child.stdout.on('data', (chunk) => {
  stdoutData += chunk.toString();
});

function send(req) {
  child.stdin.write(JSON.stringify(req) + '\n');
}

// 1. Send initialize
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-runner', version: '1.0' }
  }
});

// 2. Send tools/list
send({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
});

// 3. Call gripm_list_releases
send({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'gripm_list_releases',
    arguments: {}
  }
});

// 4. Call gripm_get_stats
send({
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'gripm_get_stats',
    arguments: {}
  }
});

// 5. Call gripm_sync_backlog
send({
  jsonrpc: '2.0',
  id: 5,
  method: 'tools/call',
  params: {
    name: 'gripm_sync_backlog',
    arguments: { autoFix: false }
  }
});

// 6. DEV-224: Call gripm_update_task to ready with unchecked ACs (Must fail)
send({
  jsonrpc: '2.0',
  id: 6,
  method: 'tools/call',
  params: {
    name: 'gripm_update_task',
    arguments: { taskId: 'DEV-998', status: 'ready' }
  }
});

// 7. DEV-224: Call gripm_update_task with failing verifyCommand (Must fail)
send({
  jsonrpc: '2.0',
  id: 7,
  method: 'tools/call',
  params: {
    name: 'gripm_update_task',
    arguments: {
      taskId: 'DEV-998',
      status: 'ready',
      checkAllAcs: true,
      verifyCommand: 'node -e "process.exit(1)"'
    }
  }
});

// 8. DEV-224: Call gripm_update_task with all ACs checked and passing verifyCommand (Must succeed)
send({
  jsonrpc: '2.0',
  id: 8,
  method: 'tools/call',
  params: {
    name: 'gripm_update_task',
    arguments: {
      taskId: 'DEV-998',
      status: 'ready',
      checkAllAcs: true,
      verifyCommand: 'node -e "process.exit(0)"'
    }
  }
});

setTimeout(() => {
  child.kill();

  const lines = stdoutData.trim().split('\n').filter(Boolean);
  const responses = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  console.log(`📡 Recibidas ${responses.length} respuestas JSON-RPC`);

  const initRes = responses.find(r => r.id === 1);
  if (!initRes || !initRes.result?.serverInfo) {
    throw new Error('Respuesta de initialize no válida');
  }
  console.log(`✅ [1/5] initialize OK: Servidor ${initRes.result.serverInfo.name} v${initRes.result.serverInfo.version}`);

  const toolsRes = responses.find(r => r.id === 2);
  const toolNames = (toolsRes?.result?.tools || []).map(t => t.name);
  
  const expectedTools = [
    'gripm_list_projects',
    'gripm_list_tasks',
    'gripm_get_task',
    'gripm_create_task',
    'gripm_update_task',
    'gripm_bulk_update_tasks',
    'gripm_get_stats',
    'gripm_export_backlog',
    'gripm_list_releases',
    'gripm_sync_backlog',
    'gripm_create_retro',
    'gripm_list_retros'
  ];

  for (const expected of expectedTools) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Herramienta canónica requerida "${expected}" no encontrada en tools/list: ${toolNames.join(', ')}`);
    }
  }

  // DEV-160: Assert first-class status 'ideas' in gripm_update_task schema
  const updateTool = (toolsRes?.result?.tools || []).find(t => t.name === 'gripm_update_task');
  const allowedStatuses = updateTool?.inputSchema?.properties?.status?.enum || [];
  if (!allowedStatuses.includes('ideas')) {
    throw new Error(`Estado de primera clase 'ideas' ausente en enum de gripm_update_task: ${allowedStatuses.join(', ')}`);
  }

  console.log(`✅ [2/5] tools/list OK: 12/12 herramientas canónicas gripm_* presentes con soporte de status 'ideas' (${toolNames.length} total)`);

  const releasesRes = responses.find(r => r.id === 3);
  if (!releasesRes || releasesRes.error) {
    throw new Error(`Llamada a gripm_list_releases falló: ${JSON.stringify(releasesRes)}`);
  }
  const releasesData = JSON.parse(releasesRes.result.content[0].text);
  console.log(`✅ [3/5] gripm_list_releases OK: Total releases: ${releasesData.totalReleases || 0}`);

  const statsRes = responses.find(r => r.id === 4);
  if (!statsRes || statsRes.error) {
    throw new Error(`Llamada a gripm_get_stats falló: ${JSON.stringify(statsRes)}`);
  }
  const statsData = JSON.parse(statsRes.result.content[0].text);
  const statsSummary = statsData.summary || statsData;
  console.log(`✅ [4/5] gripm_get_stats OK: Total tareas: ${statsSummary.total}, Open: ${statsSummary.open}, Completion: ${statsSummary.completionRate}`);

  const syncRes = responses.find(r => r.id === 5);
  if (!syncRes || syncRes.error) {
    throw new Error(`Llamada a gripm_sync_backlog falló: ${JSON.stringify(syncRes)}`);
  }
  const syncData = JSON.parse(syncRes.result.content[0].text);
  console.log(`✅ [5/5] gripm_sync_backlog OK: Tareas auditadas: ${syncData.taskCount}`);

  // DEV-224: Assert Gatekeeper enforcement
  const gatekeeperRes = responses.find(r => r.id === 6);
  if (!gatekeeperRes?.result?.isError || !gatekeeperRes.result.content[0].text.includes('[MCP Gatekeeper] Transición rechazada')) {
    throw new Error(`DEV-224: Se esperaba rechazo de Gatekeeper por ACs incompletos, recibido: ${JSON.stringify(gatekeeperRes)}`);
  }
  console.log('✅ [6/8] DEV-224 Gatekeeper: Rechazó correctamente transición a ready con ACs pendientes');

  const verifyCmdFailRes = responses.find(r => r.id === 7);
  if (!verifyCmdFailRes?.result?.isError || !verifyCmdFailRes.result.content[0].text.includes('falló al intentar mover')) {
    throw new Error(`DEV-224: Se esperaba fallo por verifyCommand fallido, recibido: ${JSON.stringify(verifyCmdFailRes)}`);
  }
  console.log('✅ [7/8] DEV-224 Gatekeeper: Rechazó correctamente por verifyCommand con error');

  const successRes = responses.find(r => r.id === 8);
  if (successRes?.result?.isError) {
    throw new Error(`DEV-224: Se esperaba éxito con ACs completos y verifyCommand exitoso, recibido error: ${JSON.stringify(successRes)}`);
  }
  console.log('✅ [8/8] DEV-224 Gatekeeper: Aprobó transición a ready con todos los ACs y verificación exitosa');

  // Limpieza de tarea de prueba
  if (fs.existsSync(testTaskPath)) {
    fs.unlinkSync(testTaskPath);
  }

  // DEV-160: Restaurar BACKLOG.md original si el test lo mutó para garantizar cero mutación en git status
  if (originalBacklogContent !== null && fs.existsSync(backlogPath)) {
    fs.writeFileSync(backlogPath, originalBacklogContent, 'utf8');
  }

  console.log('🎉 MCP Server y catálogo gripm_* completamente validados!');
  process.exit(0);
}, 2500);
