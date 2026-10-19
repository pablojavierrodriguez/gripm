---
id: DEV-321
title: "Optimización Integral de Densidad UX en 1366x768 y Viewports Reales de Portátil (1366x650)"
status: done
claimed_by: "antigravity:worker_dev321_1"
created_date: '2026-10-17'
updated_date: '2026-10-18 01:38'
labels:
  - "ux"
  - "ui"
  - "responsive"
  - "desktop"
  - "playwright"
dependencies: []
priority: high
type: ux
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Auditoría y resolución integral de los problemas de densidad vertical y horizontal en pantallas de portátil de `1366x768` (considerando tanto el viewport completo `1366x768` como el alto útil real de navegador `1366x650` tras descontar barra de tareas del sistema operativo y pestañas/barra de direcciones del navegador), validado pantalla por pantalla con Playwright en Español e Inglés.

### Invariante de Diseño Obligatorio (Restricción Negativa):
- **El scroll horizontal en las columnas del tablero Kanban es 100% intencional por diseño.** Queda terminantemente prohibido alterar el ancho mínimo de las columnas del Kanban o intentar forzar que todas las columnas entren sin scroll horizontal.

### Diagnóstico Pantalla por Pantalla Pendiente de Resolver:

1. **Modal de Edición / Creación de Ítem (`src/components/ItemModal.tsx` y subcomponentes en `src/components/item-modal/`):**
   - En `1366x768` (y más aún en `1366x650`), la combinación de paddings verticales amplios, `textarea` de descripción y la sección `Implementation Plan & Plan Guard` desplegada por defecto empuja la sección crítica de **Acceptance Criteria (AC)** completamente fuera del área visible inicial (no se ve ni un solo criterio sin scrollear).
   - En la columna lateral derecha (`Item Attributes`), el bloque de `Labels` y sus chips quedan cortados al ras del footer.
   - Se requiere compactar la densidad vertical en alturas `<= 800px` (paddings, gaps, colapso inteligente de secciones secundarias vacías o no prioritarias) para que Título, Descripción, Estado/Atributos y el inicio de Acceptance Criteria sean visibles de inmediato sin cortes.

2. **Popover de Filtros Avanzados (`src/components/AdvancedFiltersPopover.tsx`):**
   - Limitar `max-h` únicamente agrega scroll interno a una lista vertical larga de una sola columna (`420px`), dejando **Target Release**, **Sprint** y el botón de **Reset** enterrados debajo del pliegue en `1366x768` / `1366x650`.
   - Se requiere un layout más compacto (grilla de 2 columnas o chips de menor altura/espaciado vertical) para que todos los grupos de filtros y el pie de acciones entren de un vistazo sin requerir scroll interno salvo cuando existan decenas de releases/sprints.

3. **Header con las 5 Pestañas Activas en Español e Inglés (`src/components/Header.tsx`):**
   - Validar y blindar el presupuesto horizontal en `1366px` y `1280px` cuando están activas simultáneamente las **5 pestañas** (`Tablero`, `Sprints`, `Versiones`, `Cronograma`, `Métricas`), junto con nombre de proyecto largo, badge de nueva versión (`vX.Y.Z`), indicador de sincronización, botón `Re-sync /docs`, utilidades y CTA `+ Nueva Tarea`, garantizando cero solapamientos y cero salto de línea en botones.

4. **Vistas Principales y Modales Secundarios en `1366x768` / `1366x650`:**
   - **SprintView (`src/components/SprintView.tsx`):** Verificar y ajustar cabeceras de sprint, métricas superiores y listas de tareas para no desperdiciar más del 35% del alto útil de `650px` en banners estáticos antes de ver las tareas.
   - **TimelineView (`src/components/TimelineView.tsx`):** Verificar controles de zoom/rango, cabeceras de fechas y filas del cronograma sin cortes ni desbordes de controles.
   - **ReleaseAssembler (`src/components/ReleaseAssembler.tsx`) y ReleaseView (`src/components/ReleaseView.tsx`):** Asegurar que el panel de armado de release, preview de notas y selector de ítems `ready` funcionen sin recorte vertical en `650px - 768px` de alto.
   - **SettingsView (`src/components/SettingsView.tsx`):** Verificar tabs/secciones de configuración y controles sin truncamientos ni desbordes en `1366x768`.
   - **Modales operativos (`ImportWizardModal.tsx`, `SprintModal.tsx`, `CompleteSprintModal.tsx`, `ProjectModal.tsx`, `TrashModal.tsx`, `KeyboardShortcutsModal.tsx`):** Auditar y ajustar alturas máximas, paddings de cabecera/pie y scroll interno en viewport de `1366x650`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Con las 5 pestañas habilitadas en Español (`Tablero`, `Sprints`, `Versiones`, `Cronograma`, `Métricas`), badge de actualización visible, botón `Re-sync /docs` y nombre de proyecto de 25 caracteres, el `Header` en `1366x768` y `1280x800` mantiene separación `>= 16px` entre bloques y `0` saltos de línea en botones
- [x] #2 En `ItemModal` abierto a `1366x768` y `1366x650`, la cabecera de `Acceptance Criteria` y al menos los primeros criterios son visibles sin necesidad de scroll inicial, y todos los campos de la barra lateral derecha (`Status`, `Priority`, `Type`, `Sprint`, `Release`, `Dates`, `Assignees`, `Labels`) quedan accesibles sin recortes
- [x] #3 `AdvancedFiltersPopover` presenta una disposición compacta donde las secciones de estado, tipo, prioridad, release/sprint y el botón de reset son visibles simultáneamente en `1366x768` sin corte inferior
- [x] #4 `SprintView`, `TimelineView`, `ReleaseView` / `ReleaseAssembler`, `MetricsView` y `SettingsView` pasan validación visual y geométrica automatizada con Playwright en `1366x768` y `1366x650` (ES y EN) sin elementos solapados ni recortados
- [x] #5 Todos los modales secundarios (`ImportWizardModal`, `SprintModal`, `CompleteSprintModal`, `ProjectModal`, `TrashModal`, `KeyboardShortcutsModal`) mantienen cabecera y pie de acciones 100% visibles dentro de un viewport de `1366x650`
- [x] #6 El scroll horizontal de las columnas del `KanbanBoard` se mantiene intacto sin alteraciones
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Construir un script de auditoría Playwright determinista que levante la aplicación con las 5 pestañas activas, pruebe `1366x768` y `1366x650` en `es` y `en`, abra cada una de las 5 vistas y los 8 modales/popovers, y mida geométricamente (`getBoundingClientRect`) colisiones, recortes fuera de viewport y visibilidad above-the-fold.
2. Ajustar densidad vertical y distribución en `ItemModal.tsx` (y subcomponentes en `src/components/item-modal/`) para viewports de portátil.
3. Rediseñar la densidad interna de `AdvancedFiltersPopover.tsx` para eliminar el apilamiento vertical excesivo.
4. Ajustar `Header.tsx` para soportar las 5 pestañas activas + todos los indicadores opcionales simultáneos en `1366px` y `1280px`.
5. Ajustar paddings y alturas de contenedores en `SprintView.tsx`, `TimelineView.tsx`, `ReleaseAssembler.tsx`, `SettingsView.tsx` y modales operativos (`ImportWizardModal.tsx`, `SprintModal.tsx`, `CompleteSprintModal.tsx`, `ProjectModal.tsx`).
6. Re-ejecutar la suite Playwright pantalla por pantalla y la Pirámide de Verificación completa (`tsc --noEmit`, `npm test`, `npm run audit:ux`, `npm run backlog:check`).
<!-- SECTION:PLAN:END -->
