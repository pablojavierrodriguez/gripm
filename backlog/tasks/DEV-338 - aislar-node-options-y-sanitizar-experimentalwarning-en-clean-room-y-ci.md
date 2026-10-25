---
id: DEV-338
title: "Aislar NODE_OPTIONS y sanitizar ExperimentalWarning en test clean-room y CI"
status: done
release: "1.9.0"
created_date: '2026-10-25'
updated_date: '2026-10-25'
labels:
  - "ci"
  - "testing"
  - "bug"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El workflow de GitHub Actions (`ci.yml`) falló en el job `verify` para los 3 runners de Node 22.6.0 (ubuntu-latest, macos-latest y windows-latest) durante el push del release v1.9.0 a `main` (Run 40165250123), impidiendo la ejecución del job dependiente `publish` y la publicación oficial del paquete en npmjs y GitHub Releases.

La falla se originó por una combinación de factores:
1. `ci.yml` inyectaba globalmente a nivel de job `NODE_OPTIONS: "--experimental-strip-types"`.
2. En Node 22.6.0 (la versión inicial donde se introdujo type stripping), Node emite incondicionalmente a `stderr` el mensaje `(node:xxxx) ExperimentalWarning: Type Stripping is an experimental feature and might change at any time`.
3. `scripts/test-clean-room.js` heredaba `process.env.NODE_OPTIONS` al ejecutar los binarios empaquetados (`--version`, `--help`, server) y realizaba aserciones estrictas `assert.strictEqual(stderr.trim(), '')` sin limpiar el entorno ni sanitizar warnings del motor, a diferencia de `scripts/test-package-smoke.js`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/test-clean-room.js` ejecuta los binarios empaquetados bajo un entorno aislado `cleanEnv` sin `NODE_OPTIONS`.
- [x] #2 `scripts/test-clean-room.js` sanitiza warnings del motor (incluyendo `ExperimentalWarning` de Node) antes de asertar stderr limpio en `--version`, `--help` y arranque de servidor.
- [x] #3 `.github/workflows/ci.yml` retira `NODE_OPTIONS: "--experimental-strip-types"` global redundante de `jobs.verify.env` y `jobs.ui-smoke.env`.
- [x] #4 `scripts/test-clean-room.js` pasa exitosamente incluso si se invoca con `NODE_OPTIONS="--experimental-strip-types"`.
- [x] #5 La suite completa `npm test` pasa con código 0 y `node scripts/verify-changes.js --all` sale con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modificar `scripts/test-clean-room.js` para aislar `cleanEnv` (eliminar `NODE_OPTIONS`) y añadir helper `sanitizeStderr`.
2. Actualizar las llamadas de `spawnSync` y `spawn` en `scripts/test-clean-room.js` para usar `cleanEnv` y `sanitizeStderr`.
3. Modificar `.github/workflows/ci.yml` retirando `NODE_OPTIONS` global en `verify` y `ui-smoke`.
4. Probar `test-clean-room.js` localmente simulando `NODE_OPTIONS="--experimental-strip-types"`.
5. Ejecutar la Pirámide de Verificación y auditar con QA sub-agent.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Hallado durante el release de v1.9.0 en GitHub Actions run 40165250123.
<!-- SECTION:NOTES:END -->
