---
id: DEV-268
title: 'El hook de pre-commit valida que BACKLOG.md esté presente, no que corresponda al commit'
status: draft
type: bug
priority: high
sprint: ''
release: ''
assignee: ''
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
  - "tooling"
  - "ci"
  - "process"
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
- [ ] #1 El hook (o `verify-backlog-sync.js` en un modo nuevo) regenera el consolidado **leyendo el índice de git**, no el working tree, y compara contra el `BACKLOG.md` staged
- [ ] #2 Con una tarea modificada en el working tree y **sin** stagear, el hook pasa; con esa misma tarea **stageada** y un `BACKLOG.md` stale en el índice, el hook falla con exit 1
- [ ] #3 El mensaje de error nombra el archivo `.md` cuya versión no coincide con el consolidado, en vez de un "BACKLOG.md no incluido en el índice" que era cierto pero irrelevante
- [ ] #4 Demostrado en ambos sentidos: staging del caso que falla y del caso que pasa, con el comando ejecutado y la salida
- [ ] #5 El check local (`npm run backlog:check`) y el de CI pasan con el árbol limpio, sin necesidad de `git stash`
- [ ] #6 `npx tsc --noEmit`, `npm test` y `node scripts/verify-changes.js --all` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Cómo se reproduce el defecto hoy**, sin tocar nada: modificar una tarea en el working
  tree sin stagearla, correr `npm run backlog:sync`, stagear el consolidado y las tareas que
  sí se quiere commitear, y commitear. Pasa en local, falla en CI.
- **Lo que NO se va a hacer:** prohibition de trabajar con el árbol sucio. El árbol sucio es
  normal; lo que no puede pasar es que el consolidado se genere desde un estado que el
  commit no va a contener.
- **Alternativa barata si (#1) resulta invasivo:** hacer que `backlog:sync` tenga un
  `--staged` y que el hook lo use. La decisión de implementación queda para cuando se
  empiece; lo que no se negocia es que la verificación mire el índice.
- **Origen:** `cc106f9`, que arregló el síntoma en `7d50af0`/`a070a5e` sin tocar la causa.
<!-- SECTION:NOTES:END -->
