---
id: DEV-154
title: "Reparacion y Conexion de Suite de Verificacion Huerfana a npm test"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 05:14'
labels:
  - "testing"
  - "ci"
  - "open-source-launch"
  - "hygiene"
dependencies:
  - "DEV-014"
  - "DEV-017"
  - "DEV-148"
  - "DEV-151"
priority: high
type: bug
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolución del hallazgo P1 §3 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

Existen 5 scripts de verificación en `scripts/` creados en tareas históricas que no están conectados a `npm test` y que fallan con exit code 127 o errores de importación al ser invocados:
1. `scripts/verify-optimistic-locking.js` (DEV-017): Prueba crítica de integridad de datos para control de concurrencia y prevención de sobrescrituras accidentales. Falla buscando el plugin Vite con un shape antiguo.
2. `scripts/verify-sse.js` (DEV-014): Prueba de eventos server-sent y watcher en tiempo real. Falla por resolución de plugin.
3. `scripts/verify-legacy-import.js`: Prueba de importación de backlogs Markdown antiguos. Falla por resolución de plugin.
4. `scripts/verify-mcp-binary.js`: Prueba del catálogo de tools del servidor MCP. Falla porque busca `devboard_sync_backlog` en lugar del nombre canónico post-rebranding `gripm_sync_backlog`.
5. `scripts/verify-resilience-and-cli.js`: Falla intentando ejecutar `npm run tasks` (comando inexistente).

Se deben reparar o refactorizar estos scripts para que funcionen con la arquitectura actual del backend/Vite y cablearlos formalmente dentro de `npm test` para que corran en CI y localmente en cada validación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `scripts/verify-optimistic-locking.js` reparado y validando exitosamente el control de concurrencia con código 0
- [x] #2 `scripts/verify-sse.js` reparado y validando eventos SSE con código 0
- [x] #3 `scripts/verify-legacy-import.js` reparado y validando importación legacy con código 0
- [x] #4 `scripts/verify-mcp-binary.js` actualizado para comprobar las 12 tools con prefijo `gripm_*` con código 0
- [x] #5 `scripts/verify-resilience-and-cli.js` adaptado a los scripts reales del CLI o depurado limpiamente
- [x] #6 `npm test` ejecuta todos los scripts de verificación activos de forma secuencial y finaliza con código 0
- [x] #7 `npm run publish:check` se ejecuta en CI y valida la limpieza total del paquete
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adaptar el helper de arranque de servidor en los scripts de testing de Vite (`verify-optimistic-locking.js`, `verify-sse.js`, `verify-legacy-import.js`).
2. Actualizar las aserciones de `verify-mcp-binary.js` al catálogo `gripm_*`.
3. Ajustar `verify-resilience-and-cli.js` eliminando referencias a comandos inexistentes.
4. Agregar los scripts reparados al pipeline de `npm test` en `package.json`.
5. Validar ejecución en verde de toda la suite.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Un test roto que no corre en CI es peor que la ausencia del test. Debe asegurarse que todo script en `scripts/` sea mantenido y ejecutado en `npm test`.
<!-- SECTION:NOTES:END -->
