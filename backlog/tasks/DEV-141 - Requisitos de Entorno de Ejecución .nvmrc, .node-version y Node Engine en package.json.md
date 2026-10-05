---
id: DEV-141
title: "Requisitos de Entorno de Ejecución: .nvmrc, .node-version y Node Engine en package.json"
status: done
created_date: '2026-10-01'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: medium
type: chore
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fijar la versión mínima requerida de Node.js mediante archivos estándar (.nvmrc, .node-version), metadato engines en package.json y documentación clara para que cualquier desarrollador clone y ejecute sin fallos por versiones no compatibles.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear archivo `.nvmrc` con `22.6.0` (versión requerida para flag `--experimental-strip-types`)
- [x] #2 Crear archivo `.node-version` con `22.6.0` para gestores alternativos (fnm, volta, asdf)
- [x] #3 Verificar que `package.json` incluye `"engines": { "node": ">=22.6.0" }`
- [x] #4 Documentar en CONTRIBUTING.md la versión requerida de Node y el motivo técnico de `--experimental-strip-types`
- [x] #5 Agregar badge de versión mínima de Node en README.md y README.es.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear archivo .nvmrc con '22.6.0'.
2. Crear archivo .node-version con '22.6.0'.
3. Verificar 'engines' en package.json.
4. Actualizar CONTRIBUTING.md con la justificación técnica de Node >=22.6.0.
5. Agregar badge de Node en README.md y README.es.md.
<!-- SECTION:PLAN:END -->
