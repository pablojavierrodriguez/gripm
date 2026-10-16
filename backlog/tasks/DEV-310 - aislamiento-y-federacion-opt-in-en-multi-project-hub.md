---
id: DEV-310
title: "Aislamiento y Federación Opt-In en Multi-Project Hub: Exclusión de Proyectos en Modo Single"
status: draft
created_date: '2026-10-16'
updated_date: '2026-10-16'
labels:
  - "projects"
  - "hub"
  - "security"
  - "settings"
  - "backend"
dependencies: []
priority: medium
type: feature
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Garantizar la soberanía, aislamiento y privacidad de proyectos locales configurados en modo mono-proyecto (`mode: "single"` en `.gripm/config.json`), evitando que aparezcan listados en el selector de proyectos (Hub) de otros repositorios que tengan activo el modo multi-proyecto (`mode: "multi"`).

### Diagnóstico de la Causa Raíz:

1. **Frontera de Visibilidad Incompleta:**
   Actualmente, el switch de `mode` en `.gripm/config.json` solo condiciona la interfaz cuando `gripm` se inicia directamente dentro de ese repositorio (`projectsToProcess = [activeProject]`). Sin embargo, cuando se inicia `gripm` en otro proyecto que tiene `multi` activo, `server/routes/api.ts:138` procesa incondicionalmente todos los proyectos del registro global (`registry.projects`), exponiendo proyectos que se configuraron explícitamente para operar de forma aislada.

2. **Federación Opt-In Deseada:**
   Si un proyecto declara `mode: "single"` en su `.gripm/config.json`, no solo expresa la intención de no ver otros proyectos (*inbound*), sino también la de no ser indexado ni accesible desde los Hubs de otros proyectos de la máquina (*outbound*), protegiendo proyectos privados, personales o bajo acuerdos de confidencialidad.

### Solución Técnica:

- En `server/routes/api.ts`, durante la resolución de `projectsToProcess` en modo Hub, filtrar aquellos proyectos registrados cuyo `.gripm/config.json` tenga `mode === 'single'`.
- Preservar al proyecto activo actual (aunque fuera single) y al proyecto Demo si está habilitado.
- Añadir pruebas de integración que aseguren que un repositorio marcado como `single` no se fuga en el selector del Hub de otro proyecto `multi`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `GET /api/data` en modo Hub (`isMultiMode`) excluye del catálogo de proyectos a aquellos repositorios registrados cuyo `.gripm/config.json` declare `mode: "single"`
- [ ] #2 Un proyecto con `mode: "single"` permanece 100% accesible y funcional cuando `gripm` se inicia directamente desde su directorio local
- [ ] #3 El proyecto virtual Demo permanece visible y accesible en modo Hub sin verse bloqueado por el filtro
- [ ] #4 La prueba de integración valida mecánicamente el aislamiento y la no exposición de proyectos en modo `single`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `readProjectConfig` en `server/routes/api.ts` para evaluar la visibilidad de cada proyecto en el registro.
2. Aplicar el filtro opt-in en la resolución de `projectsToProcess`.
3. Agregar caso de prueba en `scripts/verify-integration.js`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
