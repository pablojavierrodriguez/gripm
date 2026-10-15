import { httpAdapter } from './httpAdapter.ts';
import type { GripmApi } from './types';

/**
 * DEV-222 — Selección del adaptador activo.
 *
 * Existe un único lugar en toda la app donde se decide contra qué almacenamiento se
 * trabaja. Hoy arranca siempre en HTTP; el detector de disponibilidad (paso 5 del
 * plan de DEV-222) va a cambiarlo a `sandboxAdapter` cuando no haya daemon.
 *
 * Se mantiene aparte de la fachada `src/api.ts` para que cambiar de adaptador no
 * obligue a tocar los 30 exports con nombre que consume `App.tsx`.
 */
let active: GripmApi = httpAdapter;

export function getActiveApi(): GripmApi {
  return active;
}

export function setActiveApi(api: GripmApi): void {
  active = api;
}