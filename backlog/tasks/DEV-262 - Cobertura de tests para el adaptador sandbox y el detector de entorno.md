---
id: DEV-262
title: "Cobertura de tests para el adaptador sandbox y el detector de entorno"
status: draft
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
  - "testing"
  - "sandbox"
  - "quality"
  - "@gripm/playbook"
dependencies:
  - DEV-222
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

## Qué está sin verificar

### `src/data/sandbox.ts`

| Invariante o comportamiento | Riesgo si se rompe |
| :--- | :--- |
| `nextCode()` genera el correlativo correcto (`DEMO-008` sobre 7 ítems) | IDs duplicados o saltados en tarjetas nuevas |
| `createItem()` rechaza título vacío | Tarjetas sin identificar en el tablero |
| Borrado lógico guarda `previousStatus` y `restoreItem()` lo recupera | Un ítem restaurado aparece en la columna equivocada |
| `purgeItem()` es físico; `deleteItem()` no lo es | Confusión entre los dos, con datos perdidos o basura visible |
| **Un solo sprint `active`** en `createSprint` y `updateSprint` | Dos sprints activos rompen el cálculo de progreso del SprintView |
| `deleteSprint()` desasocia ítems en vez de dejar punteros muertos | Ítems apuntando a un sprint inexistente |
| `bulkUpdateItems()` no deja sobrescribir `id` ni `code` | Pérdida de identidad y de trazabilidad de las tarjetas |
| `deleteProject()` cascada a ítems, releases y sprints | Huérfanos de otro proyecto visibles en el tablero |
| `restoreDemoProject()` / `resetSandbox()` limpian LocalStorage | La demo queda en un estado que el visitante no puede recuperar |
| Clonado de `fetchBoardData()` | Si devuelve la referencia interna, la UI muta el estado del adaptador |

### `src/data/detect.ts`

| Comportamiento | Riesgo si se rompe |
| :--- | :--- |
| Probe exitoso → `httpAdapter`; fallido → `sandboxAdapter` | Modo equivocado: una app local mostrando datos de demo, o una demo intentando hablar con un daemon inexistente |
| Rechaza una respuesta con `content-type` no JSON | Un SPA servida en `/api/data` con 200 y HTML pasa por disponible y la demo se rompe en blanco |
| **La decisión se cachea y es una sola** | Un probe por cada interacción: la app renderiza con `boardData === null` mientras decide, que es la pantalla vacía que DEV-222 vino a eliminar |
| Timeout con `AbortController` | Un endpoint colgado cuelga el arranque sin límite |

### Contrato y seed

- Que los 31 métodos de `GripmApi` estén implementados en **ambos** adaptadores, y que
  agregar uno nuevo no rompa la paridad. Hoy el contrato es lo único que lo garantiza.
- Que `data/demo-backlog.json` siga siendo válido contra los tipos del cliente **y** del
  server: hoy es el mismo archivo para los dos y nadie lo verifica.
- Que el seed cubra las 5 columnas y tenga sprints y ACs, que es lo que hace que la demo
  se vea viva y no vacía.

## Enfoque

Un paso más en `scripts/run-tests.js`, sin dependencias nuevas, siguiendo el patrón de
`verify-json-sprint-persistence.js`: `BoardData` en memoria, sin red ni disco.

Los casos de `detect.ts` necesitan `fetch` inyectable o un stub de `globalThis.fetch`;
conviene decidir si el probe se vuelve parametrizable en vez de parchear el global en el
test, porque el global se ensucia entre pasos.

> [!CAUTION]
> **No usar `--update-baseline` como atajo.** Si algún caso nuevo dispara UX-011 (por
> ejemplo, un `text-[Npx]` en un fixture), el atajo congela la supresión sin revisión.
> Los fixtures de test van en `tests/` o `scripts/`, que el auditor no escanea, así que lo
> correcto es que **no aparezca ningún hallazgo nuevo** y el gate siga igual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Caso de regresión que falle si `nextCode()` no genera el correlativo esperado al crear ítems sobre el seed real
- [ ] #2 Ciclo borrado lógico → restaurar → purgar verificado campo por campo, incluyendo `previousStatus` y que `purgeItem()` sea el único que saca el ítem del array
- [ ] #3 Invariante de un solo sprint `active` verificado tanto al crear como al actualizar, incluido el demotaje de los preexistentes
- [ ] #4 `deleteSprint()` deja los ítems desasociados (`sprint`, `targetSprint` y `sprints` vacíos), no apuntando a un nombre inexistente
- [ ] #5 `bulkUpdateItems()` devuelve el conteo correcto y no permite sobrescribir `id` ni `code`
- [ ] #6 `deleteProject()` en cascada no deja ítems, releases ni sprints huérfanos
- [ ] #7 `resetSandbox()` borra `gripm_sandbox_board` y `gripm_sandbox_config` y vuelve al seed
- [ ] #8 `fetchBoardData()` devuelve un clon: mutar el resultado no altera el estado interno del adaptador
- [ ] #9 `detect.ts`: probe que responde JSON → `httpAdapter`; que falla o agota el timeout → `sandboxAdapter`; y **una sola** invocación de `fetch` aunque haya llamadas concurrentes
- [ ] #10 `detect.ts` rechaza una respuesta 200 con `content-type` no JSON, que es el caso de un SPA servida en `/api/data`
- [ ] #11 Test de paridad del contrato que falle al agregar un método a `GripmApi` sin implementarlo en ambos adaptadores
- [ ] #12 Test que valida `data/demo-backlog.json` contra los tipos del cliente y del server, cubriendo las 5 columnas, sprints y ACs
- [ ] #13 `npm run audit:ux` en verde **sin regenerar el baseline**, `npx tsc --noEmit` con 0 errores y `npm test` y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** detectado al cerrar DEV-222. El hueco se hizo visible al notar que la
  verificación runtime de la demo fue 10/10 sobre un recorrido feliz, y que eso no
  reemplaza una aserción por invariante.
- **Prioridad `medium` y no `high`:** un defecto acá no filtra datos ni rompe
  instalaciones, se manifiesta como demo visiblemente rota. Pero es producto público y
  son ~480 líneas.
- **No bloquea el release de npm:** la sandbox no es usada por el CLI en local, donde
  siempre hay daemon. `src/` viaja al tarball como código inerte.
<!-- SECTION:NOTES:END -->