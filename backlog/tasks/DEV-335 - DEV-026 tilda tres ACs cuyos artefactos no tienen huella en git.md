---
id: DEV-335
title: "DEV-026 tilda tres ACs cuyos artefactos no tienen ninguna huella en la historia de git"
status: draft
created_date: '2026-10-23'
updated_date: '2026-10-23'
labels:
  - "backlog"
  - "governance"
  - "verification"
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Durante la regularizacion de atribucion de los items en `done` que nunca entraron en `itemCodes`, el rastreo por artefacto de DEV-026 encontro que **tres de sus cinco ACs no tienen ninguna aparicion en la historia de git**:

| AC | Artefacto que nombra | Huella en git |
| --- | --- | --- |
| #1 | `devboard` y `devboard-mcp` en el campo `bin` de `package.json` | **ninguna** |
| #2 | `data/projects-registry.json` (limpieza de `isDemo`) | **ninguna: nunca fue agregado por ningun commit** |
| #4 | referencias a `devboard` en `README.md` | **ninguna: cero menciones siquiera en el import de v1.0.0** |

Comandos usados y sus resultados:

- `git log --all --reverse -S "devboard" -- package.json` -> vacio.
- `git log --all --reverse -S "devboard-mcp"` -> solo archivos distintos de `package.json`.
- `git log --all --diff-filter=A -- data/projects-registry.json` -> vacio. Ni agregado ni modificado jamas.
- `git show af5780e:README.md | grep devboard` -> cero coincidencias.

**Por que es inverificable y no necesariamente falso.** La historia de git de gripm arranca en el commit raiz `af5780e` del **2026-10-05**, la release v1.0.0 (*"initial open-source release"*). DEV-026 se cerro el **2026-09-19**, dieciseis dias antes de que existiera git. Y el arco de rebranding que lo reemplazo, **DEV-144**, se cerro el **2026-10-03**, solo dos dias antes del import.

La secuencia mas parsimoniosa es: DEV-026 puso los binarios como `devboard` en septiembre, DEV-144 los renombro a `gripm` a principios de octubre, y el repositorio se importo el 5 de octubre ya renombrado. Todo eso habria pasado en disco sin quedar rastro en git.

**El problema es que esa hipotesis no se puede probar ni refutar desde este repositorio.** Un artefacto que nunca se commiteo y otro que se commiteo y se borro antes del raiz son indistinguibles. La herramienta con la que el gate certifica los ACs (`git`) no alcanza para esta franja de la historia.

**Contraste con DEV-025** (levantado como DEV-334): ahi el hermano del mismo AC **si** sobrevivio al import (`docs/AGENTIC_PLAYBOOK.md` esta en `af5780e`), lo que debilita la explicacion de "se borro antes de importar". En DEV-026 los tres artefactos caen en la misma franja ciega y hay un candidato creible (DEV-144) que los explica a todos, asi que el caso es distinto y merece tratamiento distinto.

**Existe un limite metodologico de fondo que esta tarea deberia dejar documentado:** cualquier AC tildado antes del 2026-10-05 no es verificable por inspeccion de git. Es una franja fija de la historia, no un defecto transitorio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se determina y se deja escrito si existe una fuente de evidencia externa al repositorio (backup pre-import, otro repositorio, decision registrada del PO) que respalde los AC #1, #2 y #4 de DEV-026.
- [ ] #2 Si la evidencia existe, se anota su ubicacion exacta en las notas del AC correspondiente de DEV-026, para que el tick sea verificable por un tercero.
- [ ] #3 Si la evidencia NO existe, los AC #1, #2 y #4 de DEV-026 se reescriben para afirmar solo lo que el repositorio puede sostener, o se abren (`- [ ]`). No se conserva un tick que nadie puede comprobar.
- [ ] #4 Si al abrir los ACs DEV-026 deja de cumplir la condicion de `done`, su estado se ajusta segun el flujo. Un `done` sin respaldo verificable no puede sostenerse por inercia.
- [ ] #5 Queda documentado en un lugar de gobernanza (AGENTS.md, gate o skill) que los ACs tildados antes del 2026-10-05 no son verificables por git, para que futuras auditorias no repitan este rastreo.
- [ ] #6 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0 tras cualquier cambio sobre DEV-026.
- [ ] #7 `node scripts/verify-changes.js --all` sale con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preguntar al PO si sobrevive evidencia pre-git: copias, el repositorio anterior o su propio registro.
2. Segun la respuesta, reescribir o abrir los AC #1, #2 y #4 de DEV-026.
3. Ajustar el `status` de DEV-026 si el trabajo deja de estar completo.
4. Documentar el limite de verificacion pre-2026-10-05 en el sitio de gobernanza que corresponda.
5. Correr `backlog:sync`, `backlog:check` y `verify-changes --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que no se corrigio junto con la atribucion.** La regularizacion de `itemCodes` es un dato de registro y no depende de si los ACs son verificables: el trabajo se entrego o no se entrego, y eso es independiente de que podamos probarlo hoy. Resolver los ACs en cambio si abre una pregunta de fondo (se sostiene el `done` o no), y esa decision no deberia arrastrarse dentro de un commit de bookkeeping.

**Por que no es lo mismo que DEV-334.** En DEV-025 hay un hermano que sobrevivio al import, lo que hace razonable sospechar que el artefacto falta porque nunca se creo. En DEV-026 los tres artefactos caen en la franja ciega y DEV-144 los explica de forma coherente. Aqui el problema no es un criterio mal escrito, es que **la herramienta no alcanza**. Acusar de fabricado seria tan injustificado como darlo por probado.

**El dato que orienta la investigacion.** DEV-144 (*"Migracion Integral de Rebranding Renombrado de Binarios"*) esta en `done`, se cerro el 2026-10-03 y su `id` es muy posterior al de DEV-026. Si en algun momento existio un registro de esa tarea con el antes/despues de los binarios, ahi estaria la evidencia.

**Lo que ya quedo verificado en esta auditoria.** DEV-179 esta limpio: `DEFAULT_REMOTE` entra en `ed08e58` y se publica en la v1.0.1. La atribucion de los tres items ya se regularizo en `backlog/releases.json` (DEV-025 y DEV-026 en 1.0.0, DEV-179 en 1.0.1) sin alterar el `CHANGELOG.md` publicado, porque `generate-changelog.cjs` se alimenta de `markdownContent` y no de `itemCodes`.
<!-- SECTION:NOTES:END -->
