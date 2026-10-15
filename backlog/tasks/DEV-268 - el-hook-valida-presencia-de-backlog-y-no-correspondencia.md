---
id: DEV-268
title: "El hook de pre-commit valida que BACKLOG.md esté presente, no que corresponda al commit"
status: ready
assignee:
  - ""
created_date: '2026-10-14'
updated_date: '2026-10-15 02:35'
labels:
  - "tooling"
  - "ci"
  - "process"
dependencies: []
priority: high
type: bug
release: ""
targetRelease: ""
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El hook `.githooks/pre-commit` rechaza el commit cuando se modifican tareas y `BACKLOG.md`
**no está en el índice**. No verifica que el `BACKLOG.md` que se está por commitear
**corresponda a las tareas que se están por commitear**.

Esa diferencia es la que rompió CI el 2026-10-14 en `7d50af0`:

1. El working tree tenía un cambio **sin commitear** en DEV-264.
2. `npm run backlog:sync` regeneró `BACKLOG.md` **leyendo el working tree**, así que el
   consolidado describía la versión nueva de DEV-264.
3. `git add BACKLOG.md` lo subió al índice. El commit `a070a5e` quedó con un consolidado
   que describía un archivo que ese commit no contenía.
4. El hook pasó: `BACKLOG.md` estaba en el índice, que es exactamente lo que exige.
5. En CI el checkout trae DEV-264 en su versión de HEAD, el consolidado no coincide, y
   `npm run backlog:check` falla con exit 1.

**El hook y CI miden cosas distintas.** El hook mide presencia; CI mide correspondencia.
El hook es la única barrera entre el error y el push, y es la que no lo detecta.

El defecto es de clase: cualquier tarea sin commitear en el working tree durante un
`backlog:sync` reproduce el fallo, y el síntoma aparece **un commit después, en otra
máquina**, sin forma local de reproducirlo salvo que se haga stash primero.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El hook (o `verify-backlog-sync.js` en un modo nuevo) regenera el consolidado **leyendo el índice de git**, no el working tree, y compara contra el `BACKLOG.md` staged
- [x] #2 Con una tarea modificada en el working tree y **sin** stagear, el hook pasa; con esa misma tarea **stageada** y un `BACKLOG.md` stale en el índice, el hook falla con exit 1
- [x] #3 El mensaje de error nombra el archivo `.md` cuya versión no coincide con el consolidado, en vez de un "BACKLOG.md no incluido en el índice" que era cierto pero irrelevante
- [x] #4 Demostrado en ambos sentidos: staging del caso que falla y del caso que pasa, con el comando ejecutado y la salida
- [x] #5 El check local (`npm run backlog:check`) y el de CI pasan con el árbol limpio, sin necesidad de `git stash`
- [x] #6 `npx tsc --noEmit`, `npm test` y `node scripts/verify-changes.js --all` con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Cómo se reproduce el defecto hoy**, sin tocar nada: modificar una tarea en el working
  tree sin stagearla, correr `npm run backlog:sync`, stagear el consolidado y las tareas que
  sí se quiere commitear, y commitear. Pasa en local, falla en CI.
- **Implementación efectuada:**
  1. `scripts/gripm-cli.ts`: se añadió `--staged` para que `loadTasks` lea el árbol de tareas
     directamente desde el índice de Git mediante `git ls-files -s -z` y `git cat-file --batch` en
     un único proceso stream (reduciendo la lectura de 266 tareas de ~6s a ~240ms).
  2. En modo `--check --staged`, se compara el consolidado generado contra `git show :BACKLOG.md`
     del índice de Git. Ante cualquier discrepancia, se aíslan los bloques de cada tarea para nombrar
     con precisión el archivo `.md` que no coincide con el consolidado en el stage.
  3. `scripts/verify-backlog-sync.js`: en modo `--hook`, el conjunto de tareas a auditar se limita
     estrictamente a `stagedTasks` (leyendo su contenido con `git show :${relPath}`), evitando que
     modificaciones no stageadas en el working tree bloqueen el commit con falsos positivos.
  4. Se normalizó la comparación descartando la línea de fecha en `--check` para prevenir fallos por
     cambio de día en UTC (rollover de medianoche).
  5. Verificado en ambas direcciones (caso que pasa y caso que falla) con 17/17 pruebas en verde.
<!-- SECTION:NOTES:END -->
