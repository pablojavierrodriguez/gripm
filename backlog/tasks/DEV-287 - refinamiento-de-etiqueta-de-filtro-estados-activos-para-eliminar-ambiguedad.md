---
id: DEV-287
title: "Refinamiento de etiqueta de filtro de estados: 'Estados activos' / 'Active statuses' para eliminar ambigüedad"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "filterbar"
  - "i18n"
dependencies: []
priority: low
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la barra de filtros y en el menú desplegable `AdvancedFiltersPopover.tsx`, la selección rápida de los estados activos del flujo de trabajo se rotula actualmente como "Todos los estados" / "All statuses" (`filter.allActiveFlow`).

Esta etiqueta presenta una ambigüedad semántica: el usuario puede inferir razonablemente que incluye también estados terminales como `done` (completados), `cancelled` o `dismissed`. 

Al delimitar explícitamente el alcance como estados "activos" (WIP / flujo en curso):
1. Se elimina la falsa expectativa de ver tareas completadas o canceladas.
2. Se adopta la convención estándar de la industria (Linear, Jira) donde los filtros de ciclo vivo se designan canónicamente:
   - Español: "Estados activos" (o "Todos los estados activos").
   - Inglés: "Active statuses" (o "All active statuses").
3. Se preserva la economía visual y el espacio horizontal en el chip de cabecera y en el dropdown de filtros avanzados.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Actualizar el catálogo de idioma español (`src/locales/es.json`) en `filter.allActiveFlow` a "Estados activos"
- [ ] #2 Actualizar el catálogo de idioma inglés (`src/locales/en.json`) en `filter.allActiveFlow` a "Active statuses"
- [ ] #3 Validar que el chip en FilterBar y la opción en AdvancedFiltersPopover rendericen la nueva etiqueta con economía espacial
- [ ] #4 Verificar tipado estricto (`npx tsc --noEmit`) y ejecución limpia de la suite de pruebas
<!-- AC:END -->
