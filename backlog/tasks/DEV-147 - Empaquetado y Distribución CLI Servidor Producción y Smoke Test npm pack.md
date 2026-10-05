---
id: DEV-147
title: "Empaquetado y Distribución CLI: Servidor de Producción, Dependencias Runtime y Smoke Test de npm pack"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-03 19:48'
labels:
  - "cli"
  - "packaging"
  - "npm"
  - "blocker"
dependencies: []
priority: urgent
type: bug
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver el crash crítico detectado en auditoría externa al instalar `gripm` como paquete npm global o ejecutarlo con `npx gripm`.
Actualmente `package.json` incluye en `files` únicamente `bin/`, `dist/`, `data/demo-backlog.json` y READMEs, omitiendo `scripts/` y `vite.config.ts`, mientras `bin/gripm.js` intenta importar `../scripts/*.js` y levantar el servidor dev de Vite con `dependencies` completamente vacío.

Esta tarea aborda:
1. Asegurar que `bin/gripm.js` cuente con todos los scripts necesarios o un servidor Node de producción autónomo que sirva `dist/` y el API sin depender del servidor de desarrollo de Vite.
2. Mover las dependencias esenciales de ejecución a `dependencies` en `package.json` o empaquetar de forma autocontenida.
3. Incorporar un smoke test automatizado en `npm test` que ejecute `npm pack`, extraiga el tarball en un directorio temporal y verifique que `node package/bin/gripm.js --help` ejecute sin errores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `package.json` incluye en `files` todos los archivos y carpetas requeridos en tiempo de ejecución (`scripts`, `dist`, etc.) o empaqueta un bundle autónomo
- [x] #2 Las dependencias requeridas en tiempo de ejecución por `bin/gripm.js` están correctamente declaradas en `dependencies`
- [x] #3 `bin/gripm.js` no arroja `ERR_MODULE_NOT_FOUND` al ejecutarse desde un tarball empaquetado con `npm pack`
- [x] #4 Implementar script de smoke test (`scripts/test-package-smoke.js`) que empaquete, extraiga y pruebe `--help` del CLI
- [x] #5 Integrar el smoke test en `npm test` para prevenir regresiones en CI y antes de cualquier release
- [x] #6 `npm test`, `npx tsc --noEmit` y `npm run backlog:check` pasan con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `scripts/test-package-smoke.js` que empaqueta con `npm pack`, descomprime en un sandbox temporal y ejecuta `node package/bin/gripm.js --help`.
2. Actualizar `package.json` agregando `scripts` a `files` y pasando dependencias runtime necesarias (ej. `vite`, o crear servidor de producción liviano).
3. Validar con `npm test`.
<!-- SECTION:PLAN:END -->
