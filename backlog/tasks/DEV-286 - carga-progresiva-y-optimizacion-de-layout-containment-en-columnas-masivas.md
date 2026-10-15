---
id: DEV-286
title: "Carga progresiva y optimización de layout containment en columnas masivas"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "performance"
  - "kanban"
  - "dom"
  - "scalability"
dependencies:
  - "DEV-282"
priority: low
type: feature
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mecanismo de carga progresiva y optimizaciones de renderizado de DOM para columnas del tablero Kanban que contengan un volumen muy elevado de tareas (ej. columnas `Draft` o `Done` con cientos de ítems acumulados).

### Problemas identificados:
1. Cuando una columna acumula más de 100 tarjetas (situación común en proyectos maduros o con historiales extensos), el navegador debe gestionar simultáneamente miles de nodos DOM, SVGs en línea y estilos computados en un contenedor desplazable.
2. Esto provoca que el scroll vertical de la columna o el drag-and-drop de tarjetas presente micro-tirones (jank de layout/reflow).

### Solución propuesta:
- Implementar renderizado progresivo por lotes (ej. renderizar las primeras 40-50 tarjetas y cargar las siguientes al hacer scroll o mediante botón "Cargar más tareas").
- Aplicar optimizaciones modernas de CSS en las tarjetas del Kanban: `contain-intrinsic-size` y `content-visibility: auto` (o `contain: content`) para que el motor del navegador omita los cálculos de pintura y layout de las tarjetas fuera del viewport visible.
- Preservar completamente la experiencia de arrastre (`Drag and Drop`) e indicadores visuales de drop target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Las columnas con más de 50 tareas adoptan carga progresiva o contención de layout para evitar sobrecarga del DOM
- [ ] #2 El scroll en columnas densas se mantiene a 60 FPS estables sin bloqueos del hilo principal
- [ ] #3 La funcionalidad de arrastrar y soltar (drag & drop) y reordenamiento de tareas sigue operando con total precisión
- [ ] #4 Las pruebas unitarias y de integración (`npm test`) se ejecutan sin regresiones
<!-- AC:END -->

## Implementation Notes

- Archivos a modificar: `src/components/KanbanBoard.tsx`, `src/index.css`.
- Dependencia: `DEV-282`.
