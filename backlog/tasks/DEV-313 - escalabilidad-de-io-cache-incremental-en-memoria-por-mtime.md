---
id: DEV-313
title: "Escalabilidad de I/O en disco: Cache incremental en memoria por mtime en BacklogService"
status: draft
priority: medium
type: enhancement
owner: Antigravity
estimate: 2d
sprint: ""
release: ""
created: 2026-10-17
updated: 2026-10-17
---

# DEV-313 - Escalabilidad de I/O en disco: Cache incremental en memoria por mtime en BacklogService

## Descripcion

Actualmente, cada invocación de consulta (`getAllTasks`, `getTasksFiltered`, `getStats`, `getReleases`) en `BacklogService` recorre el directorio `backlog/tasks/` leyendo de forma completa y síncrona el contenido de todos los archivos `.md` del disco (`fs.readdirSync`, `fs.readFileSync`), parseando el frontmatter YAML con expresiones regulares o js-yaml en cada llamada.

A medida que el proyecto escala a más de 300 o 500 tareas, esta lectura exhaustiva genera un overhead de I/O y CPU evitable en el proceso del servidor y MCP, bloqueando el event loop de Node.js en operaciones repetidas.

Esta tarea implementa una capa de caché en memoria e indexación incremental en `BacklogService`:
1. Almacena en memoria un mapa de tareas indexadas por `taskId` junto con la fecha de modificación (`mtimeMs`) y tamaño (`size`) reportados por `fs.statSync`.
2. En cada lectura, sólo lee de disco y re-parsea aquellos archivos cuyo `mtimeMs` haya cambiado respecto a la caché, o que hayan sido agregados recientemente.
3. Elimina de la caché las tareas cuyos archivos hayan sido removidos del disco.
4. Mantiene invalidación explícita inmediata ante mutaciones locales ejecutadas por `saveTask`, `deleteTask` o `syncBacklog`.

## Criterios de Aceptacion

<!-- AC:BEGIN -->
- [ ] Implementar un mapa de caché en memoria dentro de `BacklogService` que almacene la tarea parseada, su ruta y su `mtimeMs`.
- [ ] En lecturas consecutivas sin cambios en disco, `getAllTasks` reutiliza los objetos cacheados sin invocar `fs.readFileSync` ni re-parsear YAML.
- [ ] Si un archivo `.md` es modificado externamente (por el usuario o un editor), la caché detecta el cambio en `mtimeMs` e invalida/re-lee únicamente dicho archivo.
- [ ] Si se eliminan archivos de `backlog/tasks/`, la caché remueve los ítems correspondientes.
- [ ] Operaciones de mutación internas (`saveTask`, `deleteTask`) actualizan atómicamente la entrada en caché y la metadata en memoria.
- [ ] Incorporar tests unitarios e integrados que certifiquen el comportamiento de la caché con archivos nuevos, modificados y eliminados.
- [ ] La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run backlog:check`) pasa con 0 errores.
<!-- AC:END -->

## Notas Tecnicas

- Preservar la compatibilidad de llamadas síncronas requeridas por la arquitectura actual.
- Cero uso de em-dash (`—`), respetando la regla canónica de guión simple ` - `.
