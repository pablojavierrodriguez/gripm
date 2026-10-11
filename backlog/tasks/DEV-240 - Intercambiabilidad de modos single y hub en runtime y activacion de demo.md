---
id: DEV-240
title: "Intercambiabilidad de modos --single y --hub en runtime y persistencia activa del proyecto demo"
status: ready
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "cli"
  - "projects"
  - "ui"
  - "hub"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tras ejecutar la inicialización de un repositorio mediante `gripm --init`, las opciones de runtime `--single` y `--hub` (o `--multi`) no funcionaban de forma intercambiable y la experiencia con el proyecto Demo presentaba fallas de activación y persistencia:
1. **Conflicto de Precedencia CLI vs. Configuración Local:** Al iniciar el servidor web, `src/App.tsx` subordinaba la bandera `singleProject` a la configuración estática `.gripm/config.json` (`config.mode === 'single'`), ignorando la bandera CLI `--hub` recibida por el servidor y ocultando el selector de proyectos.
2. **Sobreescritura Incondicional de `activeProjectId`:** En `vite.config.ts`, la función `getRegistry()` sobreescribía `reg.activeProjectId = existingLocal.id` en cada petición HTTP si detectaba el repositorio local actual, revirtiendo inmediatamente cualquier selección del usuario hacia el proyecto demo u otro proyecto del Hub.
3. **Resolución Rígida de `activeProject`:** En `vite.config.ts`, la resolución del proyecto activo priorizaba la ruta del sistema de archivos sobre `registry.activeProjectId`, impidiendo que el backend despachara las tareas y metadatos del proyecto demo en modo Hub.
4. **Flags de CLI en `bin/gripm.js`:** La ejecución sin banderas (`gripm`) forzaba incondicionalmente `process.env.GRIPM_MODE = 'single'`, impidiendo que proyectos configurados con modo hub en `.gripm/config.json` funcionaran adecuadamente al invocar el binario directamente.

### Solución

1. **Precedencia canónica en CLI (`bin/gripm.js`):**
   - `--hub` / `--multi` establece `GRIPM_MODE = 'multi'`.
   - `--single` establece `GRIPM_MODE = 'single'`.
   - Ejecución sin banderas elimina `GRIPM_MODE` para permitir que el servidor derive el modo desde `.gripm/config.json` o la cantidad de proyectos en el registro.
2. **Preservación de identidad activa en `vite.config.ts`:**
   - En `getRegistry()`, solo se asigna `reg.activeProjectId = existingLocal.id` si `reg.activeProjectId` no estaba previamente definido.
   - En la resolución de `activeProject`, en modo Hub (`!isSingleMode`) se prioriza `registry.activeProjectId`, despachando el proyecto demo y sus tareas completas.
3. **Precedencia de runtime en cliente (`src/App.tsx`):**
   - El prop `singleProject` de `Header` consume prioritariamente `boardData.singleProject`, respondiendo dinámicamente a la bandera del CLI.
   - Ante eventos SSE `settings_changed`, se revalida `loadData(true)` para reflejar cambios de modo en caliente.
4. **Badge diferenciado en Header (`src/components/Header.tsx`):**
   - Si se ejecuta en modo mono-proyecto sobre el proyecto demo, se muestra la etiqueta "Demo" en lugar de "Local".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 bin/gripm.js respeta flags CLI --single y --hub explícitas y no fuerza single en ejecuciones sin banderas
- [x] #2 vite.config.ts preserva registry.activeProjectId sin sobreescribirlo con el repo local en cada petición
- [x] #3 vite.config.ts en modo hub resuelve activeProject desde registry.activeProjectId permitiendo visualizar proyecto demo
- [x] #4 src/App.tsx prioriza boardData.singleProject sobre config.mode permitiendo alternar --single y --hub en runtime
- [x] #5 Header.tsx distingue badge 'Demo' vs 'Local' en modo singleProject
- [x] #6 Pruebas automatizadas validan la precedencia de flags CLI y la activación del proyecto demo
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Precedencia estricta: CLI flag > Project config (.gripm/config.json) > Registry dynamic fallback (projects.length <= 1).
- Enfoque no destructivo: Se preservan intactas las tareas y configuraciones del otro agente en DEV-238 y DEV-239.
<!-- SECTION:NOTES:END -->
