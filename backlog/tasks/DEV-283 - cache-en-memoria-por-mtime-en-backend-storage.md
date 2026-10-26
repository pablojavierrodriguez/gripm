---
id: DEV-283
title: "Caché en memoria por mtime para lecturas de tareas en el backend storage"
status: review
created_date: '2026-10-15'
updated_date: '2026-10-26'
labels:
  - "performance"
  - "backend"
  - "storage"
  - "mtime"
dependencies: []
priority: high
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimización del rendimiento de I/O en disco en el servicio de almacenamiento del backend ([server/services/storage.ts](file:///c:/Users/Pablo/Proyectos/gripm/server/services/storage.ts)) para evitar la lectura y parseo redundante de cientos de archivos Markdown en cada solicitud.

### Problemas identificados:
1. **Lectura síncrona bloqueante masiva:** Cada petición a `/api/data` (al cargar el tablero, tras guardar tareas o al dispararse eventos SSE) ejecuta `loadProjectBacklog`, el cual itera síncronamente sobre todos los archivos `.md` de `backlog/tasks/` (278 archivos en proyectos medianos).
2. Para cada archivo realiza `fs.statSync`, `fs.readFileSync` y `parseBacklogMd` (análisis léxico de frontmatter y expresiones regulares), congelando el event loop de Node.js durante 50-150 ms en cada ciclo.
3. El 99% de las veces, los archivos en disco no han cambiado entre una solicitud y la siguiente.

### Solución propuesta:
- Implementar una estructura de caché en memoria (`Map<string, { mtimeMs: number, item: any }>`) indexada por la ruta absoluta del archivo de tarea.
- Al listar archivos en `loadProjectBacklog`, obtener únicamente el `stat` rápido del archivo: si `fileStat.mtimeMs` coincide con el valor en caché, reutilizar la tarea parseada en memoria sin llamar a `fs.readFileSync` ni `parseBacklogMd`.
- Invalidar o actualizar la entrada puntual en el caché cuando se realicen escrituras a través de las funciones de mutación (`saveBacklogMdItem`, `softDeleteBacklogMdItem`, `restoreBacklogMdItem`, `purgeBacklogMdItem`).
- Limpiar entradas obsoletas si se eliminan archivos de disco.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `loadProjectBacklog` en `storage.ts` utiliza un caché en memoria validado contra `fileStat.mtimeMs` para omitir lecturas de archivos sin modificaciones
- [x] #2 Las operaciones de escritura y mutación (`saveBacklogMdItem`, `softDeleteBacklogMdItem`, etc.) actualizan o invalidan inmediatamente la entrada correspondiente del caché
- [x] #3 Los cambios externos en disco (ej. ediciones manuales o cambios por agentes/git) se detectan automáticamente mediante la discrepancia de `mtimeMs`
- [x] #4 El tiempo de respuesta de `/api/data` se reduce de más de 80ms a menos de 10ms en llamadas subsiguientes
- [x] #5 La suite de pruebas y sincronización de backlog aprueban limpiamente (`npm test` y `npm run backlog:check`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Archivo principal: `server/services/storage.ts`.
- Verificar que las pruebas existentes en `scripts/verify-integration.js` y `scripts/run-tests.js` sigan pasando sin falsos positivos de caché.
<!-- SECTION:NOTES:END -->
