---
id: DEV-272
title: "Chips descartables de filtros activos en FilterBar para dinamizar el filtrado rápido"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "filters"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente, la barra superior `FilterBar.tsx` cuenta con píldoras de acceso rápido rígidas (Tipos y Prioridades fijos). Si un usuario desea filtrar frecuentemente por estados concretos (ej: solo `doing` y `review`) o por un módulo específico (ej: `UI / Layout`), debe abrir repetidamente el popover de filtros avanzados.

En lugar de construir un panel de configuración complejo y pesado para personalizar qué botones se colocan en la barra (lo que generaría sobre-ingeniería), se adopta el estándar de la industria (Linear / GitHub): **materialización dinámica de filtros activos como chips descartables**.

### Objetivos:
1. Toda dimensión aplicada desde el Popover de Filtros Avanzados que no pertenezca a los accesos directos estándar (ej. Estados específicos, Módulo, Asignado, Sprint) se refleja de inmediato en la barra como una píldora activa interactiva (ej: `[Estado: doing ✕]`, `[Módulo: Auth ✕]`).
2. El usuario puede remover cualquier filtro individual con un clic sobre la X del chip sin tener que abrir el popover.
3. El botón general de "Limpiar filtros" sigue reseteando todas las condiciones activas.
4. Diseño responsivo con scroll horizontal suave o colapso elegante en pantallas pequeñas para evitar solapamientos con las estadísticas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Al aplicar filtros desde AdvancedFiltersPopover (estados, módulos, sprints, releases), estos se renderizan como chips activos en la barra principal
- [ ] #2 Cada chip muestra la dimensión, el valor y un botón de descarte individual (✕)
- [ ] #3 Hacer clic en la ✕ de un chip elimina ese filtro específico de inmediato y actualiza la vista
- [ ] #4 La barra de filtros no genera scroll vertical ni roturas de layout en resoluciones estándar
- [ ] #5 Coherencia de accesibilidad y foco para los chips descartables
- [ ] #6 Tests unitarios para el estado de filtros y chips
<!-- AC:END -->
