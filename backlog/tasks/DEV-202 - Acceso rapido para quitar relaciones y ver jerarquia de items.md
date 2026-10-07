---
id: DEV-202
title: "Acceso rápido para quitar relaciones y ver jerarquía de ítems"
status: done
created_date: '2026-10-07'
updated_date: '2026-10-07 23:29'
labels:
  - "ux"
  - "ui"
  - "backlog"
dependencies: []
priority: high
type: improvement
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Las relaciones guardadas se resumen en el modal, pero para quitarlas hay que expandir la sección y buscar el chip correspondiente. Además, la relación jerárquica parent/epic no se ve de forma consistente en las tarjetas del Kanban ni en la vista Backlog, que actualmente muestra solo el campo legacy `epic`. Hacer removibles las relaciones desde su resumen y presentar el padre resuelto por código y título en las vistas de trabajo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Cada relación existente en el resumen del modal se puede quitar con una acción directa y accesible, sin expandir la sección
- [x] #2 Las tarjetas del Kanban muestran código y título del ítem padre cuando `parentId` resuelve a un ítem del proyecto
- [x] #3 El Backlog muestra bajo el título la relación `parentId` resuelta, sin requerir habilitar una columna opcional
- [x] #4 Las relaciones no resueltas siguen mostrando el identificador almacenado sin fallar ni desaparecer
- [x] #5 Pasan las pruebas de regresión, UX, TypeScript, suite completa, build y sincronización del backlog
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- La jerarquía se muestra en la tarjeta Kanban y debajo del título del ítem en Backlog; las referencias no resueltas conservan y muestran su identificador.
- El resumen de relaciones permite quitar cada vínculo con un botón accesible de 44×44 px y persiste las listas vacías para eliminarlo realmente.
- Validado con `npm run test:ui`, `node --experimental-strip-types scripts/verify-optimistic-locking.js`, `npx tsc --noEmit`, `npm run test:linux` (incluye suite completa y auditoría UX), `npm run build`, `npm run publish:check`, `npm run backlog:check` y `git diff --check`; todos pasaron.
<!-- SECTION:NOTES:END -->
