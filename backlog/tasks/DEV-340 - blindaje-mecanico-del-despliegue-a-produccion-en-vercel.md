---
id: DEV-340
title: "Blindaje mecanico del despliegue a produccion en Vercel (Anti-Dev-Production-Deploy)"
status: ready
created_date: '2026-10-25'
updated_date: '2026-10-26'
labels:
  - "ci"
  - "devops"
  - "release"
dependencies: []
priority: high
type: tech_debt
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Históricamente, los despliegues de producción hacia Vercel (`https://gripm.vercel.app`) se ejecutaban manualmente mediante `npx vercel --prod --yes` desde la terminal local mientras los desarrolladores o agentes se encontraban situados en la rama de integración `dev`. Esto provocaba que en el dashboard de Vercel todos los despliegues de producción quedaran etiquetados formalmente con la rama `dev`, introduciendo un grave riesgo de "State Lie" (desplegar código inestable no auditado) y una inconsistencia con el trunk canónico de release `main`.

Esta tarea implementa el guardrail mecánico `scripts/deploy-prod.js` y el comando de npm `npm run deploy:prod`, asegurando que cualquier intento de despliegue a producción aborte de inmediato si no se ejecuta sobre el trunk canónico `main` y con un working tree completamente limpio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Guardrail mecánico `scripts/deploy-prod.js` que verifica que la rama actual sea estrictamente `main` antes de permitir cualquier deploy a producción.
- [x] #2 `scripts/deploy-prod.js` aborta con código 1 y banner explicativo si se invoca desde `dev` o cualquier otra rama no-main.
- [x] #3 `scripts/deploy-prod.js` verifica que el working tree esté limpio sin cambios sin commitear antes de desplegar.
- [x] #4 Script `npm run deploy:prod` registrado en `package.json` y vinculado al guardrail mecánico.
- [x] #5 Documentación de `AGENTS.md` actualizada con la regla canónica Anti-Dev-Production-Deploy y el flujo de promoción desde `main`.
- [x] #6 Suite de pruebas automatizadas en `scripts/test-deploy-prod.js` que valida que el guardrail aborte en ramas incorrectas o con árbol sucio.
- [x] #7 `npx tsc --noEmit` con 0 errores y `npm test` con suite unificada en verde.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `scripts/deploy-prod.js` con las validaciones de git branch (`main`), git status (clean) y ejecución de build + vercel deploy.
2. Crear `scripts/test-deploy-prod.js` para probar en forma aislada las aserciones del guardrail.
3. Registrar `"deploy:prod": "node scripts/deploy-prod.js"` en `package.json`.
4. Incorporar `test-deploy-prod.js` a `scripts/run-tests.js`.
5. Actualizar `AGENTS.md` y sincronizar backlog con `npm run backlog:sync`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
