---
id: DEV-236
title: "Selector de Proyectos Queda por Detrás de la Barra de Filtros por Conflicto de Stacking Context"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "bug"
  - "ui"
  - "stacking-context"
  - "header"
  - "filterbar"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al abrir el selector desplegable de proyectos en el encabezado (`Header.tsx`), la parte superior del menú quedaba visualmente oculta **por detrás de la barra de búsqueda y filtros** (`FilterBar.tsx`), mostrando únicamente la sección inferior sobre las columnas de Kanban.

### Causa Raíz

Conflicto de niveles de apilamiento (*stacking context tie*):
- Tanto `<header>` (`Header.tsx:122`) como el contenedor de `<FilterBar>` (`FilterBar.tsx:162`) declaraban la misma clase de z-index: `z-30`.
- Ambos elementos establecen contextos de apilamiento posicionados (`sticky` y `relative`).
- En el árbol DOM (`App.tsx`), `FilterBar` se renderiza inmediatamente después de `Header`.
- Según la especificación CSS 2.1 (Apéndice E), cuando dos contextos de apilamiento hermanos tienen el mismo valor de `z-index`, el orden en el documento determina la prioridad de pintado. `FilterBar` se pintaba encima de `Header` y de todos sus descendientes (incluyendo el menú desplegable del selector con `z-50`).

### Solución

Ajustar la jerarquía canónica de z-index del sistema:
- `FilterBar.tsx`: Reducir de `z-30` a `z-10`. De este modo, `FilterBar` conserva prioridad sobre el contenido del tablero (tarjetas y columnas en `z-auto`), pero queda estrictamente por debajo de `Header` (`z-30`).
- El menú del selector de proyectos (`z-50` dentro de `Header`) se proyecta limpiamente por encima de la barra de filtros.
- Al hacer scroll, `FilterBar` se desliza correctamente por debajo del encabezado adhesivo (`Header`).
- Incorporar prueba anti-regresión en `scripts/test-ui-logic.js` para certificar la jerarquía `headerZ > filterBarZ`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 FilterBar define z-index inferior al de Header (z-10 vs z-30) para evitar colisión de contextos de apilamiento
- [x] #2 El menú desplegable del selector de proyectos se renderiza completamente por encima de FilterBar sin oclusión visual
- [x] #3 FilterBar y su popover de filtros avanzados mantienen prioridad sobre las columnas y tarjetas del tablero
- [x] #4 Prueba estática anti-regresión en test-ui-logic.js que valida invariante headerZ > filterBarZ
- [x] #5 Pirámide de verificación en verde (tsc --noEmit, npm test, backlog:sync, backlog:check)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Jerarquía de apilamiento global: Tablero/Tarjetas (z-0 / auto) < FilterBar (z-10) < Settings sticky (z-20) < Header (z-30) < BottomNav (z-40) < Modales/Drawers (z-50) < Portals (z-[100]).
<!-- SECTION:NOTES:END -->
