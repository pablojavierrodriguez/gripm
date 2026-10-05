---
id: DEV-146
title: "Desacople Canónico de Sprint vs Release, Gobernanza de Ciclo de Vida y Release v0.7.0"
status: done
created_date: '2026-10-02'
updated_date: '2026-10-02 23:51'
labels: []
dependencies: []
priority: high
type: tech_debt
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Desacople canónico de Sprint vs Release, actualización de directivas de gobernanza ágil en AGENTS.md, consolidación del paquete v0.7.0 con 25 tareas completadas, bump de versión y publicación en main de GitHub.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Actualizar AGENTS.md reflejando el desacople conceptual entre Sprint y Release (releases por valor entregado y no atadas al sprint)
- [x] #2 Actualizar AGENTS.md definiendo el ciclo de vida de Sprint por timeboxing y ampliación de alcance sin bloqueos artificiales
- [x] #3 Tildar ACs validados pendientes (#6 en DEV-126 y #10 en DEV-130)
- [x] #4 Registrar la versión formal v0.7.0 en backlog/releases.json con sus release notes y los 25 itemCodes completados
- [x] #5 Promover a status done las tareas incluidas en la release v0.7.0
- [x] #6 Incrementar versión en package.json a 0.7.0
- [x] #7 Actualizar README.md y README.es.md con Features Overview (v0.7.0) y conteo real de tareas dogfooding
- [x] #8 Ejecutar npm run build para regenerar dist/ y binarios ejecutables
- [x] #9 Ejecutar npm test y npm run backlog:check verificando 0 errores
- [x] #10 Comitear, crear tag v0.7.0 y pushear a origin/main con tags en GitHub
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
