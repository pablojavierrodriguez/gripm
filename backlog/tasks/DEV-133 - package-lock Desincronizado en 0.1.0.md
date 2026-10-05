---
id: DEV-133
title: "package-lock.json Desincronizado en 0.1.0: el Lockfile No se Regenera desde el 16/09"
status: done
created_date: '2026-09-30'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "packaging"
  - "hygiene"
  - "devboard-core"
dependencies: []
priority: low
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`package-lock.json` declara `"version": "0.1.0"` mientras `package.json` declara
`"version": "0.6.1"`. El lockfile **no se regenera desde el 16/09/2026**, cuando el
proyecto atravesó las versiones 0.2.0, 0.3.0, 0.4.0, 0.5.0, 0.6.0 y 0.6.1.

**Cómo se detectó**: al buscar por qué `releases.json` no tenía entrada para
`0.1.0`, la única referencia a esa versión en todo el repositorio apareció en el
lockfile. La evidencia de que `0.1.0` fue un bump real pero informal: los commits
`e0029b7` y `ed91943` (ambos del 16/09) tienen `version=0.1.0` en `package.json`,
y horas después `f4ce6ae` ya sube a `0.2.0`. No hay tag `v0.1.0` — el más antiguo
es `v0.2.0` — ni entrada en `releases.json` ni tarea asignada a esa versión.

**Por qué importa, aunque no rompa nada hoy**: npm reconcilia el desfase en el
momento de instalar, así que el proyecto funciona. El problema es de higiene del
repositorio y de trazabilidad: es un dato que afirma una versión que no existe
como release, en un archivo versionado que cualquier agente o persona puede leer
como si fuera verdad. Es exactamente la clase de dato desincronizado que este
sprint viene limpiando (DEV-127 eliminó contenido fabricado de los `.md`).

Un segundo problema Observable: el lockfile congelado implica que las
dependencias transitivas instaladas pueden no coincidir con las que se resuelven
hoy, y la diferencia no queda registrada en el historial.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `package-lock.json` declara una `version` igual a la de `package.json`
- [x] #2 El lockfile se regenera con `npm install`, actualizando el árbol de dependencias transitivas
- [x] #3 Se verifica que `npm ci` funciona con el lockfile regenerado
- [x] #4 Se verifica que `npm run build` sigue funcionando tras la regeneración
- [x] #5 Se documenta en el plan el criterio para futuras promociones de versión: subir `package.json` y regenerar el lockfile en el mismo commit, para que la desincronización no vuelva a ocurrir
- [x] #6 `npm test` finishes con código 0
- [x] #7 `npm run backlog:check` finishes con código 0
- [x] #8 La regeneración resultó quirúrgica: **únicamente** cambió el campo `version` del root (0.1.0 → 0.6.1). Cero cambios en las 185 entradas del árbol y cero paquetes agregados o eliminados, lo que confirma que la única desincronización era el campo de versión
- [x] #9 Se verifica el árbol de dependencias de forma explícita: las 12 dependencias declaradas (uniendo `dependencies` y `devDependencies`) coinciden en nombre con las del root del lockfile, sin faltantes ni sobrantes
- [x] #10 `npx tsc --noEmit` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Correr `npm install` para regenerar el lockfile con la versión actual.
2. Confirmar que `version` quedó alineada con `package.json`.
3. Probar `npm ci` en limpio para asegurar que el lockfile es consistente.
4. Probar `npm run build` y la suite de tests.
5. Dejar asentado, en la nota técnica de esta tarea, que toda promoción de
   versión futura debe regenerar el lockfile en el mismo commit.
<!-- SECTION:PLAN:END -->
