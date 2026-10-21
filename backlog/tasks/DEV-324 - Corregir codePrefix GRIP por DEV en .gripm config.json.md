---
id: DEV-324
title: "Corregir codePrefix GRIP por DEV en .gripm/config.json"
status: draft
created_date: '2026-10-21'
updated_date: '2026-10-21 12:00'
labels:
 - "config"
 - "bug"
dependencies: []
priority: high
type: bug
estimate: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`.gripm/config.json` declara `"codePrefix": "GRIP"`, pero este repositorio usa el prefijo `DEV`. El bug ya causo un efecto observable: el CLI creo la tarea `GRIP-320` por error y hubo que renombrarla a `DEV-323`.

`codePrefix` no es decorativo. Lo leen dos caminos de creacion:

- `scripts/gripm-cli.js:920` lo usa para generar el ID de la tarea nueva.
- `src/lib/sandbox.ts:144` y `src/lib/sandbox.ts:372` lo usan como `project?.codePrefix ?? 'TASK'`.

Mientras el config declare `GRIP`, cualquier tarea creada desde la CLI o el sandbox de gripm sobre este repo vuelve a salir mal prefijada. Corregirlo es la mitigacion del defecto; la alternativa de proceso (escribir los IDs a mano) no arregla nada y deja la bomba armada.

Revisar de paso la inconsistencia relacionada en el mismo archivo: `defaultView: "sprint"` contra `enabledTabs.sprint: false`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `.gripm/config.json` declara `"codePrefix": "DEV"`.
- [ ] #2 `npx tsc --noEmit` con 0 errores.
- [ ] #3 `npm test` con codigo 0.
- [ ] #4 `node scripts/verify-changes.js --all` con codigo 0.
- [ ] #5 No quedan tareas `GRIP-*` en `backlog/tasks/` ni referencias al prefijo `GRIP` como prefijo de este repo.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cambiar `"codePrefix": "GRIP"` por `"codePrefix": "DEV"` en `.gripm/config.json`.
2. Evaluar `defaultView: "sprint"` contra `enabledTabs.sprint: false` y alinearlos.
3. Verificar que no quede ningun `GRIP-*` residual en `backlog/tasks/`.
4. Correr `npx tsc --noEmit`, `npm test` y `node scripts/verify-changes.js --all`.
5. `npm run backlog:sync` y commit `fix(DEV-324): ...`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
`AGENTS.md` regla 17 define `.gripm/config.json` como configuracion canonica OSS del repo (`language: en`, `theme: dark`, `density: comfortable`, `methodology: kanban`, `enabledTabs`) y prohíbe commitear preferencias de entorno personales. Cambiar `codePrefix` a `DEV` no entra en esa prohibicion: es la correccion de un valor que describe al propio repositorio, igual que `methodology`.
<!-- SECTION:NOTES:END -->
