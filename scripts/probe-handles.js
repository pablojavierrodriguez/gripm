/**
 * Dumps the handles and requests still alive after verify-integration.js has
 * finished all of its work.
 *
 * CI evidence: on ubuntu-latest the script prints
 * "🎉 Full verification passed successfully!" and then the process never exits,
 * so the next script in the `&&` chain never starts. Every assertion already
 * passed, which means the work is done and something is keeping the event loop
 * alive. This prints that something.
 *
 * Run it inside the Linux container, since the leak does not happen on macOS.
 */
import { _getActiveHandles, _getActiveRequests } from 'node:process';

const started = Date.now();
await import('../scripts/verify-integration.js');

console.log(`\n── verify-integration.js terminó su trabajo en ${Date.now() - started}ms ──`);

const describe = (h) => {
  const name = h?.constructor?.name ?? typeof h;
  const bits = [];
  if (h.pid) bits.push(`pid=${h.pid}`);
  if (h.spawnfile) bits.push(`spawnfile=${String(h.spawnfile).split('/').pop()}`);
  if (h.connected !== undefined) bits.push(`connected=${h.connected}`);
  if (h.remoteAddress) bits.push(`remote=${h.remoteAddress}:${h.remotePort ?? ''}`);
  if (h.localPort) bits.push(`local=${h.localAddress}:${h.localPort}`);
  if (h.destroyed !== undefined) bits.push(`destroyed=${h.destroyed}`);
  if (h.listenerCount) {
    const evs = ['connect', 'timeout', 'error', 'exit', 'close', 'data'].filter((e) =>
      h.listenerCount(e),
    );
    if (evs.length) bits.push(`listeners=[${evs.join(',')}]`);
  }
  return `${name}${bits.length ? ' ' + bits.join(' ') : ''}`;
};

const handles = _getActiveHandles();
const requests = _getActiveRequests();

console.log(`\nHANDLES VIVOS (${handles.length}):`);
for (const h of handles) console.log(`  · ${describe(h)}`);

console.log(`\nREQUESTS PENDIENTES (${requests.length}):`);
for (const r of requests) console.log(`  · ${describe(r)}`);

// Only stdin/stdout/stderr cannot keep the loop alive, so they are expected.
const benign = new Set(['Socket', 'TTY', 'WriteWrap', 'ReadWrap', 'ProcessWrap']);
const suspects = handles.filter((h) => {
  const name = h?.constructor?.name;
  if (benign.has(name)) return false;
  // A socket connected to stdout/stderr is also benign.
  if (name === 'Socket' && [1, 2].includes(h._handle?.fd ?? h.fd)) return false;
  return true;
});

console.log(`\nSOSPECHOSOS (${suspects.length}):`);
for (const h of suspects) console.log(`  ⛔ ${describe(h)}`);

if (suspects.length) {
  console.log('\n❌ Hay handles vivos que mantienen el event loop: el proceso no puede salir.');
  process.exit(1);
}
console.log('\n✅ Ningún handle sospechoso: el proceso debería salir solo.');