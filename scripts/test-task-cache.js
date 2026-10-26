#!/usr/bin/env node

/**
 * scripts/test-task-cache.js - Verification suite for in-memory mtime cache (DEV-283).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as storage from '../server/services/storage.ts';
import { BacklogService } from '../server/services/backlogService.ts';
import {
  clearTaskCache,
  getTaskCacheStats,
  invalidateTaskCache
} from '../server/services/taskCache.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Iniciando verificación del Caché en Memoria por mtime (DEV-283)...\n');

  const testProject = {
    id: 'test-proj',
    name: 'gripm',
    storageType: 'markdown',
    repoPath: ROOT,
    codePrefix: 'DEV'
  };

  // TEST 1: Cold start -> cache misses
  console.log('--- Test 1: Cold Start y Población de Caché ---');
  clearTaskCache();
  let stats = getTaskCacheStats();
  assert(stats.size === 0 && stats.hits === 0 && stats.misses === 0, 'El caché debe iniciar vacío.');

  const t0 = performance.now();
  const itemsCold = storage.readProjectBacklog(testProject).items;
  const coldDuration = performance.now() - t0;
  stats = getTaskCacheStats();

  console.log(`  Items leídos: ${itemsCold.length}`);
  console.log(`  Duración Cold: ${coldDuration.toFixed(2)} ms`);
  console.log(`  Cache Stats: size=${stats.size}, hits=${stats.hits}, misses=${stats.misses}`);

  assert(itemsCold.length > 0, 'Debe leer tareas del proyecto.');
  assert(stats.size === itemsCold.length, 'El tamaño del caché debe ser igual a las tareas leídas.');
  assert(stats.misses >= itemsCold.length, 'En cold start todas las lecturas deben ser misses.');
  assert(stats.hits === 0, 'En cold start no debe haber hits.');
  console.log('✅ Test 1 aprobado: Caché inicial poblado correctamente.\n');

  // TEST 2: Warm read -> 100% cache hits and speedup
  console.log('--- Test 2: Warm Read y Rendimiento ---');
  const prevMisses = stats.misses;
  const t1 = performance.now();
  const itemsWarm = storage.loadProjectBacklog(testProject).items;
  const warmDuration = performance.now() - t1;
  const statsWarm = getTaskCacheStats();

  console.log(`  Duración Warm: ${warmDuration.toFixed(2)} ms (vs Cold: ${coldDuration.toFixed(2)} ms)`);
  console.log(`  Cache Stats: size=${statsWarm.size}, hits=${statsWarm.hits}, misses=${statsWarm.misses}`);

  assert(itemsWarm.length === itemsCold.length, 'El número de tareas devueltas debe ser idéntico.');
  assert(statsWarm.misses === prevMisses, 'No debe haber nuevos misses en lectura warm.');
  assert(statsWarm.hits >= itemsCold.length, 'Todas las tareas deben provenir de cache hits.');
  console.log('✅ Test 2 aprobado: Lectura warm servida 100% desde caché con aceleración.\n');

  // TEST 3: External modification on disk detected via mtime
  console.log('--- Test 3: Detección de Edición Externa en Disco por mtime ---');
  // Create an isolated temporary test directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-cache-test-'));
  const tempTasksDir = path.join(tempDir, 'backlog', 'tasks');
  fs.mkdirSync(tempTasksDir, { recursive: true });

  const tempProject = {
    id: 'temp-proj',
    name: 'temp',
    storageType: 'markdown',
    repoPath: tempDir,
    codePrefix: 'TMP'
  };

  const file1 = path.join(tempTasksDir, 'TMP-001 - tarea-uno.md');
  const file2 = path.join(tempTasksDir, 'TMP-002 - tarea-dos.md');

  fs.writeFileSync(file1, `---
id: TMP-001
title: Tarea Uno
status: draft
---
## Description
Inicial
`, 'utf8');

  fs.writeFileSync(file2, `---
id: TMP-002
title: Tarea Dos
status: draft
---
## Description
Segunda
`, 'utf8');

  clearTaskCache();
  const res1 = storage.readProjectBacklog(tempProject);
  assert(res1.items.length === 2, 'Debe leer las 2 tareas temporales.');
  const st1 = getTaskCacheStats();
  assert(st1.misses === 2 && st1.hits === 0, 'Inicial: 2 misses, 0 hits.');

  // Second read: 2 hits
  const res2 = storage.readProjectBacklog(tempProject);
  const st2 = getTaskCacheStats();
  assert(st2.hits === 2 && st2.misses === 2, 'Segunda lectura: 2 hits.');

  // Modify file1 externally on disk (with simulated time delay to ensure mtime change)
  await new Promise(r => setTimeout(r, 50));
  fs.writeFileSync(file1, `---
id: TMP-001
title: Tarea Uno Modificada Externamente
status: draft
---
## Description
Contenido cambiado externamente
`, 'utf8');

  const res3 = storage.readProjectBacklog(tempProject);
  const st3 = getTaskCacheStats();
  const updatedTask = res3.items.find(i => i.id === 'TMP-001');

  assert(updatedTask.title === 'Tarea Uno Modificada Externamente', 'Debe reflejar el cambio externo de título.');
  assert(st3.misses === 3, 'Debe registrar exactamente 1 miss para el archivo modificado.');
  assert(st3.hits === 3, 'El archivo no modificado (TMP-002) debe seguir siendo un cache hit.');
  console.log('✅ Test 3 aprobado: Edición externa detectada automáticamente por mtime.\n');

  // TEST 4: Mutation invalidation
  console.log('--- Test 4: Invalidación Inmediata por Mutación ---');
  // Update task using BacklogService.updateTask
  BacklogService.updateTask(tempProject, 'TMP-002', { title: 'Tarea Dos Actualizada por API' });

  // Next read
  const res4 = storage.readProjectBacklog(tempProject);
  const task2 = res4.items.find(i => i.id === 'TMP-002');
  assert(task2.title === 'Tarea Dos Actualizada por API', 'La tarea mutada debe reflejar el nuevo título.');

  // Soft delete task
  storage.softDeleteBacklogMdItem(tempProject, 'TMP-002');
  const res5 = storage.readProjectBacklog(tempProject);
  const deletedTask = res5.items.find(i => i.id === 'TMP-002');
  assert(deletedTask.isDeleted === true, 'La tarea debe figurar como isDeleted.');

  // Restore task
  storage.restoreBacklogMdItem(tempProject, 'TMP-002');
  const res6 = storage.readProjectBacklog(tempProject);
  const restoredTask = res6.items.find(i => i.id === 'TMP-002');
  assert(!restoredTask.isDeleted, 'La tarea restaurada no debe estar borrada.');
  console.log('✅ Test 4 aprobado: Operaciones de mutación invalidan el caché de inmediato.\n');

  // TEST 5: Deletion pruning
  console.log('--- Test 5: Purgado de Entradas Huérfanas al Eliminar Archivo ---');
  fs.unlinkSync(file2);
  const res7 = storage.readProjectBacklog(tempProject);
  assert(res7.items.length === 1, 'Solo debe quedar 1 tarea en disco.');
  const st7 = getTaskCacheStats();
  assert(st7.size === 1, 'El caché debe tener exactamente 1 entrada tras purgar la huérfana.');
  console.log('✅ Test 5 aprobado: Entradas huérfanas purgadas tras borrado en disco.\n');

  // TEST 6: Cache poisoning immunity on rejected Gatekeeper mutations
  console.log('--- Test 6: Inmunidad ante Envenenamiento de Caché por Rechazo del Gatekeeper ---');
  fs.writeFileSync(file1, `---
id: TMP-001
title: Titulo Original Intacto
status: doing
---
## Description
Con AC pendiente

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Criterio sin completar
<!-- AC:END -->
`, 'utf8');
  clearTaskCache();
  // Warm the cache
  storage.readProjectBacklog(tempProject);

  // Attempt invalid transition to ready while mutating title -> Gatekeeper must throw
  let threwGatekeeper = false;
  try {
    BacklogService.updateTask(tempProject, 'TMP-001', {
      status: 'ready',
      title: 'Titulo Envenenado Rechazado'
    });
  } catch {
    threwGatekeeper = true;
  }
  assert(threwGatekeeper, 'El Gatekeeper debe rechazar el paso a ready con AC sin tildar.');

  // Subsequent valid update (toggling AC #1 without passing title) must NOT persist the poisoned title
  BacklogService.updateTask(tempProject, 'TMP-001', { toggleAcIndex: 1 });
  const res8 = storage.readProjectBacklog(tempProject);
  const taskAfterReject = res8.items.find(i => i.id === 'TMP-001');
  assert(taskAfterReject.title === 'Titulo Original Intacto', `El título en caché no debe contaminarse tras un fallo del Gatekeeper (recibido: ${taskAfterReject.title}).`);
  assert(taskAfterReject.status === 'doing', `El estado en caché no debe contaminarse tras un fallo del Gatekeeper (recibido: ${taskAfterReject.status}).`);
  console.log('✅ Test 6 aprobado: Inmunidad total contra envenenamiento de caché en mutaciones abortadas.\n');

  // Cleanup temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });
  clearTaskCache();

  console.log('🎉 ¡TODOS LOS TESTS DEL CACHÉ EN MEMORIA POR MTIME (DEV-283) PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('❌ Error no controlado en test-task-cache:', err);
  process.exit(1);
});
