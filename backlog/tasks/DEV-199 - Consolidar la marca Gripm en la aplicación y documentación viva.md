---
id: DEV-199
title: "Consolidar la marca Gripm en la aplicación y documentación viva"
status: done
created_date: '2026-10-07'
updated_date: '2026-10-07 23:29'
labels:
  - "docs"
  - "ux"
dependencies: []
priority: medium
type: chore
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La interfaz ya se presenta como gripm, pero la documentación operativa y las plantillas activas todavía describen el producto como "anteriormente DevBoard". Consolidar el nombre Gripm en la aplicación y en las guías vigentes, hacer explícito el corte de marca posterior a v1.0.0 y dejar intactos el changelog y el backlog histórico. Mantener las rutas de migración de datos heredados para no arriesgar información de proyectos existentes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Las guías y plantillas vigentes presentan el producto únicamente como Gripm y no como "anteriormente DevBoard"
- [x] #2 La interfaz web y los metadatos del producto identifican Gripm de forma consistente
- [x] #3 CHANGELOG.md y las tareas históricas del backlog permanecen intactos
- [x] #4 Las claves y carpetas heredadas se conservan solo como compatibilidad/migración de datos, sin promocionarlas como marca vigente
- [x] #5 Las validaciones de build, tests y sincronización del backlog pasan
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Se eliminaron las referencias de marca anterior de las guías, skills, reglas de agentes, arquitectura y playbook vigentes; la README explica el corte de marca desde v1.0.1.
- Los templates de agentes ahora citan únicamente herramientas MCP `gripm_*` reales, no supuestos alias `devboard_*`.
- La interfaz ya usaba Gripm; el título del documento HTML ahora presenta la marca con capitalización consistente.
- Se preserva la lectura/migración de claves `devboard_*` y rutas `.devboard` como compatibilidad técnica de datos, sin exponerlas como identidad vigente.
- `CHANGELOG.md`, `backlog/releases.json` y tareas históricas no se modificaron.
<!-- SECTION:NOTES:END -->
