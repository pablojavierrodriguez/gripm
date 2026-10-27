---
id: DEV-345
title: "Adopcion de Arquitectura Zero-Clutter y Confinamiento en .gripm"
status: ready
created_date: '2026-10-27'
updated_date: '2026-10-27'
labels:
  - "architecture"
  - "refactor"
  - "clean-code"
  - "dx"
dependencies: []
priority: high
type: refactor
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adopcion formal en el repositorio de Gripm Board de la arquitectura **Zero-Clutter** establecida en Gripm Playbook (PLAY-041 y PLAY-051) e integracion con el flujo de onboarding modular de la Suite (DEV-344).

Bajo este principio, la raiz del repositorio consumidor debe permanecer completamente limpia y libre de artefactos o metadatos de herramientas satelite:
1. **Confinamiento de Metadatos en `.gripm/`:**
   - `.playbook-lock.json` se traslada a `.gripm/playbook-lock.json`.
   - `audit-ux-baseline.json` se traslada a `.gripm/audit-ux-baseline.json`.
   - `.uxaudit.json` se traslada a `.gripm/.uxaudit.json`.
   - Purga de la carpeta obsoleta `.playbook-backups/` en raiz (los respaldos se ubican en `.gripm/backups/`).
2. **Seleccion Modular y Sincronizacion de Scripts:**
   - Incorporacion de `scripts/lib/selection.mjs` y extension de `scripts/init.mjs` y `scripts/sync-playbook.mjs` con flags de granularidad (`--select`, `--no-docs`, `--no-agents`) para permitir a repositorios consumidores adoptar solo los componentes necesarios sin contaminar la raiz con documentacion o artefactos superfluos.
   - Purgar plantillas opt-in no utilizadas en flujo Kanban continuo (`docs/DOMAIN_TEMPLATE.md` y `docs/sprints/`), manteniendo el arbol de documentacion vivo y enfocado.
3. **Erradicacion de Duplicados y Scripts Obsoletos:**
   - Eliminacion de `scripts/validate-commit-msg.js`, unificando en el validador sincronizado `scripts/validate-commit-msg.mjs` (actualizando `.githooks/commit-msg` y `scripts/test-commit-msg.js` con soporte integral para Anti-Em-Dash, Conventional Commits y bypass de Git).
   - Limpieza de residuos de `.agents/teamwork/` en el arbol local.
4. **Actualizacion de Scripts de Auditoria, Verificacion y UX:**
   - Sincronizacion de `scripts/audit-ux-code.cjs` con la version canonica de Playbook con resolucion nativa en `.gripm/`.
   - Adaptacion de `scripts/verify-audit-ux-baseline.js` para resolver el baseline desde `.gripm/audit-ux-baseline.json`.
   - Adaptacion de `scripts/verify-publish-surface.js` para asegurar que `.gripm/` y metadatos queden formalmente excluidos del tarball npm.
   - Ajuste de etiquetas de accesibilidad a11y (UX-010) en `CompleteSprintModal.tsx` y `TaxonomyTab.tsx` para satisfacer el baseline estricto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Archivos de metadata confinados en .gripm/ (.gripm/playbook-lock.json, .gripm/audit-ux-baseline.json, .gripm/.uxaudit.json) y carpeta .playbook-backups de raiz eliminada.
- [x] #2 scripts/validate-commit-msg.js eliminado, unificando la validacion en scripts/validate-commit-msg.mjs con .githooks/commit-msg y scripts/test-commit-msg.js en verde.
- [x] #3 scripts/audit-ux-code.cjs sincronizado con soporte para .gripm/ y scripts/verify-audit-ux-baseline.js adaptado con resolucion defensiva.
- [x] #4 Residuos de plantillas innecesarias eliminados (docs/DOMAIN_TEMPLATE.md, docs/sprints) y .agents/teamwork/ limpio.
- [x] #5 Motor de seleccion modular incorporado (scripts/lib/selection.mjs) y scripts/init.mjs / scripts/sync-playbook.mjs actualizados con soporte granular.
- [x] #6 Accesibilidad UX-010 verificada en componentes modificados y superficie de publicacion protegida contra fugas de .gripm/.
- [x] #7 La Piramide de Verificacion pasa al 100% (tsc, npm test, publish:check, backlog:check, verify-changes --all).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mover archivos a .gripm/ y eliminar .playbook-backups/.
2. Eliminar scripts/validate-commit-msg.js, enriquecer scripts/validate-commit-msg.mjs si es necesario y actualizar .githooks/commit-msg y scripts/test-commit-msg.js.
3. Sincronizar scripts de seleccion modular (selection.mjs, init.mjs, sync-playbook.mjs).
4. Actualizar scripts/audit-ux-code.cjs, scripts/verify-audit-ux-baseline.js y scripts/verify-publish-surface.js.
5. Eliminar plantillas obsoletas en docs/ y ajustar referencias.
6. Ejecutar la Piramide de Verificacion completa y someter a auditoria independiente de QA.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Metadatos migrados exitosamente a `.gripm/` sin residuos en la raiz.
- Validador unificado en `scripts/validate-commit-msg.mjs` con Anti-Em-Dash y bypass completo de Git.
- Motor de seleccion modular (`selection.mjs`) sincronizado con Playbook v2.4 para soporte de onboarding granular.
- Plantillas opt-in purgadas de `docs/` y referencias actualizadas en `docs/adr/README.md`, `AGENTS.md`, `TEAM_PLAYBOOK.md` y `pm-orchestrator/SKILL.md`.
- Verificacion de a11y UX-010 aplicada y suite de baseline UX en verde.
- Auditoria de QA independiente ejecutada por sub-agente qa-auditor (68ba73ce-1f29-4a03-87df-6139d6f7a1f5): Piramide de Verificacion completa validada (tsc 0 errores, 27 pasos de test en verde, publish:check limpio, verify-changes --all sin infracciones).
- Tarea formalmente certificada y promovida a `ready`.
<!-- SECTION:NOTES:END -->
