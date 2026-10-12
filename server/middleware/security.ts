export const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB limit (DEV-243: Anti-DoS)

export function applySecurityHeaders(res: any) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
    );
  }
}

export function sendJson(res: any, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function getBody(req: any, res: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    let receivedBytes = 0;
    let aborted = false;

    req.on('data', (chunk: any) => {
      if (aborted) return;
      receivedBytes += chunk ? (chunk.length || Buffer.byteLength(chunk)) : 0;
      if (receivedBytes > MAX_BODY_SIZE) {
        aborted = true;
        const err: any = new Error('Payload Too Large: request body exceeds 10MB limit');
        err.statusCode = 413;
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Payload Too Large: request body exceeds 10MB limit' }));
        reject(err);
        if (typeof req.destroy === 'function') req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (aborted) return;
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', (err: any) => {
      if (aborted) return;
      reject(err);
    });
  });
}

export function validateSecurity(req: any, res: any): { isAllowedOrigin: boolean } | null {
  applySecurityHeaders(res);

  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
  const originHeader = req.headers.origin;
  const configuredHost = (process.env.GRIPM_HOST || '127.0.0.1').toLowerCase();
  const isLoopbackHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostHeader);
  const isIpHost = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(hostHeader) ||
                   hostHeader.includes(':') || hostHeader.endsWith('.local');
  const extraAllowedHosts = (process.env.GRIPM_ALLOWED_HOSTS || '')
    .split(',')
    .map((h: string) => h.trim().toLowerCase())
    .filter(Boolean);

  const isAllowedHost = isLoopbackHost ||
    (configuredHost !== '0.0.0.0' && hostHeader === configuredHost) ||
    (configuredHost === '0.0.0.0' && isIpHost) ||
    extraAllowedHosts.includes(hostHeader);

  // 1. DNS Rebinding Protection: Host header validation
  if (!isAllowedHost) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden: Invalid or untrusted Host header' }));
    return null;
  }

  // 2. CSRF Protection: Origin validation
  let isAllowedOrigin = false;
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const originHost = originUrl.hostname.toLowerCase();
      const isLoopbackOrigin = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(originHost);
      isAllowedOrigin = isLoopbackOrigin ||
        originHost === hostHeader ||
        (configuredHost !== '0.0.0.0' && originHost === configuredHost) ||
        extraAllowedHosts.includes(originHost);

      if (!isAllowedOrigin) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Forbidden: Cross-Origin request blocked' }));
        return null;
      }
    } catch {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Malformed Origin header' }));
      return null;
    }
  }

  // 3. Mutating methods protection: require Content-Type application/json
  const method = (req.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 0 || method === 'POST' || method === 'PUT') {
      if (!contentType.includes('application/json')) {
        res.statusCode = 415;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Unsupported Media Type: Content-Type must be application/json' }));
        return null;
      }
    }
  }

  // Handle CORS preflight requests for allowed local origins
  if (method === 'OPTIONS') {
    if (originHeader && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', originHeader);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.statusCode = 204;
    res.end();
    return null;
  }

  return { isAllowedOrigin };
}
