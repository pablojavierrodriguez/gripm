---
id: DEV-144
title: "Migración Integral de Rebranding: Renombrado de Binarios, Documentación y Alias Retrocompatibles"
status: done
created_date: '2026-10-01'
updated_date: '2026-10-03 21:38'
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
Una vez seleccionado y aprobado el nombre definitivo del producto, ejecutar la migración técnica integral de la identidad: package.json, binarios CLI, aliases retrocompatibles, componentes visuales de UI y suite completa de documentación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Actualizar `package.json` con el nuevo nombre y configurar binarios duales para retrocompatibilidad total (`bin: { "nuevo-nombre": "...", "devboard": "..." }`)
- [x] #2 Actualizar textos de marca, logos y encabezados en la UI (`src/components/Header.tsx`, `SettingsView.tsx`, etc.)
- [x] #3 Actualizar toda la documentación técnica: README.md, README.es.md, AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md, AGENTIC_PLAYBOOK.md
- [x] #4 Actualizar scripts de scaffolding (`initScaffold.js`), binarios CLI y updateChecker con las nuevas referencias y aliases
- [x] #5 Verificar que `npx tsc --noEmit`, `npm test` y `npm run build` pasan sin errores con el nuevo nombre
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar package.json con 'name: gripm' y configurar binarios duales: gripm, gripm-mcp, devboard, devboard-mcp.
2. Crear bin/gripm.js y actualizar scripts/build-binaries.js para soportar tanto gripm-mcp.js como devboard-mcp.js.
3. Actualizar index.html y src/components/Header.tsx con el branding 'gripm'.
4. Actualizar scripts/initScaffold.js y bin/devboard.js con el banner y comandos de gripm.
5. Actualizar documentacion tecnica: README.md, README.es.md, CONTRIBUTING.md, AGENTS.md, ARCHITECTURE.md, AGENTIC_PLAYBOOK.md.
6. Ejecutar piramide de verificacion: tsc, test, backlog:check, audit:ux y build.
<!-- SECTION:PLAN:END -->
