---
id: DEV-139
title: "Métricas Agregadas en SprintView Tabla de Backlog y Filtros por Estimación"
status: draft
created_date: '2026-09-30'
updated_date: '2026-09-30 14:07'
labels:
  - "estimation"
  - "sprints"
  - "metrics"
  - "filters"
  - "analytics"
dependencies:
  - "DEV-136"
  - "DEV-137"
  - "DEV-138"
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Incorporar inteligencia analítica ágil y visibilidad consolidada en DevBoard a través de métricas agregadas de estimación en la vista de Sprints (SprintView), vista tabular de Backlog y filtros avanzados:

### 1. Métricas Agregadas en SprintView (src/components/SprintView.tsx):
- **Modo Story Points (Fibonacci):**
  - Conteo total de Story Points del sprint (capacidad comprometida).
  - Story points completados / listos (avance en puntos vs avance en tarjetas).
  - Porcentaje de velocidad/avance ponderado por puntos.
- **Modo T-Shirt Sizes:**
  - Resumen visual de distribución por tallas (ej. `2 XS · 3 S · 5 M · 1 L`).
- Visibilidad condicional: estas métricas solo se renderizan si `config.estimation?.enabled === true`.

### 2. Columna de Estimación en Vista Tabular:
- En la tabla de tareas de Sprints y Backlog, incluir columna "Estimación" que muestre el valor con su formato adecuado (badge compacto).
- Soportar ordenamiento por estimación (numérico para Fibonacci, orden jerárquico canónico XS < S < M < L < XL < XXL para T-Shirt).

### 3. Filtros Avanzados (src/components/FilterBar.tsx y AdvancedFiltersPopover.tsx):
- Permitir filtrar por estimación cuando esté activa.
- Selector multi-talla para T-Shirt sizes o rangos de Story Points.
- Los filtros operan de manera 100% ortogonal respecto a sprint, release, prioridad y tipo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 En SprintView.tsx, calcular y visualizar el rollup de Story Points (puntos totales planificados, puntos completados o en ready, y puntos pendientes) cuando el método es Fibonacci
- [ ] #2 En SprintView.tsx, calcular y visualizar el desglose cuantitativo por tallas (ej: 2 XS, 4 M, 1 XL) cuando el método es T-Shirt Sizes
- [ ] #3 Agregar columna 'Estimación' en la tabla de tareas de SprintView y vista de Backlog, con capacidad de ordenamiento ascendente y descendente
- [ ] #4 Incorporar filtro por estimación en AdvancedFiltersPopover.tsx para filtrar tarjetas por tallas o rangos de Story Points cuando la estimación esté habilitada
- [ ] #5 Garantizar recálculo reactivo automático de métricas y totales en tiempo real ante modificaciones de estado o estimación en las tareas
- [ ] #6 Respetar el Principio de Ortogonalidad de Dimensiones: las métricas de estimación complementan pero nunca reemplazan ni interfieren con los conteos de tareas por estado ni con las dimensiones de sprint o release
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `src/components/SprintView.tsx`:
   - Calcular métricas de estimación sobre las tareas del sprint activo/seleccionado:
     - Si método es Fibonacci: sumar `totalPoints`, `completedPoints` (tareas en 'ready' o 'done'), `inProgressPoints`.
     - Si método es T-Shirt: acumular conteo agrupado por talla `Record<string, number>`.
   - Renderizar barra de métricas de estimación en el header del sprint.
   - En la tabla de tareas, añadir la columna 'Estimación' condicionalmente.
2. En `src/types.ts`:
   - Extender `FilterState` con `estimates?: (string | number)[];` si aplica.
3. En `src/components/AdvancedFiltersPopover.tsx`:
   - Si la estimación está activa, añadir sección de filtro por estimación con checkboxes/pills.
4. En `src/App.tsx`:
   - Integrar el filtrado de estimación dentro de la lógica `filteredItems`.
5. Validar con pruebas y auditoría de ortogonalidad.
<!-- SECTION:PLAN:END -->
