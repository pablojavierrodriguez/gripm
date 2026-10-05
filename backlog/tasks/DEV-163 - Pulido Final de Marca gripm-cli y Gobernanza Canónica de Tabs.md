---
id: DEV-163
title: "Pulido Final de Marca gripm-cli y Gobernanza Canónica de Tabs"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 17:47'
labels:
  - "branding"
  - "cli"
  - "governance"
  - "open-source-launch"
dependencies:
  - "DEV-161"
  - "DEV-162"
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cierre de los dos últimos residuos identificados en la auditoría final de lanzamiento (Rev 4 de `docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

1. **Renombrar `scripts/devboard-cli.ts` a `scripts/gripm-cli.ts`:**
   - Actualizar el banner y texto de ayuda en `printUsage()` para decir `📋 gripm CLI - Gestión, Auditoría y Mutaciones de Backlog` y `gripm [comando]`.
   - Actualizar las referencias en `package.json` (`scripts.tasks`), `scripts/verify-backlog-sync.js` y `scripts/verify-resilience-and-cli.js`.
2. **Gobernanza Canónica de Tabs en `.gripm/config.json`:**
   - Restaurar `"sprint": true` dentro de `enabledTabs` en `.gripm/config.json` para que los clones públicos del repositorio no nazcan con pestañas de primer orden artificialmente desactivadas.
   - Actualizar la regla de gobernanza #17 en `AGENTS.md` para cubrir explícitamente `enabledTabs`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Renombrar `scripts/devboard-cli.ts` a `scripts/gripm-cli.ts` y actualizar referencias en `package.json`, `verify-backlog-sync.js` y `verify-resilience-and-cli.js`
- [x] #2 Actualizar banner de `printUsage()` en `scripts/gripm-cli.ts` a "📋 gripm CLI" y "gripm [comando]"
- [x] #3 Restaurar `enabledTabs.sprint: true` en `.gripm/config.json`
- [x] #4 Explicitar `enabledTabs` en la Regla 17 de `AGENTS.md`
- [x] #5 Pirámide de verificación en verde (`tsc`, `npm test`, `npm run backlog:check`, `npm run publish:check`, `npm run build`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Renombrar archivo y actualizar scripts invocadores.
2. Actualizar strings de ayuda de CLI.
3. Actualizar `.gripm/config.json` y `AGENTS.md`.
4. Ejecutar pirámide de verificación completa.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: La compatibilidad de lectura legacy (`.devboard/` y `.devboard/config.json`) se mantiene intacta en los parsers de lectura.
<!-- SECTION:NOTES:END -->
