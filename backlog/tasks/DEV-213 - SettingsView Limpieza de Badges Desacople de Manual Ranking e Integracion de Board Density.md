---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
milestone: "1.0.5"
id: DEV-213
title: SettingsView Limpieza de Badges Desacople de Manual Ranking e Integracion de Board Density
status: done
priority: p2
type: ux
module: UI / Settings
release: "1.0.5"
created: 2026-10-09
---

## Descripción

Refinamiento de la vista de configuración y activación funcional de la densidad del tablero:
1. En Settings > Workflow & Views, se remueve el badge duplicado y desalineado a la derecha de 'Project Work Methodology'.
2. En Settings > Apariencia, se desacopla el checkbox de 'Manual Ranking and Drag & Drop' que estaba erróneamente incrustado dentro de la tarjeta de 'Auto-save on Edit', presentándolo como tarjeta independiente en la cuadrícula.
3. Se conecta la propiedad 'config.density' ('comfortable' vs 'compact') con 'KanbanBoard.tsx' y 'ItemCard.tsx' para que la selección de densidad impacte realmente el espaciado, paddings y tipografía del tablero.

## Criterios de Aceptación

<!-- AC:BEGIN -->
- [x] 1. En 'SettingsView.tsx', se elimina el badge duplicado/desalineado junto al título de 'Project Work Methodology'.
- [x] 2. 'Manual Ranking and Drag & Drop' se extrae de la tarjeta de Auto-save y se ubica como control propio e independiente dentro del grid de configuración.
- [x] 3. 'KanbanBoard.tsx' e 'ItemCard.tsx' consumen 'config.density' aplicando clases de densidad compacta ('compact') vs estándar ('comfortable') en gaps de columna y espaciados internos de tarjetas.
<!-- AC:END -->
