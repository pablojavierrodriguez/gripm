---
id: DEV-282
title: "Optimización de renderizado en Kanban: callbacks estables, listener condicional y lookup O(1)"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
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
- [ ] #1 Los callbacks pasados a `ItemCard` (`onClick`, `onUpdateStatus`, `onDelete`) preservan referencias estables para que `React.memo` evite re-renders innecesarios
- [ ] #2 El listener global `mousedown` de click-outside en `ItemCard` solo se registra en `document` cuando el menú contextual está activo (`menuOpen === true`)
- [ ] #3 La búsqueda de la tarea padre (`parentItem`) se resuelve en $O(1)$ mediante una tabla hash/Map pre-indexada
- [ ] #4 `ConfirmModal` en `ItemCard` se monta condicionalmente solo cuando la confirmación es solicitada
- [ ] #5 La suite de pruebas y typechecking aprueban limpiamente (`npm test` y `npx tsc --noEmit`)
<!-- AC:END -->

## Implementation Notes

- Archivos involucrados: `src/components/KanbanBoard.tsx`, `src/components/ItemCard.tsx`.
- Verificar compatibilidad de drag and drop y atajos de teclado sin alterar el comportamiento funcional.
