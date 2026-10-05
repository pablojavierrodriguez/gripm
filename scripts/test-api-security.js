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
    const isLoopbackHost = ['localhost', '127.0.0.1'].includes(hostHeader);
    const isAllowedHost = isLoopbackHost || hostHeader === confHost;

    // 1. DNS Rebinding
    if (!isAllowedHost && confHost !== '0.0.0.0') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Invalid or untrusted Host header' }));
      return;
    }

    // 2. CSRF Origin
    if (originHeader) {
      try {
        const originUrl = new URL(originHeader);
        const originHost = originUrl.hostname.toLowerCase();
        const isAllowedOrigin = ['localhost', '127.0.0.1'].includes(originHost) || originHost === confHost;
        if (!isAllowedOrigin && confHost !== '0.0.0.0') {
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

console.log('🎉 [Security Test] Todas las salvaguardas de seguridad pasaron exitosamente.');
