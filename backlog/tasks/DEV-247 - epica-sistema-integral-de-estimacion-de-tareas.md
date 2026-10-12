---
id: DEV-247
title: "Épica: Sistema Integral de Estimación de Tareas (Story Points y T-Shirt Sizes)"
status: draft
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "estimation"
  - "epic"
  - "story-points"
  - "settings"
  - "analytics"
dependencies: []
priority: high
type: epic
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épica paraguas para la incorporación del sistema integral de estimación de tareas en Gripm, permitiendo dimensionar el esfuerzo del backlog bajo estándares ágiles de la industria (Story Points con secuencia Fibonacci o T-Shirt Sizes por tallas cualitativas).

Esta épica agrupa y coordina cuatro fases de entrega técnica y de producto:
1. **DEV-136 (Configuración y Soberanía):** Activación/desactivación en `SettingsView`, elección de método (Fibonacci vs T-Shirt), previsualización de escalas y persistencia reactiva en configuración.
2. **DEV-137 (Modelo de Dominio, Persistencia y MCP):** Soporte del campo `estimate` en frontmatter Markdown (`estimate: 5`), parser y serializador en `backlogMdParser.ts`, middleware API y contratos en herramientas MCP (`gripm_create_task`, `gripm_update_task`, `gripm_get_task`, `gripm_list_tasks`).
3. **DEV-138 (UI/UX en Cockpit):** Selector de estimación en `ItemModal` con feedback visual interactivo y renderizado de badges de estimación en las tarjetas Kanban (`ItemCard`).
4. **DEV-139 (Métricas Ágiles y Filtros):** Agregación de puntos/tallas en `SprintView` (velocidad, capacidad, total de puntos por estado/columna), vista tabular de Backlog y filtrado avanzado por estimación en `FilterBar`.

### Regla de Ciclo de Vida:
Como épica contenedora:
- Entra en `doing` tan pronto como cualquiera de las tareas hijas (`DEV-136` a `DEV-139`) inicie su desarrollo activo.
- Pasa a `review` una vez que las 4 tareas hijas alcancen el estado `ready` para la verificación y auditoría integral de la funcionalidad.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 DEV-136 completada y certificada: activación soberana, selección de escala Fibonacci/T-Shirt y persistencia en configuración
- [ ] #2 DEV-137 completada y certificada: modelo tipado en BacklogItem, persistencia del campo estimate en Markdown y soporte completo en MCP
- [ ] #3 DEV-138 completada y certificada: edición intuitiva en ItemModal y badges visuales accesibles en tarjetas Kanban
- [ ] #4 DEV-139 completada y certificada: métricas agregadas por columna y sprint en SprintView y filtros avanzados por estimación
- [ ] #5 La épica pasa a review y ready únicamente tras la certificación de la Pirámide de Verificación en las cuatro tareas hijas
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Coordinar la ejecución secuencial o paralela de las tareas hijas según su grafo de dependencias:
   - DEV-136 (Settings) -> DEV-137 (Parser & MCP) -> DEV-138 (UI & Modal) -> DEV-139 (Métricas & Analytics).
2. Auditar que la persistencia en Markdown no degrade la performance del sincronizador (`verify-backlog-sync.js`).
3. Validar retrocompatibilidad absoluta: proyectos con estimación desactivada mantienen paridad visual y operativa preexistente sin warnings ni errores.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Invariante: Preservar no-destructividad: si la estimación se desactiva en Settings, los valores previamente guardados en los archivos Markdown no deben eliminarse.
<!-- SECTION:NOTES:END -->
