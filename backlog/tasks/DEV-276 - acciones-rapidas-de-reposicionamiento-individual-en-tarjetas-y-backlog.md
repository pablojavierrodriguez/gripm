---
id: DEV-276
title: "Acciones rápidas de reposicionamiento individual en tarjetas y backlog (Top, Bottom y Asignar Sprint)"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "kanban"
  - "backlog"
  - "ranking"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente, reordenar una tarea dentro de una columna o en la tabla de Backlog depende casi exclusivamente del arrastre con mouse (drag & drop). En `ItemCard.tsx`, el menú contextual solo ofrece subir o bajar una única posición (`canMoveUp` / `canMoveDown`), lo que resulta sumamente tedioso e inviable cuando una columna o backlog contiene decenas de ítems.

Asimismo, asignar una tarea a un sprint específico exige arrastrarla verticalmente por todo el viewport o abrir el modal de edición completo.

### Objetivos:
1. **Mover al Tope / Fondo:** Incorporar en el menú contextual (`...`) de cada tarjeta en el Tablero y en el menú de acciones de cada fila en `SprintView`:
   - *"Mover al principio de la columna / backlog"* (Top rank)
   - *"Mover al final de la columna / backlog"* (Bottom rank)
2. **Asignación Rápida de Sprint:** Agregar un submenú o acción directa *"Asignar a Sprint →"* con listado de sprints vigentes y la opción *"Devolver al Backlog"*, permitiendo transferir la tarea en un solo clic sin abrir el formulario de edición.
3. Actualizar el orden numérico (`order`) de forma consistente para garantizar persistencia determinística en disco.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El menú contextual de la tarjeta en KanbanBoard incluye acciones para mover al tope y al fondo de su columna
- [ ] #2 Cada fila en SprintView incluye menú o botones de acción para mover el ítem al tope o fondo de su contenedor (sprint o backlog)
- [ ] #3 Se provee acción contextual para mover rápidamente el ítem a cualquier sprint activo/vigente o al backlog general
- [ ] #4 El recálculo del campo `order` mantiene la estabilidad de ranking sin solapamientos
- [ ] #5 Accesibilidad por teclado en las nuevas opciones de menú
- [ ] #6 `npm test` y verificación de consistencia en verde
<!-- AC:END -->
