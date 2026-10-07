---
id: DEV-197
title: "Propagar fallos del smoke test Linux"
status: done
created_date: '2026-10-06'
updated_date: '2026-10-07 23:29'
labels:
  - "bug"
  - "ci"
  - "testing"
dependencies: []
priority: high
type: bug
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`npm run test:linux` puede terminar con exit code 0 aunque la suite interna haya fallado. `scripts/repro-ci-linux.sh` imprime `SUITE_EXIT=1`, pero luego completa correctamente el shell del contenedor con el `echo`, ocultando el resultado de `npm test` a CI y a quien ejecuta localmente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `npm run test:linux` devuelve exit code distinto de cero si falla `npm test` dentro del contenedor
- [x] #2 `npm run test:linux` devuelve exit code 0 cuando pasan todos los pasos
- [x] #3 La suite Linux corre contra el árbol local actual, incluyendo archivos no stageados
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `scripts/repro-ci-linux.sh` ahora conserva e imprime el código de la suite y lo devuelve como código del contenedor, en lugar de terminar con el `echo` exitoso.
- `npm run test:linux` verifica el código final contra el árbol de trabajo del host copiado al contenedor.
<!-- SECTION:NOTES:END -->
