---
id: DEV-156
title: "Normalizacion Canonica de Slugs de Tareas en Backlog dev a DEV"
status: dismissed
created_date: '2026-10-04'
updated_date: '2026-10-04 06:34'
labels:
  - "backlog"
  - "hygiene"
  - "standards"
dependencies:
  - "DEV-152"
priority: medium
type: chore
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolución del hallazgo §5.2 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

`AGENTS.md` §6.4 establece la regla canónica de nombres de archivos: `DEV-XXX - slug-descriptivo.md`. Actualmente, 101 de las 150 tareas históricas en `backlog/tasks/` tienen formato en minúsculas `dev-0XX - ...`, lo cual genera inconsistencia en el repositorio y contradice las normas operativas escritas.

Se deben normalizar los nombres de los 101 archivos preservando su frontmatter, sus criterios de aceptación y actualizando de forma transparente y determinista `BACKLOG.md` mediante `npm run backlog:sync`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Todos los archivos en `backlog/tasks/` siguen el patrón estricto `DEV-XXX - ...md` (0 archivos con prefijo en minúscula `dev-`)
- [ ] #2 `npm run backlog:sync` y `npm run backlog:check` finalizan con código 0
- [ ] #3 `npx tsc --noEmit` y `npm test` verifican que no haya rutas relativas rotas en tests o scripts
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Escribir un script de migración seguro para renombrar los archivos `dev-0XX` a `DEV-0XX` respetando mayúsculas canónicas.
2. Ejecutar `npm run backlog:sync`.
3. Validar con `npm run backlog:check`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
En sistemas de archivos macOS (APFS case-insensitive por defecto), los renombres de solo cambio de mayúsculas deben usar un paso intermedio temporal o invocación directa de git mv para persistir en Git sin conflictos.
<!-- SECTION:NOTES:END -->
