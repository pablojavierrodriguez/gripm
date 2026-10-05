---
id: DEV-183
title: "Higiene de Documentación Secundaria: Unificación de Logs Internos, Endpoints de Arquitectura y Metadata"
status: draft
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "documentation"
  - "branding"
  - "dx"
dependencies:
  - DEV-176
  - DEV-181
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ejecutar la limpieza y actualización de documentación técnica secundaria y residuos de logs internos identificados en el informe de auditoría técnica (R11):

1. **Logs y Fallbacks de UI:** Erradicar cadenas residuales `[DevBoard]` en `App.tsx` y fallbacks `|| 'dev-board'` en `ReleaseAssembler.tsx`.
2. **Endpoints en Arquitectura:** Corregir menciones obsoletas de endpoints en `docs/ARCHITECTURE.md` (`/api/backlog`, `/api/tasks` por los reales `/api/data`, `/api/items`).
3. **Métricas en Docs:** Sincronizar recuentos de herramientas MCP en `CONTRIBUTING.md` (12 tools) y tiempos reales de tests.
4. **Metadata de Repositorio:** Configurar topics de GitHub oficiales para gripm basados en las palabras clave del paquete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Erradicar prefijos de log residuales [DevBoard] en App.tsx reemplazando por [gripm]
- [ ] #2 Actualizar fallbacks de proyecto en ReleaseAssembler.tsx
- [ ] #3 Corregir la descripción de endpoints del servidor en docs/ARCHITECTURE.md
- [ ] #4 Sincronizar catálogo de MCP tools y notas en CONTRIBUTING.md
- [ ] #5 Verificar que la suite de tests y backlog:check pasen con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspeccionar y reemplazar los logs en `App.tsx` y `ReleaseAssembler.tsx`.
2. Actualizar las referencias de rutas API en `docs/ARCHITECTURE.md`.
3. Ajustar `CONTRIBUTING.md` con las 12 herramientas MCP canónicas.
4. Ejecutar `npm test` y sincronizar backlog.
<!-- SECTION:PLAN:END -->
