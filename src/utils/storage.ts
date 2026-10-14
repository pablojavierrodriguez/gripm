/**
 * src/utils/storage.ts
 * Persistencia canónica en localStorage con prefijo gripm_*
 */

export const STORAGE_KEYS = {
  THEME: 'gripm_theme',
  ACTIVE_TAB: 'gripm_active_tab',
  ACTIVE_PROJECT_ID: 'gripm_active_project_id',
  KANBAN_SHOW_IDEAS: 'gripm_kanban_show_ideas',
  KANBAN_SHOW_DONE_HISTORY: 'gripm_kanban_show_done_history',
  KANBAN_SPRINT: 'gripm_kanban_sprint',
  BACKLOG_VISIBLE_COLS: 'gripm_backlog_visible_cols',
  SPRINTVIEW_SHOW_COMPLETED: 'gripm_sprintview_show_completed',
  LANGUAGE: 'gripm_language',
  /** DEV-222: dataset mutado de la sandbox web. */
  SANDBOX_BOARD: 'gripm_sandbox_board',
  /** DEV-222: configuración guardada desde la vista Settings en modo sandbox. */
  SANDBOX_CONFIG: 'gripm_sandbox_config',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Obtiene un valor de localStorage bajo la clave canónica.
 */
export function getStoredItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Guarda un valor exclusivamente bajo la clave canónica.
 */
export function setStoredItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/**
 * Elimina la clave canónica de localStorage.
 */
export function removeStoredItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * DEV-222: lee y deserializa un objeto JSON desde localStorage.
 *
 * Devuelve `null` ante ausencia, JSON inválido o cualquier excepción: un valor
 * corrupto en la caché no puede romper el arranque de la app, tiene que caerse
 * al dataset semilla.
 */
export function getStoredJSON<T>(key: string): T | null {
  const raw = getStoredItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * DEV-222: serializa y guarda un objeto. Silencioso ante cuota excedida o
 * localStorage bloqueado (modo privado): perder la persistencia de la demo es
 * aceptable, romper la interacción no.
 */
export function setStoredJSON(key: string, value: unknown): void {
  try {
    setStoredItem(key, JSON.stringify(value));
  } catch {}
}

