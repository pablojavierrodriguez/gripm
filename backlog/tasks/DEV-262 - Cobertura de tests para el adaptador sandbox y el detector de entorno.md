---
id: DEV-262
title: "Cobertura de tests para el adaptador sandbox y el detector de entorno"
status: done
created_date: '2026-10-14'
updated_date: '2026-10-15'
labels:
  - "testing"
  - "sandbox"
  - "quality"
  - "@gripm/playbook"
dependencies:
  - "DEV-222"
priority: medium
type: tech_debt
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La sandbox web de DEV-222 se publicó y está en producción, pero su lógica **no tiene una
sola aserción**. Son ~480 líneas de `src/data/sandbox.ts` más el detector de
`src/data/detect.ts`, y la suite de 17 pasos no las toca.

El contraste es lo que hace el hueco visible: el equivalente del lado daemon tiene tests
propios para cada almacenamiento (optimistic-locking, legacy-import, json-sprint,
resilience), mientras que el camino que ahora atiende a cualquier visitante de la demo
pública no tiene ninguno.

Lo verificado en runtime fue de extremo a extremo en un navegador real, lo cual **no es
lo mismo**: una prueba manual sobre un recorrido feliz no encuentra la colisión de un
correlativo ni el sprint que queda activo sin querer. Un bug acá no filtra datos ni rompe
instalaciones — se manifiesta como una demo visiblemente rota — pero es producto público.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Caso de regresión que falle si `nextCode()` no genera el correlativo esperado al crear ítems sobre el seed real
- [x] #2 Ciclo borrado lógico → restaurar → purgar verificado campo por campo, incluyendo `previousStatus` y que `purgeItem()` sea el único que saca el ítem del array
- [x] #3 Invariante de un solo sprint `active` verificado tanto al crear como al actualizar, incluido el demotaje de los preexistentes
- [x] #4 `deleteSprint()` deja los ítems desasociados (`sprint`, `targetSprint` y `sprints` vacíos), no apuntando a un nombre inexistente
- [x] #5 `bulkUpdateItems()` devuelve el conteo correcto y no permite sobrescribir `id` ni `code`
- [x] #6 `deleteProject()` en cascada no deja ítems, releases ni sprints huérfanos
- [x] #7 `resetSandbox()` borra `gripm_sandbox_board` y `gripm_sandbox_config` y vuelve al seed
- [x] #8 `fetchBoardData()` devuelve un clon: mutar el resultado no altera el estado interno del adaptador
- [x] #9 `detect.ts`: probe que responde JSON → `httpAdapter`; que falla o agota el timeout → `sandboxAdapter`; y **una sola** invocación de `fetch` aunque haya llamadas concurrentes
- [x] #10 `detect.ts` rechaza una respuesta 200 con `content-type` no JSON, que es el caso de un SPA servida en `/api/data`
- [x] #11 Test de paridad del contrato que falle al agregar un método a `GripmApi` sin implementarlo en ambos adaptadores
- [x] #12 Test que valida `data/demo-backlog.json` contra los tipos del cliente y del server, cubriendo las 5 columnas, sprints y ACs
- [x] #13 `npm run audit:ux` en verde **sin regenerar el baseline**, `npx tsc --noEmit` con 0 errores y `npm test` y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** detectado al cerrar DEV-222. El hueco se hizo visible al notar que la
  verificación runtime de la demo fue 10/10 sobre un recorrido feliz, y que eso no
  reemplaza una aserción por invariante.
- **Implementación (DEV-262):**
  - Creado `scripts/verify-sandbox.js` con suite completa de 12 pasos verificando las 12
    reglas e invariantes del adaptador sandbox y detector de entorno.
  - Registrado como paso 18 en `scripts/run-tests.js`.
  - Actualizado `CONTRIBUTING.md` y `AGENTS.md` a 18 pasos secuenciales en la suite unificada.
  - Tipado Node ESM completado con extensiones `.ts` relativas en `src/data/detect.ts`,
    `src/data/runtime.ts` y soporte de `item.projectId` en `sandbox.ts:createItem()`.
  - Suite unificada ejecutada en verde (`npm test`, 18/18 pasos, 26.9s).
<!-- SECTION:NOTES:END -->
