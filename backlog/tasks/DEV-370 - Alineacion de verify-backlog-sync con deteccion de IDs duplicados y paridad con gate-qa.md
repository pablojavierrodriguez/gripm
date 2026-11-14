---
id: DEV-370
title: "Alineacion de verify-backlog-sync con deteccion de IDs duplicados y paridad con gate-qa"
status: done
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels:
  - "backlog"
  - "ci"
  - "ux"
  - "playbook-sync"
dependencies: []
priority: high
type: feature
milestone: "v1.12.0"
claimed_by: "antigravity:dev-00a9c7bd"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Auditorias reales detectaron desalineacion entre el validador local de gripm (`scripts/verify-backlog-sync.js`) y `gate-qa.mjs` de `@gripm/playbook`:
1. `verify-backlog-sync.js` no verificaba la unicidad global ni acotada de `id:` entre los archivos de `backlog/tasks/`, permitiendo falsos verdes si existian dos archivos declarando el mismo ID en el backlog activo o en sprints activos.
2. Al sincronizar `@gripm/playbook` actualizado (`PLAY-070..073`: reglas `UX-018`, `UX-019`, `UX-020`, `physical-hit-test.mjs`, matriz de alcanzabilidad `BottomNav` y manejo acotado de IDs duplicados), se detecta en `gripm` un overlay fijo sin `createPortal` en `src/components/header/HeaderMobileMenu.tsx` (atrapado potencialmente detras de `<header className="sticky top-0 z-30 backdrop-blur-md">`).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Actualizar `scripts/verify-backlog-sync.js` para detectar IDs duplicados entre `taskEntries` leyendo sprints activos desde `backlog/sprints.json`:
    - Bloquea (`errorsFound++`) si alguna copia duplicada tiene estado no historico (fuera de `['done', 'dismissed']`), pertenece a un sprint con `status === 'active'`, o si se pasa `--strict`.
    - Emite advertencia (`▲`) sin bloquear cuando todas las copias duplicadas son puramente historicas (`done` / `dismissed`) fuera de sprints activos y sin `--strict`.
  - Agregar tests unitarios y CLI de paridad en `scripts/test-verify-backlog-sync.js` y registrar el paso en `scripts/run-tests.js`.
  - Sincronizar `@gripm/playbook` actualizado (`PLAY-070..073`) sobre `.agents/` y resolver el hallazgo real `UX-018` en `src/components/header/HeaderMobileMenu.tsx` mediante `createPortal(..., document.body)`.
  - Ejecutar la Piramide de Verificacion completa de `gripm` (`tsc`, `npm test`, `audit:ux:strict`, `backlog:sync`, `backlog:check`, `publish:check`, `build`, `verify-changes --all`).
- **Out-of-Scope:**
  - Modificar la interfaz visual del menu movil mas alla de su encapsulacion en `createPortal`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/verify-backlog-sync.js` detecta IDs duplicados en `backlog/tasks/`, bloqueando cuando alguna copia esta fuera de `done`/`dismissed`, pertenece a un sprint activo (`backlog/sprints.json`) o se pasa `--strict`, y emitiendo advertencia `▲` sin bloquear para duplicados puramente historicos.
- [x] #2 `scripts/test-verify-backlog-sync.js` (registrado en `scripts/run-tests.js`) verifica regresion de duplicados historicos vs activos y `--strict`.
- [x] #3 `.agents/` queda sincronizado con `@gripm/playbook` (`UX-018..020`, `physical-hit-test.mjs`, BottomNav Reachability Matrix y scoped collision checks) y `src/components/header/HeaderMobileMenu.tsx` utiliza `createPortal(..., document.body)` pasando `UX-018`.
- [x] #4 Piramide de Verificacion completa en `gripm` (`npx tsc --noEmit`, `npm test`, `npm run audit:ux:strict` contra catalogo actualizado, `npm run backlog:sync && npm run backlog:check`, `npm run publish:check`, `npm run build`, `node scripts/verify-changes.js --all`) pasa con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Iniciar `DEV-370` (`draft` -> `doing`).
2. Implementar deteccion acotada de IDs duplicados + flag `--strict` en `scripts/verify-backlog-sync.js`.
3. Corregir `src/components/header/HeaderMobileMenu.tsx` con `createPortal(..., document.body)`.
4. Agregar `scripts/test-verify-backlog-sync.js` y sumarlo a `scripts/run-tests.js`.
5. Sincronizar `@gripm/playbook` local hacia `gripm` y validar toda la Piramide de Verificacion.
<!-- SECTION:PLAN:END -->
