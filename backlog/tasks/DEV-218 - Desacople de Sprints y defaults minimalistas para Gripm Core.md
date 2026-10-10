---
id: DEV-218
title: "Desacople de Sprints y defaults minimalistas para Gripm Core"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "core"
  - "kanban"
  - "minimalism"
  - "settings"
  - "ui"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establecer Gripm Core como un producto minimalista por defecto, desacoplando Sprints y Scrum de la configuración inicial del tablero:
1. **Defaults canónicos orientados a flujo continuo:** En `src/types.ts` y en la resolución de configuración, la metodología por defecto pasa a ser `kanban` en lugar de `scrumban`, con la pestaña de Sprints deshabilitada por defecto (`enabledTabs: { kanban: true, sprint: false, release: true }`).
2. **Ocultamiento condicional en UI (Zero-Leakage):** Cuando el módulo de Sprints esté inactivo (`enabledTabs.sprint === false` o metodología `kanban`), la interfaz debe ocultar limpiamente los selectores y metadatos de Sprint en `ItemModal`, `FilterBar` y tarjetas, sin dejar huecos ni campos mudos.
3. **Preservación total de retrocompatibilidad:** Los proyectos que ya tengan configurado `sprint: true` o metodología `scrum`/`scrumban` continúan viendo y usando Sprints sin alteración ni pérdida de datos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 La metodologia por defecto en configuraciones nuevas es kanban con enabledTabs.sprint en false
- [x] #2 ItemModal oculta el selector de sprint cuando enabledTabs.sprint es false o methodology es kanban
- [x] #3 FilterBar oculta el filtro y dropdown de sprints cuando el modulo de sprints no esta activo
- [x] #4 Proyectos con configuracion previa de sprints o scrumban preservan la visibilidad de sprints sin regresion
- [x] #5 La suite de verificacion npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- No eliminar modelos de datos ni código de Sprints existente, únicamente desacoplar su activación por defecto y visibilidad en UI.
<!-- SECTION:NOTES:END -->
