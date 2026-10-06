---
id: DEV-183
title: "Higiene de Documentación Secundaria: Unificación de Logs Internos, Endpoints de Arquitectura y Metadata"
status: ready
created_date: '2026-10-05'
updated_date: '2026-10-06 01:47'
labels:
  - "documentation"
  - "branding"
  - "dx"
dependencies:
  - "DEV-176"
  - "DEV-181"
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
- [x] #1 Erradicar prefijos de log residuales [DevBoard] en App.tsx reemplazando por [gripm]
- [x] #2 Actualizar fallbacks de proyecto en ReleaseAssembler.tsx
- [x] #3 Corregir la descripción de endpoints del servidor en docs/ARCHITECTURE.md
- [x] #4 Sincronizar catálogo de MCP tools y notas en CONTRIBUTING.md
- [x] #5 Verificar que la suite de tests y backlog:check pasen con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspeccionar y reemplazar los logs en `App.tsx` y `ReleaseAssembler.tsx`.
2. Actualizar las referencias de rutas API en `docs/ARCHITECTURE.md`.
3. Ajustar `CONTRIBUTING.md` con las 12 herramientas MCP canónicas.
4. Ejecutar `npm test` y sincronizar backlog.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Alcance real ejecutado

- **#1 `src/App.tsx`:** el único log con prefijo era
  `console.warn('[DevBoard] Failed to load config:')`. Corregido a `[gripm]`.
  Se limpiaron además los residuos equivalentes en el propio pipeline de
  documentación que regeneraba el branding: banner de `BACKLOG.md`
  (`scripts/backlogMdParser.ts`), encabezado del guard y mensaje del commit
  guard (`scripts/verify-backlog-sync.js`).
- **#2 `ReleaseAssembler.tsx`:** los tres fallbacks `|| 'dev-board'` se
  reemplazaron por un helper único `resolveReleaseProjectId()` con
  `DEFAULT_PROJECT_ID = 'gripm'`. Centralizarlo evita la regresión: la expresión
  estaba triplicada y cualquier corrección futura tenía que aplicarse tres
  veces.
- **`backlog/releases.json`:** las 10 entradas tenían `"projectId": "dev-board"`
  mientras `.gripm/config.json` declara `"gripm"` y `backlog/sprints.json` ya
  usaba `gripm`. Como `App.tsx` filtra releases por igualdad estricta
  (`r.projectId === selectedProjectId`), el historial de releases era invisible en
  el tablero. Sincronizado a `gripm`.
- **#4 `CONTRIBUTING.md`:** el catálogo listaba 7 de las 12 herramientas MCP.
  Completadas las 5 faltantes (`gripm_create_task`, `gripm_list_projects`,
  `gripm_list_retros`, `gripm_create_retro`, `gripm_export_backlog`) con sus
  descripciones reales tomadas de `scripts/mcp-server.ts`. El falso `~300ms` de
  `npm test` se reemplazó por la descripción de los pasos de la suite.
- **Guard de docs corregido:** `verify-backlog-sync.js` buscaba
  `bin/devboard-mcp.js` con el patrón `devboard_*`, rutas que no existen. Ese
  chequeo nunca pudo detectar desactualización. Apuntado a `bin/gripm-mcp.js` y
  `gripm_*`; verificado que expone las 12 herramientas, en línea con el
  `README.md`.

### Fuera de alcance (decisión deliberada)

- **`DevBoardConfig` no se renombró a `GripmConfig`.** Es un tipo público
  importado por 10 módulos de `src/`, reexportado en la superficie de la app y
  usado como contrato de configuración. El AC pedía eliminar *prefijos de log*,
  no renombrar la API de tipos. Queda registrado como deuda de naming para un
  refactor dedicado con su propia tarea.
- **`scripts/uninstall.js` conserva las cadenas `dev-board`.** No son branding
  residual sino reconocimiento de instalaciones legacy: el script debe seguir
  detectando y revirtiendo scripts inyectados por la marca anterior. Borrarlas
  rompería la desinstalación de usuarios existentes.

### Verificación ejecutable

```bash
grep -rn "\[DevBoard\]\|'dev-board'" src/     # sin resultados
node -e "console.log(require('fs').readFileSync('bin/gripm-mcp.js','utf8')
  .match(/name:\s*['\"]gripm_[a-z0-9_]+['\"]/g).length)"   # 12
npx tsc --noEmit && npm test && npm run backlog:check \
  && npm run publish:check && npm run build   # todos exit 0
```
<!-- SECTION:NOTES:END -->
