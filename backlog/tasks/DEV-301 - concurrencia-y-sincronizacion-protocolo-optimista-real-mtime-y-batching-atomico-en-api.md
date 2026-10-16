---
id: DEV-301
title: "Concurrencia y Sincronización: Protocolo Optimista Real Mtime y Batching Atómico en API"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-16 05:05'
labels:
  - "concurrency"
  - "frontend"
  - "backend"
  - "sse"
  - "performance"
dependencies: []
priority: high
type: bug
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rediseño del protocolo de concurrencia optimista y sincronización en tiempo real entre el servidor y el cliente React: corrección del mecanismo de bloqueo por `mtime` en disco, eliminación de falsos positivos/negativos de colisión `409 Conflict`, y reemplazo de tormentas de peticiones HTTP N+1 por operaciones en lote atómicas (`bulkUpdateItems`).

### Diagnóstico de la Causa Raíz:

1. **Desactivación Silenciosa del Guard 409 (`App.tsx` vs `ItemModal.tsx`):**
   Al recibir eventos SSE `backlog_changed`, `App.tsx:337` actualiza `editingItem.mtime` al nuevo timestamp del disco para "evitar errores 409". Sin embargo, `ItemModal` no recarga sus 35 campos de formulario si el modal ya está abierto. Al pulsar "Guardar", envía el `mtime` nuevo pero con los datos viejos en pantalla, sobrescribiendo silenciosamente los cambios que un agente o usuario externo hizo en disco.
2. **Margen Ciego de 1.000 ms en el Backend:**
   En `server/routes/api.ts:278`, la verificación `if (existing.mtime > body.expectedMtime + 1000)` ignora deliberadamente colisiones concurrentes dentro de un segundo. Este hack se introdujo porque `api.ts:337` devolvía `updatedItem.mtime = Date.now()` (hora de CPU) en vez de `fs.statSync(targetFilePath).mtimeMs` (hora del sistema de archivos), provocando desfasajes artificiales.
3. **Tormenta N+1 y Corrupción de Orden en Bulk Actions:**
   Reordenar una tarea en `App.tsx:660-672` o mover tareas seleccionadas en `SprintView.tsx:680-721` ejecuta bucles con decenas de llamadas individuales `PUT /api/items/:id`. Además, como `onReorderItem` lee `boardData.items` desde un closure obsoleto en cada iteración del bucle, los órdenes se computan con datos viejos y corrompen la secuencia de las tareas anteriores.
4. **Bypass del Estado en Modo Sandbox:**
   Componentes como `KanbanBoard` y `SprintView` importan y llaman directamente a `updateItem()` desde `src/api.ts` sin notificar a `App.tsx`. En modo Sandbox (`gripm.vercel.app`), donde SSE es un no-op, la interfaz no se entera del cambio hasta que el usuario recarga la página.

### Solución Arquitectónica Profunda:

- **Protocolo Mtime Determinista:**
  - `saveBacklogMdItem` y `PUT /api/items/:id` leen y devuelven el valor exacto `Math.round(fs.statSync(filePath).mtimeMs)`.
  - La verificación de conflicto en `api.ts` se vuelve exacta (`existing.mtime > body.expectedMtime`), erradicando la ventana ciega de 1.000 ms.
  - En `App.tsx`, no se pisa `prevEditing.mtime` en segundo plano. Si el disco cambia mientras el modal está abierto, `ItemModal` muestra un banner contextual: *"Esta tarea fue modificada externamente en disco — [Comparar / Recargar]"*, preservando el bloqueo optimista 409 si el usuario decide guardar sobre una versión desfasada.
- **Batching Atómico Universal:**
  - Migrar todas las operaciones de reordenamiento (`handleReorderBacklogItem`), finalización de sprint (`handleCompleteSprint`) y acciones masivas en `SprintView` para que utilicen el endpoint ya existente `POST /api/items/bulk` en **una única transacción HTTP**, con un único `setBoardData` funcional y una única notificación SSE.
  - Asegurar que todas las mutaciones pasen por los handlers de `App.tsx` para sincronización inmediata en modo Sandbox y HTTP.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `PUT /api/items/:id` devuelve el `mtime` exacto del archivo en disco (`fs.statSync().mtimeMs`) y aplica validación estricta de conflicto sin márgenes arbitrarios de 1.000 ms
- [x] #2 `src/App.tsx` no sobrescribe silenciosamente `expectedMtime` cuando una tarea en edición cambia en disco; `ItemModal` advierte de la modificación externa permitiendo al usuario decidir recargar o resolver el conflicto
- [x] #3 `handleReorderBacklogItem`, `handleCompleteSprint` y todas las acciones masivas de `SprintView` ejecutan una única llamada `bulkUpdateItems` por operación, eliminando bucles N+1 de peticiones individuales
- [x] #4 Las mutaciones disparadas desde menús contextuales en `KanbanBoard` y `SprintView` actualizan el estado de `App.tsx`, garantizando consistencia inmediata en modo Sandbox y modo Local
- [x] #5 El cambio de proyecto activo en `App.tsx` espera a la confirmación de la API antes de cargar datos y mantiene una conexión SSE persistente sin destruirla innecesariamente
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Ajustar `server/routes/api.ts` para devolver `fs.statSync().mtimeMs` real y remover `+ 1000` en la verificación de 409.
2. Refactorizar `handleReorderBacklogItem` y los bulk handlers de `SprintView.tsx` para armar un payload de patches y llamar a `bulkUpdateItems`.
3. Ajustar `loadData` en `App.tsx` para no mutar `expectedMtime` a espaldas del formulario de `ItemModal`.
4. Conectar el banner de advertencia de cambio en disco en `ItemModal.tsx`.
5. Validar con prueba de stress y simulación de concurrencia en `npm run test:ui`.
<!-- SECTION:PLAN:END -->
