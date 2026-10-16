---
id: DEV-242
title: "Remediacion integral de seguridad Fase 2: erradicacion de RCE en frontmatter y auditoria MCP (SEC-01 a SEC-10)"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "security"
  - "mcp"
  - "audit"
  - "quality-gate"
dependencies:
  - "DEV-233"
parent: "DEV-233"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación y certificación de la **Fase 2 de Seguridad** definida en la auditoría integral de `@gripm/board@1.1.0` (`docs/archive/auditoria-2026-10-10.md` §4 y §11.2):

1. **SEC-01 · Ejecución ciega de comandos persistidos en frontmatter:**
   El Gatekeeper de `scripts/mcp-server.ts` leía `verifyCommand` desde `rawExtraFrontmatter` del archivo Markdown en disco y lo persistía tras cada transición. Cualquier tarea con comandos shell maliciosos en su frontmatter lograba ejecución de código (RCE) en la máquina del próximo agente o usuario al transicionar a `ready` o `done`. Se erradica la lectura ciega desde disco y la persistencia de scripts en los archivos Markdown.
2. **SEC-02 · Mutación silenciosa y fabricación de ACs en `gripm_sync_backlog`:**
   El parámetro `autoFix` tenía valor por defecto `true`, alterando `- [ ]` a `- [x]` sin verificación real en tareas `done`. Se establece `autoFix` en `false` por defecto (modo seguro/solo lectura de auditoría).
3. **SEC-03 · Contención de rutas en `--repo` del servidor MCP:**
   Validar contención de la ruta `--repo` contra límites del sistema para impedir traversals o rutas no autorizadas.
4. **SEC-05 · Validación estricta de `inputSchema` en herramientas MCP:**
   Validar parámetros en `handleToolCall` (tipos numéricos, límites y rangos en `limit`, `toggleAcIndex`), rechazando valores inválidos con error descriptivo en lugar de fallos silenciosos.
5. **SEC-08 · Higiene en `verify-publish-surface.js` y detección multiplataforma:**
   Eliminar el path privado del autor hardcodeado en la fuente del verificador y extender las expresiones regulares de fuga de rutas de usuario para cubrir Windows (`C:\Users\...`) y Linux (`/home/...`).
6. **SEC-09 · Trazabilidad auditable en bypass `force: true`:**
   Registrar advertencia explícita y metadata de auditoría cuando se salten las validaciones del Gatekeeper mediante `force: true`.
7. **SEC-06, SEC-07, SEC-10 · Declaración explícita de superficie de riesgo:**
   Crear documento canónico `SECURITY.md` y documentar en `AGENTS.md` el modelo de amenazas, la frontera stdio, la exposición en `--host 0.0.0.0` y las garantías del Gatekeeper.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 scripts/mcp-server.ts nunca ejecuta verifyCommand proveniente del frontmatter de un archivo en disco (SEC-01)
- [x] #2 scripts/mcp-server.ts nunca persiste comandos shell ejecutables en el frontmatter de los archivos .md (SEC-01)
- [x] #3 gripm_sync_backlog opera con autoFix: false por defecto y no muta ACs ni tareas sin opt-in explícito (SEC-02)
- [x] #4 scripts/mcp-server.ts valida contención y existencia de --repo impidiendo escape a rutas del sistema (SEC-03)
- [x] #5 handleToolCall valida tipos y rangos de argumentos (limit, toggleAcIndex) retornando errores explícitos (SEC-05)
- [x] #6 verify-publish-surface.js no hardcodea rutas privadas de autores y detecta rutas absolutas de Windows, Linux y macOS (SEC-08)
- [x] #7 El uso de force: true emite advertencia explícita de auditoría en la respuesta del Gatekeeper (SEC-09)
- [x] #8 SECURITY.md y AGENTS.md documentan formalmente la superficie de riesgo, modelo de amenazas y mitigaciones (SEC-06, SEC-07, SEC-10)
- [x] #9 Pruebas automatizadas en scripts/verify-mcp-binary.js y scripts/test-api-security.js validan todas las mitigaciones con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Sanitizar `scripts/mcp-server.ts`:
   - En `handleToolCall` para `gripm_update_task`:
     - Solo ejecutar verificación si `args.verifyCommand` fue provisto explícitamente en los argumentos de la llamada MCP (nunca desde `current.rawExtraFrontmatter`).
     - No persistir `verifyCommand` en `current.rawExtraFrontmatter`.
     - Si `args.force` es true, incluir `warning` y bandera `audit: { bypassedGatekeeper: true }`.
     - Validar que `toggleAcIndex` sea un entero positivo válido dentro del rango de ACs de la tarea.
   - En `handleToolCall` para `gripm_list_tasks`:
     - Validar que `limit` sea un número entero positivo si se provee.
   - En `handleToolCall` para `gripm_sync_backlog`:
     - Establecer `const autoFix = args.autoFix === true;` (default `false`).
     - Desactivar la conversión ciega de `- [ ]` a `- [x]`.
   - En resolución de `--repo`:
     - Validar que la ruta resuelta exista y no sea raíz del sistema (`/`, `C:\`, `/etc`, etc.) y respete `isAllowedBrowsePath`.
2. Actualizar `scripts/verify-publish-surface.js`:
   - Eliminar `Pablo/code/`.
   - Agregar regex multiplataforma para Windows, Linux y macOS sin datos personales.
3. Crear `SECURITY.md` y actualizar `AGENTS.md`:
   - Declarar threat model, mitigaciones de red local, contención y Gatekeeper.
4. Actualizar suites de pruebas:
   - `scripts/verify-mcp-binary.js` (validar SEC-01, SEC-02, SEC-05, SEC-09).
   - `scripts/test-api-security.js`.
5. Ejecutar la Pirámide de Verificación completa y certificar la tarea en `ready`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Cumplimiento riguroso de la regla de cierre de DEV-233: Cada hallazgo cuenta con aserción ejecutable de regresión.
- Preservada compatibilidad hacia atrás del catálogo canónico de 12 tools `gripm_*`.
- Certificación QA (Pirámide de Verificación completa superada con código 0):
  1. `npx tsc --noEmit` -> 0 errores.
  2. `npm test` -> 16/16 pasos secuenciales en verde (30.9s).
  3. `scripts/verify-mcp-binary.js` -> 13/13 aserciones cubriendo SEC-01, SEC-02, SEC-05, SEC-09.
  4. `scripts/test-api-security.js` -> 14/14 aserciones cubriendo SEC-03, CSRF, Rebinding, Contención FS y Runtime Interchangeability.
  5. `npm run publish:check` -> Superficie limpia con detección multiplataforma Windows/Linux/macOS sin hardcoding privado.
  6. `npm run build` -> Bundle Vite y binarios standalone en `bin/` generados exitosamente.
<!-- SECTION:NOTES:END -->
