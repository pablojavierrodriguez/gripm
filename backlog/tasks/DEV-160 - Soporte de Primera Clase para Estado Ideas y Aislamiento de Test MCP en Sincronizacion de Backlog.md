---
id: DEV-160
title: "Soporte de Primera Clase para Estado Ideas y Aislamiento de Test MCP en Sincronizacion de Backlog"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04'
labels:
  - "mcp"
  - "parser"
  - "bug"
  - "qa"
dependencies: []
priority: urgent
type: bug
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Esta tarea aborda dos anomalías críticas reportadas en el cierre de Sprint 8:

1. **Error al marcar ítems como "ideas":**
   - En `scripts/backlogMdParser.ts`, la función `formatStatusForMd` degradaba silenciosamente `ideas` a `draft`, violando la regla de AGENTS.md §6.6 (*"Estado ideas de primera clase: NUNCA normalizar o degradar ideas a draft en parsers o vistas"*).
   - En `scripts/mcp-server.ts`, los esquemas JSON-RPC de las herramientas de mutación (`gripm_update_task`, `devboard_update_task`, `gripm_create_task`, `gripm_bulk_update_tasks`) omitían `'ideas'` de su lista de valores permitidos (`enum`), provocando errores de validación de esquema en clientes y agentes MCP.
   - En `src/components/SprintView.tsx`, el selector de estado en la tabla carecía de la opción `<option value="ideas">`.

2. **Mutación del árbol de trabajo en `npm test` (Hallazgo §13.5 del Auditor):**
   - El script `scripts/verify-mcp-binary.js` ejecutaba la tool mutante `gripm_sync_backlog` directamente sobre el repositorio activo.
   - Dicha herramienta inyectaba `targetSprint` en `milestone`, violando la ortogonalidad y generando un `BACKLOG.md` desfasado respecto al comando canónico `npm run backlog:sync`.
   - Se debe desacoplar sprint de milestone y garantizar que `npm test` deje el árbol de trabajo completamente limpio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Corregir formatStatusForMd en scripts/backlogMdParser.ts para preservar 'ideas' como estado canonico de primera clase
- [x] #2 Incorporar 'ideas' en los enums de esquema de mutacion de scripts/mcp-server.ts (update, create y bulk_update)
- [x] #3 Actualizar SprintView.tsx y KanbanBoard.tsx para soportar y seleccionar 'ideas' sin degradaciones visuales
- [x] #4 Eliminar la inyeccion de sprint en milestone en scripts/mcp-server.ts para alinear gripm_sync_backlog con el CLI export
- [x] #5 Preservar el estado limpio de BACKLOG.md en scripts/verify-mcp-binary.js para que npm test no ensucie el arbol de trabajo
- [x] #6 Recompilar binarios con build-binaries.js y validar suite completa (tsc, npm test, backlog:check) en verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modificar `scripts/backlogMdParser.ts` para que `formatStatusForMd('ideas')` retorne `'ideas'`.
2. Actualizar los esquemas de herramientas en `scripts/mcp-server.ts` agregando `'ideas'` a todos los enums de status.
3. Desacoplar `milestone` de `targetSprint` en `scripts/mcp-server.ts`.
4. Añadir `ideas` en el dropdown de `SprintView.tsx` y ajustar estilos de badge.
5. Respaldar y restaurar o aislar `BACKLOG.md` en `scripts/verify-mcp-binary.js` para asegurar zero-diff tras `npm test`.
6. Recompilar ejecutables en `bin/` y ejecutar la suite completa de verificación.
<!-- SECTION:PLAN:END -->

## Technical Notes

<!-- SECTION:NOTES:BEGIN -->
- Cumple con AGENTS.md §6.5 (Ortogonalidad estricta) y §6.6 (Estado ideas de primera clase).
<!-- SECTION:NOTES:END -->
