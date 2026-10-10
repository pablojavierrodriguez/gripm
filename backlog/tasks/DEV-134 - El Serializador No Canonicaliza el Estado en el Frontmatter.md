---
id: DEV-134
title: "El Serializador No Canonicaliza el Estado en el Frontmatter: Done/Done vs done/done Acumulados"
status: done
created_date: '2026-09-30'
updated_date: '2026-09-30 02:45'
labels:
  - "chore"
  - "parser"
  - "hygiene"
  - "data-integrity"
  - "devboard-core"
dependencies:
  - "DEV-127"
priority: low
type: chore
sprints: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El frontmatter de las tareas escribe el estado **tal como viene**, sin
canonicalizarlo. Como el read path sí normaliza (`normalizeStatus` mapea `Done` a
`done`, `Draft` a `draft`), el sistema funciona, pero el dato persistido queda
inconsistente para siempre.

**Estado real de los 132 archivos de `backlog/tasks/`:**

| Valor escrito | Cantidad |
|---|---|
| `Done` (mayúscula) | 93 |
| `Draft` (mayúscula) | 3 |
| `done` (minúscula) | 12 |
| `draft` (minúscula) | 10 |
| `ready` | 8 |
| `review` | 6 |

Es decir, **96 de 132 tareas (73%) tienen el estado con mayúscula inicial**, y
esas 96 son exactamente las más antiguas: el proyecto empezó escribiéndose a mano
con `Done` y `Draft`, y desde que `normalizeStatus` existe el write path no
corrige lo que ya quedó.

**Por qué no rompe nada**: `normalizeStatus` se aplica al leer, así que la UI y
el MCP ven `done` correctamente. El costo es de higiene del dato versionado, y
crece: cada guardado reescribe el archivo con el valor que venga, de modo que la
divergencia se congela en vez de resolverse.

**Mismo patrón que DEV-127, otra dimensión**: DEV-127 eliminó que el serializador
fabricara contenido que el usuario nunca escribió. Acá no fabrica, pero tampoco
**normaliza**: escribe un valor no canónico. En ambos casos el write path debería
garantizar que lo que llega al disco es la forma canónica del modelo.

**Consecuencia práctica más grave que la estética**: cualquier herramienta que lea
el frontmatter de forma directa sin pasar por el parser ve dos valores distintos
para el mismo estado. Un `grep '^status: done'` sobre los archivos devuelve 12
resultados de 105 tareas completadas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `serializeBacklogMd` escribe el estado usando la forma canónica en minúscula, independientemente de cómo llegue en el objeto de entrada
- [x] #2 Verificar con un round-trip que una tarea creada con `status: "Done"` se persiste como `status: "done"` y se relee como `done`
- [x] #3 Se agrega un test de regresión en `scripts/test-parser.js` que cubra las variantes con mayúscula inicial (`Done`, `Draft`, `In Progress`, `Ready`, `Testing`, `Review`)
- [x] #4 Se normalizan los 96 archivos existentes que tienen el estado con mayúscula, sin alterar su contenido más allá del campo `status`
- [x] #5 La normalización preserva cualquier otro campo del frontmatter, incluidos los no canónicos (`labels`, `assignees`) y los nombres de sección
- [x] #6 Se documenta en el plan el criterio: en el write path, todo campo del modelo que tenga forma canónica se escribe en forma canónica, nunca "tal como vino"
- [x] #7 `npx tsc --noEmit` finishes con código 0
- [x] #8 `npm test` finishes con código 0
- [x] #9 `npm run backlog:check` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Escribir el test de regresión que falle con el comportamiento actual: una tarea
   con `status: "Done"` debe persistirse como `done`.
2. Canonicalizar el estado en `serializeBacklogMd` antes de escribirlo, reutilizando
   la misma función que usa el read path para no duplicar el mapa de estados.
3. Verificar el round-trip completo.
4. Migrar los 96 archivos con un script declarado en `package.json`, limitado
   estrictamente al campo `status` del frontmatter, y verificado con `--dry-run`
   y recuento antes/después.
5. Ejecutar la pirámide de verificación completa.
<!-- SECTION:PLAN:END -->

## Technical Notes

<!-- SECTION:TECHNOTES:BEGIN -->
**Prioridad estimada: baja.** Nada se rompe: el read path normaliza. Se prioriza
bajo porque es deuda de higiene, no un defecto funcional. Se deja registrado
porque un dato no canónico en un archivo versionado cuesta más caro a medida que
el proyecto crece, y porque las herramientas que consumed el frontmatter sin el
parser existen (editores, búsquedas, agentes).

**Reutilizar `normalizeStatus` y no escribir un mapa propio**: el riesgo de tener
dos listas de estados canónicos es que se desincronicen. El write path debe usar
exactamente la misma función que el read path, por la misma razón que en DEV-127:
la fuente de verdad de la canonicalización es una sola función.

**Por qué una migración y no un fix silencioso**: corregir sólo el serializador
deja 96 archivos con el valor viejo, y el próximo `grep` vuelve a dar un resultado
engañoso. La migración tiene que ser explícita, auditable e idempotente, como
`backlog:purge-fabricated` (DEV-127).

**Convención de nombres de script**: seguir el patrón existente
(`backlog:purge-fabricated`), es decir `backlog:canonicalize-status`, declarado en
`package.json`, con `--dry-run` obligatorio antes de aplicar.
<!-- SECTION:TECHNOTES:END -->
