---
id: DEV-138
title: "Selector de Estimación en ItemModal y Badges Visuales en Tarjetas Kanban"
status: draft
created_date: '2026-09-30'
updated_date: '2026-09-30 14:07'
labels:
  - "estimation"
  - "ui"
  - "ux"
  - "kanban"
  - "modal"
dependencies:
  - "DEV-136"
  - "DEV-137"
priority: medium
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diseñar e implementar la experiencia de usuario (UX) para la asignación y visualización de estimaciones en la interfaz gráfica del cockpit:

### 1. Edición y Asignación en ItemModal (src/components/ItemModal.tsx):
- Visualización condicional: el selector de estimación sólo es visible si `config.estimation?.enabled === true`. Si está desactivado, el campo no se dibuja, manteniendo el modal limpio y sin distracciones.
- Control interactivo moderno:
  - **Modo Story Points (Fibonacci):** Segmented control o fila de botones tipo pill con los valores canónicos [0, 1, 2, 3, 5, 8, 13, 21], destacando con estilo activo el punto seleccionado.
  - **Modo T-Shirt Sizes:** Pills interactivas con las tallas estándar [XS, S, M, L, XL, XXL].
  - Botón o acción de reseteo (`Sin estimar`) para desasignar la estimación de la tarea con un solo click.
- Integración en `populateFromItem` y transmisión en el payload de guardado `onSave`.

### 2. Visualización en Tarjetas Kanban (src/components/ItemCard.tsx):
- Badge discreto y elegante en el pie o encabezado de la tarjeta Kanban.
- Representación contextual:
  - Para Fibonacci: ej. `5 pts` o badge con icono sutil de estimación + número.
  - Para T-Shirt: ej. badge con `M`, `L`, etc. con estilo distintivo.
- Compatibilidad perfecta con Dark Mode y Light Mode (tokens Tailwind existentes en el proyecto).
- Zero Layout Shifts: dimensiones estables para no alterar la altura ni el drag-and-drop de las tarjetas en el tablero.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 En ItemModal.tsx, mostrar el campo y control de estimación únicamente si config.estimation?.enabled es true
- [ ] #2 Renderizar un selector ergonómico adaptativo según el método configurado: pills/botones para Fibonacci (0, 1, 2, 3, 5, 8, 13, 21) o T-Shirt Sizes (XS, S, M, L, XL, XXL)
- [ ] #3 Permitir asignar, cambiar o desasignar (limpiar estimación) con feedback visual inmediato y persistencia en onSave hacia el backend
- [ ] #4 En ItemCard.tsx, renderizar un badge compacto de estimación en la tarjeta Kanban únicamente si la estimación está habilitada y el ítem tiene un valor asignado
- [ ] #5 Diseñar el badge de ItemCard con tokens semánticos del sistema, excelente contraste en Light y Dark Mode y cero saltos de layout (Zero-CLS)
- [ ] #6 Garantizar que al desactivar la estimación desde Settings, los elementos visuales en ItemModal e ItemCard se oculten inmediatamente sin alterar los datos persistidos en disco
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `src/components/ItemModal.tsx`:
   - Leer `config.estimation` desde props o contexto.
   - Si `config.estimation?.enabled` es true, agregar campo en la columna lateral de atributos (junto a Sprint, Release, Prioridad, etc.).
   - Crear subcomponente `EstimationPicker` que reciba el método ('fibonacci' | 'tshirt'), el valor actual y el callback `onChange`.
   - Incluir soporte para valor vacío/limpio (`Sin estimar`).
   - Mapear `estimate` en el estado local del modal y en el guardado.
2. En `src/components/ItemCard.tsx`:
   - Recibir o consultar la configuración de estimación.
   - Si `config.estimation?.enabled` y `item.estimate !== undefined`, renderizar el badge de estimación.
   - Aplicar clases utilitarias de Tailwind armónicas con los badges de tipo y prioridad (evitando colisión visual).
3. Probar reactividad al alternar entre habilitado/deshabilitado y entre Fibonacci/T-Shirt.
4. Validar tipado y linting.
<!-- SECTION:PLAN:END -->
