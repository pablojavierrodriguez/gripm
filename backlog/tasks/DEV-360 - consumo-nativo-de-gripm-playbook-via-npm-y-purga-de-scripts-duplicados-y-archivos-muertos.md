---
id: DEV-360
title: "Consumo nativo de @gripm/playbook via npm y purga de scripts duplicados y archivos muertos"
status: draft
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "architecture"
  - "refactor"
  - "zero-clutter"
  - "dry"
  - "clean-code"
dependencies: []
priority: high
type: refactor
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Actualmente `@gripm/board` predica el principio Zero-Clutter y DRY (`DEV-250` y `DEV-345`), pero en la práctica mantiene **19 scripts duplicados** de `@gripm/playbook` copiados físicamente dentro de `scripts/` y `scripts/lib/` (`audit-ux-code.cjs`, `gate-qa.mjs`, `audit-engine.mjs`, `check-loc.mjs`, `sync-playbook.mjs`, `init.mjs`, `validate-commit-msg.mjs`, `ux-rules.json` y 10 módulos en `scripts/lib/`), además de scripts históricos de migraciones ya superadas (`canonicalize-status.js`, `purge-fabricated-task-sections.js`) y reglas duplicadas en `.agents/rules/git-approval.md` (que duplica `.agents/rules/git-workflow.md`).

Como consumidor de `@gripm/playbook`, `@gripm/board` debe importar y ejecutar el Playbook desde su paquete (`@gripm/playbook`), eliminando toda copia manual de código ajeno y todo archivo muerto sin uso.

### Cross-Project Dependency
- **Requiere en `@gripm/playbook`:** `PLAY-057` (para que `playbook sync` no vuelva a copiar `scripts/` al sincronizar desde `--source` o remoto) y `PLAY-059` (para contar con el auditor UX modularizado).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Vincular `@gripm/playbook` en `devDependencies` de `package.json` y actualizar los imports en `server/services/auditService.ts`, `server/services/backlogService.ts` y `scripts/initScaffold.js` hacia `@gripm/playbook/*` (`@gripm/playbook/audit-engine`, `@gripm/playbook/check-loc`, etc.), manteniendo el empaquetado standalone en `bin/` vía `esbuild`.
  2. Eliminar de `scripts/` y `scripts/lib/` los 19 archivos clonados de `@gripm/playbook` y actualizar los scripts de `package.json` (`gate:review`, `check-loc`, `playbook:check`, `playbook:sync`, `audit:ux`, etc.) y `.githooks/commit-msg` para invocar los binarios de `@gripm/playbook`.
  3. Purgar los scripts de migración muertos (`scripts/canonicalize-status.js`, `scripts/purge-fabricated-task-sections.js` y sus entradas en `package.json`) y eliminar `.agents/rules/git-approval.md` (consolidado en `.agents/rules/git-workflow.md`).
  4. Actualizar `.gripm/playbook-lock.json` mediante `npm run playbook:sync` verificando que queden 0 entradas bajo `scripts/`.
- **Out-of-Scope:**
  - `scripts/import-docs.js` se conserva temporalmente o se reemplaza su fixture en `scripts/test-parser.js` si se decide retirar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `@gripm/playbook` está declarado en `devDependencies` de `package.json` y los módulos internos (`auditService.ts`, `backlogService.ts`, `initScaffold.js`) importan `audit-engine` y `check-loc` desde `@gripm/playbook` sin copias locales en `scripts/`.
- [ ] #2 Los 19 archivos duplicados de `@gripm/playbook` en `scripts/` y el directorio `scripts/lib/` han sido eliminados del repositorio, y `.gripm/playbook-lock.json` registra únicamente archivos bajo `.agents/`.
- [ ] #3 Los scripts históricos sin uso (`scripts/canonicalize-status.js`, `scripts/purge-fabricated-task-sections.js`) y la regla redundante `.agents/rules/git-approval.md` han sido eliminados sin dejar referencias rotas.
- [ ] #4 `npm run build` empaqueta correctamente `bin/gripm.js`, `bin/gripm-mcp.js`, `bin/server.js` y `bin/gripm-cli.js` con `esbuild`, y `npm run publish:check` confirma que el tarball de producción funciona en sala limpia (`test-clean-room.js`).
- [ ] #5 La Pirámide de Verificación completa (`npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run publish:check`, `node scripts/verify-changes.js --all`) pasa con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Completar `PLAY-057` en `gripm-playbook` y vincular `@gripm/playbook` en `gripm/package.json`.
2. Reemplazar los imports relativos `../../scripts/audit-engine.mjs` y `../../scripts/check-loc.mjs` por `@gripm/playbook/audit-engine` y `@gripm/playbook/check-loc`.
3. Eliminar los 19 scripts de Playbook de `scripts/` y `scripts/lib/`, más `canonicalize-status.js`, `purge-fabricated-task-sections.js` y `.agents/rules/git-approval.md`.
4. Actualizar scripts en `package.json`, `.githooks/commit-msg` y tests que referencien rutas directas en `scripts/`.
5. Ejecutar `npm run build` y toda la Pirámide de Verificación.
<!-- SECTION:PLAN:END -->
