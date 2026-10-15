---
id: DEV-277
title: "Selección múltiple en Backlog y barra de acciones masivas con reposicionamiento en lote"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15 23:26'
labels:
  - "ux"
  - "ui"
  - "backlog"
  - "bulk-actions"
  - "ranking"
dependencies:
  - "DEV-276"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la vista de Backlog y Sprints (`SprintView.tsx`), gestionar múltiples tareas simultáneamente no es posible desde la interfaz web. Los usuarios deben modificar o arrastrar tareas una por una, lo que ralentiza enormemente las ceremonias de Sprint Planning, priorización y ordenamiento de backlog.

Esta tarea implementa **selección múltiple de ítems** y una **barra flotante de acciones masivas (*Bulk Action Bar*)**, incorporando además la capacidad de **mover múltiples ítems seleccionados al tope o al fondo del backlog/sprint en un solo movimiento en lote**.

### Objetivos:
1. **Mecanismo de Selección Múltiple:**
   - Checkboxes de selección por fila en la tabla de `SprintView`.
   - Checkbox "Seleccionar todos" en el encabezado de cada sección (Sprint o Backlog).
   - Soporte para selección de rango contiguo mediante `Shift + Click`.
2. **Barra Flotante de Acciones Masivas (Bulk Action Bar):**
   - Aparece en la parte inferior de la pantalla al seleccionar $\ge 1$ ítem, indicando el contador de tareas seleccionadas y botón de deseleccionar.
   - **Reposicionamiento en lote:** Botones para *"Mover selección al tope"* (Bulk Top) y *"Mover selección al fondo"* (Bulk Bottom) conservando el orden relativo entre los ítems seleccionados.
   - **Asignación de Sprint en lote:** Mover todos los ítems seleccionados a un sprint vigente o devolverlos al backlog.
   - **Asignación de Release en lote:** Vincular la selección a una versión planificada.
   - **Cambio de Estado y Prioridad en lote:** Modificar estado (ej. pasar todos a `ready` o `draft`) o prioridad (ej. `p1`).
   - **Mover a Papelera en lote:** Descarte masivo protegido con diálogo de confirmación `ConfirmModal`.
3. Conectar la ejecución con el motor de mutaciones masivas existente o las rutas de API correspondientes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 SprintView incluye checkboxes de selección por fila y en la cabecera de cada bloque de sprint/backlog
- [x] #2 Permite selección rápida de rangos de tareas contiguas manteniendo pulsada la tecla Shift
- [x] #3 Al seleccionar uno o más ítems se despliega una barra flotante inferior con el contador y las acciones masivas disponibles
- [x] #4 Acción masiva para mover todos los ítems seleccionados al tope o al fondo del contenedor preservando su orden relativo
- [x] #5 Acciones masivas para asignar sprint, asignar release, cambiar estado y cambiar prioridad en un solo paso
- [x] #6 Acción para mover masivamente a la papelera con diálogo de confirmación claro y seguro
- [x] #7 `npm test` y consistencia de datos en disco sin race conditions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Selección Múltiple:** Se añadieron checkboxes accesibles en cada fila de tabla y checkboxes maestros con soporte para estado indeterminado en la cabecera de grupo y tabla de `SprintView.tsx`.
- **Rango con Shift + Click:** `handleRowShiftClick` calcula el rango entre `lastSelectedId` y la tarea clicada tanto en clics de checkbox como en clics de fila con tecla Shift pulsada, previniendo la apertura del modal de detalle.
- **Barra Flotante de Acciones Masivas:** Renderizada vía `createPortal` en `document.body` fija en `bottom-6 left-1/2 -translate-x-1/2` con contador, botón de desmarcar todo (`✕ Desmarcar`), y atajo de teclado `Escape`.
- **Reposicionamiento en lote (Bulk Top & Bulk Bottom):** `handleBulkMoveTop` y `handleBulkMoveBottom` reordenan los ítems seleccionados al inicio o final de cada contenedor preservando estrictamente su orden relativo original y el de los ítems no seleccionados.
- **Acciones Masivas Unificadas:** Selectores estilizados para Sprint (con opción de devolver a Backlog), Release, Estado (`draft`, `doing`, `review`, `ready`, `done`, etc.) y Prioridad (`p0`, `p1`, `p2`, `p3`), además de borrado masivo protegido mediante `ConfirmModal`.
- **Anti-Race-Conditions:** Mutaciones ejecutadas secuencialmente con feedback visual mediante toast de confirmación flotante.
- **Auditoría UX y Accesibilidad:** Todos los controles cuentan con atributos `aria-label`, `title`, estados activos (`active:scale-95`) y tipografía canónica Tailwind (`text-xs`), cumpliendo 100% con `audit-ux-code.cjs` (0 errores).
<!-- SECTION:NOTES:END -->
