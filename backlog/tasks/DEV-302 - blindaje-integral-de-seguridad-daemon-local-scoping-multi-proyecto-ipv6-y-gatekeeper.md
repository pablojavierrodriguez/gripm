---
id: DEV-302
title: "Blindaje Integral de Seguridad: Daemon Local, Scoping Multi-Proyecto, IPv6 y Gatekeeper"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "security"
  - "backend"
  - "mcp"
  - "api"
  - "network"
dependencies: []
priority: high
type: security
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cierre sistemático de vulnerabilidades de seguridad y robustecimiento de la superficie de ataque del daemon local y el servidor MCP: soporte de loopback IPv6, contención estricta de symlinks con resolución de ancestros, aislamiento riguroso entre proyectos para prevenir mutaciones cruzadas por colisión de ID, blindaje del Gatekeeper de ejecución y sanitización de rutas HTTP.

### Diagnóstico de la Causa Raíz:

1. **Rechazo de Loopback IPv6 (`[::1]`):**
   En `server/middleware/security.ts:62`, `(req.headers.host || '').split(':')[0]` convierte `[::1]:4100` en `'['`, fallando la comprobación `isLoopbackHost` y devolviendo `403 Forbidden` a cualquier cliente o navegador configurado con pila dual IPv6 local.
2. **Evasión de Allowlist en el Gatekeeper de Certificación (`verifyCommand`):**
   En `scripts/mcp-server.ts:260-384`, `validateVerifyCommand` valida el comando base (`npm test`, `npx vitest`), pero admite cualquier argumento que coincida con caracteres alfanuméricos y símbolos. Flags como `--prefix=/tmp/evil`, `--script-shell=/bin/sh`, `--config=/tmp/malicious.js` o `-c` permiten ejecutar código arbitrario fuera del repositorio.
3. **Bypass de Contención por Symlinks en Rutas Inexistentes y en MCP:**
   - En `server/services/fsExplorer.ts:57-62`, si se consulta una ruta que aún no existe físicamente (`/allowed/symlink_a_raiz/archivo_nuevo`), `fs.realpathSync` falla con `ENOENT` y el bloque `catch` realiza una comprobación sintáctica sobre la ruta sin resolver, permitiendo escapar de los límites permitidos.
   - En `scripts/mcp-server.ts:148`, `isAllowedBrowsePath` evalúa `isPathContained` **antes** de resolver `fs.realpathSync`, permitiendo que enlaces simbólicos dentro de `cwd` sorteen la contención.
4. **Colisión de IDs entre Proyectos (Mutación Cruzada):**
   En `server/routes/api.ts:270-420` (`PUT`, `PATCH`, `DELETE`) y en `mcp-server.ts:1050/1160`, las operaciones buscan tareas iterando `registry.projects` desde el índice `0` sin filtrar por `projectId`. En un entorno con varios proyectos registrados, si dos repositorios tienen una tarea `DEV-001`, editar o borrar `DEV-001` en el Proyecto 2 muta o borra la tarea del Proyecto 1.
5. **Ruteo con `req.url` en lugar de `pathname` y Parámetros no Sanitizados:**
   Más de 15 endpoints en `api.ts` comparan directamente `req.url` (incluyendo query strings) o usan `url.split('/')[3]` sin `decodeURIComponent`. Además, `POST /api/import` no valida `docsPath` y `POST /api/projects` acepta `backlogDir` con secuencias `../`.

### Solución Arquitectónica Profunda:

- **Middleware de Seguridad Robusto:**
  - Parseo RFC-compliant de la cabecera `Host` soportando formato IPv6 `[::1]` y validación de `Origin` / `Sec-Fetch-Site` en todos los métodos de mutación (`POST`, `PUT`, `DELETE`, `PATCH`).
- **Gatekeeper Hardened:**
  - Rechazar cualquier argumento que comience con `--prefix`, `--config`, `-c`, `--script-shell`, `--eval`, `-e`, `--import`, `--loader` o contenga secuencias relativas `..` o barras absolutas.
  - Ejecutar verificación mediante argumentos estructurados sin invocación de shell en entornos POSIX.
- **Contención de Filesystem con Resolución de Ancestros:**
  - En `isAllowedBrowsePath`, si el archivo objetivo no existe, resolver iterativamente `fs.realpathSync` sobre su directorio padre existente más cercano antes de evaluar la contención. Unificar esta función en un solo módulo.
- **Scoping Estricto por `projectId`:**
  - Exigir o resolver prioritariamente el proyecto activo (`body.projectId || query.projectId || activeProjectId`) en todos los endpoints y herramientas MCP, garantizando que ninguna operación sobre `DEV-XXX` afecte a un proyecto ajeno.
- **Sanitización de Ruteo:**
  - Extraer `pathname` mediante `new URL(req.url, 'http://localhost')` en todos los manejadores de `server/routes/api.ts`, y validar contención estricta en `docsPath` y `backlogDir`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Peticiones locales HTTP emitidas sobre IPv6 (`Host: [::1]:port`) son reconocidas legítimamente como loopback sin emitir `403 Forbidden`
- [ ] #2 `validateVerifyCommand` rechaza de forma determinista cualquier intento de pasar flags de evasión (`--prefix`, `--config`, `--script-shell`, etc.) o rutas con escape `..`
- [ ] #3 `isAllowedBrowsePath` resuelve symlinks sobre el ancestro existente más cercano, impidiendo escapes de contención sobre archivos nuevos o inexistentes tanto en HTTP como en MCP
- [ ] #4 Las operaciones de edición, restauración y borrado de tareas (`PUT/PATCH/DELETE /api/items/:id` y MCP) aplican scoping estricto al proyecto seleccionado, impidiendo mutaciones en proyectos homónimos
- [ ] #5 El ruteo de `server/routes/api.ts` opera exclusivamente sobre `pathname` decodificado, siendo inmune a variaciones de query parameters
- [ ] #6 `POST /api/import` y `POST /api/projects` validan que `docsPath` y `backlogDir` residan estrictamente dentro de la raíz permitida
- [ ] #7 Todos los watchers `fs.FSWatcher` registran listeners de error para evitar caídas fatales del proceso Node ante borrado de directorios
- [ ] #8 La suite de seguridad `scripts/test-api-security.js` valida limpiamente las 8 mitigaciones con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Corregir la extracción de `hostHeader` para IPv6 en `server/middleware/security.ts`.
2. Endurecer `validateVerifyCommand` en `scripts/mcp-server.ts` con lista negra estricta de flags de evasión y argumentos seguros.
3. Unificar `isAllowedBrowsePath` en `server/services/fsExplorer.ts` con algoritmo de ancestros y consumirla desde `mcp-server.ts`.
4. Refactorizar la resolución de proyectos en `server/routes/api.ts` y MCP para forzar coincidencia por `projectId`.
5. Reemplazar `req.url` por `pathname` en el router de `api.ts`.
6. Agregar listeners `watcher.on('error', ...)` en `server/sse/sseManager.ts`.
7. Actualizar y ejecutar `scripts/test-api-security.js`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
