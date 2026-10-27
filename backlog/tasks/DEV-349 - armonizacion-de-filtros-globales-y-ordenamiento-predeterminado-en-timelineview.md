---
id: DEV-349
title: "Armonizacion de filtros globales y ordenamiento predeterminado en TimelineView"
status: ready
created_date: '2026-10-27'
updated_date: '2026-10-27'
labels:
  - "roadmap"
  - "filters"
  - "ux"
  - "sorting"
dependencies:
  - "DEV-348"
priority: high
type: feature
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente `TimelineView` ignora los filtros globales aplicados en el encabezado (`FilterBar`), consumiendo indiscriminadamente `dataset = allItems || items`, lo que provoca que se listen 200+ tareas (incluyendo completadas, canceladas o ideas que el usuario tiene ocultas en el tablero principal).

Ademas, el orden de aparicion en el timeline carece de criterio unificado:
1. **Filtros por Defecto:** Timeline debe respetar los items filtrados por el encabezado general (`items`), manteniendo la sincronia con el Board y Backlog. Tareas en `done` y `cancelled` deben permanecer ocultas por defecto a menos que el usuario active explicitamente los filtros de visualizacion correspondientes.
2. **Items Padre / Contexto:** Si una epica o contenedor no coincide con el filtro pero sus hijos si, el padre se renderiza atenuado o los hijos se agrupan respetando la coherencia sin reinyectar tareas no deseadas.
3. **Orden Predeterminado:** Adoptar por defecto el orden canónico configurado en el proyecto (orden natural del backlog / board: `order` o jerarquia), permitiendo al usuario alternar entre orden natural y orden cronologico por fecha de inicio.
4. **Unificacion de Busqueda:** Eliminar el campo de busqueda redundante local o sincronizarlo bidireccionalmente con la barra superior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 La vista de Timeline respeta de forma predeterminada los filtros activos en `FilterBar` (estados activos, exclusion de done/cancelled/ideas salvo seleccion expresa)
- [x] #2 El orden predeterminado en la lista y filas coincide con el orden establecido en Backlog / Board
- [x] #3 El contador de items visibles en el encabezado de Roadmap refleja la cantidad de items filtrados activos
- [x] #4 Se incluye selector o toggle para alternar entre orden del tablero y orden cronológico por fecha de inicio
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Recibir `filters` desde `App.tsx` en `TimelineViewProps` y utilizar `visibleItems` (`items`) en lugar de saltar a `allItems`.
2. Excluir por defecto tareas en `done` a menos que estén explícitamente solicitadas en `filters.statuses` o `filters.includePreviousDone`.
3. Soportar padres de contexto (`isContextParent: true`): si una tarea hija coincide con los filtros activos pero su épica padre no, la épica se renderiza atenuada como contenedor sin reinyectar tareas no deseadas.
4. Integrar selector de ordenamiento `sortMode` ('natural' vs 'chronological') en `TimelineToolbar` con persistencia en `localStorage`.
5. Eliminar el input redundante de búsqueda local en `TimelineToolbar` para unificar la búsqueda en `FilterBar`.
<!-- SECTION:PLAN:END -->
