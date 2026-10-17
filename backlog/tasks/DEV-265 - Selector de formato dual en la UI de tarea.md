---
id: DEV-265
title: "Selector de formato dual: inspeccionar una tarea como Markdown y como JSON desde la UI"
status: draft
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
 - "ux"
 - "demo"
 - "pitch"
 - "markdown"
dependencies:
 - DEV-222
 - DEV-264
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Salió de DEV-222 con decisión del PO: **es un afordance de pitch, no parte del entregable
de la sandbox.** El objetivo de DEV-222 era que la app funcione sin daemon; esto es que la
demo comunique mejor. Atarlos al mismo criterio de cierre mezclaba dos objetivos de
naturaleza distinta.

## Qué es

Un selector dentro de la tarjeta o del modal de tarea que muestra **la misma tarea
serializada en los dos formatos que gripm soporta**:

- **Markdown** → el `backlog/tasks/DEMO-003.md` con su frontmatter YAML, tal como lo leería
  y escribiría un agente de IA.
- **JSON** → el objeto equivalente de `.gripm/backlog.json`.

## Por qué importa

El discurso de gripm frente a Jira o Linear se apoya entero en una idea: **tu backlog son
archivos `.md` versionados en tu repo**, que un agente lee y escribe sin merge conflicts.

En la demo pública, un visitante ve un tablero y **no tiene forma de saber que por debajo
hay texto plano**. El diferencial del producto es invisible. Este selector lo hace
visible en el lugar exacto donde alguien se pregunta "¿qué hay realmente acá?".

## Por qué cuesta poco

Medido: `scripts/backlogMdParser.ts` son **722 líneas sin una sola dependencia** - sin
imports, sin `require`, sin `fs`, sin `process`, sin `path`. Es un módulo de funciones
puras, que hoy se importa solo desde el server (`server/services/storage.ts:12` y
`server/routes/api.ts:34`).

Bundlearlo al cliente no arrastra nada, no agrega dependencias y no toca el contrato de
adaptadores de DEV-222: la serialización es una vista de los datos que ya están en memoria,
no una fuente nueva.

El punto a resolver es de diseño, no de infraestructura: **dónde vive el selector y en qué
momento se muestra**, para que sea un afordance y no una distracción. Tres opciones:

1. Un botón en el modal de tarea que abre un panel con las dos representaciones.
2. Un toggle dentro de la tarjeta, solo en modo sandbox.
3. Una vista dedicada "Inspect format" desde el menú de acciones.

La 1 es la menos invasiva y la que menos commitments visuales agrega en un tablero que ya
está apretado en escritorio (ver DEV-264).

## Fuera de alcance

- Cambiar el motor de serialización o el formato de archivo. Solo se **muestra** lo que el
  parser ya produce, sin reimplementarlo ni duplicarlo.
- Una vista de diff entre Markdown y JSON.
- Exportación o descarga desde ese panel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El panel muestra las dos representaciones de la tarea abierta: el Markdown con frontmatter y el JSON, generadas por `serializeBacklogMd()` y por el shape de `BacklogItem`, sin reimplementar ninguno de los dos
- [ ] #2 El Markdown mostrado es exactamente el que se escribiría en `backlog/tasks/<CODE> - <slug>.md`, incluido el nombre de archivo que `generateTaskFilename()` produciría
- [ ] #3 El contenido mostrado se **copia al portapapeles** completo, sin perder acentos ni saltos de línea del frontmatter
- [ ] #4 El afordance **solo aparece en modo sandbox**, con `isSandboxMode()`. En la app local con daemon no se ofrece, porque el dato real ya está en disco y el inspector sería ruido
- [ ] #5 No introduce scroll horizontal ni desborde en el modal, verificado a 1366x768 y en ambos temas
- [ ] #6 Texto y atajos en ambos idiomas (`es.json` y `en.json`), sin literales sueltos
- [ ] #7 Cero hallazgos nuevos de `UX-010` o `UX-011`: los botones icon-only llevan nombre accesible y los tamaños usan la escala canónica
- [ ] #8 `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** AC #4 de DEV-222. Se descartó por scope en la ronda de planificación, cuando
  todavía no se había verificado que el módulo necesario fuera sin dependencias. Con ese
  dato, la relación costo/beneficio cambió y la decisión se revirtió en la dirección
  contraria: sacarlo de DEV-222 y hacerlo propio.
- **El mismo dato también habilita la opción de hacerlo.** `backlogMdParser.ts` es puro,
  así que la barrera técnica es casi nula. Si alguna vez no se hace, la razón no va a ser
  que era difícil.
- **Relacionado con DEV-264:** el selector es una pieza de UI nueva en el modal, así que
  tiene que cumplir el criterio de no agregar desborde. Conviene implementarlo después de
  que DEV-264 haya fijado el estándar, no antes.
<!-- SECTION:NOTES:END -->