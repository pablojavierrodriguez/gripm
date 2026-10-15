---
id: DEV-273
title: "Editor de estructura de columnas Kanban horizontal e intuitivo en Settings"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "settings"
  - "kanban"
dependencies: []
priority: medium
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `SettingsView.tsx` (sección *Kanban Board > Column Structure & Status Mapping*), las columnas del tablero se configuran dentro de una lista vertical apilada (`space-y-4`).

Esta disposición contradice el modelo mental del usuario: un tablero Kanban se visualiza de izquierda a derecha en columnas horizontales. Actualmente, los botones de reordenamiento tienen flechas hacia arriba y hacia abajo (`ArrowUp` y `ArrowDown`), mientras que sus textos de ayuda indican textualmente `moveColLeft` ("Mover a la izquierda") y `moveColRight` ("Mover a la derecha"). Además, la lista vertical consume una cantidad excesiva de scroll.

### Objetivos:
1. Reestructurar la sección de mapeo de columnas para que se presente como un **mini-tablero horizontal** (`flex flex-row overflow-x-auto gap-4 pb-4`).
2. Cada columna en el editor se representa como una tarjeta esbelta con su título editable, límite WIP, dot de color y los chips de los estados asignados.
3. Los controles de reordenamiento utilizan flechas izquierda y derecha coherentes con la dirección espacial del tablero (`ArrowLeft` / `ArrowRight`).
4. Se preserva y optimiza la interacción de drag & drop para mover chips de estado entre columnas (DEV-053).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El editor de columnas en Settings presenta las columnas dispuestas una al lado de la otra en flujo horizontal
- [x] #2 Contenedor con scroll horizontal limpio sin desbordar el modal ni la página de configuración
- [x] #3 Los botones de reordenar columnas utilizan iconos horizontales de izquierda y derecha alineados con sus tooltips
- [x] #4 Se mantiene la edición de títulos, límites WIP y la transferencia de chips de estado entre columnas
- [x] #5 La interfaz escala correctamente tanto en modo de columnas Ampliada como Simplificada
- [x] #6 `npm test` y validación de guardado de configuración en verde
<!-- AC:END -->

## Implementation Notes

- Se transformó el contenedor de columnas en `SettingsView.tsx` a un mini-tablero horizontal con clase `flex flex-row overflow-x-auto gap-4 pb-4 items-stretch scrollbar-thin`.
- Cada columna se representa con una tarjeta estructurada (`w-72 sm:w-80 shrink-0 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border shadow-xs flex flex-col justify-between gap-3.5`).
- Los botones de reordenamiento ahora utilizan `ArrowLeft` y `ArrowRight` acordes a sus tooltips espaciales (`moveColLeft` / `moveColRight`).
- Preservada la edición de títulos, límites WIP, transferencias drag & drop de chips de estados entre columnas y persistencia de configuración.

