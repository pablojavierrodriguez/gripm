---
id: DEV-289
title: "Integridad del Parser: Eliminación de mutilación de código y pérdida de campos YAML en backlogMdParser"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "parser"
  - "data-integrity"
  - "markdown"
  - "yaml"
dependencies: []
priority: p0
type: bug
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corrección crítica en `scripts/backlogMdParser.ts` para evitar la pérdida silenciosa de datos y la mutilación de texto Markdown al guardar tareas desde la UI Web o el servidor MCP.

### Problemas identificados y reproducibles:

1. **Pérdida silenciosa de campos YAML personalizados:**
   En `scripts/backlogMdParser.ts:247-266`, la función `finalizeList()` solo procesa una lista fija de claves (`labels`, `assignees`, `dependencies`, `blocks`, `blocked_by`, `related_to`, `sprints`, `releases`). Cualquier otra clave YAML en formato de lista (ej: `tags:`, `reviewers:`, `qa_steps:`) se descarta de la memoria y **se elimina físicamente del archivo en disco al serializar**.
2. **Rotura de listas inline con comas:**
   En `scripts/backlogMdParser.ts:301`, listas como `labels: ["ui/ux", "auth, login"]` se parten con `.split(',')`, corrompiendo los valores.
3. **Mutilación de descripciones con bloques de código Markdown:**
   En `scripts/backlogMdParser.ts:202-213`, `extractSectionBlock()` busca delimitadores H2 (`## Acceptance Criteria`, `## Description`) mediante expresiones regulares ignorando bloques de código cercados (```markdown ... ```). Si una tarea contiene documentación técnica o ejemplos con encabezados H2 dentro de código, el parser corta la sección en el bloque de código y **borra todo el texto posterior al re-serializar**.

### Script de Reproducción Inmediata (PoC):

```javascript
import { parseBacklogMd, serializeBacklogMd } from './scripts/backlogMdParser.ts';

// Caso 1: Pérdida de campos YAML
const md1 = `---\nid: DEV-999\ntags:\n  - security\nreviewers:\n  - alice\n---\n## Description\nTest.`;
const p1 = parseBacklogMd(md1, 'DEV-999');
const s1 = serializeBacklogMd(p1);
console.assert(s1.includes('reviewers'), 'FALLO: reviewers fue eliminado del archivo');

// Caso 2: Truncamiento por código
const md2 = `## Description\n\`\`\`markdown\n## Acceptance Criteria\n- [ ] en código\n\`\`\`\nTexto que se borra.`;
const p2 = parseBacklogMd(md2, 'DEV-999');
console.assert(p2.description.includes('Texto que se borra'), 'FALLO: Texto posterior al código fue truncado');
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `parseBacklogMd` y `serializeBacklogMd` preservan cualquier campo o lista YAML no estándar dentro de `rawExtraFrontmatter` sin pérdida de datos en el ciclo de lectura y serialización
- [x] #2 Los valores de listas inline entre corchetes con comas entrecomilladas (`["a", "b, c"]`) se analizan respetando las cadenas sin dividirlas erróneamente
- [x] #3 `extractSectionBlock` ignora cualquier encabezado H2 (`## ...`) que se encuentre dentro de bloques de código cercados (\`\`\` o ~~~), extrayendo la totalidad de la descripción y el plan
- [x] #4 Un test de ida y vuelta (round-trip) verifica que tareas con bloques de código y metadatos YAML complejos conservan el 100% de su contenido
- [x] #5 La suite de pruebas de sincronización aprueba limpiamente (`npm run backlog:check`)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Preservación de campos YAML personalizados:**
  - `finalizeList()` y el parser inline de `parseBacklogMd()` almacenan dinámicamente cualquier lista YAML o clave no estándar dentro de `result.rawExtraFrontmatter`.
  - `serializeBacklogMd()` recorre `rawExtraFrontmatter` y emite arrays como listas YAML indented (`key:\n  - "value"`), arrays vacíos como `key: []`, valores numéricos/booleanos de forma nativa y cadenas JSON-escapadas, garantizando persistencia bidireccional sin pérdida.
- **Parser de listas inline sin mutilación por comas:**
  - Nueva función `parseInlineList()` que procesa listas inline entre corchetes (`[...]`). Si es JSON válido, aprovecha `JSON.parse`; de lo contrario emplea un tokenizador que respeta comillas simples/dobles y caracteres de escape, preservando cadenas como `["ui/ux", "auth, login"]` intactas.
- **Protección de bloques de código en `extractSectionBlock`:**
  - Se implementó un escaneo línea por línea con seguimiento de fences (` ``` ` y ` ~~~ ` respetando longitud y apertura/cierre de bloques de código según CommonMark).
  - Los encabezados H2 (`## ...`) ubicados dentro de bloques de código son ignorados, eliminando por completo la mutilación de texto posterior en descripciones o planes técnicos.
- **Sanitización de Path Traversal en `generateTaskFilename` (SEC-01 de DEV-292):**
  - Sanitización estricta de `id` con `[^a-zA-Z0-9_-]` eliminando secuencias `..`, `/` y `\`, con fallback seguro a `'TASK'`.
  - Garantiza contención estricta dentro de `backlog/tasks`.
- **Tests y Verificación:**
  - Se añadieron tests exhaustivos en `scripts/test-parser.js` cubriendo round-trips de metadatos YAML complejos, listas inline con comas, código cercado con encabezados H2, y contención segura de rutas contra path traversal.
<!-- SECTION:NOTES:END -->
