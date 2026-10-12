---
id: DEV-238
title: "Erradicación total de referencias legacy DevBoard (devboard, dev-board, .devboard, DEVBOARD_*) en código activo"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-12'
labels:
  - "tech-debt"
  - "cleanup"
  - "refactor"
  - "canonical-naming"
dependencies: []
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Invariante canónico del proyecto: **"Cualquier referencia en código activo a `dev-board`, `devboard`, `.devboard` o `DEVBOARD_*` es un defecto si no es `gripm`"**.

Tras la consolidación como paquete autónomo `@gripm/board`, no existe justificación para sostener capas de compatibilidad con versiones pre-1.0. Esta tarea define la purga atómica e integral de todas las variantes del nombre histórico en el código fuente.

### Inventario de las 5 Capas de Purga

1. **Variables de entorno de proceso:**
   - Erradicar todos los operadores fallback `|| process.env.DEVBOARD_*` en `vite.config.ts`, `bin/gripm.js`, `scripts/registryConfig.js` y `scripts/updateChecker.js`.
   - Variables a purgar: `DEVBOARD_MODE`, `DEVBOARD_HOST`, `DEVBOARD_PORT`, `DEVBOARD_OPEN`, `DEVBOARD_ALLOWED_PATHS`, `DEVBOARD_ALLOWED_HOSTS`, `DEVBOARD_HOME`, `DEVBOARD_REGISTRY_PATH`, `DEVBOARD_TARGET_REPO`, `DEVBOARD_NO_UPDATE_CHECK`.
   - Único contrato válido: `GRIPM_*`.

2. **Directorios y rutas en disco:**
   - Purgar búsquedas de carpetas `.devboard/` y archivos `.devboard/config.json` o `.devboard/backlog.json` en `vite.config.ts` y scripts.
   - Purgar referencias a `data/dev-board.json` y `data/projects-registry.json` (incluyendo `.gitignore` y scripts de empaquetado).
   - Único contrato válido: `.gripm/`.

3. **Claves de almacenamiento en navegador (`src/utils/storage.ts`):**
   - Retirar los 9 arrays de claves alias legacy (`devboard-theme`, `devboard_active_tab`, `devboard_active_project_id`, `devboard_kanban_sprint`, etc.).
   - Único contrato válido: `gripm_*` / `gripm-*`.

4. **Nombres internos, plugins y contratos de TypeScript:**
   - En `vite.config.ts`: renombrar `devBoardApi()` a `gripmApi()`, `DevBoardPlugin` a `GripmPlugin`, y el nombre del plugin `'vite-plugin-dev-board-api'` a `'vite-plugin-gripm-api'`.
   - En `src/types.ts`: eliminar alias de tipo `export type DevBoardConfig = GripmConfig`.
   - En `src/api.ts`: renombrar propiedad `hasDevBoard` a `hasGripm`.
   - En `scripts/registryConfig.js`: renombrar `getDevBoardHomeDir()` a `getGripmHomeDir()`.

5. **Logs de consola y textos de usuario:**
   - Reemplazar prefijos de log `[DevBoard API]`, `[DevBoard Watcher]`, `[DevBoard FS]`, `[DevBoard Backlog.md]` por `[gripm ...]`.
   - Corregir descripción del proyecto demo en `vite.config.ts` ("Proyecto de demostración de gripm").

6. **Actualización de suites de test:**
   - Actualizar `scripts/test-api-security.js`, `scripts/verify-integration.js`, `scripts/verify-optimistic-locking.js`, `scripts/verify-sse.js` y `scripts/verify-legacy-import.js` para buscar e interactuar exclusivamente con `'vite-plugin-gripm-api'` y variables `GRIPM_*`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Cero ocurrencias de variables process.env.DEVBOARD_* en código fuente activo
- [x] #2 Cero referencias a carpetas .devboard/ o archivos dev-board.json en el runtime y scripts
- [x] #3 src/utils/storage.ts purgado de arrays de claves de retrocompatibilidad devboard_*
- [x] #4 vite.config.ts y types.ts renombran plugins y contratos internos a gripmApi / vite-plugin-gripm-api
- [x] #5 Logs de consola y descripciones en runtime estandarizados 100% en gripm
- [x] #6 Suites de prueba actualizadas al nuevo estándar sin romper ningún paso de la suite
- [x] #7 Pirámide de verificación en verde (tsc --noEmit, npm test con 16 pasos, backlog:sync, backlog:check)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Regla de oro: No preservar "redes de seguridad" muertas que generen ambigüedad o futuros bugs de precedencia.
<!-- SECTION:NOTES:END -->
