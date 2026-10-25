---
id: DEV-333
title: "El chequeo de fantasmas no distingue archivos stageados de archivos sin trackear en commits por pathspec"
status: done
release: "1.9.0"
created_date: '2026-10-22'
updated_date: '2026-10-25'
labels:
  - "git"
  - "guards"
  - "backlog"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`scripts/verify-backlog-sync.js:96-130` implementa el chequeo de tareas fantasma: si `BACKLOG.md` esta en el stage y referencia un archivo que git no trackea, el commit se rechaza. La deteccion recorre `git status --porcelain -z backlog/tasks/` y se queda solo con las entradas que empiezan por `?? `.

Esa condicion es correcta para un commit normal. **No lo es para un commit por pathspec.**

Cuando se ejecuta `git commit -m "..." -- <paths>`, git construye el commit a partir de HEAD **mas** los paths indicados, y el hook pre-commit corre contra ese indice temporal. Los archivos stageados en el indice principal que no estan en el pathspec aparecen ahi como `??` sin trackear, aunque en el indice real esten en `A `.

Resultado medido (2026-10-22): seis tareas stageadas (`A `, creadas por otro agente) y un commit selectivo de DEV-326 por pathspec. El guard las detecto como fantasmas y bloqueo un commit que era legitimo.

Peor aun, **las dos salidas que sugiere el error son incorrectas para ese caso**:

1. `git add <los 6 archivos>` - arrastra trabajo de otro agente al commit del agente en curso, violando la norma de "una tarea, un commit consolidado".
2. "Regenera BACKLOG.md sin esas tareas" - es imposible sin borrar los archivos de disco, que pertenecen a otro agente.

El agente quedo sin salida mecanica y tuvo que escalar la decision al PO. La unica resolucion real era incluir las tareas en el commit, y eso solo se sostiene invocando el precedente de `fa9a19a`.

El problema de fondo no es la deteccion: es que `BACKLOG.md` es un agregado que referencia **todas** las tareas del arbol, y por eso cualquier commit que lo incluya acopla al agente con todos los demás tareas pendientes. Ese acoplamiento ya le costo al repo una ocasion mas: el hook **antes** ejecutaba `git add BACKLOG.md backlog/`, que stageaba el directorio entero y arrastraba tareas ajenas. Se corrigio el indice (`verify-backlog-sync.js:367-372`) pero la politica de bloqueo reprodujo el mismo efecto por el lado opuesto. En ambos periodos, **commits selectivos imposibles**.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El chequeo distingue tres casos y reporta cada uno con su nombre: archivo `??` sin trackear (fantasma real), archivo `A ` stageado en el indice principal, y archivo presente en el arbol pero fuera del commit por pathspec.
- [x] #2 El mensaje de error **no** sugiere `git add` de archivos que pertenecen a otro agente ni la regeneracion del consolidado sin ellos, porque ambas salidas son invalidas en el caso pathspec.
- [x] #3 Ante un commit por pathspec que deja fuera archivos stageados, el error nombra explicitamente el pathspec como causa y ofrece las dos salidas reales: incluirlos, o commitearlos antes.
- [x] #4 `node scripts/verify-integration.js` cubre el caso: un repositorio de prueba con una tarea stageada y un commit por pathspec que la excluye. El test debe demostrar que el mensaje correcto aparece.
- [x] #5 El chequeo sigue rechazando el fantasma real: un archivo `??` referenciado por el consolidado bloquea el commit como hasta ahora.
- [x] #6 `npm run backlog:check` y `node scripts/verify-changes.js --all` salen con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Releer `verify-backlog-sync.js:96-130` y separar la recoleccion de la decision: hoy ambas cosas viven en el mismo `if`.
2. Detectar el caso pathspec via `GIT_INDEX_FILE` o comparando el indice efectivo contra el principal.
3. Redactar los tres mensajes.
4. Agregar el caso a `verify-integration.js`.
5. Correr `backlog:check` y `verify-changes --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que el defecto no es solo cosmético.** El guard no solo dio un falso positivo: las dos soluciones que propuso empeoraban la situacion. Un agente que le siguiera el consejo de `git add` habria metido seis tareas ajenas en su commit, que es exactamente lo que la norma de trazabilidad prohibe. El guard tiene autoridad sobre el developer; un mensaje de error mal orientado se ejecuta.

**La deuda que queda despues de este fix.** Arreglar el mensaje no elimina el acoplamiento: `BACKLOG.md` seguira referenciando todas las tareas del arbol, y un commit que lo incluya seguira necesitando que las demas esten commiteadas. La salida estructural es otra (aislamiento en worktree, que el playbook ya receta) y esta levantada como PLAY-038 en el repo del framework. Este item arregla el guard; PLAY-038 arregla la causa.

**Por que toca a gripm y no al playbook.** Verificado contra el tag `v2.6.0` de `gripm-playbook`: `scripts/verify-backlog-sync.js` no existe upstream. Es guard propio de este repo.
<!-- SECTION:NOTES:END -->
