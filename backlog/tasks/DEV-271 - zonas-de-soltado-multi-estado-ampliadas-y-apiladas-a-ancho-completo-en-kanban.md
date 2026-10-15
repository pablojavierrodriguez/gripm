---
id: DEV-271
title: "Zonas de soltado multi-estado ampliadas y apiladas a ancho completo en KanbanBoard"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "kanban"
  - "drag-and-drop"
dependencies: []
priority: medium
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En columnas Kanban que agrupan más de un estado (por ejemplo, la columna de trabajo en curso que agrupa `doing`, `review`, `testing_qa`), `KanbanBoard.tsx` renderiza las subzonas de soltado específicas dentro de un `grid grid-cols-2` con cajas pequeñas (`p-2 text-[11px] truncate`).

Al arrastrar una tarjeta, el usuario debe realizar una puntería excesivamente precisa para soltar sobre una de estas mitades estrechas. El texto suele cortarse y el área táctil / de puntero no ofrece la suficiente tolerancia ni claridad de a qué estado exacto se está transicionando la tarea.

### Objetivos:
1. Reemplazar la grilla compacta de dos columnas por una disposición vertical apilada que ocupe **todo el ancho de la columna** (`flex flex-col gap-2 w-full`).
2. Incrementar la altura y el padding de cada slot de soltado (`py-3 px-4`) para transformarlo en un drop-target generoso y ergonómico.
3. Incorporar borde discontinuo visible, dot de color del estado y texto completo sin elipsis (`truncate`) que confirme el destino antes de soltar.
4. Mantener la animación suave de apertura y cierre de zonas durante el arrastre sin generar saltos de scroll.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Al arrastrar una tarjeta sobre una columna con múltiples estados mapeados, las subzonas de soltado se presentan apiladas ocupando todo el ancho de la columna
- [ ] #2 Cada subzona dispone de altura y padding ergonómico que facilita el soltado con mouse o touch
- [ ] #3 La etiqueta y el indicador de estado se leen de forma completa sin cortes abruptos por elipsis
- [ ] #4 El estado de hover / sobre-vuelo resalta intensamente la subzona destino con feedback de color y borde
- [ ] #5 Soltar la tarjeta en una subzona asigna el estado exacto correspondiente
- [ ] #6 `npm test` y validación de interacciones en verde
<!-- AC:END -->
