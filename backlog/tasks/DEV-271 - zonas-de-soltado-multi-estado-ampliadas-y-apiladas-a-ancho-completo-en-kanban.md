---
id: DEV-271
title: "Zonas de soltado multi-estado ampliadas y apiladas a ancho completo en KanbanBoard"
status: ready
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
- [x] #1 Al arrastrar una tarjeta sobre una columna con múltiples estados mapeados, las subzonas de soltado se presentan apiladas ocupando todo el ancho de la columna
- [x] #2 Cada subzona dispone de altura y padding ergonómico que facilita el soltado con mouse o touch
- [x] #3 La etiqueta y el indicador de estado se leen de forma completa sin cortes abruptos por elipsis
- [x] #4 El estado de hover / sobre-vuelo resalta intensamente la subzona destino con feedback de color y borde
- [x] #5 Soltar la tarjeta en una subzona asigna el estado exacto correspondiente
- [x] #6 `npm test` y validación de interacciones en verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Se reemplazó la grilla compacta `grid grid-cols-2` de `KanbanBoard.tsx` por una disposición vertical apilada `flex flex-col gap-2 w-full`.
- Cada subzona de soltado cuenta ahora con altura y padding ergonómico `w-full py-3 px-4 rounded-xl border-2 border-dashed`, superando con holgura los 44px de target táctil y garantizando área de captura amplia.
- Se configuró la paleta temática canónica por estado (`SUB_DROP_THEME`) con estados de hover/dragOver intensos y de alto contraste (borde discontinuo coloreado, fondo tintado y realce de dot y texto sin saltos de scroll).
- Se eliminó la clase `truncate` del nombre del estado, permitiendo la lectura íntegra y sin elipsis de etiquetas localizadas.
- Los hijos dentro de la subzona incluyen `pointer-events-none` para estabilizar el dragOver evitando parpadeos de eventos del cursor, y se limpia `dropTarget` de tarjetas al sobrevolar una subzona para mantener foco visual exclusivo en la transición.
- Se verificaron la Pirámide de Verificación y la suite headless unificada (`npm test`, 18 pasos en verde).
<!-- SECTION:NOTES:END -->
