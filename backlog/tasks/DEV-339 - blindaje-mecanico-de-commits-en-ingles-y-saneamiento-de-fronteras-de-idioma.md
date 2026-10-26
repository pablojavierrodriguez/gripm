---
id: DEV-339
title: "Saneamiento de excepciones en inglés en BacklogService y adopción de commit-msg hook"
status: done
release: "1.10.0"
created_date: '2026-10-25'
updated_date: '2026-10-26'
labels:
  - "backend"
  - "quality"
  - "dx"
  - "git"
dependencies: []
priority: medium
type: chore
estimate: 2
claimed_by: "antigravity:288e6b7f-8462-48a3-a6be-d5d41592f1f9"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Como producto de software consumidor de `@gripm/playbook`, Gripm Board (`@gripm/board`) debe mantener su stock técnico y mensajes de servidor alineados con los estándares de la industria en inglés.

Actualmente existen discrepancias internas:
1. `server/services/backlogService.ts` arroja excepciones de validación en español (`[Validation] Parámetro 'taskId' requerido...`, `Tarea no encontrada`), mientras que `server/routes/api.ts`, los esquemas del servidor MCP y los middlewares de seguridad operan 100% en inglés.
2. Los hooks locales (`.githooks/`) carecen de un `commit-msg` activo que prevenga commits accidentales en español en el desarrollo diario del producto.

La definición metodológica canónica del framework se transfiere a `@gripm/playbook` (PLAY-047), limitando esta tarea estrictamente al saneamiento del stock de código de Gripm Board y a la adopción del hook local.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Saneamiento de excepciones en BacklogService: Auditar y migrar todas las excepciones de validación y errores arrojados en `server/services/backlogService.ts` a inglés técnico (`[Validation] Parameter 'taskId' is required and must be a non-empty string`, `Task ${taskId} not found`, etc.), manteniendo consistencia con `server/routes/api.ts`.
- [x] #2 Paridad y actualización de pruebas: Actualizar las aserciones de mensajes de error en la suite de pruebas (`scripts/test-backlog-service.js`, `scripts/verify-integration.js`, etc.) para verificar los nuevos textos en inglés sin regresiones.
- [x] #3 Adopción local del hook commit-msg: Incorporar `.githooks/commit-msg` en el repositorio para validar formato Conventional Commits en inglés imperativo y actualizar `scripts/prepare-hooks.js` para asegurar su configuración automática en el entorno de desarrollo.
- [x] #4 Verificación integral: `npx tsc --noEmit`, `npm test`, `npm run backlog:check` y `node scripts/verify-changes.js --all` pasan con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identificar exhaustivamente todas las cadenas `throw new Error(...)` en `server/services/backlogService.ts` y traducirlas al inglés técnico.
2. Adaptar las pruebas de integración que comprueban errores de validación específicos.
3. Instalar `.githooks/commit-msg` con la validación de Conventional Commits en inglés.
4. Ejecutar la Pirámide de Verificación completa y comprobar que ningún test rompe.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Separación de responsabilidades: La definición metodológica troncal y la regla de Git pertenecen a `@gripm/playbook`. Esta tarea DEV-339 se enfoca exclusivamente en el producto Gripm Board.
<!-- SECTION:NOTES:END -->
