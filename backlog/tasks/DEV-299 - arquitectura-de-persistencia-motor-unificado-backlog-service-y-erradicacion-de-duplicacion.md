---
id: DEV-299
title: "Arquitectura de Persistencia: Motor Unificado de Backlog (BacklogService) y Erradicación de Duplicación"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-16'
labels:
  - "architecture"
  - "backend"
  - "mcp"
  - "cli"
  - "storage"
  - "state-machine"
dependencies: []
priority: urgent
type: architecture
estimate: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creación de una capa de servicio unificada y canónica (`server/services/backlogService.ts`) que centralice el 100% de la lógica de lectura, mutación, validación de State Machine, Gatekeeper de certificación, filtrado de tareas borradas (`isDeleted`), persistencia atómica y reconciliación de metadatos, erradicando la triplicación divergente actual entre `server/services/storage.ts`, `scripts/mcp-server.ts` y `scripts/gripm-cli.ts`.

### Diagnóstico de la Causa Raíz:

Actualmente, el producto mantiene tres implementaciones desconectadas para operar sobre las tareas:
1. **`server/services/storage.ts`:** Usado por los endpoints HTTP del cockpit web.
2. **`scripts/mcp-server.ts`:** Usado por agentes LLM (Cursor, Claude Code, Antigravity) vía protocolo stdio.
3. **`scripts/gripm-cli.ts`:** Usado por scripts y terminal.

Esta fragmentación es la causa raíz de regresiones sistemáticas en cada release:
- **Bypass del Gatekeeper:** `gripm_update_task` valida criterios de aceptación antes de pasar a `ready`/`done`, pero `gripm_bulk_update_tasks` y `gripm-cli.ts --update-status` permiten cambiar estados sin validar ACs ni emitir auditoría `SEC-09`.
- **Divergencia de State Machine:** Cuando `DEV-293` eliminó la auto-promoción ilegítima a `ready` en `verify-backlog-sync.js`, la función `gripm_sync_backlog` en `mcp-server.ts:1533-1538` quedó desincronizada y siguió mutando tareas de `doing` a `ready`.
- **Efectos secundarios en lecturas `GET`:** `readProjectBacklog()` en `storage.ts:311-325` muta `backlog/sprints.json` y cierra sprints automáticamente al consultar `GET /api/data`, violando la soberanía del PO (`AGENTS.md` §2) y disparando bucles SSE.
- **Fuga de tareas en papelera:** `mcp-server.ts:394-445`, `gripm-cli.ts:79-194` y `api.ts:820` no filtran `!task.isDeleted`, exponiendo ítems descartados a agentes y ensuciando estadísticas.
- **Rutas de escritura no atómicas:** A pesar de `DEV-291`, 8 llamadas en `registry.ts`, `api.ts`, `gripm-cli.ts` y `updateChecker.js` siguen usando `fs.writeFileSync` truncante.

### Solución Arquitectónica Profunda:

Diseñar e implementar `server/services/backlogService.ts` como la única interfaz de dominio del sistema:
- **Operaciones Atómicas Centralizadas:** `getTask(projectId, taskId)`, `listTasks(projectId, filters)`, `createTask(projectId, data)`, `updateTask(projectId, taskId, updates, options)`, `bulkUpdateTasks(projectId, patches, options)`, `deleteTask(projectId, taskId, options)`, `syncBacklog(projectId, options)`.
- **Gobernanza Unificada:**
  - El Gatekeeper de certificación de ACs se ejecuta obligatoriamente en `updateTask` y `bulkUpdateTasks` independientemente de si la llamada proviene de HTTP, MCP o CLI.
  - El filtro `!task.isDeleted` es estricto por defecto en todas las consultas y exportaciones, salvo solicitud explícita (`includeDeleted: true`).
  - Cero escrituras en operaciones de solo lectura (`getTask`, `listTasks`, `readProjectBacklog`).
  - El 100% de las escrituras se realizan mediante `atomicWriteFileSync` de `server/services/atomicWrite.ts`.
  - Reemplazo y delegación de `storage.ts`, `mcp-server.ts` y `gripm-cli.ts` hacia `backlogService`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se implementa `server/services/backlogService.ts` como módulo canónico de dominio que encapsula lectura, escritura atómica, validaciones y reconciliación de tareas y releases
- [x] #2 `server/services/storage.ts`, `scripts/mcp-server.ts` y `scripts/gripm-cli.ts` delegan su lógica de dominio en `backlogService`, eliminando código duplicado
- [x] #3 `gripm_bulk_update_tasks` y `gripm-cli.ts --update-status` aplican estrictamente la validación del Gatekeeper (bloqueo a `ready`/`done` con ACs pendientes sin `force: true`) idéntica a `gripm_update_task`
- [x] #4 `gripm_sync_backlog` en MCP deja de auto-promocionar tareas a `ready`, limitándose a emitir advertencias de calidad y escribiendo `BACKLOG.md` únicamente cuando hay cambios reales o `autoFix: true`
- [x] #5 `readProjectBacklog` y las consultas de lectura no ejecutan ninguna mutación física en disco ni auto-cierre de sprints
- [x] #6 Las tareas marcadas con `isDeleted: true` quedan excluidas por defecto de `gripm_list_tasks`, `gripm_get_stats`, listados CLI y exportaciones de `BACKLOG.md`
- [x] #7 Todas las escrituras residuales identificadas (`registry.ts:212`, `api.ts:787, 1008, 1178, 1286`, `gripm-cli.ts:325, 460, 478`) migran a `atomicWriteFileSync`
- [x] #8 Una suite de pruebas de integración verifica paridad 1:1 de comportamiento entre llamadas API REST, MCP y CLI
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Diseñar el contrato tipado de `BacklogService` en `server/services/backlogService.ts`.
2. Migrar la lógica de validación de State Machine y Gatekeeper de `mcp-server.ts` a `backlogService`.
3. Refactorizar `storage.ts` para consumir `backlogService` eliminando efectos secundarios de disco en lecturas.
4. Refactorizar `mcp-server.ts` y `gripm-cli.ts` para invocar `backlogService`.
5. Ejecutar auditoría de escrituras con grep asegurando 0 llamadas directas a `fs.writeFileSync`.
6. Añadir tests de paridad en `scripts/test-backlog-service.js`.
<!-- SECTION:PLAN:END -->
