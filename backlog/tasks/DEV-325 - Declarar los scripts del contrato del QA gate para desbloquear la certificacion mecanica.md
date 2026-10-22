---
id: DEV-325
title: "Declarar los scripts del contrato del QA gate para desbloquear la certificacion mecanica"
status: ready
created_date: '2026-10-21'
updated_date: '2026-10-22'
labels:
 - "gate"
 - "playbook"
 - "infra"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`scripts/gate-qa.mjs` nunca pudo salir con codigo 0 en este repositorio. El motivo no es un defecto del script: es un **contrato de nombres sin satisfacer**.

`qa-auditor/SKILL.md:69` lo declara textual:

> A blocking step (`validate`/`typecheck`, `test`, `spec`, `audit:ux`) that has no defined script **fails the gate**.

El gate lee el `package.json` del anfitrión y resuelve cada paso por nombre. El playbook declara esos nombres en su propio `package.json` (`validate`, `gate:review`, `audit:ux:strict`), pero **gripm nunca los declaro**. El contrato lo falto el consumidor, no el framework.

Verificado en el upstream `v2.6.0`: el mensaje de error que emite gripm (`blocking step has no "validate" script in package.json; it cannot be certified on a step that never ran`) es identico carácter a carácter al de `scripts/lib/pyramid.mjs`. La logica del fork esta preservada. Ademas upstream ya preve anfitriones con otros nombres via `fallbackScripts: ['typecheck']`.

Consecuencia del contrato insatisfecho: tres de cinco pasos son `blocking: true` y quedan `failed`, asi que el gate **no ha podido certificar ningun item** en la historia del repo. Los 293 `done` llegaron ahi sin certificacion mecanica.

La correccion va en `package.json`, no en `gate-qa.mjs`. Editar el gate profundizaria un fork cuya unica razon de existir es cosmética (DEV-320 AC #3: encabezado abierto y glifos mono-ancho) y cerraria gripm a cualquier fix futuro del upstream.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `package.json` define los tres scripts del contrato del gate: `validate`, `gate:review` y `audit:ux:strict`.
- [x] #2 Los tres delegan en los scripts primarios existentes (`verify:changes`, `backlog:check`, `audit:ux`) sin duplicar el comando, para que la fuente unica de verdad siga siendo el script primario.
- [x] #3 `validate` pasa `--all`, de modo que el paso verifique el arbol completo y no pueda certificar un pase vacio cuando nada esta stageado.
- [x] #4 `node scripts/gate-qa.mjs DEV-325` ejecuta los cinco pasos de la pirámide y ninguno reporta `has no "..." script in package.json`.
- [x] #5 `scripts/gate-qa.mjs` no fue modificado: su SHA-256 sigue coincidiendo con el registrado en `.playbook-lock.json`.
- [x] #6 `npm run audit:ux:strict` sale con codigo 0.
- [x] #7 `npm run validate` sale con codigo 0 verificando el arbol completo.
- [x] #8 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0.
- [x] #9 `node scripts/verify-changes.js --all` sale con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Declarar en `package.json` los tres nombres del contrato como delegaciones, no como copias: `validate` → `npm run verify:changes -- --all`, `gate:review` → `npm run backlog:check`, `audit:ux:strict` → `npm run audit:ux -- --strict`.
2. Verificar cada uno de los tres por separado antes de tocar el gate.
3. Dejar DEV-325 en `review` y correr `node scripts/gate-qa.mjs DEV-325`, que es quien escribe `ready` en disco.
4. Confirmar que `scripts/gate-qa.mjs` quedo intacto contra el hash del lockfile.
5. `npm run backlog:sync` y commit `feat(DEV-325): ...`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que delegar y no copiar el comando.** Los scripts del contrato conviven con los primarios en el mismo `package.json`. Si `validate` contuviera literalmente `node scripts/verify-changes.js --all` y alguien renombrara o reemplazara `verify:changes`, el contrato quedaria apuntando a un fantasma. La delegacion (`npm run verify:changes -- --all`) mantiene una sola fuente de verdad: el comando vive una vez, en el script primario, y el contrato solo lo invoca.

**Por que `--all` y no el `verify:changes` plano.** `verify-changes.js:391` distingue `--all` (`git ls-files`, arbol completo) del modo por defecto (solo archivos stageados). El gate corre despues del stage, frecuentemente con el indice vacio; sin `--all` el loop no itera y el paso sale en verde sin haber verificado ningun archivo. Un pase vacio es peor que un fallo, porque certifica algo que no se comprobo. `--all` no es una preferencia de exhaustividad, es la condicion para que el paso signifique algo.

**`audit:ux:strict` ya es viable.** DEV-319/DEV-320 y DEV-188 advertian que `--strict` quedaba permanentemente en exit 1. Eso dejo de ser cierto tras la adopcion de `v2.6.0`: medido hoy, sale en 0 con 0 findings y 206 observaciones absorbidas por el baseline.

**El fork no se toca.** `gate-qa.mjs` sigue declarado como customizacion en `.playbook-lock.json` por su capa cosmética. Retirar esa customizacion es labor separada y no forma parte de esta tarea.

**Correccion tras QA (T3).** La auditoria ciega rechazo la primera pasada con dos hallazgos, ambos reales:

1. `backlog:check` salia en 1 porque el AC #4 se tildo sin regenerar `BACKLOG.md` despues, dejando el consolidado con `- [ ] #4` contra `- [x] #4` en la tarea. Violo el AC #8 en el arbol final.
2. El AC #4 afirmaba que el gate "sale con codigo 0". Esa propiedad nunca se observo: lo que se observo fue que los cinco pasos de la piramide pasaban, mientras el gate completo salia en 1 precisamente por el AC #4 sin tildar.

El hallazgo 2 expuso un defecto de diseno del propio AC. El gate no admite excepciones (`acs.filter((line) => !line.startsWith('- [x]'))`), asi que un AC que declara la certificacion del gate como criterio es circular por construccion: no puede tildarse hasta que el gate salga en 0, y el gate no puede salir en 0 hasta que este tildado. La correccion propuesta por QA (correr el gate en 0 con el AC sin tildar y tildarlo despues) es literalmente imposible bajo esa implementacion.

Se reescribio el AC #4 para que describa una propiedad observable del trabajo, no el acto de certificacion: los cinco pasos se ejecutan y ninguno reporta `has no "..." script in package.json`. La certificacion del gate es T2 en si misma, la transicion, no un criterio del trabajo.
<!-- SECTION:NOTES:END -->
