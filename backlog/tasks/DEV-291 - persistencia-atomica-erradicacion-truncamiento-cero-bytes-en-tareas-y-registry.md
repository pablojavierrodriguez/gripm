---
id: DEV-291
title: "Persistencia Atómica: Erradicación de truncamiento a cero bytes en tareas y registry"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15 23:26'
labels:
  - "storage"
  - "data-integrity"
  - "concurrency"
  - "io"
dependencies: []
priority: urgent
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reemplazo sistemático de llamadas directas a `fs.writeFileSync()` por una función de escritura atómica (`write to temp file` + `fs.fsync` + `fs.renameSync`) en toda la capa de almacenamiento del backend y configuración global para prevenir la pérdida irreversible de tareas y corrupción de datos ante interrupciones de proceso.

### Problemas identificados y reproducibles:

1. **Truncamiento instantáneo a 0 bytes:**
   En `server/services/storage.ts:660`, `storage.ts:787` y `scripts/registryConfig.js:66`, los archivos se sobrescriben directamente con `fs.writeFileSync(path, content)`.
   `fs.writeFileSync` con la bandera por defecto `'w'` trunca el archivo a 0 bytes inmediatamente al abrir el descriptor.
2. **Corrupción irreversible ante interrupción:**
   Si el proceso de Node.js se cancela bruscamente (Ctrl+C, desconexión de terminal, fallo del sistema, OOM Killer o excepción no capturada) durante la escritura, el archivo de la tarea o `~/.gripm/registry.json` queda vacío (0 bytes).
3. **Reseteo catastrófico de registry:**
   En `scripts/registryConfig.js:48`, si `registry.json` queda corrupto o vacío por un truncamiento, el bloque `catch` descarta el archivo y devuelve `{ activeProjectId: '', projects: [] }`, borrando todo el historial de proyectos en el siguiente guardado.

### Script de Reproducción Inmediata (PoC):

```javascript
import fs from 'node:fs';
// Simulación de interrupción forzada a mitad de escritura directa
const target = './test-corrupt-task.md';
fs.writeFileSync(target, 'contenido previo valioso');
try {
  const fd = fs.openSync(target, 'w');
  // Proceso abortado antes de transferir bytes
  process.kill(process.pid, 'SIGKILL');
} catch {}
// Resultado: test-corrupt-task.md queda con 0 bytes de tamaño
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se implementa un helper canónico `atomicWriteFileSync(filePath, content)` que escribe a un archivo temporal `.tmp.[pid].[timestamp]`, fuerza el vaciado físico a disco (`fs.fsyncSync`) y ejecuta `fs.renameSync` para reemplazar el archivo destino de forma atómica
- [x] #2 `saveBacklogMdItem()` y `writeProjectBacklog()` en `server/services/storage.ts` utilizan la función de escritura atómica
- [x] #3 `saveRegistryFile()` en `scripts/registryConfig.js` utiliza la función de escritura atómica
- [x] #4 El servidor MCP en `scripts/mcp-server.ts` utiliza la función de escritura atómica para la creación y actualización de tareas
- [x] #5 Un test de stress simula interrupciones y verifica que el archivo de destino nunca queda con 0 bytes ni en estado parcialmente escrito
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
