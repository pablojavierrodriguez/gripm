import { httpAdapter } from './httpAdapter';
import { sandboxAdapter } from './sandbox';
import { setActiveApi } from './runtime';
import type { GripmApi } from './types';

/**
 * DEV-222 — Detección de disponibilidad del daemon.
 *
 * Gripm es local-first: el tablero habla con un daemon por HTTP. Desplegado como
 * estático en Vercel no hay daemon, así que `dist/` sirve y todos los `/api/*` dan
 * 404. Esta función decide contra qué adaptador se trabaja y lo fija una sola vez.
 *
 * No es una heurística sobre la URL: es un probe real contra `GET /api/data`, la
 * misma ruta que la app necesita para pintar el tablero. Un `window.location`
 * que "parece" web puede estar sirviendo la SPA detrás de un proxy que sí tiene
 * API; al revés, un `localhost` puede estar sin daemon. La única señal fiable es
 * si el endpoint responde.
 *
 * La decisión se cachea en una promesa. Sin cachear, cada interacción paga el
 * timeout otra vez y en el peor caso la app renderiza con `boardData === null`
 * mientras el probe corre, que es justo la pantalla vacía que este ítem elimina.
 */

const PROBE_TIMEOUT_MS = 1500;
const PROBE_URL = '/api/data';

/** `null` mientras no se resolvió. */
let resolved: Promise<void> | null = null;
let sandbox = false;

function probeAvailableApi(): Promise<boolean> {
  if (typeof fetch !== 'function') return Promise.resolve(false);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null;

  return (async () => {
    try {
      const res = await fetch(PROBE_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      });
      if (!res.ok) return false;
      // Una SPA servida en `/api/data` devolvería HTML con 200: hay que exigir JSON.
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) return false;
      await res.json();
      return true;
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
}

/**
 * Resuelve y fija el adaptador una única vez.
 * Todas las llamadas concurrentes comparten la misma promesa.
 */
export function ensureAdapter(): Promise<void> {
  if (!resolved) {
    resolved = (async () => {
      sandbox = !(await probeAvailableApi());
      setActiveApi(sandbox ? sandboxAdapter : httpAdapter);
    })();
  }
  return resolved;
}

/** `true` si se resolvió y no hay daemon. Antes de resolver devuelve `false`. */
export function isSandboxMode(): boolean {
  return sandbox;
}

/** Solo para tests: olvida la decisión y vuelve al estado inicial. */
export function resetAdapterDecision(): void {
  resolved = null;
  sandbox = false;
  setActiveApi(httpAdapter);
}

export type { GripmApi };