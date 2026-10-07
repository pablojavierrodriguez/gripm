---
id: DEV-194
title: "Corregir el orden de hooks al abrir ItemModal"
status: ready
created_date: '2026-10-06'
updated_date: '2026-10-07'
labels:
  - "bug"
  - "ui"
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
En el smoke test de Gripm como producto, al crear una tarea el tablero muestra el error fatal `Rendered more hooks than during the previous render.`. `ItemModal` retorna cuando está cerrado antes de ejecutar `useFocusTrap`, pero ejecuta ese hook cuando se abre; React recibe un número distinto de hooks entre renders del mismo componente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `ItemModal` ejecuta el mismo conjunto de hooks y en el mismo orden tanto cerrado como abierto
- [x] #2 Abrir el modal de creación, guardar una tarea y volver al tablero no produce el error de hooks
- [x] #3 `npx tsc --noEmit` y `npm run build` pasan
- [x] #4 La suite incluye una regresión que verifica que `useFocusTrap` se invoca antes del retorno por modal cerrado
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Se movió `useFocusTrap` antes del retorno temprano de `ItemModal`.
- Smoke test en navegador: abrir nueva tarea, guardarla y verla persistida en `backlog/tasks/`; consola sin errores.
- `npm test` ejecutó correctamente `focus-trap`, pero la suite completa falla en el paso `dist`: `verify-dist.js` espera que el `SKILL.md` instalado esté en español, mientras el archivo local fue generado en inglés durante la inicialización del proyecto.
<!-- SECTION:NOTES:END -->
