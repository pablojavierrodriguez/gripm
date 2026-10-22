---
id: DEV-327
title: "Vista Hoy con vencidas y próximas para uso diario"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "product"
  - "ux"
  - "board"
priority: medium
type: feature
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El modelo de datos ya persiste `dueDate` y `startDate` en el frontmatter de las tareas (`src/types.ts`), pero no existe ninguna lente que responda "¿qué debo atender hoy?". OpenTodo triunfa porque su pantalla principal agrupa vencidas, vencen hoy y próximas; gripm exige al usuario recorrer el Kanban o filtrar a mano para llegar a la misma información.

Explorar una pestaña "Hoy" (junto a Board, Sprints, Releases y Trash) que consulte las tareas por `dueDate` sin duplicar datos: la fuente sigue siendo el frontmatter o el JSON del backlog. La vista debe respetar los módulos habilitados en `.gripm/config.json` y no introducir estado persistido propio fuera de la configuración del proyecto.

Es una iniciativa de descubrimiento: antes de implementar, definir el agrupamiento exacto (vencidas, hoy, esta semana), el comportamiento con tareas sin fecha y si suma time-blocking sobre el `startDate` existente o se mantiene como lista simple.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se documenta el alcance de la vista Hoy (agrupamiento, orden, tareas sin fecha) antes de implementar.
- [ ] #2 La vista se alimenta exclusivamente de `dueDate`/`startDate` ya persistidos, sin crear un segundo store de fechas.
- [ ] #3 La pestaña se integra al patrón de módulos existente y se puede deshabilitar desde `.gripm/config.json`.
- [ ] #4 Las tareas sin fecha no desaparecen del resto de vistas ni generan errores de render en la vista Hoy.
- [ ] #5 Los atajos de teclado y el cheat sheet (`?`) quedan actualizados si la vista agrega navegación nueva.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir con el PO el agrupamiento, el orden y el caso sin fecha.
2. Implementar la vista como pestaña derivada del estado ya cargado, sin storage propio.
3. Integrar el toggle de módulo y la navegación por teclado.
4. Validar con la suite de tests y `npm run test:ui`.
<!-- SECTION:PLAN:END -->
