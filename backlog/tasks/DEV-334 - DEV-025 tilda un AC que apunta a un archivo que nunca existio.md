---
id: DEV-334
title: "DEV-025 tilda un AC que apunta a docs/DISTRIBUTION.md, un archivo que nunca existio"
status: draft
created_date: '2026-10-23'
updated_date: '2026-10-23'
labels:
  - "backlog"
  - "governance"
  - "verification"
priority: high
type: bug
estimate: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al regularizar la atribucion de los tres items en `done` que nunca entraron en `itemCodes` (DEV-025, DEV-026, DEV-179), el rastreo por artefacto mostro que el AC #2 de DEV-025 apunta a un archivo que jamas existio.

El criterio dice textualmente:

```
- [x] #2 Crear docs/DISTRIBUTION.md explicando npm link, npx devboard-mcp,
  configuracion en IDEs y publicacion a npmjs.com
```

Evidencia recogida con git, sin interpretacion:

- `git log --all --diff-filter=A -- '*DISTRIBUTION*'` devuelve un unico commit, `a5f8b3d`, que agrega `docs/archive/DISTRIBUTION_POC.md`. Fue el **2026-10-09**, tres semanas despues de que DEV-025 se cerrara el 2026-09-19, y esta atribuido a DEV-015/DEV-016, no a esta tarea.
- `git log --all --follow -- docs/DISTRIBUTION.md` no devuelve ningun commit. La ruta nunca fue agregada, modificada ni eliminada.
- La busqueda en el arbol actual no encuentra ningun archivo `DISTRIBUTION` trackeado salvo el PoC archivado.

**El punto que debilita la hipotesis de "se creo y se borro antes del import".** El hermano del mismo AC si sobrevivio: `docs/AGENTIC_PLAYBOOK.md` (AC #1) estaba presente en el commit raiz `af5780e` del **2026-10-05**, que es la release v1.0.0, y recien lo elimino DEV-250 mucho despues. Si dos criterios de una misma tarea crearon artefactos en `docs/` y solo uno llego al import, lo mas parsimonioso es que el otro no se creo.

El **contenido** si existe, repartido en el README: `### 2. Local Development Link (npm link)` en la L413 y la seccion de conexion de agentes e IDEs en L94-L134. O sea, la intension del criterio se cumplio; la ruta especifica que nombro, no.

**Casos relacionados descubiertos en el mismo rastreo, NO cubiertos por esta tarea:**

- **DEV-179** esta limpio y trazable: `DEFAULT_REMOTE = 'pablojavierrodriguez/gripm-playbook'` entra en `ed08e58` y se publica en la **v1.0.1**.
- **DEV-026** tiene **tres de cinco ACs sin ningun pie de huella en git** (el bin `devboard`, `data/projects-registry.json` y las referencias del README). La explicacion plausible es que el arco de rebranding (DEV-144, cerrado el 2026-10-03) los reemplazo antes del import del 2026-10-05, pero es **inverificable** porque la historia de git arranca despues de ambas tareas. Requiere decision propia del PO.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El AC #2 de DEV-025 se reescribe para nombrar el artefacto que realmente existe (la seccion de distribucion del `README.md`), en vez de una ruta que nunca se creo.
- [ ] #2 El AC #2 conserva su `- [x]` solo si respalda la afirmacion nueva con la evidencia real de que el contenido esta en el README: `npm link` en `README.md:413` y conexion de agentes e IDEs en `README.md:94-134`.
- [ ] #3 Si al revisar la evidencia el contenido resulta insuficiente, el AC #2 se abre (`- [ ]`) y DEV-025 vuelve a un estado donde el trabajo falte. No se sostiene un tick sin respaldo.
- [ ] #4 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0 tras la modificacion, porque DEV-025 vive en `BACKLOG.md`.
- [ ] #5 Se documenta en las notas por que no se creo `docs/DISTRIBUTION.md` en su momento, para que el defecto no se repita en tareas nuevas.
- [ ] #6 `node scripts/verify-changes.js --all` sale con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Releer `README.md` L94-L134 y L400-L434 y confirmar que cubren las cuatro materias del AC original: `npm link`, `npx`, configuracion en IDEs y publicacion.
2. Reescribir el AC #2 de DEV-025 con la ruta y el ancla reales.
3. Correr `backlog:sync` y `backlog:check`.
4. Correr `verify-changes --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que esta tarea existe y no se arreglo sobre la marcha.** DEV-025 esta en `done`, y la regla del flujo es que los `done` no se editan de forma casual. Abrir un trabajo aparte hace que la correccion tenga trazabilidad propia y que el PO decida si el tick se sostiene o se abre, que es la pregunta de fondo (AC #3).

**Por que el hallazgo no es solo cosmético.** `SEC-02` prohíbe fabricar ACs: "alterar checkboxes sin verificacion real en tareas `done`". Un AC que nombra una ruta inexistente es una variante mas sutil del mismo problema: el tick puede ser honesto (el agente escribio la documentacion, en otro lado) y aun asi no ser verificable por nadie que venga despues. El defecto es de **fidelidad del criterio**, no necesariamente de mala fe.

**Lo que el rastrio no pudo probar.** Que `docs/DISTRIBUTION.md` no llegara a existir nunca en disco. Lo que se demuestra es que no esta en ningun commit, ni en el raiz, ni en el arbol actual. Un archivo creado y no commiteado seria indistinguible de uno que no se creo, salvo por el testigo del hermano que si llego al import.

**Por que DEV-026 queda fuera.** Su caso es estructuralmente distinto: tres ACs sin huella no es un criterio mal escrito, es evidencia que la historia de git no alcanza a cubrir. Resolverlo exige una fuente de evidencia distinta al repositorio, o una decision del PO sobre que hacer con ACs inverificables. Eso merece su propio trabajo.
<!-- SECTION:NOTES:END -->
