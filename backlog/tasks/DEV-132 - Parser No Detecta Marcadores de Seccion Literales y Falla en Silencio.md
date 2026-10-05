---
id: DEV-132
title: "El Parser No Detecta Marcadores de Sección Literales en Descripciones y Falla en Silencio"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "parser"
  - "data-integrity"
  - "observability"
  - "devboard-core"
dependencies:
  - "DEV-127"
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El parser de archivos de tarea extrae las secciones delimitadas tomando la
**primera coincidencia** de cada marcador, en orden de documento. Consecuencia: si
la descripción de una tarea contiene los marcadores literales del formato —algo
perfectamente natural en una tarea que **documenta el propio formato**— el parser
lee esa copia como si fuera la sección real, y la tarea se parsea con datos
equivocados, **sin ningún error visible**.

**Caso real, encontrado en el propio backlog**: la descripción de DEV-127 incluye,
para mostrar un `.md` contaminado, un bloque de código con los marcadores literales
de sección. Como la descripción va antes que las secciones reales, el regex de
extracción capturaba desde el `AC:BEGIN` de la descripción hasta el `AC:END` real,
es decir medio documento. Los **18 ACs de DEV-127 eran invisibles para el parser**.

**El agravante: el guard de integridad no lo puede detectar.** `npm run
backlog:check` lee y escribe con el mismo parser. Si el parser interpreta
consistentemente el bloque equivocado, la relectura produce el mismo error y el
guard reporta "100% sincronizado". Un error autoconsistente se valida como
verdadero, que es la peor clase de fallo en una herramienta cuyo propósito es
justamente dar confianza sobre el estado del backlog.

**Por qué importa más de lo que parece**: la serie DEV-101 a DEV-131 es,
precisamente, la que documenta y modifica el formato de los archivos de tarea
(serialización, secciones, plan guard, campos, sanitización). Es un tipo de tarea
que va a seguir apareciendo en cada iteración del producto, y todas ellas corren
riesgo de caer en esta trampa. Cuantas más tareas documenten el formato, mayor es
la probabilidad de que una corrompa silenciosamente su propia lectura.

**Mitigación parcial ya aplicada**: en DEV-127 los marcadores del ejemplo se
reescribieron como texto neutro (`[marcador AC:BEGIN]`) en lugar de su forma
literal. Eso corrige **ese** archivo, pero no previene el próximo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se agrega al guard de integridad (`npm run backlog:check`) un detector que falle de forma explícita cuando un archivo de tarea contiene más de un marcador `BEGIN` por sección, en lugar de dejar que el error pase inadvertido
- [x] #2 El detector reporta el archivo, la línea y el marcador duplicado, para que el autor pueda localizarlo sin buscar a ciegas
- [x] #3 El detector no produce falsos positivos: los archivos legítimos con secciones adicionales como `SECTION:TECHNOTES` se validan sin error
- [x] #4 El write path deja de propagar el problema: al serializar, los marcadores que aparezcan literalmente dentro de texto libre del usuario se neutralizan o se escapan
- [x] #5 El write path nunca altera los marcadores reales de la estructura del archivo
- [x] #6 Una tarea cuya descripción contenga los marcadores literales se relee con sus ACs, plan y descripción reales, y no con los de la descripción
- [x] #7 Se agrega un test de regresión en `scripts/test-parser.js` que construya una tarea con marcadores literales en la descripción y verifique que el round-trip conserva los ACs y el plan reales
- [x] #8 El test cubre también el caso de un marcador literal en el plan y en las notas técnicas
- [x] #9 `npx tsc --noEmit` finishes con código 0
- [x] #10 `npm test` finishes con código 0
- [x] #11 `npm run backlog:check` finishes con código 0
- [x] #12 Se documenta en `AGENTS.md` la prohibición de escribir marcadores de sección literales dentro de descripciones, y el motivo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Escribir un test que reproduzca el fallo: una tarea con marcadores literales
   dentro de la descripción, verificando que hoy los ACs reales se pierden. El test
   debe fallar antes del fix.
2. Implementar el detector en `scripts/verify-backlog-sync.js`: recorrer los
   archivos de `backlog/tasks/` y `backlog/archive/`, contar marcadores por
   sección y reportar los duplicados con archivo y línea.
3. Sanitizar en el write path (`scripts/backlogMdParser.ts`) los marcadores
   literales que provienen de texto libre del usuario, sin tocar los marcadores
   estructurales.
4. Regenerar `bin/devboard-mcp.js` con `npm run build:bin`.
5. Cubrir el round-trip con el test de regresión y los casos de plan y notas.
6. Documentar la prohibición en `AGENTS.md`.
7. Ejecutar la pirámide completa de verificación.
<!-- SECTION:PLAN:END -->
