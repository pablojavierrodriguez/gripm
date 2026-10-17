---
id: DEV-316
title: "Erradicacion de remanentes anti-em-dash en generadores automaticos y documentacion de arquitectura"
status: done
created_date: '2026-10-17 17:20'
updated_date: '2026-10-17 17:20'
labels: []
dependencies: []
priority: low
type: debt
estimate: "1d"
owner: "Antigravity"
release: ""
targetRelease: ""
created: "2026-10-17"
updated: "2026-10-17"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Escanear el repositorio en busca de caracteres em-dash y en-dash en código, plantillas y documentación Markdown.
- [x] #2 Reemplazar todos los hallazgos por el guión estándar ` - ` con espacios o el guión simple `-`.
- [x] #3 Incorporar una verificación mecánica en `scripts/verify-changes.js` que falle si algún archivo stageado contiene em-dash o en-dash.
- [x] #4 Verificar que `npm run backlog:sync` y los generadores de releases y tareas no generen guiones largos bajo ninguna circunstancia.
- [x] #5 La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `node scripts/verify-changes.js --all`) pasa con 0 errores.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
