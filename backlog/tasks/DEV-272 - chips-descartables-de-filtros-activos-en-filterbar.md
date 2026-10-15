---
id: DEV-272
title: "Chips descartables de filtros activos en FilterBar para dinamizar el filtrado rápido"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "filters"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente, la barra superior `FilterBar.tsx` cuenta con píldoras de acceso rápido rígidas (Tipos y Prioridades fijos). Si un usuario desea filtrar frecuentemente por estados concretos (ej: solo `doing` y `review`) o por un módulo específico (ej: `UI / Layout`), debe abrir repetidamente el popover de filtros avanzados.

En lugar de construir un panel de configuración complejo y pesado para personalizar qué botones se colocan en la barra (lo que generaría sobre-ingeniería), se adopta el estándar de la industria (Linear / GitHub): **materialización dinámica de filtros activos como chips descartables**.

### Objetivos:
1. Toda dimensión aplicada desde el Popover de Filtros Avanzados que no pertenezca a los accesos directos estándar (ej. Estados específicos, Módulo, Asignado, Sprint) se refleja de inmediato en la barra como una píldora activa interactiva (ej: `[Estado: doing ✕]`, `[Módulo: Auth ✕]`).
2. El usuario puede remover cualquier filtro individual con un clic sobre la X del chip sin tener que abrir el popover.
3. El botón general de "Limpiar filtros" sigue reseteando todas las condiciones activas.
4. Diseño responsivo con scroll horizontal suave o colapso elegante en pantallas pequeñas para evitar solapamientos con las estadísticas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Al aplicar filtros desde AdvancedFiltersPopover (estados, módulos, sprints, releases), estos se renderizan como chips activos en la barra principal
- [x] #2 Cada chip muestra la dimensión, el valor y un botón de descarte individual (✕)
- [x] #3 Hacer clic en la ✕ de un chip elimina ese filtro específico de inmediato y actualiza la vista
- [x] #4 La barra de filtros no genera scroll vertical ni roturas de layout en resoluciones estándar
- [x] #5 Coherencia de accesibilidad y foco para los chips descartables
- [x] #6 Tests unitarios para el estado de filtros y chips
<!-- AC:END -->

## Implementation Notes

- Exportadas funciones puras `getActiveFilterChips` y `removeFilterFromState` en `src/components/FilterBar.tsx` para extraer de forma reactiva y mutar de forma inmutable los filtros activos aplicados.
- Dimensiones cubiertas por chips descartables: Estados (`statuses`, `status`, `ideas`, `dismissed`), Módulos (`module`, `modules`), Sprints (`sprint`, `sprints`), Releases (`release`, `releases`), Estimaciones (`estimates`) y tipos no estándares (`epic`, `initiative`).
- Interfaz accesible con `role="region" aria-label="Filtros"`, botones con `aria-label`, tamaño mínimo de touch target compensado, y anillos de foco visibles (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
- Contenedor scrollable horizontal (`overflow-x-auto scrollbar-none scroll-smooth`) que respeta la posición y `tabular-nums` de las métricas fijas a la derecha.
- Verificación exhaustiva: 18/18 pasos de la suite unificada (`npm test`) en verde y typecheck estricto (`npx tsc --noEmit`) con 0 errores.

