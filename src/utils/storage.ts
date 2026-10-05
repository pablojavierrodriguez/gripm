/**
 * src/utils/storage.ts
 * DEV-168: Persistencia canónica en localStorage con prefijo gripm_* y auto-migración retrocompatible
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

const LEGACY_KEY_MAP: Record<string, string[]> = {
  [STORAGE_KEYS.THEME]: ['devboard-theme', 'devboard_theme'],
  [STORAGE_KEYS.ACTIVE_TAB]: ['devboard_active_tab'],
  [STORAGE_KEYS.ACTIVE_PROJECT_ID]: ['devboard_active_project_id'],
  [STORAGE_KEYS.KANBAN_SHOW_IDEAS]: ['devboard_kanban_show_ideas'],
  [STORAGE_KEYS.KANBAN_SHOW_DONE_HISTORY]: ['devboard_kanban_show_done_history'],
  [STORAGE_KEYS.KANBAN_SPRINT]: ['devboard_kanban_sprint'],
  [STORAGE_KEYS.BACKLOG_VISIBLE_COLS]: ['devboard_backlog_visible_cols'],
  [STORAGE_KEYS.SPRINTVIEW_SHOW_COMPLETED]: ['devboard_sprintview_show_completed'],
  [STORAGE_KEYS.LANGUAGE]: ['devboard_language'],
};

/**
 * Obtiene un valor de localStorage bajo la clave canónica.
 * Si no existe, busca en las claves heredadas (devboard_*), realiza auto-migración y retorna el valor.
 */
export function getStoredItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;

    const legacyKeys = LEGACY_KEY_MAP[key] || [];
    for (const legacyKey of legacyKeys) {
      const legacyVal = localStorage.getItem(legacyKey);
      if (legacyVal !== null) {
        localStorage.setItem(key, legacyVal);
        return legacyVal;
      }
    }
    return null;
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
 * Elimina la clave canónica y cualquier residuo legado de devboard.
 */
export function removeStoredItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
    const legacyKeys = LEGACY_KEY_MAP[key] || [];
    for (const legacyKey of legacyKeys) {
      localStorage.removeItem(legacyKey);
    }
  } catch {}
}
