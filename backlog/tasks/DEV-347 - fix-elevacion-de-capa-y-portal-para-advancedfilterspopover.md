---
id: DEV-347
title: "Fix: Elevacion de capa y portal para AdvancedFiltersPopover sobre vistas de tablero y timeline"
status: done
created_date: '2026-10-27'
updated_date: '2026-11-02'
labels:
  - "ui"
  - "ux"
  - "bug"
  - "z-index"
dependencies: []
priority: high
type: bug
estimate: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la vista de Timeline/Roadmap (y potencialmente en vistas con contenedores de alto apilamiento), el panel desplegable de filtros avanzados (`AdvancedFiltersPopover`) queda visualmente ocluido o renderizado por detras de la lista lateral izquierda de tareas y de los contenedores con `backdrop-blur` o `z-index` local.

Esto ocurre porque `FilterBar` declara `relative z-10` con `backdrop-blur-sm`, generando un contexto de apilamiento local en el que el sidebar de Timeline (`z-10` posterior en el DOM) se superpone. Conforme al guardrail #11 de AGENTS.md (DEV-129, DEV-130), los modales y popovers flotantes deben desacoplarse o montarse con elevacion asegurada (`createPortal` o elevacion superior coordinada) para no sufrir recortes por stacking context o containing blocks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El popover de filtros avanzados se renderiza siempre por encima de la barra lateral de tareas del Roadmap y del lienzo de tiempo sin quedar tapado
- [x] #2 El posicionamiento del popover permanece anclado al boton de activacion de filtros o flotante con visibilidad completa en viewports compactos y desktop
- [x] #3 El cierre por click exterior y teclado (Escape) se mantiene operativo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
