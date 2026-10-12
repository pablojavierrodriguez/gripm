---
id: DEV-250
title: "Desacople de Gripm Playbook en el onboarding de gripm init y superficie limpia de Gripm Board"
status: doing
created_date: '2026-10-12'
updated_date: '2026-10-12 06:59'
labels:
  - "onboarding"
  - "playbook"
  - "packaging"
  - "dx"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alinear el onboarding de `@gripm/board` (`gripm --init`) y su superficie de publicación para erradicar la apariencia de duplicación o "fork a plena vista" con `gripm-playbook`, consolidando los siguientes puntos:

1. **Denominación Canónica Unificada:**
   Erradicar todas las referencias residuales a "Agentic Team Playbook" en el código, CLI y documentación, unificando bajo el nombre de producto oficial: **Gripm Playbook** (`@gripm/playbook`).

2. **Onboarding Opcional y Limpio (`gripm --init` / `runInitWizard`):**
   Incorporar en el asistente interactivo de inicialización (`scripts/initScaffold.js`) la pregunta explícita:
   `¿Deseas instalar también Gripm Playbook (@gripm/playbook) con roles de equipo de agentes (PM, Principal Engineer, QA, Designer) y auditoría de UX? (s/N)`
   - Si el usuario rechaza (default `N` o perfil minimalista): el proyecto consumidor queda **100% limpio**. Solo se configuran `backlog/tasks/`, `.gripm/config.json` y la skill de conexión `.agents/skills/gripm/SKILL.md`. No se descargan ni inyectan roles, scripts de auditoría ni templates de sprint ajenos.
   - Si el usuario acepta: se ejecuta la sincronización de `@gripm/playbook` en ese momento (invocando el sincronizador o `npx @gripm/playbook sync`).

3. **Superficie de Distribución Limpia (`package.json` de Gripm Board):**
   En el campo `files` de `package.json`, acotar `".agents"` a `".agents/skills/gripm"` (más templates necesarios en `scripts/templates/`). Gripm Board no debe distribuir en su tarball de npm las skills internas del Playbook (`principal-engineer`, `rigorous-qa-auditor`, etc.) que viven en el repo únicamente por dogfooding de desarrollo propio.

4. **Clarificación y Limpieza en el Repositorio `gripm`:**
   Documentar en `AGENTS.md` y `docs/` que las skills de Playbook presentes en `.agents/skills/` del repositorio `gripm` residen allí en calidad de dogfooding metodológico para el desarrollo del producto, no como código fuente de Gripm Board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El asistente de inicialización scripts/initScaffold.js pregunta explícitamente si se desea instalar Gripm Playbook, dejando el proyecto completamente limpio si se responde que no.
- [ ] #2 Si el usuario acepta instalar Gripm Playbook en el init, se dispara la instalación/sincronización canónica de @gripm/playbook.
- [ ] #3 package.json acota su campo files para incluir únicamente .agents/skills/gripm en lugar del comodín .agents completo, verificado por verify-publish-surface.js.
- [ ] #4 Todas las menciones residuales de 'Agentic Team Playbook' en CLI, scripts y documentación viva se unifican a 'Gripm Playbook'.
- [ ] #5 Se documenta formalmente la frontera entre el producto Gripm Board (Cockpit/MCP) y Gripm Playbook (framework metodológico), aclarando el rol del dogfooding en el repo gripm.
- [ ] #6 Pirámide de verificación en verde (npx tsc --noEmit, npm test, npm run backlog:check, npm run publish:check con código 0).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modificar `scripts/initScaffold.js` para incorporar la pregunta de adopción de Gripm Playbook en el flujo interactivo y las opciones del CLI (`--with-playbook` / `--no-playbook`).
2. Conectar la ejecución del sincronizador de Gripm Playbook cuando el usuario responda afirmativamente.
3. Actualizar `package.json` files para no empaquetar `.agents` completo sino `.agents/skills/gripm`.
4. Ajustar `scripts/verify-publish-surface.js` si corresponde para validar la nueva superficie acotada.
5. Reemplazar "Agentic Team Playbook" por "Gripm Playbook" en `bin/gripm.js`, `scripts/sync-playbook.mjs` y docs.
6. Ejecutar `npm run backlog:sync` y validar que todos los checks pasen con código 0.
<!-- SECTION:PLAN:END -->
