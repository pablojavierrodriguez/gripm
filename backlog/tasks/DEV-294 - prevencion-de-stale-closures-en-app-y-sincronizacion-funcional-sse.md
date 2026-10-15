---
id: DEV-294
title: "Prevención de Stale Closures en App.tsx y Sincronización Funcional con SSE"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "frontend"
  - "react"
  - "concurrency"
  - "sse"
dependencies: []
priority: p2
type: bug
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corrección de condiciones de carrera y pérdida silenciosa de tareas en el cliente React (`src/App.tsx`) causadas por el uso de copias obsoletas en closures (`setBoardData({ ...boardData, items })`) en lugar de mutaciones funcionales ante la llegada concurrente de eventos SSE.

### Problemas identificados y reproducibles:

1. **Stale Closure en guardado de tareas:**
   En `src/App.tsx:848-856`:
   ```tsx
   const handleSaveItem = useCallback(async (itemData) => {
     if (!boardData) return;
     const updated = await updateItem(itemData.id, itemData);
     setBoardData({
       ...boardData, // ¡Referencia capturada al momento de invocar el handler!
       items: boardData.items.map(...)
     });
   }, [boardData]);
   ```
2. **Eliminación silenciosa de tareas creadas concurrentemente:**
   Si un usuario tiene el modal de edición abierto y en segundo plano un agente de IA o terminal crea una tarea nueva (`DEV-101`), el evento SSE actualiza `boardData` en la UI. Al hacer clic en "Guardar" en el modal, la promesa `updateItem()` se resuelve y ejecuta `setBoardData` utilizando la versión vieja capturada en el closure, **borrando inmediatamente la tarea recién llegada de la pantalla del usuario**.
3. Idéntico patrón defectuoso ocurre en:
   - `handleUpdateStatus` (`src/App.tsx:527`)
   - `handleUpdatePriority` (`src/App.tsx:578`)
   - `handleCreateProject` (`src/App.tsx:908`)

### Escenario de Reproducción:

1. Abrir la UI de Gripm en el navegador.
2. Abrir el modal de edición de una tarea existente.
3. Desde la terminal, crear una nueva tarea con `node scripts/gripm-cli.ts create --title "Tarea Concurrente"`.
4. Verificar que la tarjeta aparece en el Kanban vía SSE.
5. Guardar la tarea abierta en el modal en la UI.
6. En el estado actual, "Tarea Concurrente" desaparece del tablero.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Todas las invocaciones a `setBoardData` en `src/App.tsx` utilizan el patrón de actualización funcional (`setBoardData(prev => ...)`), garantizando que operan siempre sobre la versión más reciente del estado en memoria
- [ ] #2 Los eventos de actualización en vivo (`subscribeToBoardEvents`) no son sobrescritos ni descartados por operaciones de guardado pendientes o concurrentes
- [ ] #3 Si un ítem en edición es modificado externamente en disco mientras su modal está abierto, la UI advierte del cambio o actualiza `mtime` para prevenir conflictos 409 inesperados
- [ ] #4 La suite de pruebas de UI y Smoke Tests aprueban limpiamente (`npm run test:ui`)
<!-- AC:END -->

## Implementation Notes

- Archivo principal: [src/App.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/App.tsx) (líneas 520-585, 840-870, 900-915).
