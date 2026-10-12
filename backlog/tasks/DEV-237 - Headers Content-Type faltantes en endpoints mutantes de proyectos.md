---
id: DEV-237
title: "Resolución integral de Restaurar Proyecto Demo (Error 415 por Content-Type y activación multi-proyecto)"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "bug"
  - "api"
  - "security"
  - "projects"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al invocar la acción "Restaurar Proyecto Demo" desde el selector de proyectos, se manifestaban dos fallas consecutivas:
1. **Error HTTP 415 (Unsupported Media Type):** Al enviar la petición `POST /api/projects/restore-demo`, el middleware de seguridad CSRF de `vite.config.ts` rechazaba la solicitud por no incluir `Content-Type: application/json`.
2. **Invisibilidad y falta de activación del Demo:** Tras resolver el 415, el servidor respondía OK y mostraba el toast de éxito, pero la pantalla no mostraba ningún cambio ni proyecto demo. Esto ocurría por dos factores combinados:
   - En `vite.config.ts`, `isSingleMode` forzaba `true` de manera incondicional ante la ausencia de `process.env.GRIPM_MODE='multi'` (ignorando `config.mode: "multi"` de `.gripm/config.json` y la existencia de múltiples proyectos en el registro). Como resultado, `GET /api/data` filtraba y descartaba todos los proyectos del registro excepto el proyecto activo inicial (`gripm`), impidiendo que el cliente recibiera el proyecto demo y sus ítems.
   - En `src/App.tsx`, `handleRestoreDemo` no conmutaba `selectedProjectId` a `'demo'`, dejando la interfaz anclada en el proyecto anterior.

### Solución

1. **Headers de mutación en `src/api.ts`:** Se agregaron `headers: { 'Content-Type': 'application/json' }` y `body: JSON.stringify({})` en `restoreDemoProject()`, `convertProjectToMd()` y `convertProjectToJson()`.
2. **Detección consistente de `isSingleMode` en `vite.config.ts`:**
   - Respeta `config.mode` (`"multi"` / `"single"`) definido en `.gripm/config.json`.
   - Si no hay modo forzado por entorno ni configuración, deriva `isSingleMode` dinámicamente según `registry.projects.length <= 1`, permitiendo que coexistan múltiples proyectos sin forzar monoproyecto artificial.
3. **Activación de proyecto demo:**
   - En `vite.config.ts`, `POST /api/projects/restore-demo` establece `registry.activeProjectId = 'demo'`.
   - En `src/App.tsx`, `handleRestoreDemo` ejecuta `setSelectedProjectId('demo')`, sincroniza con `STORAGE_KEYS.ACTIVE_PROJECT_ID` y llama a `setActiveProjectApi('demo')`.
4. **Pruebas anti-regresión:** En `scripts/test-api-security.js`, se valida estáticamente que todas las peticiones `POST`/`PUT` de `src/api.ts` contengan `Content-Type: application/json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 restoreDemoProject, convertProjectToMd y convertProjectToJson envían Content-Type application/json
- [x] #2 /api/projects/restore-demo responde 200 OK y registra demo como activeProjectId sin error 415
- [x] #3 vite.config.ts respeta config.mode y registry.projects.length en isSingleMode sin ocultar proyectos registrados
- [x] #4 handleRestoreDemo en App.tsx conmuta selectedProjectId a demo y renderiza inmediatamente el tablero demo
- [x] #5 Prueba estática en test-api-security.js valida que todo fetch POST/PUT en src/api.ts incluye Content-Type application/json
- [x] #6 Pirámide de verificación en verde (tsc --noEmit, npm test, backlog:sync, backlog:check)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Enfoque seguro: Se mantiene el guardrail anti-CSRF en el servidor y se adapta el cliente para cumplirlo estrictamente.
- Modo multi-proyecto: Si el registro contiene más de un proyecto o el proyecto declara `"mode": "multi"`, el tablero permite alternar libremente entre los proyectos registrados.
<!-- SECTION:NOTES:END -->
