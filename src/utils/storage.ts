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

