/**
 * Watchdog preload: reports what is keeping the process alive if it hangs.
 *
 * The suite used to fail on CI with no diagnostic at all: every assertion passed,
 * the success banner printed, and then nothing, until the job hit its timeout.
 * Hunting that down meant running the suite on the failing OS, by hand, once per
 * culprit.
 *
 * This preload makes the failure self-describing. It arms an **unref'd** timer,
 * which is the key detail: an unref'd timer does not keep the loop alive, so it
 * cannot delay a healthy run, but it still fires when something *else* is
 * holding the loop open. That is exactly the failure we care about, so the timer
 * fires only when the hang is real.
 *
 * On fire it prints every live handle and pending request, then exits 124
 * (the conventional timeout code).
 *
 * Usage: node --import ./scripts/watchdog.js <script>
 *        GRIPM_WATCHDOG_MS=90000 to change the deadline.
 */
import { _getActiveHandles, _getActiveRequests } from 'node:process';

const DEADLINE_MS = Number(process.env.GRIPM_WATCHDOG_MS || 90_000);

const STDIO_FDS = new Set([0, 1, 2]);

const describe = (h) => {
  const name = h?.constructor?.name ?? typeof h;
  const bits = [];
  if (h.pid) bits.push(`pid=${h.pid}`);
  if (h.spawnfile) bits.push(`spawnfile=${String(h.spawnfile).split('/').pop()}`);
  if (h.connected !== undefined) bits.push(`connected=${h.connected}`);
  if (h.remoteAddress) bits.push(`remote=${h.remoteAddress}:${h.remotePort ?? ''}`);
  if (h.localPort) bits.push(`local=${h.localAddress}:${h.localPort}`);
  if (h.destroyed !== undefined) bits.push(`destroyed=${h.destroyed}`);
  // A directory path is the single most useful clue for a leaked FSWatcher.
  const dir = h._handle?.path ?? h.path;
  if (dir) bits.push(`dir=${dir}`);
  return `${name}${bits.length ? ` ${bits.join(' ')}` : ''}`;
};

/** Handles that cannot keep the loop alive, so they are not worth reporting. */
const isBenign = (h) => {
  const name = h?.constructor?.name;
  if (name !== 'Socket') return false;
  // Sockets bound to the stdio fds never hold the loop open.
  return STDIO_FDS.has(h._handle?.fd ?? h.fd);
};

const suspects = () => _getActiveHandles().filter((h) => !isBenign(h));

const timer = setTimeout(() => {
  const handles = suspects();
  const requests = _getActiveRequests();

  console.error(`\n⛔ Watchdog: el proceso sigue vivo ${DEADLINE_MS}ms después de empezar.`);
  console.error(`\nHandles que mantienen el event loop (${handles.length}):`);
  const byType = new Map();
  for (const h of handles) {
    const name = h.constructor?.name ?? typeof h;
    if (!byType.has(name)) byType.set(name, []);
    byType.get(name).push(describe(h));
  }
  for (const [name, list] of byType) {
    console.error(`  · ${name} ×${list.length}`);
    // Print every instance of a rare type, but cap a flood of a common one.
    for (const line of list.slice(0, 5)) console.error(`      ${line}`);
    if (list.length > 5) console.error(`      … y ${list.length - 5} más`);
  }

  console.error(`\nRequests pendientes (${requests.length}):`);
  for (const r of requests.slice(0, 10)) console.error(`  · ${describe(r)}`);

  console.error(
    '\nLos handles de arriba son la causa: el trabajo terminó pero el proceso no puede salir.',
  );
  console.error('Un handle que no se puede unref (como fs.FSWatcher) necesita un close() explícito.');

  process.exit(124);
}, DEADLINE_MS);

// The whole point: do not hold the loop open on a healthy run.
timer.unref();