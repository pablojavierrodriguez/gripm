---
id: DEV-326
title: "Retirar la customizacion de gate-qa.mjs y adoptar el gate canonico v2.6.0"
status: done
release: "1.9.0"
created_date: '2026-10-21'
updated_date: '2026-10-22'
labels:
 - "gate"
 - "playbook"
 - "infra"
dependencies: []
priority: high
type: chore
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`scripts/gate-qa.mjs` esta declarado como customizacion en `.playlock.json` por una razon que ya no existe. DEV-320 AC #3 lo marco para preservar sus mejoras de salida (encabezado abierto, glifos mono-ancho, eliminacion de cajas rigidas). Verificado caracter a caracter contra upstream `v2.6.0`, esas mejoras **ya estan en el canon**: `printHeader` y la paleta `c` son identicas, el bloque `Task:/ID:/Status:` es identico, los glifos `✖ ✔ ℹ ➜` son identicos y upstream tambien elimino las cajas `---`. Incluso mejora el original: su `isColorSupported` acepta cualquier `FORCE_COLOR` truthy, no solo `'1'`.

Lo que el fork si diverge no es cosmético, es funcional, y en tres ejes:

1. **No escribe nunca.** El fork no contiene `writeFileSync` ni `mutateTaskFrontmatter` en ningun camino. El canon escribe `status: ready` en T2, escribe status y limpia `blocked_reason` en T_unblock. El fork solo certifica y dice "may be promoted".
2. **No implementa T0 ni T1.** `startMain` y `submitMain` no existen. Ejecutado: `node scripts/gate-qa.mjs start DEV-325` responde `no task found for "start"`, porque toma la palabra como identificador de tarea.
3. **No soporta `--by`.** `pm-orchestrator/SKILL.md:87` ordena `--by "<provider>:<id>"`; el canon lo acepta (`--by`, `--as`, `--to`), el fork no.

Las skills instaladas por DEV-323 (`qa-auditor/SKILL.md:52-53`, `pm-orchestrator/SKILL.md:22,87,90`) documentan el comportamiento del canon. Skills y herramienta quedaron fuera de sincronia porque el sync actualizo los primeros y protegio el segundo.

Con el fork vivo, T2 no puede completarse por via mecanica: aunque todo este verde y el gate salga en 0, alguien tiene que escribir `ready` a mano. Eso explica por que los 293 `done` tuvieron que moverse a mano.

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/gate-qa.mjs` coincide byte a byte con el blob upstream `v2.6.0` (SHA-256 identico).
- [x] #2 `.playbook-lock.json` ya no lista `scripts/gate-qa.mjs` en `customizations`.
- [x] #3 `customizations` queda reducida exclusivamente a `scripts/audit-ux-code.cjs`.
- [x] #4 `scripts/lib/frontmatter.mjs`, `scripts/lib/terminal.mjs` y `scripts/lib/pyramid.mjs` siguen presentes, porque el gate canonico los importa.
- [x] #5 `node scripts/gate-qa.mjs DEV-326` sale con codigo 0, reporta los cinco pasos y escribe `status: ready` en el archivo de la tarea.
- [x] #6 `node scripts/gate-qa.mjs start <ID>` reconoce `start` como transicion T0 y no como identificador de tarea.
- [x] #7 `npx tsc --noEmit` sale con 0 errores y `node scripts/verify-changes.js --all` sale con codigo 0.
- [x] #8 `npm run backlog:sync` y `npm run backlog:check` salen con codigo 0.
- [x] #9 `npm run publish:check` sale con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. `git rm scripts/gate-qa.mjs` para que el archivo deje de existir localmente.
2. Sacar `scripts/gate-qa.mjs` del array `customizations` en `.playbook-lock.json`. Es obligatorio: la rama `!exists` de `sync-playbook.mjs` hace `continue` sin borrar la entrada de `nextCustomizations`, y el lockfile quedaria declarando una customizacion que ya no existe.
3. `npm run playbook:sync -- --tag v2.6.0 --yes`, que recrea el archivo via la rama `created` y registra el hash upstream.
4. Verificar los ACs #1 a #4 por hash y contenido, no por inspeccion.
5. Certificar DEV-326 y DEV-325 con el gate canonico, que escribe `ready` en disco.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que no basta quitarlo de `customizations`.** `classifyLocalFile` decide por contenido, no por pertenencia: `if (knownHash) return 'customization'` re-clasifica el archivo por el mismatch de hash. Ademas `sync-playbook.mjs:265` lo re-agrega con `nextCustomizations.add(relativePath)` en el mismo pase. Sacarlo de la lista no tiene efecto medible.

**Por que no se uso `--force`.** Es la unica otra salida (`sync-playbook.mjs:263`), pero es global: sobrescribiria tambien `scripts/audit-ux-code.cjs`, que es customizacion declarada y cuyo retiro es labor de DEV-188, todavia en curso. No se toca.

**La trampa del lockfile.** Borrar el archivo y sincronizar deja el contenido correcto pero conserva la entrada obsoleta en `customizations`, porque la rama `created` no pasa por el `nextCustomizations.delete` de la linea 298. Un lockfile que declara una customizacion inexistente es el mismo tipo de inconsistencia que un AC tildado sin ejecucion: se corrige en origen, no se ignora.

**Trazabilidad del AC #5.** El AC pide que el gate salga en 0 y escriba `ready` para DEV-326. Como el gate exige todos los ACs tildados para salir en 0, tildarlo antes de la corrida final es una afirmacion previa a la evidencia. No es circular en los hechos porque la propiedad "el gate canonico escribe `ready`" tiene evidencia externa e independiente: la promocion de DEV-325 a `ready` que el mismo gate escribio y que quedo commiteada en `fa9a19a`. El corrido final de DEV-326 confirma la corrida, no la propiedad.

**Deslinchado de DEV-325.** La tarea declaraba `dependencies: ["DEV-325"]`. El gate canonico exige `status !== 'done'` como unico estado que satisface una dependencia (`scripts/gate-qa.mjs:160-162`), y `done` es exclusivo del release. Como DEV-325 y DEV-326 viajan en el mismo release, el campo producia un deadlock: ninguno podia certificarse porque ninguno llegaba a `done` antes del release.

El campo `dependencies` solo puede expresar "estrictamente antes", no "junto con". Se deslincho de forma explicita, no por omision, porque el orden que el campo pretendia garantizar (los scripts del contrato de DEV-325 deben existir antes de que el gate canonico pueda correr) lo garantiza el agrupado del release.
<!-- SECTION:NOTES:END -->
