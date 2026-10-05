---
id: DEV-155
title: "Saneamiento de Artefactos de Distribucion Shims de Binarios DTS Obsoletos y Residuos de Marca"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 06:34'
labels:
  - "packaging"
  - "hygiene"
  - "open-source-launch"
dependencies:
  - "DEV-144"
  - "DEV-149"
  - "DEV-151"
priority: medium
type: chore
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolución de los hallazgos de empaquetado e higiene reportados en la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md` §5.1, §5.3, §5.4, §5.5, §5.8, §5.10):

1. **Renombrado/Alias de Skill de Agentes:** `.agents/skills/devboard/` todavía contiene la denominación previa a rebranding y es instalada en repositorios externos durante `--init`. Se debe migrar a `.agents/skills/gripm/` manteniendo alias retrocompatible si fuera necesario.
2. **Shims en Binarios Duplicados:** `bin/devboard.js` y `bin/devboard-mcp.js` son duplicados exactos (~195 KB) de `bin/gripm.js` y `bin/gripm-mcp.js`. Deben convertirse en wrappers ligeros de 3 líneas que importen el binario canónico correspondiente.
3. **Eliminación de `.d.ts` Obsoletos:** Eliminar los 6 archivos `.d.ts` en `scripts/` (`import-docs.d.ts`, `initScaffold.d.ts`, `portUtils.d.ts`, `registryConfig.d.ts`, `uninstall.d.ts`, `updateChecker.d.ts`) y agregarlos a `.gitignore` dado que `tsconfig` opera con `"noEmit": true`.
4. **Deriva de Versión:** Corregir el fallback `let appVersion = '0.5.0'` en `vite.config.ts:31` para que coincida con `1.0.0` y actualizar targets hardcodeados en `scripts/import-docs.js`.
5. **Residuo de Marca en Demo Backlog:** Actualizar `data/demo-backlog.json` para reemplazar menciones residuales de "DevBoard" por "gripm".
6. **Configuración local `.gripm/config.json`:** Sanear opciones personales commiteadas y unificar subtítulos de columnas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Renombrar `.agents/skills/devboard/` a `.agents/skills/gripm/` y actualizar el asistente `--init` para instalar `gripm`
- [x] #2 `bin/devboard.js` y `bin/devboard-mcp.js` convertidos en shims ligeros que reexportan/importan `bin/gripm.js` y `bin/gripm-mcp.js`
- [x] #3 6 archivos `.d.ts` en `scripts/` eliminados del árbol de trabajo y `*.d.ts` ignorado en `.gitignore`
- [x] #4 Fallback de `appVersion` en `vite.config.ts` actualizado a `1.0.0` y `scripts/import-docs.js` actualizado
- [x] #5 `data/demo-backlog.json` libre de menciones a DevBoard
- [x] #6 `.gripm/config.json` saneado y estandarizado
- [x] #7 `npm run publish:check` y `npm test` finalizan con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear los shims para `bin/devboard.js` y `bin/devboard-mcp.js`.
2. Renombrar la skill e integrar en el script de scaffolding.
3. Eliminar `.d.ts` obsoletos de `scripts/`.
4. Actualizar `appVersion` y sanear `data/demo-backlog.json`.
5. Ejecutar verificaciones completas.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reducir el peso del tarball y eliminar cualquier disparidad entre la marca pública gripm y los archivos distribuidos.
<!-- SECTION:NOTES:END -->
