import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('🛡️  [Security Test] Verificando mitigaciones de CSRF, DNS Rebinding y Contención en API Middleware REAL...');

// DEV-181 / Auditoría R4-R5: Extraer middleware directamente desde vite.config.ts de producción
const viteConfigModule = await import('../vite.config.ts');
const rawConfig = viteConfigModule.default;
const config = typeof rawConfig === 'function' ? await rawConfig({ command: 'serve', mode: 'development' }) : rawConfig;
const devBoardPlugin = (config.plugins || []).find(p => p && p.name === 'vite-plugin-dev-board-api');

if (!devBoardPlugin || typeof devBoardPlugin.configureServer !== 'function') {
  throw new Error('Plugin vite-plugin-dev-board-api no encontrado en vite.config.ts');
}

let middlewareHandler = null;
const mockServer = {
  httpServer: { once: () => {} },
  middlewares: {
    use: (fn) => {
      middlewareHandler = fn;
    }
  }
};

devBoardPlugin.configureServer(mockServer);

if (!middlewareHandler) {
  throw new Error('configureServer no registró apiMiddleware');
}

// DEV-190: release the fs.watch handles this hook opened. They are real watches
// on real directories and, since FSWatcher cannot be unref'd, they kept the
// process alive after the assertions finished.
try { devBoardPlugin.closeWatchers?.(); } catch {}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  writeHead(status, headers) {
    this.statusCode = status;
    if (headers) Object.assign(this.headers, headers);
  }
  setHeader(name, val) {
    this.headers[name] = val;
  }
  end(chunk) {
    if (chunk) this.body += chunk;
    this.emit('finish');
  }
}

class MockRequest extends EventEmitter {
  constructor(method, url, headers = {}, body = null) {
    super();
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
  }
}

// Test 1: Malicious Origin blocked (CSRF mitigation)
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'https://malicious.com' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, 'CSRF malicioso debe responder 403 en middleware real');
  assert.strictEqual(nextCalled, false, 'Middleware no debe llamar next() en petición rechazada');
  console.log('✅ CSRF: Petición desde origen externo bloqueada con 403');
}

// Test 2: Local Origin allowed
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 200, 'Petición con Origin localhost debe responder 200 OK');
  console.log('✅ CSRF: Petición desde localhost permitida con 200 OK');
}

// Test 3: DNS Rebinding attack blocked
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', '/api/data', { host: 'evil-rebinding.attacker.com:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, 'DNS rebinding debe responder 403 en middleware real');
  assert.strictEqual(nextCalled, false);
  console.log('✅ DNS Rebinding: Host malicioso bloqueado con 403');
}

// Test 4: Mutating request without application/json rejected
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('POST', '/api/projects', { host: 'localhost:4100', 'content-type': 'text/plain' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 415, 'POST text/plain debe responder 415 en middleware real');
  assert.strictEqual(nextCalled, false);
  console.log('✅ Mutating Requests: POST sin application/json rechazado con 415');
}

// Test 5: Host 0.0.0.0 blocks DNS Rebinding domains
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = '0.0.0.0';
  const req = new MockRequest('GET', '/api/data', { host: 'evil-attacker.com:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, '0.0.0.0 con dominio atacante debe responder 403');
  assert.strictEqual(nextCalled, false);
  console.log('✅ 0.0.0.0: DNS Rebinding hacia dominio atacante bloqueado con 403');
}

// Test 6: Host 0.0.0.0 blocks cross-origin requests from arbitrary external websites
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = '0.0.0.0';
  const req = new MockRequest('POST', '/api/projects', { host: '192.168.1.100:4100', origin: 'https://evil.com', 'content-type': 'application/json' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, '0.0.0.0 con Origin web externo debe responder 403');
  assert.strictEqual(nextCalled, false);
  console.log('✅ 0.0.0.0: Petición cross-origin desde web externa bloqueada con 403');
}

// Test 7: Host 0.0.0.0 allows LAN client with matching IP origin
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = '0.0.0.0';
  const req = new MockRequest('GET', '/api/data', { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 200, 'En 0.0.0.0, Origin que coincide con Host LAN debe responder 200 OK');
  console.log('✅ 0.0.0.0: Petición LAN legítima permitida con 200 OK');
}

// Test 8: OPTIONS preflight sets Vary: Origin
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('OPTIONS', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const res = new MockResponse();
  middlewareHandler(req, res, () => {});
  assert.strictEqual(res.statusCode, 204, 'OPTIONS preflight debe responder 204');
  assert.strictEqual(res.headers['Vary'], 'Origin', 'OPTIONS preflight debe incluir Vary: Origin');
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'http://localhost:4100');
  console.log('✅ CORS: Preflight OPTIONS devuelve Vary: Origin y Access-Control-Allow-Origin correcto');
}

// Test 9: FS Containment: GET /api/fs/browse escaping roots rejected
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', '/api/fs/browse?dir=/etc', { host: 'localhost:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, '/api/fs/browse a /etc debe responder 403 en middleware real');
  const payload = JSON.parse(res.body);
  assert.strictEqual(payload.error, 'Forbidden: Path is outside allowed roots');
  console.log('✅ FS Containment: Validación de contención dentro de roots permitidos verificada (/etc -> 403)');
}

// Test 10: FS Containment: GET /api/fs/browse with path traversal rejected
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', `/api/fs/browse?dir=${os.homedir()}/../../etc`, { host: 'localhost:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, 'Path traversal relativo debe responder 403 en middleware real');
  const payload = JSON.parse(res.body);
  assert.strictEqual(payload.error, 'Forbidden: Path is outside allowed roots');
  console.log('✅ FS Containment: Path traversal relativo bloqueado con 403');
}

// Test 11: FS Containment: Allowed directory returns 200 OK
{
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';
  const req = new MockRequest('GET', `/api/fs/browse?dir=${os.homedir()}`, { host: 'localhost:4100' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 200, 'Directorio autorizado debe devolver 200 OK');
  const payload = JSON.parse(res.body);
  assert.strictEqual(payload.ok, true, 'payload.ok debe ser true');
  assert.strictEqual(Array.isArray(payload.folders), true, 'folders debe ser un array');
  console.log('✅ FS Containment: Directorio autorizado devuelve 200 OK');
}

// Test 12: Client API Invariant (DEV-237): All mutating POST/PUT fetch calls in src/api.ts must declare Content-Type: application/json
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const apiSource = fs.readFileSync(path.join(ROOT, 'src', 'api.ts'), 'utf8');
  const postPutBlocks = apiSource.match(/fetch\([^)]*\{\s*method:\s*['"](?:POST|PUT)['"][\s\S]*?\}\);/g) || [];
  assert(postPutBlocks.length > 0, 'Debe haber llamadas fetch mutantes en src/api.ts');

  for (const block of postPutBlocks) {
    assert(
      block.includes("'Content-Type': 'application/json'") || block.includes('"Content-Type": "application/json"'),
      `Llamada mutante en src/api.ts debe declarar Content-Type: application/json para evitar rechazo 415 (DEV-237):\n${block}`,
    );
  }
  console.log(`✅ Client API Invariant (DEV-237): ${postPutBlocks.length} llamadas POST/PUT en src/api.ts incluyen Content-Type: application/json`);
}

// Test 13: Runtime Interchangeability & Mode Precedence (DEV-240)
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  delete process.env.DEVBOARD_HOST;
  process.env.GRIPM_HOST = 'localhost';

  // 1. In multi mode (--hub), GET /api/data reports singleProject === false
  process.env.GRIPM_MODE = 'multi';
  const reqMulti = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const resMulti = new MockResponse();
  middlewareHandler(reqMulti, resMulti, () => {});
  assert.strictEqual(resMulti.statusCode, 200, 'GET /api/data en multi mode responde 200');
  const payloadMulti = JSON.parse(resMulti.body);
  assert.strictEqual(payloadMulti.singleProject, false, 'En GRIPM_MODE=multi singleProject debe ser false (DEV-240)');

  // 2. In single mode (--single), GET /api/data reports singleProject === true
  process.env.GRIPM_MODE = 'single';
  const reqSingle = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const resSingle = new MockResponse();
  middlewareHandler(reqSingle, resSingle, () => {});
  assert.strictEqual(resSingle.statusCode, 200, 'GET /api/data en single mode responde 200');
  const payloadSingle = JSON.parse(resSingle.body);
  assert.strictEqual(payloadSingle.singleProject, true, 'En GRIPM_MODE=single singleProject debe ser true (DEV-240)');

  // 3. Toggling mode via POST /api/settings updates runtime server mode immediately
  const configPath = path.resolve(ROOT, '.gripm/config.json');
  const originalConfigContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : null;
  try {
    const reqSettings = new MockRequest('POST', '/api/settings', {
      host: 'localhost:4100',
      origin: 'http://localhost:4100',
      'content-type': 'application/json'
    });
    const resSettings = new MockResponse();
    middlewareHandler(reqSettings, resSettings, () => {});
    reqSettings.emit('data', JSON.stringify({ config: { mode: 'multi' } }));
    reqSettings.emit('end');

    await new Promise(r => resSettings.once('finish', r));
    assert.strictEqual(resSettings.statusCode, 200, 'POST /api/settings responde 200');
    assert.strictEqual(process.env.GRIPM_MODE, 'multi', 'POST /api/settings con mode=multi actualiza process.env.GRIPM_MODE');

    const reqDataAfter = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
    const resDataAfter = new MockResponse();
    middlewareHandler(reqDataAfter, resDataAfter, () => {});
    assert.strictEqual(resDataAfter.statusCode, 200);
    const payloadAfter = JSON.parse(resDataAfter.body);
    assert.strictEqual(payloadAfter.singleProject, false, 'Tras guardar mode=multi en settings, GET /api/data devuelve singleProject: false');
  } finally {
    if (originalConfigContent !== null) {
      fs.writeFileSync(configPath, originalConfigContent, 'utf8');
    }
  }

  delete process.env.GRIPM_MODE;
  console.log('✅ Runtime Interchangeability (DEV-240): --hub, --single y settings toggle son intercambiables dinámicamente en runtime');
}

// Test 14: MCP Repo Containment (SEC-03)
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const mcpBin = path.join(ROOT, 'bin', 'gripm-mcp.js');

  // Case A: Non-existent directory rejected
  const invalidPath = path.join(ROOT, 'non_existent_dir_for_test_sec_03');
  const childA = spawn(process.execPath, [mcpBin, '--repo', invalidPath], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errOutputA = '';
  childA.stderr.on('data', d => { errOutputA += d.toString(); });
  const codeA = await new Promise(resolve => childA.on('close', resolve));
  assert.strictEqual(codeA, 1, 'Proceso debe terminar con código 1 ante ruta inexistente');
  assert(errOutputA.includes('[MCP Security] Error') || errOutputA.includes('no existe'), 'Debe rechazar ruta inexistente en --repo');
  console.log('✅ MCP Repo Containment (SEC-03): Rechazó ruta inexistente con error de seguridad');

  // Case B: System root directory rejected
  const sysRoot = path.parse(process.cwd()).root;
  const childB = spawn(process.execPath, [mcpBin, '--repo', sysRoot], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errOutputB = '';
  childB.stderr.on('data', d => { errOutputB += d.toString(); });
  const codeB = await new Promise(resolve => childB.on('close', resolve));
  assert.strictEqual(codeB, 1, 'Proceso debe terminar con código 1 ante raíz del sistema');
  assert(errOutputB.includes('[MCP Security] Error'), 'Debe rechazar raíz del sistema en --repo');
  console.log('✅ MCP Repo Containment (SEC-03): Rechazó raíz protegida del sistema con error de seguridad');
}

console.log('🎉 [Security Test] Todas las salvaguardas de seguridad pasaron exitosamente contra el middleware REAL.');
