import net from 'node:net';

/**
 * Checks if a specific port is in use across both IPv4 and IPv6 loopback interfaces.
 * Prevents "ghost sockets" where a process bound to ::1 and another bound to 0.0.0.0
 * coexist on macOS without throwing EADDRINUSE.
 *
 * @param {number} port
 * @param {string} [host='localhost']
 * @returns {Promise<boolean>} true if the port is completely free to use
 */
export async function isPortAvailable(port, host = 'localhost') {
  // 1. Connection check: attempt connecting to 127.0.0.1 and ::1.
  // If connection succeeds, someone is already listening on that port.
  const checkConnect = (targetHost) => new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        socket.destroy();
      }
    };

    socket.setTimeout(150);
    socket.once('connect', () => {
      cleanup();
      resolve(false); // Port is occupied!
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(true); // No response / timed out
    });
    socket.once('error', (err) => {
      cleanup();
      // ECONNREFUSED or EADDRNOTAVAIL indicates no service is listening
      resolve(true);
    });

    try {
      socket.connect(port, targetHost);
    } catch {
      cleanup();
      resolve(true);
    }
  });

  const [v4Free, v6Free] = await Promise.all([
    checkConnect('127.0.0.1'),
    checkConnect('::1')
  ]);

  if (!v4Free || !v6Free) {
    return false;
  }

  // 2. Bind check: attempt binding on both 127.0.0.1 and ::1 (and target host)
  const checkBind = (targetHost) => new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else if (err.code === 'EADDRNOTAVAIL' || err.code === 'EAFNOSUPPORT') {
        // System might not support IPv6, treat as non-conflicting
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    try {
      server.listen(port, targetHost);
    } catch {
      resolve(false);
    }
  });

  const bindV4 = await checkBind('127.0.0.1');
  if (!bindV4) return false;

  const bindV6 = await checkBind('::1');
  if (!bindV6) return false;

  if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    const bindCustom = await checkBind(host);
    if (!bindCustom) return false;
  }

  return true;
}

/**
 * Proactively scans for the next truly available port starting from startPort.
 *
 * @param {number} [startPort=4100]
 * @param {string} [host='localhost']
 * @param {number} [maxAttempts=30]
 * @returns {Promise<number>}
 */
export async function findAvailablePort(startPort = 4100, host = 'localhost', maxAttempts = 30) {
  let candidate = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const available = await isPortAvailable(candidate, host);
    if (available) {
      return candidate;
    }
    candidate++;
  }
  return startPort;
}
