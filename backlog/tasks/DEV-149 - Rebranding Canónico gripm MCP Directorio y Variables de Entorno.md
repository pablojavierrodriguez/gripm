---
id: DEV-149
title: "Rebranding Canónico y Erradicación de Deuda Técnica: MCP gripm_*, Directorio .gripm y Variables GRIPM_*"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-03 19:48'
labels:
  - "rebrand"
  - "mcp"
  - "governance"
  - "blocker"
dependencies: []
priority: urgent
type: tech_debt
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Culminar el rebranding de forma definitiva antes de la publicación del repositorio público `gripm`:
Como el proyecto se lanza como un repositorio nuevo en GitHub (`pablojavierrodriguez/gripm`) con versión 1.0.0 y sin usuarios externos heredados, no existe justificación para arrastrar alias y dualidad de nombres (`devboard_*`, `.devboard/`, `DEVBOARD_*`) que perpetúen una deuda técnica como contrato público.

Esta tarea abarca:
1. **MCP Canónico:** Canonizar las herramientas bajo el prefijo `gripm_*` (`gripm_list_tasks`, `gripm_get_task`, etc.) en `scripts/mcp-server.ts`.
2. **Directorio de Configuración:** Utilizar `.gripm/` como carpeta estándar del proyecto, con soporte de migración transparente o fallback si existe `.devboard/`.
3. **Variables de Entorno:** Estandarizar en `GRIPM_*` (`GRIPM_PORT`, `GRIPM_HOST`, `GRIPM_MODE`), aceptando `DEVBOARD_*` únicamente como fallback suave.
4. **Almacenamiento Global:** Estandarizar en `~/.gripm/` para el registro global de proyectos y caché.
5. **Licencia y Notificaciones:** Actualizar `LICENSE` a "gripm Contributors" y limpiar menciones residuales de DevBoard en cabeceras y guardrails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/mcp-server.ts` expone formalmente las herramientas canónicas `gripm_*`
- [x] #2 La aplicación detecta y utiliza `.gripm/config.json` de forma nativa, migrando automáticamente `.devboard/` si existe
- [x] #3 Las variables de entorno canónicas son `GRIPM_PORT`, `GRIPM_HOST`, `GRIPM_MODE`, `GRIPM_HOME`
- [x] #4 El archivo `LICENSE` nombra a "gripm Contributors" en concordancia con `package.json`
- [x] #5 Los guardrails de pre-commit y banners de consola muestran `[gripm Guard]`
- [x] #6 Tests e integración pasan con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `scripts/mcp-server.ts` para que `gripm_*` sea la nomenclatura de primer nivel y empaquetar binarios con `npm run build:bin`.
2. Actualizar `registryConfig.js` y `vite.config.ts` para preferir `.gripm/` y `~/.gripm/`.
3. Actualizar `LICENSE` y hooks.
<!-- SECTION:PLAN:END -->
