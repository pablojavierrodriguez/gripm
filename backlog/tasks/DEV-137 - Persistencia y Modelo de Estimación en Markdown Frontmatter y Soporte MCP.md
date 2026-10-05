---
id: DEV-137
title: "Persistencia y Modelo de Estimación en Markdown Frontmatter y Soporte MCP"
status: draft
created_date: '2026-09-30'
updated_date: '2026-09-30 14:06'
labels:
  - "estimation"
  - "markdown"
  - "parser"
  - "mcp"
  - "devboard-core"
dependencies:
  - "DEV-136"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Incorporar el soporte del atributo de estimación en el motor de almacenamiento de DevBoard, garantizando persistencia soberana en archivos Markdown individuales (backlog/tasks/*.md), el archivo consolidado (BACKLOG.md) y los contratos de herramientas MCP.

### Requerimientos Técnicos:
1. **Modelo de Dominio Tipado:**
   - Añadir `estimate?: string | number;` en `BacklogItem` (`src/types.ts`) y `BacklogMdTask` (`scripts/backlogMdParser.ts`).
   - Normalización de valores: Story Points numéricos (0, 1, 2, 3, 5, 8, 13, 21) o strings de tallas canónicas (XS, S, M, L, XL, XXL).
2. **Parser y Serializador Markdown (backlogMdParser.ts):**
   - Lectura defensiva de `estimate:` en frontmatter YAML.
   - Serialización limpia: si `task.estimate` está definido, escribir `estimate: ${val}` respetando el formato YAML.
   - Preservación en sincronización y regeneración de `BACKLOG.md`.
3. **Contratos API y Middleware (vite.config.ts):**
   - Propagar `estimate` en endpoints de tareas sin descarte de payload.
4. **Herramientas MCP (scripts/mcp-server.ts y bin/devboard-mcp.js):**
   - Permitir asignar o modificar la estimación desde `devboard_create_task` y `devboard_update_task`.
   - Exponer `estimate` en las consultas de `devboard_get_task` y `devboard_list_tasks`.
5. **Idempotencia y Retrocompatibilidad:**
   - Tareas preexistentes sin estimación continúan funcionando sin errores (`estimate: undefined`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Extender la interfaz BacklogItem en src/types.ts y BacklogMdTask en scripts/backlogMdParser.ts con el campo opcional estimate?: string | number
- [ ] #2 El parser parseBacklogMd extrae de forma robusta el atributo estimate del frontmatter YAML tanto para números (Story Points) como para cadenas (T-Shirt sizes)
- [ ] #3 El serializador serializeBacklogMd serializa de forma canónica y limpia el campo estimate: en el frontmatter de backlog/tasks/*.md y BACKLOG.md
- [ ] #4 Actualizar los endpoints en vite.config.ts (/api/tasks, /api/backlog) para propagar el campo estimate en lecturas y escrituras sin pérdida de atributos
- [ ] #5 Extender las herramientas MCP devboard_create_task y devboard_update_task para aceptar y procesar el parámetro estimate de forma nativa
- [ ] #6 Exponer el valor de estimate en devboard_get_task y devboard_list_tasks para consumo eficiente por agentes de IA
- [ ] #7 Añadir tests de regresión en scripts/test-parser.js verificando parseo, serialización e idempotencia de tareas con y sin estimación
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `src/types.ts`:
   - Añadir `estimate?: string | number;` a `BacklogItem`.
2. Actualizar `scripts/backlogMdParser.ts`:
   - Añadir `estimate?: string | number;` a `BacklogMdTask`.
   - En `parseBacklogMd`: parsear línea `estimate:` en frontmatter. Si es un entero válido, convertir a número; si es string (ej. 'M'), preservar trimmed.
   - En `serializeBacklogMd`: si `task.estimate !== undefined`, escribir `estimate: ${typeof task.estimate === 'number' ? task.estimate : JSON.stringify(task.estimate)}`.
   - En `generateMonolithicBacklogMd`: incluir columna o badge de estimación si está presente.
3. Actualizar `vite.config.ts`:
   - Verificar que los handlers de guardado y lectura de tareas no filtren `estimate`.
4. Actualizar `scripts/mcp-server.ts` y esquemas JSON:
   - Añadir propiedad `estimate` en `devboard_create_task` y `devboard_update_task`.
   - Incluir `estimate` en el formato compacto y detallado de `devboard_list_tasks` y en `devboard_get_task`.
5. Incorporar tests en `scripts/test-parser.js` para asegurar 100% de cobertura de parseo y serialización.
<!-- SECTION:PLAN:END -->
