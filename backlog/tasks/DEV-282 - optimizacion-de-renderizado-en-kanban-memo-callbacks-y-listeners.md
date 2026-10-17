---
id: DEV-282
title: "Optimización de renderizado en Kanban: callbacks estables, listener condicional y lookup O(1)"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-17 17:20'
labels:
  - "performance"
  - "kanban"
  - "react"
  - "ux"
dependencies: []
priority: high
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimización del rendimiento en tiempo de ejecución del tablero Kanban ([src/components/KanbanBoard.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/components/KanbanBoard.tsx) e [src/components/ItemCard.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/components/ItemCard.tsx)) para eliminar caídas de frames y lag de interacción cuando el backlog acumula más de 100-250 tareas.

### Problemas identificados:
1. **Invalidación de `React.memo` por callbacks anónimos:** En `KanbanBoard.tsx`, cada tarjeta recibe props con funciones anónimas inline (`onClick={() => onClickItem(item)}`, `onUpdateStatus={(id, s) => onUpdateStatus(id, s)}`). Esto invalida `React.memo(ItemCard)` y causa que las 278 tarjetas re-rendericen completamente ante cualquier cambio de filtro, tipeo en búsqueda o actualización de estado.
2. **Fuga y saturación de event listeners globales:** Cada tarjeta montada registra un listener permanente `document.addEventListener('mousedown', handleClickOutside)` en su `useEffect`, sin importar si su menú contextual está abierto o cerrado. Con más de 200 tarjetas, cada clic en el documento activa más de 200 handlers simultáneos.
3. **Búsqueda cuadrática $O(N^2)$ por render:** Dentro de `ItemCard`, la búsqueda de la tarea padre ejecuta `allItems.find(...)`, provocando decenas de miles de comparaciones redundantes en cada ciclo de render.
4. **Modales no condicionales en el árbol virtual:** Cada tarjeta instancia un `<ConfirmModal isOpen={showDeleteConfirm} ... />` de forma permanente, agregando hooks, estado y refs innecesarios por tarjeta.

### Solución propuesta:
- Estabilizar callbacks con `useCallback` en el contenedor Kanban o delegar acciones por ID.
- Activar el listener de `mousedown` en `ItemCard` exclusivamente cuando `menuOpen === true`.
- Pre-calcular un `Map<string, BacklogItem>` en el contenedor padre para resolución $O(1)$ de tareas padre.
- Condicionalizar el montaje de `ConfirmModal` (`{showDeleteConfirm && <ConfirmModal ... />}`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Los callbacks pasados a `ItemCard` (`onClick`, `onUpdateStatus`, `onDelete`) preservan referencias estables para que `React.memo` evite re-renders innecesarios
- [x] #2 El listener global `mousedown` de click-outside en `ItemCard` solo se registra en `document` cuando el menú contextual está activo (`menuOpen === true`)
- [x] #3 La búsqueda de la tarea padre (`parentItem`) se resuelve en $O(1)$ mediante una tabla hash/Map pre-indexada
- [x] #4 `ConfirmModal` en `ItemCard` se monta condicionalmente solo cuando la confirmación es solicitada
- [x] #5 La suite de pruebas y typechecking aprueban limpiamente (`npm test` y `npx tsc --noEmit`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Callbacks estabilizados con `useCallback` y referencias estables en `src/App.tsx` (`handleKanbanUpdateStatus`, `handleKanbanClickItem`, `handleKanbanQuickAddItem`) y `src/components/KanbanBoard.tsx` (`handleCardUpdateStatus`, `handleMoveWithinColumn`, `handleMoveItemWithinColumn` desacoplado de recreaciones de ítems mediante `useRef`).
- Listener global `mousedown` en `ItemCard.tsx` asegurado con salida temprana estricta cuando los menús no están abiertos (`!menuOpen && !statusMenuOpen && !sprintMenuOpen`).
- Búsqueda de tarea padre optimizada a O(1) mediante `parentLookupMap` memoizado en `KanbanBoard` e inyectado directamente como prop `parentItem` a `ItemCard`, evitando la propagación de `allItems` y la búsqueda cuadrática O(N^2).
- Montaje de `ConfirmModal` condicionalizado (`showDeleteConfirm && <ConfirmModal ... />`) reduciendo la instanciación innecesaria en el Virtual DOM.
- Pirámide de verificación aprobada: 0 errores de tipo en `npx tsc --noEmit`, 19 pasos en `npm test` exitosos incluyendo `verify-kanban-reorder.js`.
<!-- SECTION:NOTES:END -->
