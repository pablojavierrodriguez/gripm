---
id: DEV-125
title: "Correccion de Raiz del Pre-Commit Hook: Verificar Sin Mutar el Indice de Git"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "tooling"
  - "git"
  - "devboard-core"
  - "quality"
dependencies: []
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El pre-commit hook de DevBoard modifica el indice de git, lo que provoca que
cualquier tarea sin trackear entre silenciosamente en commits de tematica
diferente.

**Sintoma observado**: al committear el fix de light mode (DEV-124) con 14
archivos stageados selectivamente, el commit resulto con 20 archivos. Las 6
tareas DEV-118 a DEV-123 (rutas personales, GitHub Actions, sanitizacion,
docs comunitarios) quedaron incluidas, pese a no tener relacion con el cambio.
El mensaje del commit describia un tema que no correspondia con su contenido.

**Causa raiz** (`scripts/verify-backlog-sync.js`, lineas 172-183):

```js
execSync(`node --experimental-strip-types "${exportScript}" export`, ...);
if (isHookMode) {
  execSync(`git add BACKLOG.md backlog/`, ...);   // <-- stagea el directorio completo
}
```

Tres defectos en un mismo mecanismo:

1. **El hook muta el indice.** Un hook debe verificar, no escribir en el
   indice. `git add backlog/` stagea TODO el directorio, incluyendo archivos
   que el usuario no selecciono. Convierte el stageo selectivo en imposible.
2. **El exportador se ejecuta antes de validar.** Si el commit va a ser
   rechazado por un error de release, igual ya reescribio `BACKLOG.md` como
   efecto secundario.
3. **El mensaje de error sugiere `--no-verify`.** El propio hook se ofrece
   como escape, con lo cual el usuario queda obligado a saltarse la
   verificacion que el hook deberia garantizar.

**El caso de uso es legitimo y debe preservarse**: durante el desarrollo se
crean tareas y el consolidado `BACKLOG.md` queda desfasado, por lo que
conviene garantizar que se entregue regenerado. Lo que esta mal es el
mecanismo, no la intencion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `verify-backlog-sync.js` deja de ejecutar `git add` en cualquier rama de ejecucion (eliminar el bloque `isHookMode` que stagea `BACKLOG.md backlog/`)
- [x] #2 El hook sigue regenerando y verificando `BACKLOG.md`, pero NO escribe en el indice de git en ningun caso
- [x] #3 Si el hook detecta que `BACKLOG.md` quedo desfasado, RECHAZA el commit con un mensaje que indique el comando exacto a ejecutar para regenerarlo
- [x] #4 El mensaje de rechazo deja de sugerir `git commit --no-verify`, ya que con el hook corregido el stageo selectivo funciona sin evasión
- [x] #5 El exportador no debe escribir en disco cuando el commit sera rechazado: reordenar la ejecucion para validar antes de mutar
- [x] #6 Verificar que un commit con stageo selectivo ya no arrastra tareas sin trackear de otra tematica (regresion sobre DEV-124)
- [x] #7 Actualizar `.githooks/pre-commit` para reflejar el nuevo contrato (verificar y reportar, sin mutar)
- [x] #8 Documentar el contrato corregido en el mensaje del hook y en `AGENTS.md` si corresponde
- [x] #9 `npx tsc --noEmit` finishes con codigo 0
- [x] #10 `npm test` finishes con codigo 0
- [x] #11 `npm run backlog:check` finishes con codigo 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar `scripts/verify-backlog-sync.js`: identificar todas las mutaciones de
   disco y de indice, y la interaccion con `isHookMode`.
2. Eliminar el `git add` del hook. El hook pasa a ser un verificador puro: lee,
   valida y reporta, nunca escribe.
3. Reordenar para que la validacion preceda a cualquier escritura. Si el commit
   sera rechazado, no se toca `BACKLOG.md`.
4. Sustituir el rejection por un mensaje accionable: "BACKLOG.md desfasado,
   ejecuta `npm run backlog:sync` y stagea el resultado".
5. Actualizar el texto de `.githooks/pre-commit` para que describa el contrato
   real y deje de ofrecer `--no-verify`.
6. Probar el escenario de regresion: stagear solo codigo y comprobar que el
   commit no arrastra tareas ajenas.
7. Reparar el commit `afb36f8` con `amend`, ahora que el hook ya no muta el
   indice, para dejar DEV-118..123 fuera del commit de light mode.
<!-- SECTION:PLAN:END -->
