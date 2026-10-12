---
id: DEV-256
title: "Renombrar la columna de épica a Parent en SprintView (contenedor: épica o iniciativa)"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ux"
  - "i18n"
  - "sprint-view"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La columna opcional de SprintView que muestra la relación jerárquica de un ítem se rotula "Épica" / "Epic", pero el dato que renderiza no es exclusivamente una épica: la relación `parentId` acepta cualquier ítem contenedor y en la práctica incluye también iniciativas (y features contenedores, según `candidateParents` en `ItemModal.tsx`). El rótulo miente sobre el dato que muestra.

Además el identificador interno de la columna es `'epic'`, lo que arrastra el mismo sesgo semántico al código y complica futuras columnas jerárquicas.

Este trabajo cierra el ítem que quedó pendiente en la sesión Antigravity `a9edf155-8a09-4a3b-b32c-0969c36ba467` (step 160), donde elmodelo ya mapeó `ALL_OPTIONAL_COLS`, `visibleCols.has('epic')` y `sprint.colEpic`, pero la sesión se cortó antes de aplicar el cambio.

Alcance:
1. Clave de traducción `sprint.colEpic` → `sprint.colParent` con valores "Padre" (es) y "Parent" (en), eliminando la clave obsoleta.
2. Identificador de columna `'epic'` → `'parent'` en `ALL_OPTIONAL_COLS`, con **migración defensiva** del estado persistido en `BACKLOG_VISIBLE_COLS`: un usuario que tenga `'epic'` guardado debe conservar la columna visible, no perderla silenciosamente. El catálogo, los aliases legacy y la normalización se extraen a `src/utils/sprintVisibleCols.ts` para ser verificables de forma headless.
3. Encabezado `<th>`, ítem del popover de columnas y celda de datos alineados al nuevo identificador y etiqueta.
4. El texto de la celda ya no puede afirmar "Épica": se apoya en `cleanParentTitle()` (DEV-253), que strippea prefijos tipo `Épica:` / `Iniciativa:` del título del padre.

Fuera de alcance (se mantienen sin cambio): el agrupamiento `GroupBy = 'epic'` / `sprint.groupByEpic` y el string hardcodeado `'Sin Épica'`, que pertenecen al agrupamiento por jerarquía y no a la columna.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `src/locales/es.json` y `src/locales/en.json` exponen `sprint.colParent` con valores "Padre" y "Parent"; la clave `sprint.colEpic` deja de existir en ambos catálogos
- [x] #2 `ALL_OPTIONAL_COLS` en `src/utils/sprintVisibleCols.ts` declara `'parent'` en lugar de `'epic'` y no queda ninguna referencia al identificador `'epic'` en las columnas opcionales de `SprintView.tsx`
- [x] #3 El estado persistido `BACKLOG_VISIBLE_COLS` que contenga `'epic'` se migra a `'parent'` vía `normalizeVisibleCols()`, conservando la visibilidad de la columna en usuarios existentes y reinyectando las columnas núcleo (migración defensiva al estilo DEV-085)
- [x] #4 El encabezado `<th>`, la entrada del popover de columnas y la celda de datos usan `visibleCols.has('parent')` y `t('sprint.colParent')`
- [x] #5 El texto renderizado en la celda no afirma "Épica": se deriva de `cleanParentTitle()` sobre el título del padre resuelto
- [x] #6 `npx tsc --noEmit` reporta 0 errores
- [x] #7 Pirámide de verificación en verde: `npm test` (16 pasos, código 0), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run build` y `node scripts/verify-changes.js --all` (411 archivos)
<!-- SECTION:DESCRIPTION:END -->