---
id: DEV-366
title: "Fijar @gripm/playbook a la versión publicada 2.9.1"
status: ready
created_date: '2026-11-03'
updated_date: '2026-11-04'
labels:
  - "dependency"
  - "release"
  - "integration"
dependencies:
  - "DEV-360"
priority: high
type: chore
claimed_by: "copilot:db2bad02-4e8a-4cc5-a4e1-208400ba01ff"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
`@gripm/board` todavía instala `@gripm/playbook` desde `file:../gripm-playbook`, por lo que su dependencia depende de un checkout hermano y no de la versión 2.9.1 ya publicada en npm.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Cambiar `@gripm/playbook` en `devDependencies` de `package.json` a `^2.9.1` y actualizar `package-lock.json` para que resuelva 2.9.1 desde npm.
  2. Verificar que `npm ls @gripm/playbook --depth=0` resuelva 2.9.1 sin errores ni dependencia `file:`.
  3. Ejecutar la Pirámide de Verificación de Gripm, incluyendo `npm run test:linux` y `npm run build` para validar los binarios standalone.
- **Out-of-Scope:**
  - La integración de `gripm --init` con `--preset` y `--rules`, prevista para revisión posterior.
  - Publicar Gripm, crear commits o hacer push.
  - Remediar el baseline de salud existente. La auditoría inicial reporta 32/100, 24 hallazgos de LOC y 2 archivos de más de 1000 LOC; este cambio queda limitado a manifiestos y verificación, sin modificar esos archivos.
- **Decisiones R1:**
  - `@gripm/playbook` permanece en `devDependencies`, donde ya se consume durante desarrollo, verificación y empaquetado.
  - El rango `^2.9.1` es el requerido; el lockfile debe fijar la resolución efectiva y no conservar el origen local.
  - Si npm no puede resolver el paquete, la instalación debe fallar explícitamente; no se conservará un fallback a `file:../gripm-playbook`.
  - El cambio no altera el runtime publicado de Gripm ni amplía la tarea DEV-360, que permanece en `ready`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `package.json` declara `@gripm/playbook` como `^2.9.1` en `devDependencies`, y `package-lock.json` fija la resolución npm de 2.9.1 sin origen `file:`.
- [x] #2 `npm ls @gripm/playbook --depth=0` termina con código 0 y muestra la versión instalada 2.9.1 como válida.
- [x] #3 La verificación de tipos (`npm run lint`) y la suite (`npm test`) terminan con código 0.
- [x] #4 `npm run test:linux` termina con código 0.
- [x] #5 `npm run backlog:sync` y `npm run backlog:check` terminan con código 0.
- [x] #6 `npm run publish:check` termina con código 0.
- [x] #7 `npm run build` genera correctamente los binarios standalone y termina con código 0.
- [x] #8 `npm run verify:changes -- --all` termina con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reemplazar la dependencia local por `@gripm/playbook@^2.9.1` usando npm y actualizar el lockfile a la versión publicada 2.9.1.
2. Confirmar la resolución instalada y que el lockfile no contiene una referencia `file:` a Playbook.
3. Ejecutar los criterios de verificación, incluyendo la suite Linux y el build de binarios.
<!-- SECTION:PLAN:END -->
