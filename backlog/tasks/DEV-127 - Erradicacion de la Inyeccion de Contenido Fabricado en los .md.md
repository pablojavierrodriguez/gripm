---
id: DEV-127
title: "Erradicación de la Inyección de Contenido Fabricado en los Archivos .md de Tareas"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "data-integrity"
  - "parser"
  - "plan-guard"
  - "devboard-core"
dependencies:
  - "DEV-126"
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!\-- SECTION:DESCRIPTION:BEGIN -->
Crear una tarea escribiendo únicamente su título no deja la tarea vacía: el
serializador de Markdown le **fabrica** tres secciones y las escribe en el archivo
`.md` versionado del repositorio.

Al crear el ítem `DEVB-125 - Pruebaa` con el texto `"Pruebaa"` como único
contenido, el archivo resultante quedó así:

```markdown
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
