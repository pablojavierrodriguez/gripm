---
id: DEV-123
title: "GitHub Actions CI/CD Pipeline y Templates de Issues y Pull Requests"
status: done
created_date: '2026-09-28'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establecer pipeline de Integración Continua en GitHub Actions y templates de Issues/PR que garanticen calidad en contribuciones externas y automaticen verificación del build en cada PR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear `.github/workflows/ci.yml` que ejecute: `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run build` en Node 22.x sobre ubuntu-latest
- [x] #2 Crear `.github/ISSUE_TEMPLATE/bug_report.yml` (formulario YAML) con campos: descripción, pasos para reproducir, comportamiento esperado vs actual, versión de Node, SO, storage engine
- [x] #3 Crear `.github/ISSUE_TEMPLATE/feature_request.yml` (formulario YAML) con campos: problema que resuelve, solución propuesta, alternativas, relevancia para pair programming con IA
- [x] #4 Crear `.github/PULL_REQUEST_TEMPLATE.md` con checklist: descripción, tipo de cambio, task del backlog referenciada, `tsc --noEmit` pasa, `npm test` pasa, screenshots si aplica
- [x] #5 Crear `.github/ISSUE_TEMPLATE/config.yml` configurando el selector de issues y link a CONTRIBUTING.md
- [x] #6 Verificar sintaxis YAML válida en todos los archivos del directorio `.github/`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear directorio .github/workflows/ y redactar ci.yml con matriz Node 22.x para PRs y pushes a main.
2. Crear directorio .github/ISSUE_TEMPLATE/ y redactar config.yml, bug_report.yml y feature_request.yml.
3. Crear .github/PULL_REQUEST_TEMPLATE.md con checklist riguroso de dogfooding, tests y piramide de verificacion.
4. Validar sintaxis YAML con parser nativo.
5. Ejecutar verificacion de calidad: backlog:check y tests.
<!-- SECTION:PLAN:END -->
