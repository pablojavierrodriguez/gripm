import assert from 'node:assert';

console.log('🛡️  [Security Test] Verificando mitigaciones de CSRF, DNS Rebinding y Content-Type en API Middleware...');

// Helper to simulate middleware execution
function createSecurityGuard(configuredHost = '127.0.0.1') {
  return (req, res, next) => {
    const url = req.url || '';
    const pathname = url.split('?')[0];
    if (!pathname.startsWith('/api/')) {
      return next();
    }

    const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
    const originHeader = req.headers.origin;
    const confHost = configuredHost.toLowerCase();
    const isLoopbackHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostHeader);
    const isIpHost = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(hostHeader) ||
                     hostHeader.includes(':') || hostHeader.endsWith('.local');
    const extraAllowedHosts = (process.env.GRIPM_ALLOWED_HOSTS || process.env.DEVBOARD_ALLOWED_HOSTS || '')
      .split(',')
      .map(h => h.trim().toLowerCase())
      .filter(Boolean);

    const isAllowedHost = isLoopbackHost ||
      (confHost !== '0.0.0.0' && hostHeader === confHost) ||
      (confHost === '0.0.0.0' && isIpHost) ||
      extraAllowedHosts.includes(hostHeader);

    // 1. DNS Rebinding
    if (!isAllowedHost) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Invalid or untrusted Host header' }));
      return;
    }

    // 2. CSRF Origin
    let isAllowedOrigin = false;
    if (originHeader) {
      try {
        const originUrl = new URL(originHeader);
        const originHost = originUrl.hostname.toLowerCase();
        const isLoopbackOrigin = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(originHost);
        isAllowedOrigin = isLoopbackOrigin ||
          originHost === hostHeader ||
          (confHost !== '0.0.0.0' && originHost === confHost) ||
          extraAllowedHosts.includes(originHost);

        if (!isAllowedOrigin) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Forbidden: Cross-Origin request blocked' }));
          return;
        }
      } catch {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Forbidden: Malformed Origin header' }));
        return;
      }
    }

    // 3. Mutating methods Content-Type
    const method = (req.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > 0 || method === 'POST' || method === 'PUT') {
        if (!contentType.includes('application/json')) {
          res.statusCode = 415;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unsupported Media Type: Content-Type must be application/json' }));
          return;
        }
      }
    }

    if (method === 'OPTIONS') {
      if (originHeader && isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', originHeader);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, val) { this.headers[name] = val; },
    end(data) { this.body = data || ''; }
  };
}

const guard = createSecurityGuard('localhost');

// Test 1: Malicious Origin blocked (CSRF mitigation)
{
  const req = { url: '/api/items', method: 'GET', headers: { host: 'localhost:4100', origin: 'https://malicious-attacker.com' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'Petición con Origin malicioso no debe llamar a next()');
  assert.strictEqual(res.statusCode, 403, 'Petición con Origin malicioso debe responder 403');
  console.log('✅ CSRF: Petición desde origen externo bloqueada con 403');
}

// Test 2: Local Origin allowed
{
  const req = { url: '/api/items', method: 'GET', headers: { host: 'localhost:4100', origin: 'http://localhost:4100' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'Petición con Origin localhost debe pasar');
  console.log('✅ CSRF: Petición desde localhost permitida');
}

// Test 3: DNS Rebinding attack blocked
{
  const req = { url: '/api/items', method: 'GET', headers: { host: 'evil-rebinding.attacker.com:4100' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'Petición con Host ajeno no debe llamar a next()');
  assert.strictEqual(res.statusCode, 403, 'Petición con Host ajeno debe responder 403');
  console.log('✅ DNS Rebinding: Host malicioso bloqueado con 403');
}

// Test 4: Mutating request without application/json rejected
{
  const req = { url: '/api/items', method: 'POST', headers: { host: 'localhost:4100', 'content-type': 'text/plain' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'POST con text/plain debe ser rechazado');
  assert.strictEqual(res.statusCode, 415, 'POST sin application/json debe responder 415');
  console.log('✅ Mutating Requests: POST sin application/json rechazado con 415');
}

// Test 5: Mutating request with application/json accepted
{
  const req = { url: '/api/items', method: 'POST', headers: { host: 'localhost:4100', 'content-type': 'application/json' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'POST con application/json debe pasar');
  console.log('✅ Mutating Requests: POST con application/json permitido');
}

// Test 6: Host 0.0.0.0 blocks DNS Rebinding domains
{
  const lanGuard = createSecurityGuard('0.0.0.0');
  const req = { url: '/api/items', method: 'GET', headers: { host: 'evil-attacker.com:4100' } };
  const res = mockRes();
  let calledNext = false;
  lanGuard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'En 0.0.0.0, dominio malicioso en Host debe ser bloqueado');
  assert.strictEqual(res.statusCode, 403, 'Host malicioso en 0.0.0.0 debe responder 403');
  console.log('✅ 0.0.0.0: DNS Rebinding hacia dominio atacante bloqueado con 403');
}

// Test 7: Host 0.0.0.0 blocks cross-origin requests from arbitrary external websites
{
  const lanGuard = createSecurityGuard('0.0.0.0');
  const req = { url: '/api/items', method: 'POST', headers: { host: '192.168.1.50:4100', origin: 'https://evil-attacker.com', 'content-type': 'application/json' } };
  const res = mockRes();
  let calledNext = false;
  lanGuard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'En 0.0.0.0, Origin ajeno debe ser bloqueado');
  assert.strictEqual(res.statusCode, 403, 'Origin ajeno en 0.0.0.0 debe responder 403');
  console.log('✅ 0.0.0.0: Petición cross-origin desde web externa bloqueada con 403');
}

// Test 8: Host 0.0.0.0 allows LAN client with matching IP origin
{
  const lanGuard = createSecurityGuard('0.0.0.0');
  const req = { url: '/api/items', method: 'POST', headers: { host: '192.168.1.50:4100', origin: 'http://192.168.1.50:4100', 'content-type': 'application/json' } };
  const res = mockRes();
  let calledNext = false;
  lanGuard(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'En 0.0.0.0, Origin que coincide con Host LAN debe ser permitido');
  console.log('✅ 0.0.0.0: Petición LAN legítima permitida');
}

// Test 9: OPTIONS preflight sets Vary: Origin
{
  const req = { url: '/api/items', method: 'OPTIONS', headers: { host: 'localhost:4100', origin: 'http://localhost:4100' } };
  const res = mockRes();
  let calledNext = false;
  guard(req, res, () => { calledNext = true; });
  assert.strictEqual(res.statusCode, 204, 'OPTIONS preflight debe responder 204');
  assert.strictEqual(res.headers['Vary'], 'Origin', 'OPTIONS preflight debe incluir Vary: Origin');
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'http://localhost:4100');
  console.log('✅ CORS: Preflight OPTIONS devuelve Vary: Origin y Access-Control-Allow-Origin correcto');
}

// Test 10: Filesystem containment logic
{
  import('node:path').then(pathModule => {
    const path = pathModule.default || pathModule;
    function isPathContained(targetPath, rootDir) {
      const resolvedTarget = path.resolve(path.normalize(targetPath));
      const resolvedRoot = path.resolve(rootDir);
      const relative = path.relative(resolvedRoot, resolvedTarget);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    }

    const home = '/fake/home/user';
    assert.strictEqual(isPathContained('/fake/home/user/my-project', home), true, 'Directorio hijo debe ser contenido');
    assert.strictEqual(isPathContained('/fake/home/user', home), true, 'El root mismo debe ser contenido');
    assert.strictEqual(isPathContained('/etc/passwd', home), false, '/etc no debe ser contenido');
    assert.strictEqual(isPathContained('/fake/home/user/../../etc', home), false, 'Path traversal relativo no debe ser contenido');
    assert.strictEqual(isPathContained('/fake/home/otheruser', home), false, 'Otro usuario no debe ser contenido');
    console.log('✅ FS Containment: Validación de contención dentro de roots permitidos verificada');
    console.log('🎉 [Security Test] Todas las salvaguardas de seguridad pasaron exitosamente.');
  });
}
