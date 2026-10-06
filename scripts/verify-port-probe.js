import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression test for the port probe hang (DEV-189).
 *
 * `isPortAvailable` probes a port by connecting to it. `socket.setTimeout()` only
 * starts once the socket is *established*, so when the SYN is dropped rather than
 * refused — what a Linux CI runner does to a filtered port — nothing ever settles
 * the promise. The pending connect keeps the event loop alive and the process
 * never exits, which is why `npm test` hit the job timeout on ubuntu-latest while
 * every assertion had already passed.
 *
 * The fix installs an independent guard timer. This test replaces
 * `Socket.prototype.connect` with a no-op to reproduce a dropped SYN deterministically,
 * so the regression cannot come back unnoticed on macOS or Windows, where the OS
 * refuses the connection and the bug stays invisible.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT_UTILS = path.join(ROOT, 'scripts', 'portUtils.js');

const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function droppedSyn() {
  // A dropped SYN: neither answered nor refused, so the connect stays in flight.
};

let isPortAvailable;
try {
  ({ isPortAvailable } = await import(PORT_UTILS));
} finally {
  net.Socket.prototype.connect = realConnect;
}

// --- The probe must resolve even when the connect never completes ----------

{
  net.Socket.prototype.connect = function droppedSyn() {};

  const started = Date.now();
  const free = await isPortAvailable(4100, '127.0.0.1');
  const elapsed = Date.now() - started;

  net.Socket.prototype.connect = realConnect;

  assert.equal(typeof free, 'boolean', 'isPortAvailable debe resolver con un booleano');
  assert.ok(
    elapsed < 3000,
    `el sondeo debe resolverse por guardia aunque el connect nunca se complete (tardó ${elapsed}ms). ` +
      'Si se colgó, el guard del timer fue unref\u2019d o se eliminó.',
  );
  console.log(`✅ DEV-189: isPortAvailable resuelve en ${elapsed}ms con el SYN descartado`);
}

// --- The guard must not be unref'd ----------------------------------------

{
  const source = fs.readFileSync(PORT_UTILS, 'utf8');
  assert.ok(
    /setTimeout\(\(\) => \{[\s\S]{0,120}resolve\(true\)/.test(source),
    'DEV-189: debe existir una promesa de tiempo que resuelva el sondeo descartado',
  );
  // `server.unref()` in the bind check is legitimate and predates this fix: that
  // server must not keep the loop alive either. Only the connect guard matters.
  const guardBlock = source.slice(source.indexOf('const guard = setTimeout'));
  assert.ok(
    !/unref/.test(guardBlock.slice(0, guardBlock.indexOf('socket.once'))),
    'DEV-189: el timer guard no debe estar unref\u2019d: es lo único que mantiene vivo el loop ' +
      'y si no dispara, la promesa queda sin resolver',
  );
  assert.ok(
    /socket\.destroy\(\)/.test(source),
    'DEV-189: el socket debe destruirse en todas las rutas de salida',
  );
  console.log('✅ DEV-189: el guard no está unref\u2019d y el socket se destruye siempre');
}

// --- Normal behaviour is preserved ----------------------------------------

{
  const { findAvailablePort } = await import(PORT_UTILS);

  // Bind a port so the probe must report it as occupied, then release it.
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const taken = blocker.address().port;

  const freeWhileBusy = await isPortAvailable(taken, '127.0.0.1');
  await new Promise((resolve) => blocker.close(resolve));

  assert.equal(freeWhileBusy, false, 'un puerto con alguien escuchando debe reportarse ocupado');

  const freeAfterRelease = await isPortAvailable(taken, '127.0.0.1');
  assert.equal(freeAfterRelease, true, 'tras liberar el puerto debe reportarse libre');

  const chosen = await findAvailablePort(taken, '127.0.0.1');
  assert.ok(Number.isInteger(chosen), 'findAvailablePort debe devolver un puerto');

  console.log('✅ DEV-189: el sondeo sigue distinguiendo puerto ocupado de puerto libre');
}

console.log('🎉 All port probe tests passed successfully!');