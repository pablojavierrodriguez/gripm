---
id: DEV-201
title: "Corregir edición inmediata y visibilidad de relaciones en items"
status: ready
created_date: '2026-10-07'
updated_date: '2026-10-07'
labels:
  - "bug"
  - "ui"
  - "api"
priority: high
type: bug
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al crear una tarea en un proyecto Backlog.md, el API responde con un ID temporal aunque la tarea se persiste usando su código canónico. Al abrir y editar inmediatamente la tarea, la UI envía un PUT con el ID temporal y recibe 404. Además, el endpoint de creación no persiste parentId, blocks, blockedBy ni relatedTo; al reabrir el modal esas relaciones no aparecen. Alinear la identidad de la respuesta con el formato persistido, conservar las relaciones al crear y hacer que las relaciones guardadas se reconozcan claramente al editar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear una tarea Markdown devuelve la identidad canónica que acepta el endpoint de edición y puede editarse inmediatamente sin 404
- [x] #2 El endpoint de creación persiste parentId, blocks, blockedBy y relatedTo en el archivo y los devuelve en la respuesta
- [x] #3 Al reabrir una tarea con relaciones, el modal las muestra expandidas con suficiente contexto para identificar cada tarea relacionada
- [x] #4 El flujo de regresión automatizado cubre creación, lectura, edición y persistencia de relaciones
- [x] #5 Pasan TypeScript, pruebas relevantes, suite completa, build y sincronización del backlog
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Para almacenamiento Markdown, el POST ahora responde con el código canónico como `id`, igual que las lecturas posteriores; el PUT de edición puede encontrar inmediatamente la tarea recién creada.
- El POST persiste `parentId`, `blocks`, `blockedBy` y `relatedTo` y los devuelve en el objeto creado.
- El encabezado del acordeón de relaciones muestra etiquetas con código y título relacionado incluso cuando está contraído; reabrir una tarea con relaciones expande el panel y muestra el contexto en sus chips.
- Pruebas: `node --experimental-strip-types scripts/verify-optimistic-locking.js`, `npm run test:ui`, `npx tsc --noEmit`, `npm test` (16 pasos), `npm run test:linux` (16 pasos; `SUITE_EXIT=0`), `npm run build`, `npm run publish:check`, `npm run backlog:check` y `git diff --check`.
<!-- SECTION:NOTES:END -->
