---
id: DEV-300
title: "Parser de Integridad Total: Tokenizador Formal, Idempotencia Round-Trip y Resiliencia Markdown"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-16 03:25'
labels:
  - "parser"
  - "data-integrity"
  - "markdown"
  - "yaml"
  - "resilience"
dependencies: []
priority: urgent
type: architecture
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reingeniería integral del parser y serializador de tareas (`scripts/backlogMdParser.ts`) mediante un scanner determinista de bloques y tokenizador formal de YAML/Markdown que garantice idempotencia total en operaciones de lectura-escritura (round-trip), erradicando definitivamente la mutilación de código, la pérdida de secciones y la corrupción progresiva de caracteres escapados.

### Diagnóstico de la Causa Raíz:

El parser actual se basa en expresiones regulares heurísticas y particiones por líneas (`split`) que fallan ante estructuras sintácticas válidas de Markdown y YAML:
1. **Pérdida de Secciones por Ausencia de Fallback:**
   En `parseBacklogMd`, las secciones `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes` y `Final Summary` buscan encabezados `## Header` sobre bloques a los que `extractSectionBlock` ya les removió el encabezado, descartando las secciones si no tienen marcadores HTML `<!-- SECTION:... -->`. Esto provocó en `v1.5.0` la pérdida física de notas de implementación en 5 tareas.
2. **Corrupción Progresiva de Comillas y Barras (`\"` ➔ `\\\"`):**
   `serializeBacklogMd` serializa cadenas con `JSON.stringify()`, pero `parseBacklogMd` limpia comillas con `.replace(/^['"]|['"]$/g, '')` en lugar de un unquote simétrico. Títulos o notas con `"` o `\` multiplican barras en cada guardado.
3. **Inyección en YAML Frontmatter:**
   Campos como `id`, `type`, `createdDate` o claves dinámicas de `rawExtraFrontmatter` se interpolan sin sanitizar caracteres de salto de línea (`\n`), permitiendo inyectar directivas YAML arbitrarias.
4. **Falsos Positivos de Encabezados dentro de Código:**
   Cuando una sección opcional no existe, el fallback a `bodyContent` busca encabezados con regex simple, cayendo en falsos positivos si un ejemplo de código en `## Description` menciona `## Acceptance Criteria` o `## Implementation Notes`.
5. **Omisión de Estados en el Consolidado:**
   `generateMonolithicBacklogMd` omite el estado canónico `'cancelled'` en la tabla de exportación a `BACKLOG.md`.

### Solución Arquitectónica Profunda:

- **Scanner Determinista de Secciones:**
  Implementar un parser de dos fases:
  1. *Fase Frontmatter:* Extracción y parseo seguro con soporte para BOM (`\uFEFF`), validación de claves contra `/^[a-zA-Z0-9_-]+$/` y función simétrica `unquoteYamlScalar(raw)` que desescape `JSON.parse` y comillas simples limpiamente.
  2. *Fase Secciones CommonMark:* Escaneo de un solo paso que identifique todos los fences de código cercados (``` o ~~~ respetando indentación y longitudes) y extraiga con límites precisos las secciones `Description`, `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes` y `Final Summary`, tanto si usan marcadores HTML como si usan solo encabezados Markdown estándar.
- **Idempotencia de Round-Trip:**
  Garantizar que `serialize(parse(content)) === content` para cualquier archivo canónico sin diffs fantasma ni mutilación de saltos de línea.
- **Inclusión de `cancelled`:**
  Asegurar que `generateMonolithicBacklogMd` agrupe y exporte tareas en estado `cancelled`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `parseBacklogMd` extrae íntegramente las 5 secciones estándar (`Description`, `Acceptance Criteria`, `Implementation Plan`, `Implementation Notes`, `Final Summary`) independientemente de si poseen o no marcadores HTML `<!-- SECTION:... -->`
- [x] #2 Ningún encabezado H2 (`## ...`) o marcador HTML ubicado dentro de bloques de código cercados (``` o ~~~) es interpretado como delimitador estructural
- [x] #3 Se implementa `unquoteYamlScalar` determinista, eliminando la multiplicación de barras invertidas (`\"` ➔ `\\\"`) y preservando comillas y caracteres especiales en títulos y listas
- [x] #4 Las claves y valores de YAML frontmatter se validan y sanitizan para impedir inyecciones de saltos de línea o directivas no autorizadas
- [x] #5 `parseBacklogMd` soporta archivos con UTF-8 BOM (`\uFEFF`) y archivos sin salto de línea final tras el cierre `---`
- [x] #6 `generateMonolithicBacklogMd` incluye las tareas en estado `cancelled` bajo su sección correspondiente en `BACKLOG.md`
- [x] #7 Una suite de pruebas de ida y vuelta (round-trip) con 50 casos borde de Markdown/YAML complejos verifica 100% de preservación de bytes y fidelidad semántica
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Escribir pruebas unitarias fallidas con casos borde en `scripts/test-parser-roundtrip.js` (código cercado con H2, comillas complejas, BOM, listas inline y secciones sin marcadores HTML).
2. Refactorizar el scanner de secciones en `scripts/backlogMdParser.ts` implementando una máquina de estados CommonMark de una sola pasada.
3. Implementar `unquoteYamlScalar` y sanitización estricta de frontmatter.
4. Actualizar `generateMonolithicBacklogMd` para incluir `cancelled`.
5. Recompilar binarios con `npm run build:bin` y validar la suite completa.
<!-- SECTION:PLAN:END -->
