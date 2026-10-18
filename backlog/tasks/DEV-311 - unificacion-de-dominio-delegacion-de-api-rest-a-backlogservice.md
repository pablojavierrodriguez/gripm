---
id: DEV-311
title: "Unificación de Dominio: Delegación Completa de Endpoints REST en api.ts hacia BacklogService"
status: ready
claimed_by: "antigravity:worker_dev311_1"
created_date: '2026-10-17'
updated_date: '2026-10-17'
labels:
  - "architecture"
  - "refactor"
  - "backend"
  - "backlogservice"
  - "api"
dependencies: []
priority: high
type: tech_debt
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminar la bifurcación de lógica de negocio entre `server/routes/api.ts` y `server/services/backlogService.ts`, haciendo que el router REST delegue el 100% de las mutaciones de tareas en `BacklogService` (`createTask`, `updateTask`, `bulkUpdateTasks`, `deleteTask`).

### Diagnóstico de la Causa Raíz:

1. **Reimplementación de Mutaciones en el Router:**
   Actualmente, `server/routes/api.ts` (1,457 líneas) manipula y muta directamente las entidades en memoria en `POST /api/items` (líneas 181-264), `POST /api/items/bulk` (líneas 267-352) y `PUT /api/items/:id` (líneas 355-452), llamando luego a la función de bajo nivel `saveBacklogMdItem` (`BacklogService.saveTask`) en vez de delegar en los métodos canónicos de dominio de `BacklogService`.
   
2. **Divergencias entre MCP y HTTP:**
   - La asignación de IDs correlativos en `api.ts` usa una expresión regular distinta (`^${cleanPrefix}[-_]+(\\d+)`) a la de `BacklogService.createTask` (`^${cleanPrefix}-(\\d+)`).
   - Las validaciones del Gatekeeper (`validateGatekeeperTransition`) corren en el MCP pero se omiten en el controlador REST de `PUT /api/items/:id`.
   - Dentro de `BacklogService.updateTask`, el parseo y extracción de campos (`effectiveStatus`, `effectiveTitle`, etc.) se encuentra duplicado entre la rama de almacenamiento Markdown y la rama JSON.

### Solución Técnica:

- Hacer que `POST /api/items` invoque directamente `BacklogService.createTask(project, body)`.
- Hacer que `PUT /api/items/:id` invoque `BacklogService.updateTask(project, id, body, { force: body.force, expectedMtime: body.expectedMtime })`.
- Hacer que `POST /api/items/bulk` invoque `BacklogService.bulkUpdateTasks(project, { taskIds, filterPrefix, filterStatus }, updates)`.
- Unificar la extracción y normalización de campos dentro de `BacklogService.updateTask` antes de bifurcar el almacenamiento en disco (`markdown` vs `json`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `POST /api/items` delega la creación en `BacklogService.createTask` garantizando paridad de validación con MCP
- [x] #2 `PUT /api/items/:id` delega la actualización en `BacklogService.updateTask` preservando la detección de conflictos `409` por `expectedMtime`
- [x] #3 `POST /api/items/bulk` delega la actualización masiva en `BacklogService.bulkUpdateTasks`
- [x] #4 La normalización de updates en `BacklogService.updateTask` se realiza en una única función pura compartida entre motores Markdown y JSON
- [x] #5 La suite completa de tests de integración (`npm test`) y seguridad de API pasa con código de salida 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Factorizar la normalización del payload en `BacklogService.updateTask`.
2. Conectar `api.ts` (`POST /api/items`, `PUT /api/items/:id`, `POST /api/items/bulk`) a los métodos de `BacklogService`.
3. Validar que la respuesta mantenga el contrato JSON esperado por la UI y el sandbox.
4. Ejecutar `scripts/test-backlog-service.js` y `scripts/test-api-security.js`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `normalizeTaskUpdates`: helper puro exportado en `server/services/backlogService.ts` que unifica la extracción y validación de campos para motores Markdown y JSON.
- `ConflictError`: clase de error tipada exportada en `server/services/backlogService.ts` lanzada cuando `currentMtime > options.expectedMtime`, manejada con HTTP 409 Conflict en `PUT /api/items/:id`.
- Delegación de endpoints mutantes en `server/routes/api.ts` (`POST /api/items`, `PUT /api/items/:id`, `POST /api/items/bulk`, `PATCH /api/items/:id/restore`, `DELETE /api/items/:id`).
- Delegación de `export-monolithic-md` en `BacklogService.exportBacklogMd`.
- Reducción de `server/routes/api.ts` de 1,476 líneas a 1,238 líneas.
<!-- SECTION:NOTES:END -->
