---
id: DEV-277
title: "Selección múltiple en Backlog y barra de acciones masivas con reposicionamiento en lote"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "backlog"
  - "bulk-actions"
  - "ranking"
dependencies:
  - DEV-276
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
- [ ] #1 SprintView incluye checkboxes de selección por fila y en la cabecera de cada bloque de sprint/backlog
- [ ] #2 Permite selección rápida de rangos de tareas contiguas manteniendo pulsada la tecla Shift
- [ ] #3 Al seleccionar uno o más ítems se despliega una barra flotante inferior con el contador y las acciones masivas disponibles
- [ ] #4 Acción masiva para mover todos los ítems seleccionados al tope o al fondo del contenedor preservando su orden relativo
- [ ] #5 Acciones masivas para asignar sprint, asignar release, cambiar estado y cambiar prioridad en un solo paso
- [ ] #6 Acción para mover masivamente a la papelera con diálogo de confirmación claro y seguro
- [ ] #7 `npm test` y consistencia de datos en disco sin race conditions
<!-- AC:END -->
