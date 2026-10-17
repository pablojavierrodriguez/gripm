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
const gripmPlugin = (config.plugins || []).find(p => p && p.name === 'vite-plugin-gripm-api');

if (!gripmPlugin || typeof gripmPlugin.configureServer !== 'function') {
  throw new Error('Plugin vite-plugin-gripm-api no encontrado en vite.config.ts');
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

gripmPlugin.configureServer(mockServer);

if (!middlewareHandler) {
  throw new Error('configureServer no registró apiMiddleware');
}

// DEV-190: release the fs.watch handles this hook opened. They are real watches
// on real directories and, since FSWatcher cannot be unref'd, they kept the
// process alive after the assertions finished.
try { gripmPlugin.closeWatchers?.(); } catch {}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
    this.finished = false;
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
    this.finished = true;
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
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
  }
}

// Test 1: Malicious Origin blocked (CSRF mitigation)
{
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
  process.env.GRIPM_HOST = '0.0.0.0';
  const req = new MockRequest('POST', '/api/projects', { host: '192.168.1.100:4100', origin: 'https://evil.com', 'content-type': 'application/json' });
  const res = new MockResponse();
  let nextCalled = false;
  middlewareHandler(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 403, '0.0.0.0 con Origin web externo debe responder 403');
  assert.strictEqual(nextCalled, false);
  console.log('✅ 0.0.0.0: Petición cross-origin desde web externa bloqueada con 403');
}

// Test 7: Host 0.0.0.0 & Ephemeral Token Authentication (DEV-245)
{
  process.env.GRIPM_HOST = '0.0.0.0';
  const { getEphemeralToken, setEphemeralToken } = await import('../server/middleware/security.ts');
  const validToken = getEphemeralToken() || 'test-ephemeral-token-1234';
  setEphemeralToken(validToken);

  // 1. LAN request without token is rejected with 401
  const reqNoToken = new MockRequest('GET', '/api/data', { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100' });
  const resNoToken = new MockResponse();
  let nextCalledNoToken = false;
  middlewareHandler(reqNoToken, resNoToken, () => { nextCalledNoToken = true; });
  assert.strictEqual(resNoToken.statusCode, 401, 'En 0.0.0.0, petición LAN sin token debe responder 401 Unauthorized');
  assert.strictEqual(nextCalledNoToken, false);

  // 2. LAN request with invalid token is rejected with 401
  const reqBadToken = new MockRequest('GET', '/api/data', { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100', 'x-gripm-token': 'wrong-token' });
  const resBadToken = new MockResponse();
  let nextCalledBadToken = false;
  middlewareHandler(reqBadToken, resBadToken, () => { nextCalledBadToken = true; });
  assert.strictEqual(resBadToken.statusCode, 401, 'En 0.0.0.0, petición LAN con token inválido debe responder 401');
  assert.strictEqual(nextCalledBadToken, false);

  // 3. LAN request with valid token in header succeeds with 200 OK
  const reqGoodHeader = new MockRequest('GET', '/api/data', { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100', 'x-gripm-token': validToken });
  const resGoodHeader = new MockResponse();
  let nextCalledGoodHeader = false;
  middlewareHandler(reqGoodHeader, resGoodHeader, () => { nextCalledGoodHeader = true; });
  assert.strictEqual(resGoodHeader.statusCode, 200, 'Petición LAN con header X-Gripm-Token válido debe responder 200 OK');

  // 4. LAN request with valid token in query param (?token=...) succeeds with 200 OK
  const reqGoodQuery = new MockRequest('GET', `/api/data?token=${validToken}`, { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100' });
  const resGoodQuery = new MockResponse();
  let nextCalledGoodQuery = false;
  middlewareHandler(reqGoodQuery, resGoodQuery, () => { nextCalledGoodQuery = true; });
  assert.strictEqual(resGoodQuery.statusCode, 200, 'Petición LAN con ?token=... válido en URL debe responder 200 OK');

  // 5. Loopback access on 127.0.0.1, localhost and IPv6 [::1] does not require token
  for (const host of ['127.0.0.1:4100', 'localhost:4100', '[::1]:4100']) {
    const reqLoopback = new MockRequest('GET', '/api/data', { host });
    const resLoopback = new MockResponse();
    let nextCalledLoopback = false;
    middlewareHandler(reqLoopback, resLoopback, () => { nextCalledLoopback = true; });
    assert.strictEqual(resLoopback.statusCode, 200, `Petición en loopback (${host}) sin token debe responder 200 OK de forma transparente`);
  }

  console.log('✅ 0.0.0.0 & LAN Auth (DEV-245): Peticiones LAN sin token dan 401, con token dan 200, y loopback (IPv4/IPv6) es transparente');
}

// Test 8: OPTIONS preflight sets Vary: Origin
{
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

// Test 12: Client API Invariant (DEV-237): All mutating POST/PUT fetch calls in the client data layer must declare Content-Type: application/json
// DEV-222: the client data layer moved out of src/api.ts into src/data/. The invariant is unchanged,
// so the check scans the whole directory instead of a single hardcoded file: a future move inside
// src/data/ must not silently turn this test into a vacuous pass.
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataLayer = path.join(ROOT, 'src', 'data');
  const files = fs.readdirSync(dataLayer).filter((f) => f.endsWith('.ts'));
  assert(files.length > 0, 'Debe existir la capa de datos del cliente en src/data/');

  const postPutBlocks = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(dataLayer, file), 'utf8');
    postPutBlocks.push(...(source.match(/fetch\([^)]*\{\s*method:\s*['"](?:POST|PUT)['"][\s\S]*?\}\);/g) || []));
  }
  assert(postPutBlocks.length > 0, 'Debe haber llamadas fetch mutantes en src/data/');

  for (const block of postPutBlocks) {
    assert(
      block.includes("'Content-Type': 'application/json'") || block.includes('"Content-Type": "application/json"'),
      `Llamada mutante en src/data/ debe declarar Content-Type: application/json para evitar rechazo 415 (DEV-237):\n${block}`,
    );
  }
  console.log(`✅ Client API Invariant (DEV-237): ${postPutBlocks.length} llamadas POST/PUT en src/data/ incluyen Content-Type: application/json`);
}

// Test 13: Runtime Interchangeability & Mode Precedence (DEV-240)
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

// Test 15: Security Headers en UI y API Middleware (DEV-243)
{
  const req = new MockRequest('GET', '/api/data', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const res = new MockResponse();
  middlewareHandler(req, res, () => {});
  assert.strictEqual(res.headers['X-Frame-Options'], 'DENY', 'Debe incluir X-Frame-Options: DENY');
  assert.strictEqual(res.headers['X-Content-Type-Options'], 'nosniff', 'Debe incluir X-Content-Type-Options: nosniff');
  assert.strictEqual(res.headers['Referrer-Policy'], 'strict-origin-when-cross-origin', 'Debe incluir Referrer-Policy');
  assert(res.headers['Content-Security-Policy'] && res.headers['Content-Security-Policy'].includes("frame-ancestors 'none'"), 'CSP debe incluir frame-ancestors none');

  // Verificar también headers en server.headers para requests de Vite estáticos
  assert.strictEqual(config.server?.headers?.['X-Frame-Options'], 'DENY', 'server.headers debe incluir X-Frame-Options: DENY');
  assert.strictEqual(config.server?.headers?.['X-Content-Type-Options'], 'nosniff', 'server.headers debe incluir X-Content-Type-Options: nosniff');
  assert.strictEqual(config.server?.headers?.['Referrer-Policy'], 'strict-origin-when-cross-origin', 'server.headers debe incluir Referrer-Policy');
  assert(config.server?.headers?.['Content-Security-Policy']?.includes("frame-ancestors 'none'"), 'server.headers CSP debe incluir frame-ancestors none');

  console.log('✅ Security Headers (DEV-243): API Middleware y server.headers inyectan X-Frame-Options, nosniff, Referrer-Policy y CSP frame-ancestors');
}

// Test 16: Payload Too Large (413) Body Limit (DEV-243)
{
  const reqLarge = new MockRequest('POST', '/api/settings', {
    host: 'localhost:4100',
    origin: 'http://localhost:4100',
    'content-type': 'application/json'
  });
  const resLarge = new MockResponse();
  middlewareHandler(reqLarge, resLarge, () => {});

  const finishPromise = new Promise(r => {
    if (resLarge.finished) return r();
    resLarge.once('finish', r);
  });

  const chunk = 'x'.repeat(1024 * 1024); // 1 MB chunk
  for (let i = 0; i < 11; i++) {
    reqLarge.emit('data', chunk);
  }
  reqLarge.emit('end');

  await finishPromise;
  assert.strictEqual(resLarge.statusCode, 413, 'Payload que excede 10MB debe responder 413 Payload Too Large');
  const body = JSON.parse(resLarge.body);
  assert(body.error && body.error.includes('10MB'), 'El cuerpo debe indicar que excede el límite de 10MB');
  assert.strictEqual(reqLarge.destroyed, true, 'La request debe abortarse/destruirse al exceder el límite');
  console.log('✅ Body Size Limit 10MB (DEV-243): Peticiones mutantes que exceden 10MB son rechazadas con HTTP 413');
}

// Test 17: Path Traversal en generateTaskFilename (DEV-292 AC #1)
{
  const { generateTaskFilename } = await import('../scripts/backlogMdParser.ts');
  const baseDir = path.resolve('backlog/tasks');

  const dangerousInputs = [
    '../../../evil',
    '..\\..\\evil',
    '/etc/passwd',
    'C:\\Windows\\System32',
    '..',
    '....//....//payload',
    'foo/../../bar'
  ];

  for (const input of dangerousInputs) {
    const filename = generateTaskFilename(input, 'Safe Title');
    assert(!filename.includes('/'), `Filename no debe contener slash (/): ${filename}`);
    assert(!filename.includes('\\'), `Filename no debe contener backslash (\\): ${filename}`);
    assert(!filename.includes('..'), `Filename no debe contener punto relativo (..): ${filename}`);
    const resolved = path.resolve(baseDir, filename);
    assert(resolved.startsWith(baseDir), `Path resuelto (${resolved}) escapó de ${baseDir}`);
  }

  const fallbackFilename = generateTaskFilename('', '');
  assert.strictEqual(fallbackFilename, 'TASK - Task.md');

  console.log('✅ Task ID Path Traversal (DEV-292 AC #1): generateTaskFilename sanitiza estrictamente el ID y previene escape de backlog/tasks');
}

// Test 18: GET /api/projects/:id/export-monolithic-md es de solo lectura y no escribe a disco (DEV-292 AC #2)
{
  const { getRegistry } = await import('../server/services/registry.ts');
  const registry = getRegistry();
  const project = registry.projects[0];
  assert(project, 'Debe existir al menos un proyecto en el registry');

  const backlogPath = project.repoPath ? path.join(project.repoPath, 'BACKLOG.md') : null;
  const existedBefore = backlogPath ? fs.existsSync(backlogPath) : false;
  const mtimeBefore = existedBefore ? fs.statSync(backlogPath).mtimeMs : null;

  // Intentar mutación vía GET con parámetro save=true
  const req = new MockRequest('GET', `/api/projects/${project.id}/export-monolithic-md?save=true`, {
    host: 'localhost:4100',
    origin: 'http://localhost:4100'
  });
  const res = new MockResponse();
  middlewareHandler(req, res, () => {});

  assert.strictEqual(res.statusCode, 200, 'GET debe responder 200 OK');
  const payload = JSON.parse(res.body);
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.savedPath, undefined, 'GET no debe devolver savedPath');
  assert(typeof payload.content === 'string' && payload.content.length > 0, 'GET debe devolver el contenido Markdown');

  if (backlogPath) {
    const existedAfter = fs.existsSync(backlogPath);
    if (!existedBefore) {
      assert.strictEqual(existedAfter, false, 'GET ?save=true no debe crear el archivo BACKLOG.md en disco');
    } else {
      const mtimeAfter = fs.statSync(backlogPath).mtimeMs;
      assert.strictEqual(mtimeAfter, mtimeBefore, 'GET ?save=true no debe modificar el archivo BACKLOG.md en disco');
    }
  }

  console.log('✅ Export Monolithic MD (DEV-292 AC #2a): GET export-monolithic-md es estrictamente de solo lectura');
}

// Test 19: POST /api/projects/:id/export-monolithic-md valida CSRF/Content-Type y guarda en disco atómicamente (DEV-292 AC #2)
{
  const { getRegistry } = await import('../server/services/registry.ts');
  const registry = getRegistry();
  const project = registry.projects[0];
  assert(project, 'Debe existir un proyecto para el test');

  // Caso 1: Rechazado sin application/json (415)
  const reqNoJson = new MockRequest('POST', `/api/projects/${project.id}/export-monolithic-md`, {
    host: 'localhost:4100',
    origin: 'http://localhost:4100',
    'content-type': 'text/plain'
  });
  const resNoJson = new MockResponse();
  middlewareHandler(reqNoJson, resNoJson, () => {});
  assert.strictEqual(resNoJson.statusCode, 415, 'POST sin application/json debe responder 415');

  // Caso 2: Rechazado con origen malicioso (403)
  const reqMalicious = new MockRequest('POST', `/api/projects/${project.id}/export-monolithic-md`, {
    host: 'localhost:4100',
    origin: 'https://evil-attacker.com',
    'content-type': 'application/json'
  });
  const resMalicious = new MockResponse();
  middlewareHandler(reqMalicious, resMalicious, () => {});
  assert.strictEqual(resMalicious.statusCode, 403, 'POST con Origin malicioso debe responder 403');

  // Caso 3: Petición autorizada con application/json guarda atómicamente
  const backlogPath = project.repoPath ? path.join(project.repoPath, 'BACKLOG.md') : null;
  const originalBacklogContent = backlogPath && fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, 'utf8') : null;
  try {
    const reqValid = new MockRequest('POST', `/api/projects/${project.id}/export-monolithic-md`, {
      host: 'localhost:4100',
      origin: 'http://localhost:4100',
      'content-type': 'application/json'
    });
    const resValid = new MockResponse();
    middlewareHandler(reqValid, resValid, () => {});
    reqValid.emit('data', JSON.stringify({}));
    reqValid.emit('end');

    await new Promise(r => resValid.once('finish', r));
    assert.strictEqual(resValid.statusCode, 200, 'POST autorizado debe responder 200');
    const payloadValid = JSON.parse(resValid.body);
    assert.strictEqual(payloadValid.ok, true);
    assert(payloadValid.savedPath && fs.existsSync(payloadValid.savedPath), 'POST debe guardar BACKLOG.md en disco');
  } finally {
    if (originalBacklogContent !== null && backlogPath) {
      fs.writeFileSync(backlogPath, originalBacklogContent, 'utf8');
    }
  }

  console.log('✅ Export Monolithic MD (DEV-292 AC #2b): POST valida Content-Type y Origin, persistiendo atómicamente');
}

// Test 20: SSE Crash Prevention ante eventos error/EPIPE (DEV-292 AC #3)
{
  const { handleSseRoute, sseClients, broadcastSse } = await import('../server/sse/sseManager.ts');

  // Caso 1: Error en res no arroja excepción no capturada y limpia socket
  const sseReq1 = new MockRequest('GET', '/api/events', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const sseRes1 = new MockResponse();
  sseRes1.write = () => true;

  handleSseRoute(sseReq1, sseRes1, 'http://localhost:4100', true);
  assert(sseClients.has(sseRes1), 'Cliente SSE debe estar registrado en el pool');
  assert(sseRes1.listenerCount('error') > 0, 'res debe tener listener para error');
  assert(sseReq1.listenerCount('error') > 0, 'req debe tener listener para error');

  // Disparar error EPIPE en res
  assert.doesNotThrow(() => {
    sseRes1.emit('error', new Error('EPIPE: write after end'));
  }, 'Error en res no debe arrojar excepción no capturada');
  assert(!sseClients.has(sseRes1), 'Error en res debe eliminar el socket de sseClients');

  // Caso 2: Error en req limpia socket
  const sseReq2 = new MockRequest('GET', '/api/events', { host: 'localhost:4100', origin: 'http://localhost:4100' });
  const sseRes2 = new MockResponse();
  sseRes2.write = () => true;

  handleSseRoute(sseReq2, sseRes2, 'http://localhost:4100', true);
  assert(sseClients.has(sseRes2));
  assert.doesNotThrow(() => {
    sseReq2.emit('error', new Error('ECONNRESET'));
  }, 'Error en req no debe arrojar excepción no capturada');
  assert(!sseClients.has(sseRes2), 'Error en req debe eliminar el socket de sseClients');

  // Caso 3: broadcastSse defensivo ante cliente destruido/con error
  const deadClient = {
    destroyed: true,
    writableEnded: true,
    write: () => { throw new Error('EPIPE: write on dead socket'); }
  };
  sseClients.add(deadClient);
  assert.doesNotThrow(() => {
    broadcastSse('ping_test', { ok: true });
  }, 'broadcastSse debe capturar errores y no arrojar excepciones fatales');
  assert(!sseClients.has(deadClient), 'broadcastSse debe descartar cliente muerto');

  console.log('✅ SSE EPIPE Prevention (DEV-292 AC #3): Listeners de error y broadcastSse defensivo blindan el daemon ante caídas por EPIPE');
}

// Test 21: Fuga de contención en /api/fs/browse con enlaces simbólicos (DEV-292 AC #4)
{
  const { isAllowedBrowsePath } = await import('../server/services/fsExplorer.ts');

  // 1. Simular symlink mediante fs.realpathSync para verificar que se resuelve ANTES de isPathContained
  const origRealpathSync = fs.realpathSync;
  try {
    const fakeSymlinkInCwd = path.join(process.cwd(), 'fake_symlink_inside_allowed_root');
    const systemRoot = path.parse(process.cwd()).root;

    // Cuando se consulta el symlink (cuya ruta sintáctica está dentro de process.cwd),
    // su realpath resuelve fuera (la raíz del sistema)
    fs.realpathSync = (p) => {
      if (path.resolve(p) === path.resolve(fakeSymlinkInCwd)) {
        return systemRoot;
      }
      return origRealpathSync(p);
    };

    const isAllowed = isAllowedBrowsePath(fakeSymlinkInCwd);
    assert.strictEqual(isAllowed, false, 'Symlink que apunta fuera de roots permitidos debe ser bloqueado por isAllowedBrowsePath');
  } finally {
    fs.realpathSync = origRealpathSync;
  }

  // 2. Verificar a través de una petición HTTP GET /api/fs/browse
  {
    const origRealpathSync2 = fs.realpathSync;
    try {
      const fakeSymlinkPath = path.join(process.cwd(), 'simulated_evil_symlink');
      const systemRoot = path.parse(process.cwd()).root;
      fs.realpathSync = (p) => {
        if (path.resolve(p) === path.resolve(fakeSymlinkPath)) {
          return systemRoot;
        }
        return origRealpathSync2(p);
      };

      const req = new MockRequest('GET', `/api/fs/browse?dir=${encodeURIComponent(fakeSymlinkPath)}`, {
        host: 'localhost:4100'
      });
      const res = new MockResponse();
      middlewareHandler(req, res, () => {});
      assert.strictEqual(res.statusCode, 403, '/api/fs/browse con symlink hacia raíz debe responder 403 Forbidden');
    } finally {
      fs.realpathSync = origRealpathSync2;
    }
  }

  // 3. Probar creación de symlink/junction real si el entorno lo soporta
  const tmpSymlinkDir = path.join(os.tmpdir(), `gripm-symlink-test-${Date.now()}`);
  try {
    fs.mkdirSync(tmpSymlinkDir, { recursive: true });
    const realSymlinkPath = path.join(tmpSymlinkDir, 'link_out');
    const systemRoot = path.parse(process.cwd()).root;
    let symlinkCreated = false;
    try {
      fs.symlinkSync(systemRoot, realSymlinkPath, 'junction');
      symlinkCreated = true;
    } catch {
      try {
        fs.symlinkSync(systemRoot, realSymlinkPath, 'dir');
        symlinkCreated = true;
      } catch {}
    }
    if (symlinkCreated && fs.existsSync(realSymlinkPath)) {
      const allowed = isAllowedBrowsePath(realSymlinkPath);
      assert.strictEqual(allowed, false, 'Symlink real hacia raíz debe ser rechazado');
    }
  } finally {
    try { fs.rmSync(tmpSymlinkDir, { recursive: true, force: true }); } catch {}
  }

  console.log('✅ Symlink Containment (DEV-292 AC #4): isAllowedBrowsePath resuelve fs.realpathSync antes de verificar contención');
}

// Test 22: Blindaje Integral de Seguridad (DEV-302)
{
  const { validateVerifyCommand } = await import('../server/services/backlogService.ts');
  const { isAllowedBrowsePath, isSystemRootDir } = await import('../server/services/fsExplorer.ts');

  // AC #1: IPv6 Loopback [::1]
  const reqIpv6 = new MockRequest('GET', '/api/data', { host: '[::1]:4100' });
  const resIpv6 = new MockResponse();
  let nextIpv6 = false;
  middlewareHandler(reqIpv6, resIpv6, () => { nextIpv6 = true; });
  assert.strictEqual(resIpv6.statusCode, 200, 'Loopback IPv6 [::1] debe responder 200 sin emitir 403 (DEV-302 AC #1)');

  // AC #2: Gatekeeper evasion flags and escapes
  const dangerousCommands = [
    'npm test -- --prefix=/tmp',
    'npm test -- --config=malicious.js',
    'npm test -- -c',
    'npm test -- --script-shell=/bin/sh',
    'npm test -- --eval=process.exit()',
    'npm test -- -e',
    'npm test -- --import=evil.mjs',
    'npm test -- --loader=evil.js',
    'npm test -- ../outside/test.js',
    'npm test -- /etc/passwd'
  ];

  for (const cmd of dangerousCommands) {
    const result = validateVerifyCommand(cmd, process.cwd());
    assert.strictEqual(result.valid, false, `Gatekeeper debe rechazar comando peligroso: ${cmd}`);
  }

  const safeResult = validateVerifyCommand('npm test', process.cwd());
  assert.strictEqual(safeResult.valid, true, 'Gatekeeper debe permitir comando estándar legítimo: npm test');

  // AC #3: isAllowedBrowsePath resolves ancestors on non-existent files
  const nonExistentInside = path.join(process.cwd(), 'a_non_existent_folder_abc', 'subfile.md');
  assert.strictEqual(isAllowedBrowsePath(nonExistentInside), true, 'Ruta inexistente dentro de directorio permitido debe permitirse');

  const systemRoot = path.parse(process.cwd()).root;
  const nonExistentOutside = path.join(systemRoot, 'a_non_existent_system_dir_xyz', 'subfile.md');
  assert.strictEqual(isAllowedBrowsePath(nonExistentOutside), false, 'Ruta inexistente fuera de directorios permitidos debe rechazarse');

  // AC #5: Router operates on decoded pathname immune to query params
  const reqWithQuery = new MockRequest('GET', '/api/data?nocache=1&filter=all', { host: 'localhost:4100' });
  const resWithQuery = new MockResponse();
  middlewareHandler(reqWithQuery, resWithQuery, () => {});
  assert.strictEqual(resWithQuery.statusCode, 200, 'Router debe responder 200 a /api/data independientemente de query parameters');

  // AC #6: POST /api/projects rejects relative path escapes in backlogDir
  const reqEscapeProject = new MockRequest('POST', '/api/projects', {
    host: 'localhost:4100',
    'content-type': 'application/json'
  });
  const resEscapeProject = new MockResponse();
  middlewareHandler(reqEscapeProject, resEscapeProject, () => {});
  reqEscapeProject.emit('data', JSON.stringify({ name: 'Evil Project', backlogDir: '../../etc' }));
  reqEscapeProject.emit('end');
  await new Promise(r => resEscapeProject.once('finish', r));
  assert.strictEqual(resEscapeProject.statusCode, 400, 'POST /api/projects debe rechazar backlogDir con escape relativo ..');

  // DEV-317: isSystemRootDir does not flag paths in os.tmpdir() as system roots
  const tempSubdir = path.join(os.tmpdir(), 'gripm-test-fixture-mac-safe');
  assert.strictEqual(isSystemRootDir(tempSubdir), false, 'Subdirectorio en os.tmpdir() no debe considerarse raíz del sistema');
  assert.strictEqual(isAllowedBrowsePath(tempSubdir), true, 'Subdirectorio en os.tmpdir() debe permitirse en isAllowedBrowsePath');

  console.log('✅ Blindaje Integral de Seguridad (DEV-302, DEV-317): IPv6 loopback, Gatekeeper hardened, ancestros symlink, pathname router y contención validados');
}

console.log('🎉 [Security Test] Todas las salvaguardas de seguridad pasaron exitosamente contra el middleware REAL.');

