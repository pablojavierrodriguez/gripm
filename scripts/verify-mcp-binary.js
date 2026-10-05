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

  // DEV-160: Restaurar BACKLOG.md original si el test lo mutó para garantizar cero mutación en git status
  if (originalBacklogContent !== null && fs.existsSync(backlogPath)) {
    fs.writeFileSync(backlogPath, originalBacklogContent, 'utf8');
  }

  console.log('🎉 MCP Server y catálogo gripm_* completamente validados!');
  process.exit(0);
}, 2000);
