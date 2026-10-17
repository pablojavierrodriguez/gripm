---
id: DEV-314
title: "Concurrencia inter-proceso: Lockfile atomico en asignacion de IDs correlativos y mutaciones compartidas"
status: draft
priority: high
type: enhancement
owner: Antigravity
estimate: 2d
sprint: ""
release: ""
created: 2026-10-17
updated: 2026-10-17
---

# DEV-314 - Concurrencia inter-proceso: Lockfile atomico en asignacion de IDs correlativos y mutaciones compartidas

## Descripcion

En entornos de trabajo multi-agente o multi-proceso donde conviven simultáneamente el servidor web de gripm, una instancia de terminal MCP (e.g. Cursor o Antigravity) y llamadas concurrentes del usuario o scripts de sincronización, existe una ventana de carrera (race condition) al calcular el próximo ID correlativo (`DEV-XXX`) y al persistir archivos JSON compartidos (`releases.json`, `retrospectives.json`, `config.json`).

Actualmente, el cálculo de `getNextTaskId` inspecciona los archivos existentes en `backlog/tasks/` en memoria o disco sin locking a nivel de sistema de archivos. Si dos procesos o sub-agentes ejecutan `gripm_create_task` al mismo milisegundo, ambos leen el mismo ID máximo y generan colisiones de archivos o sobrescrituras involuntarias.

Esta tarea introduce un mecanismo de locking atómico inter-proceso:
1. Utiliza banderas atómicas del sistema de archivos (`fs.openSync(lockPath, 'wx')` o librería ligera y probada como `proper-lockfile`) para adquirir locks exclusivos con timeout y reintentos (exponential backoff).
2. Protege la sección crítica de `getNextTaskId` y la creación inicial del archivo en disco (`backlog/tasks/DEV-XXX - slug.md`).
3. Protege las mutaciones y lecturas de archivos consolidados compartidos como `releases.json` y `retrospectives.json` contra escrituras concurrentes truncadas.
4. Libera de forma garantizada (`try...finally`) los locks, limpiando stale locks en caso de finalización anómala de procesos.

## Criterios de Aceptacion

<!-- AC:BEGIN -->
- [ ] Implementar un módulo utilitario de lockfile atómico (`src/server/utils/fs-lock.ts` o equivalente) con soporte de timeout y liberación garantizada en `finally`.
- [ ] La función de generación de próximo ID correlativo adquiere el lock antes de inspeccionar IDs y lo libera una vez creado el archivo en disco.
- [ ] Las mutaciones en `releases.json` y `retrospectives.json` están protegidas por locks atómicos por archivo durante la lectura y escritura.
- [ ] Manejo defensivo de stale locks huérfanos con verificación de timestamp de expiración (e.g. 5000ms de gracia máxima).
- [ ] Pruebas unitarias que simulen concurrencia entre dos operaciones simultáneas de creación de tarea demostrando que se asignan IDs consecutivos sin colisión ni error no controlado.
- [ ] La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run backlog:check`) pasa con 0 errores.
<!-- AC:END -->

## Notas Tecnicas

- Sin dependencias pesadas innecesarias; priorizar primitivas estándar de Node.js (`fs.openSync` con flag `'wx'`) o `proper-lockfile`.
- Cero uso de em-dash o en-dash, respetando la regla canónica de guión simple ` - `.
