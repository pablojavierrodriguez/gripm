/**
 * DEV-256: catálogo canónico de columnas opcionales de SprintView y normalización
 * del estado de visibilidad persistido.
 *
 * La columna jerárquica se llama `parent` y no `epic` porque el contenedor puede
 * ser una épica o una iniciativa (relación `parentId`, no exclusivamente `type: epic`).
 * El id legacy `epic` se acepta como alias para no perder la visibilidad de la columna
 * en usuarios con estado persistido previo al rename.
 */

export const ALL_OPTIONAL_COLS = [
  'tipo',
  'estado',
  'modulo',
  'release',
  'sprint',
  'acProgress',
  'assignees',
  'labels',
  'parent',
  'estimate',
] as const;

export type OptionalCol = (typeof ALL_OPTIONAL_COLS)[number];

export const DEFAULT_COLS: OptionalCol[] = ['tipo', 'estado', 'modulo', 'release', 'sprint', 'estimate'];

/** Columnas núcleo que nunca pueden quedar ocultas por un estado persistido antiguo (DEV-085). */
const CORE_COLS: OptionalCol[] = ['tipo', 'estado', 'modulo', 'release'];

export const LEGACY_COL_ALIASES: Record<string, OptionalCol> = {
  epic: 'parent',
};

/**
 * Convierte un payload persistido (posiblemente de una versión anterior del catálogo)
 * en un conjunto de columnas válidas, aplicando aliases legacy y garantizando las
 * columnas núcleo. Los ids desconocidos se descartan en silencio.
 */
export const normalizeVisibleCols = (raw: readonly string[]): Set<OptionalCol> => {
  const set = new Set<OptionalCol>();
  for (const id of raw) {
    const resolved = LEGACY_COL_ALIASES[id] ?? (id as OptionalCol);
    if ((ALL_OPTIONAL_COLS as readonly string[]).includes(resolved)) set.add(resolved);
  }
  for (const core of CORE_COLS) set.add(core);
  return set;
};