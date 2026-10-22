---
id: DEV-331
title: "Vistas guardadas y filtros persistidos en config"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "product"
  - "ux"
  - "config"
priority: medium
type: feature
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Los filtros del board son efímeros: al recargar se pierden y el usuario debe reconstruirlos. OpenTodo ofrece vistas guardadas persistidas. gripm puede persistirlas en `.gripm/config.json`, lo que además las hace versionables con Git y editables por un agente vía MCP sin UI adicional.

Explorar el modelo: qué dimensiones guarda una vista guardada (estado, prioridad, etiqueta, prefijo, sprint, release) y si se definen por proyecto o de forma global en `~/.gripm/`. Debe respetar la semántica de filtros existente (estados activos vs todos los estados) y la ortogonalidad de dimensiones del modelo de datos.

Es una iniciativa de descubrimiento: definir primero el esquema de una vista guardada y su compatibilidad hacia atrás con `.gripm/config.json` actual antes de tocar la UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se define el esquema de una vista guardada y se valida contra el parser actual de `.gripm/config.json` sin romper configuraciones existentes.
- [ ] #2 Las vistas persistidas respetan la semántica de filtros vigente (estados activos vs todos los estados).
- [ ] #3 Una vista guardada definida en config es visible y utilizable en el board sin pasos manuales extra.
- [ ] #4 Un agente puede crear o modificar vistas vía MCP o edición de config y el board las refleja.
- [ ] #5 La documentación de `.gripm/config.json` queda actualizada con el nuevo esquema.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir el esquema y el alcance (por proyecto vs global).
2. Extender el parser de config con compatibilidad hacia atrás.
3. Mapear vistas guardadas al mecanismo de filtros existente sin duplicar lógica.
4. Documentar y testear carga de configs antiguas.
<!-- SECTION:PLAN:END -->
