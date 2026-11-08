---
id: DEV-367
title: "Adopción de la skill release-management de Playbook y configuración de deploy hooks"
status: ready
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels: []
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
En Gripm Board, las reglas operativas de release (DEV-340, deploy-prod, verify-publish-surface, changelog) están dispersas en AGENTS.md sin una skill formal que guíe al agente paso a paso al realizar cortes de versión.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Consumir la skill `.agents/skills/release-management/SKILL.md` desde Playbook y fijar los hooks específicos de Gripm Board:
     - Pre-Release: Pirámide de Verificación (`verify-changes.js --all`, `tsc --noEmit`, `npm test`, `npm run publish:check`, `npm run test:ui`).
     - Release Notes: `npm run changelog` sincronizado con `backlog/releases.json`.
     - Deploy Hook: Despliegue de producción en Vercel Sandbox (`npm run deploy:prod`) desde `main` (DEV-340) y publicación npm con provenance en CI.
     - Post-Deploy: Reconciliación de backlog (`releasedAt`).
  2. Actualizar `AGENTS.md` para referenciar `.agents/skills/release-management/` como el procedimiento canónico para cortes de versión.
- **Out-of-Scope:**
  - Modificar la lógica interna de `npm run changelog` o `deploy-prod.js`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 La skill .agents/skills/release-management/SKILL.md está presente y sincronizada en Gripm Board.
- [x] #2 AGENTS.md referencia la skill en la sección de releases y flujo ágil de entrega.
- [x] #3 npm run backlog:check y npm run backlog:sync terminan con código 0.
- [x] #4 La Pirámide de Verificación (npm test, npx tsc --noEmit) termina con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
