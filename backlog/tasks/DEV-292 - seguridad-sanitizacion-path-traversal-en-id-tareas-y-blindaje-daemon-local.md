---
id: DEV-292
title: "Seguridad en Daemon Local: Sanitización de Path Traversal en tareas y blindaje de endpoints"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "security"
  - "backend"
  - "api"
  - "sse"
dependencies: []
priority: p1
type: security
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corrección de vulnerabilidades de seguridad críticas en el servidor backend local de Gripm: escape de directorio (Path Traversal) en la generación de nombres de tareas, mutación de archivos sin validación CSRF vía HTTP `GET`, fuga de contención por enlaces simbólicos y caídas fatales del proceso Node por sockets SSE huérfanos.

### Problemas identificados y reproducibles:

1. **Path Traversal en `code` de tareas:**
   En `scripts/backlogMdParser.ts:741`, `generateTaskFilename(id, title)` solo sanitiza caracteres no válidos en el título, pero deja intacto el `id`:
   ```typescript
   const cleanId = (id || 'TASK').trim().toUpperCase().replace(/--+/g, '-');
   return `${cleanId} - ${cleanTitle || 'Task'}.md`;
   ```
   Si se envía `POST /api/items` con `{ "code": "../../../payload" }`, `path.join(tasksDir, targetFilename)` resuelve fuera de `backlog/tasks/` y escribe el archivo en la raíz del repositorio o fuera de él.
2. **Mutación de disco en endpoint `GET` sin protección CSRF:**
   En `server/routes/api.ts:832-838`, `GET /api/projects/:id/export-monolithic-md?save=true` escribe físicamente en `BACKLOG.md`. Las peticiones `GET` emitidas desde etiquetas HTML (`<img src="...">`) por una web externa no envían cabecera `Origin` y son autorizadas por el middleware de seguridad, permitiendo sobrescribir archivos locales sin interacción del usuario.
3. **Crash Fatal por evento `EPIPE` no capturado en SSE:**
   En `server/sse/sseManager.ts:10-16`, `broadcastSse` escribe en `http.ServerResponse`. En Node.js, si el cliente desconecta abruptamente, el stream emite un evento `'error'` asíncrono. Como no hay listener `res.on('error', ...)`, Node.js aborta el proceso completo con excepción fatal.
4. **Fuga de contención en `/api/fs/browse` con Enlaces Simbólicos:**
   En `server/services/fsExplorer.ts:56`, se evalúa `isPathContained` sobre la ruta sintáctica antes de resolver `fs.realpathSync`. Si un enlace simbólico en `/tmp` apunta a `/`, permite explorar todo el disco.

### Script de Reproducción Inmediata (PoC):

```javascript
import path from 'node:path';
import { generateTaskFilename } from './scripts/backlogMdParser.ts';

const filename = generateTaskFilename('../../../evil', 'Payload');
const resolved = path.resolve('backlog/tasks', filename);
console.assert(!resolved.startsWith(path.resolve('backlog/tasks')), 'FALLO: El archivo escapó de tasksDir');
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `generateTaskFilename()` en `scripts/backlogMdParser.ts` sanitiza estrictamente el identificador `id`, eliminando cualquier barra (`/`, `\`), punto relativo (`..`) o carácter fuera de `[a-zA-Z0-9_-]`
- [x] #2 La funcionalidad de guardado en disco (`?save=true`) se remueve del método `GET` en `/api/projects/:id/export-monolithic-md` y se traslada a un método `POST` con validación estricta de `Origin` y `Content-Type: application/json`
- [x] #3 `handleSseRoute()` en `server/sse/sseManager.ts` registra listeners `res.on('error', ...)` y `req.on('error', ...)` para liberar los sockets y limpiar temporizadores sin provocar un crash fatal de Node.js ante desconexiones intempestivas
- [x] #4 `isAllowedBrowsePath()` en `server/services/fsExplorer.ts` resuelve `fs.realpathSync` **antes** de verificar la contención con `isPathContained`, bloqueando el bypass mediante symlinks
- [x] #5 La suite de pruebas de seguridad aprueba limpiamente (`node scripts/test-api-security.js`)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **AC #1 (Path Traversal en Tareas):** Verificada la sanitización en `scripts/backlogMdParser.ts` mediante `cleanId = sanitizedId.replace(/[^a-zA-Z0-9_-]/g, '')`. Verificado en test que IDs maliciosos con `../` o barras no pueden escapar del directorio `backlog/tasks/`.
- **AC #2 (Guardado en Disco en Monolithic Backlog):** En `server/routes/api.ts`, `GET /api/projects/:id/export-monolithic-md` es estrictamente de solo lectura (se eliminó `save=true` y escritura física). Se implementó `POST /api/projects/:id/export-monolithic-md` que persiste `BACKLOG.md` usando `atomicWriteFileSync` de `server/services/atomicWrite.ts`, protegido contra CSRF y mutaciones no autorizadas vía cabeceras obligatorias (`Origin` y `Content-Type: application/json`).
- **AC #3 (Prevención de Crash EPIPE en SSE):** En `server/sse/sseManager.ts`, `handleSseRoute()` registra listeners para `req.on('error')`, `res.on('error')`, `req.on('close')` y `res.on('close')` que limpian `pingInterval` y eliminan el socket de `sseClients`. `broadcastSse()` valida `client.destroyed` y `client.writableEnded` y descarta clientes fallidos en un bloque `try/catch`.
- **AC #4 (Contención de Enlaces Simbólicos):** En `server/services/fsExplorer.ts`, `isAllowedBrowsePath()` resuelve `fs.realpathSync` **antes** de evaluar `isPathContained`, previniendo que un symlink o junction dentro de una ruta permitida que apunte a la raíz o a directorios no autorizados sortee la contención.
- **AC #5 (Suite de Seguridad):** Añadidos los Tests 17 a 21 a `scripts/test-api-security.js`, verificando las 4 mitigaciones de seguridad. Toda la suite aprueba con código 0.
<!-- SECTION:NOTES:END -->
