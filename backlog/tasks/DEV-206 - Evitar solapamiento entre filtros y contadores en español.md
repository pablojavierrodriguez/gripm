---
id: DEV-206
title: "Evitar solapamiento entre filtros y contadores en español"
status: done
created_date: '2026-10-07'
updated_date: '2026-10-07 23:29'
labels:
  - "ux"
  - "ui"
  - "i18n"
dependencies: []
priority: medium
type: improvement
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En el tablero, a 1366×768 y con la interfaz en español, el contador de tareas pendientes se solapaba con el filtro de prioridad P3. La barra de filtros debe conservar una composición compacta en desktop sin saltar grupos enteros a una segunda línea; los filtros de prioridad siguen disponibles desde el panel Filtros cuando no caben como accesos rápidos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El contador de pendientes no se solapa con los controles visibles a 1366×768 en español
- [x] #2 Los filtros de prioridad siguen accesibles desde el panel de Filtros cuando no caben como accesos rápidos
- [x] #3 Los accesos rápidos de prioridad solo ocupan espacio inline cuando el viewport permite conservar una única fila compacta
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Los accesos rápidos de prioridad se muestran inline a partir de 2xl; en resoluciones menores siguen disponibles dentro del panel Filtros. Así se mantiene una única fila compacta en 1366×768 en vez de empujar el grupo de prioridades a una línea independiente. Verificado en el navegador en español e inglés; DEV-207 registra el rediseño responsive más amplio para tablet y mobile.
<!-- SECTION:NOTES:END -->
