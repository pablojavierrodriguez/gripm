---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
milestone: "1.0.5"
id: DEV-211
title: Filtro de Sprints en Tablero y Corrección de Banner CLI
status: done
priority: p2
type: bug
module: UI & CLI
release: "1.0.5"
created: 2026-10-09
---

## Descripción

Corrección de dos problemas de ergonomía y presentación:
1. En el selector de sprints del tablero (`KanbanBoard.tsx`), cuando no existen sprints registrados figuraba redundantemente 'Todos los sprints' y 'Sin sprint'. La opción 'Todos los sprints' solo debe mostrarse si existen 2 o más sprints registrados.
2. Al ejecutar `gripm` en la terminal, el recuadro informativo ASCII mostraba el borde vertical derecho desfasado y cortado debido a diferencias de ancho visual entre emojis (U+1F680, U+1F4C1, etc.) y longitudes de caracteres en strings de JavaScript.

## Criterios de Aceptación

<!-- AC:BEGIN -->
- [x] 1. En 'KanbanBoard.tsx', la opción 'Todos los sprints' solo se renderiza si existen 2 o más sprints registrados; cuando no hay sprints o hay 1 solo, se evita la redundancia mostrando solo la opción correspondiente.
- [x] 2. La inicialización y persistencia de 'activeSprint' en 'KanbanBoard.tsx' cae en un fallback limpio cuando 'all' no está disponible en la lista de opciones.
- [x] 3. En 'bin/gripm.js', el cálculo de ancho visual de las líneas del banner informativo contempla los caracteres de ancho extendido (emojis) para que el borde vertical derecho '│' permanezca alineado en una sola columna fija.
<!-- AC:END -->
