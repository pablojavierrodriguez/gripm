---
id: DEV-303
title: "Descomposición Modular de Frontend: Desacople de God Components y Motor de Filtros"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-16'
labels:
  - "frontend"
  - "react"
  - "architecture"
  - "performance"
  - "refactor"
dependencies: []
priority: high
type: refactor
estimate: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactorización estructural del cliente React (`src/`): partición modular de los componentes monolíticos gigantes (`SettingsView`, `ItemModal`, `App.tsx`), unificación determinista del motor de filtrado multi-criterio y optimización de renderizado durante interacciones de drag-and-drop.

### Diagnóstico de la Causa Raíz:

1. **Monolitos de Responsabilidad Múltiple ("God Components"):**
   - `src/components/SettingsView.tsx` (3.082 líneas): 8 pestañas completas, 25+ estados locales, dirty-checking manual por serialización JSON en cada keystroke y formularios embebidos en un solo archivo.
   - `src/components/ItemModal.tsx` (2.507 líneas): Más de 35 hooks `useState` en el mismo componente (`lines 151-218`), preview de Markdown, BDD templates, drag-and-drop de ACs, exportación a calendar `.ics` y autosave.
   - `src/App.tsx` (1.737 líneas): Orquestador central que retiene todo el estado del dominio, 10 estados de modal, SSE, locales, y más de 25 callbacks pasados por props drilling hasta 3 niveles de profundidad.
2. **Divergencia de Filtrado ("Split-Brain"):**
   `FilterBar.tsx` y `AdvancedFiltersPopover.tsx` fueron actualizados para soportar selección múltiple (`filters.sprints`, `filters.releases`, `filters.modules`) y tareas con múltiples módulos (`item.modules` en `DEV-275`). Sin embargo, [`visibleItems` en App.tsx:1250-1266](file:///c:/Users/Pablo/Proyectos/gripm/src/App.tsx#L1250-L1266) jamás fue actualizado: solo evalúa campos singulares legacy (`filters.sprint`, `filters.release`, `filters.module`), provocando que activar filtros multi-selección en la UI no filtre absolutamente nada en el tablero.
3. **Tormenta de Re-renders a 60 fps en Drag-and-Drop:**
   En `KanbanBoard.tsx:512-527` y `SprintView.tsx:1466-1474`, `handleCardDragOver` invoca `setDropTarget` en cada píxel de movimiento del cursor sin validar si la posición o ítem cambió. Dado que `KanbanBoard` pasa 4 funciones flecha inline nuevas a cada `ItemCard` en cada render, `React.memo(ItemCard)` queda totalmente anulado y todas las tarjetas de todas las columnas se re-renderizan 60 veces por segundo durante el arrastre.
4. **Code-Splitting Incompleto:**
   Solo `ReleaseAssembler` y `SettingsView` usan `React.lazy()`. Vistas pesadas secundarias (`SprintView` 119 KB, `TimelineView` 54 KB, `MetricsView` 33 KB, `ImportWizardModal` 24 KB) se importan en el bundle inicial de arranque.

### Solución Arquitectónica Profunda:

- **Modularización de Componentes:**
  - Extraer `src/hooks/useBoardController.ts` de `App.tsx` para aislar la carga de datos, suscripción SSE y mutaciones CRUD en un hook dedicado, reduciendo `App.tsx` a ~350 líneas de maquetado y renderizado condicional.
  - Dividir `SettingsView.tsx` en submódulos por pestaña en `src/components/settings/` (`GeneralTab`, `KanbanTab`, `ModulesTab`, `TaxonomyTab`, `ComponentsTab`, `VisualTab`, `ToolsTab`, `AdvancedTab`).
  - Dividir `ItemModal.tsx` en `useItemFormState` y subpaneles (`ItemDescriptionPanel`, `AcceptanceCriteriaPanel`, `ItemRelationsPanel`, `ItemSidebarMetadata`).
- **Unificación del Motor de Filtros:**
  - Crear `src/utils/filterItems.ts` con la función pura `itemMatchesFilters(item, filters)`.
  - Soporte completo para matching multi-selección (`filters.sprints`, `filters.releases`, `filters.modules`) contra campos array (`item.modules`, `item.releases`, `item.sprints`) y campos singulares legacy.
  - Consumir el mismo predicado en `App.tsx`, `FilterBar.tsx` y vistas de exportación.
- **Rendimiento de Renderizado y Code-Splitting:**
  - Proteger `setDropTarget` con guard funcional: `setDropTarget(prev => (prev?.itemId === id && prev?.pos === pos) ? prev : { itemId: id, pos })`.
  - Estabilizar callbacks de `ItemCard` con `useCallback` parametrizado por `(item, ...)`.
  - Cargar `SprintView`, `TimelineView`, `MetricsView` e `ImportWizardModal` con `React.lazy()` y `Suspense`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se extrae `src/utils/filterItems.ts` y se unifica la lógica de filtrado; la selección de múltiples sprints, releases o módulos en el popover filtra correctamente las tarjetas en el Kanban y en el Backlog
- [x] #2 `item.modules` (array multi-módulo) y `config.modulesList` son reconocidos plenamente en la barra de filtros y en el cálculo de `availableModules`
- [x] #3 `SettingsView.tsx` se divide en subcomponentes por pestaña en `src/components/settings/`, reduciendo su tamaño individual a menos de 500 líneas por módulo
- [x] #4 `ItemModal.tsx` desacopla su gestión de estado en `useItemFormState` y separa sus paneles de visualización
- [x] #5 `KanbanBoard` y `SprintView` optimizan `setDropTarget` evitando re-renderizados innecesarios durante eventos de arrastre continuo
- [x] #6 `ItemCard` recibe callbacks estables que permiten a `React.memo` evitar re-renders de tarjetas inactivas durante el drag-and-drop
- [x] #7 `SprintView`, `TimelineView`, `MetricsView` e `ImportWizardModal` se cargan bajo demanda con `React.lazy()`, reduciendo el bundle inicial
- [x] #8 La suite de UI smoke tests (`npm run test:ui`) aprueba sin regresiones funcionales
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `src/utils/filterItems.ts` y conectar en `src/App.tsx:1235` resolviendo la discrepancia multi-filtro.
2. Optimizar `handleCardDragOver` en `KanbanBoard.tsx` y `SprintView.tsx` con verificación de identidad previa.
3. Estabilizar callbacks de `ItemCard` y verificar con React Profiler la ausencia de re-renders masivos en drag.
4. Particionar `SettingsView.tsx` en componentes modulares bajo `src/components/settings/`.
5. Extraer `useItemFormState` de `ItemModal.tsx`.
6. Convertir vistas secundarias a `React.lazy()`.
<!-- SECTION:PLAN:END -->
