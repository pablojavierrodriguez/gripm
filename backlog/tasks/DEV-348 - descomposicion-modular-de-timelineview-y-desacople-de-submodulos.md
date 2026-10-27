---
id: DEV-348
title: "Descomposicion modular de TimelineView y desacople de submódulos por debajo de 500 LOC"
status: ready
created_date: '2026-10-27'
updated_date: '2026-10-27'
labels:
  - "architecture"
  - "refactor"
  - "timeline"
  - "modularity"
dependencies: []
priority: medium
type: refactor
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El componente `TimelineView.tsx` cuenta actualmente con 1299 lineas de codigo, superando el limite maximo de 1000 LOC establecido en las directrices de arquitectura y `check-loc` de AGENTS.md. 

Agrupa de forma monolitica la resolucion de fechas, calculo de geometria temporal, arbol jerarquico de epicas/tareas, barra superior de herramientas, redimensionamiento de sidebar, lienzo Gantt con drag & drop y gestion de scroll. Es necesario descomponerlo en submódulos especializados dentro de `src/components/timeline/`:
- `timeline/dateEngine.ts`: resolucion pura de fechas (UTC), duraciones, escalas y conversion fecha a px.
- `timeline/buildHierarchy.ts`: calculo de arbol jerarquico, grupos y ordenamiento.
- `timeline/TimelineToolbar.tsx`: controles superiores de escala, busqueda, filtros y acciones.
- `timeline/TimelineSidebar.tsx`: arbol lateral de jerarquia con conectores y chevrons.
- `timeline/TimelineCanvas.tsx`: cuadricula temporal, columnas, marcador de hoy y filas de barras.
- `timeline/useTimelineDrag.ts`: hook de interaccion para arrastrar y redimensionar fechas o sprints.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `TimelineView.tsx` orquesta submódulos y ningun archivo en `src/components/timeline/` supera las 500 LOC
- [x] #2 Se extrae la logica pura de fechas a `dateEngine.ts` con cobertura de pruebas unitarias
- [x] #3 Se preserva la paridad funcional existente sin regresiones visuales o de interaccion
- [x] #4 `npm run check-loc` y `npm test` finalizan en verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
