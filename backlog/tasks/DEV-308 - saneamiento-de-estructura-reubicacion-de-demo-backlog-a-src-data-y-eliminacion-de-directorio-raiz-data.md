---
id: DEV-308
title: "Saneamiento de Estructura: Reubicación de demo-backlog.json a src/data y Eliminación del Directorio data/"
status: ready
created_date: '2026-10-16'
updated_date: '2026-10-16'
labels:
  - "refactor"
  - "tech_debt"
  - "packaging"
  - "dx"
dependencies: []
priority: low
type: tech_debt
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reubicación del dataset semilla de demostración `data/demo-backlog.json` a `src/data/demo-backlog.json` y erradicación del directorio raíz huérfano `data/`.

### Diagnóstico y Justificación:

1. **Directorio huérfano y residuo histórico:** Originalmente, `data/` albergaba las bases de datos locales del CLI (`projects-registry.json` y `dev-board.json`). Con la migración a XDG en el directorio del usuario (`~/.gripm/registry.json`), `data/demo-backlog.json` quedó como el único archivo superviviente en `data/`.
2. **Cohesión de módulos:** En el frontend, `src/data/sandbox.ts` consume directamente este fixture para inicializar la sandbox interactiva en Vercel. Ubicarlo en `src/data/demo-backlog.json` consolida los datos y adaptadores en el mismo subárbol de fuentes (`src/data/`).
3. **Reducción de fragmentación en empaquetado y guards:** Eliminar el directorio `data/` simplifica la raíz del proyecto y unifica las referencias en `package.json:files`, `server/services/registry.ts` y los scripts de verificación (`verify-publish-surface.js`, `verify-sandbox.js`, `verify-json-sprint-persistence.js`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `data/demo-backlog.json` es reubicado a `src/data/demo-backlog.json` y el directorio raíz `data/` es eliminado del repositorio
- [x] #2 `src/data/sandbox.ts` actualiza su importación estática a `./demo-backlog.json`
- [x] #3 `server/services/registry.ts` actualiza la constante `DEMO_FILE` hacia `src/data/demo-backlog.json`
- [x] #4 `package.json` actualiza la allowlist en `files` reemplazando `data/demo-backlog.json` por `src/data/demo-backlog.json` (o la ruta canónica empaquetada)
- [x] #5 `scripts/verify-publish-surface.js`, `scripts/verify-sandbox.js` y `scripts/verify-json-sprint-persistence.js` actualizan sus rutas hacia la nueva ubicación
- [x] #6 Recompilación de binarios (`bin/server.js` y `bin/gripm-mcp.js`) reflejando la nueva ruta
- [x] #7 La suite completa de verificación pasa en verde (`npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run publish:check`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mover `data/demo-backlog.json` a `src/data/demo-backlog.json` y remover la carpeta `data/`.
2. Actualizar el import en `src/data/sandbox.ts`.
3. Actualizar `DEMO_FILE` en `server/services/registry.ts`.
4. Actualizar `files` en `package.json`.
5. Actualizar scripts en `scripts/verify-publish-surface.js`, `scripts/verify-sandbox.js`, `scripts/verify-json-sprint-persistence.js`.
6. Recompilar binarios (`npm run build:bin`) y verificar build (`npm run build`).
7. Ejecutar `npm test` y `npm run publish:check`.
<!-- SECTION:PLAN:END -->
