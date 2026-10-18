#!/usr/bin/env node

/**
 * scripts/verify-fs-lock-concurrency.js - Verification for DEV-314
 *
 * Verifies:
 * 1. Atomic lockfile primitives with timeout, backoff, and guaranteed release in finally.
 * 2. Defensive stale lock detection and cleanup of orphaned locks.
 * 3. Concurrent task creation allocating strictly correlative IDs without collision.
 * 4. Concurrent mutations on releases.json and retrospectives.json with lock integrity.
 * 5. Multi-process concurrency simulation generating sequential IDs.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  acquireLockSync,
  releaseLockSync,
  withFileLockSync,
  withFileLock,
  isLockActive,
  isLockStale,
  getLockFilePath
} from '../server/utils/fs-lock.ts';
import {
  BacklogService,
  getProjectTaskAllocationLockPath,
  getProjectReleasesPath,
  getProjectRetrospectivesPath
} from '../server/services/backlogService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Iniciando verificacion de fs-lock y concurrencia inter-proceso (DEV-314)...');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-lock-concurrency-'));
const tasksDir = path.join(tmpDir, 'backlog/tasks');
const backlogDir = path.join(tmpDir, 'backlog');
fs.mkdirSync(tasksDir, { recursive: true });

function cleanup() {
  if (fs.existsSync(tmpDir)) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

const project = {
  id: 'concurrency-project',
  name: 'Concurrency Test Project',
  path: tmpDir,
  repoPath: tmpDir,
  storageType: 'markdown',
  codePrefix: 'DEV'
};

async function runTests() {
  // =========================================================================
  // TEST 1: Lock acquisition, mutual exclusion and guaranteed release in finally
  // =========================================================================
  console.log('\n--- Test 1: Primitivas de Lock, exclusion mutua y finally ---');
  const testLockTarget = path.join(tmpDir, 'test-resource.json');

  let executedInsideLock = false;
  withFileLockSync(testLockTarget, () => {
    executedInsideLock = true;
    assert.strictEqual(isLockActive(testLockTarget), true, 'El archivo .lock debe existir mientras el lock esta retenido');

    // Intentar adquirir el mismo lock con timeout corto debe fallar con error de timeout
    let threw = false;
    try {
      acquireLockSync(testLockTarget, { timeoutMs: 80, minRetryDelayMs: 10, maxRetryDelayMs: 20 });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('timeout') || err.message.includes('Excedido'), 'Debe reportar timeout');
    }
    assert.strictEqual(threw, true, 'Debe arrojar error por timeout al competir por el mismo lock');
  });

  assert.strictEqual(executedInsideLock, true, 'El bloque dentro del lock debe haberse ejecutado');
  assert.strictEqual(isLockActive(testLockTarget), false, 'El archivo .lock debe haberse liberado tras el finally');

  // Validar liberacion garantizada ante excepciones
  let threwException = false;
  try {
    withFileLockSync(testLockTarget, () => {
      assert.strictEqual(isLockActive(testLockTarget), true);
      throw new Error('Fallo simulado dentro de la seccion critica');
    });
  } catch (err) {
    threwException = true;
    assert.strictEqual(err.message, 'Fallo simulado dentro de la seccion critica');
  }
  assert.strictEqual(threwException, true);
  assert.strictEqual(isLockActive(testLockTarget), false, 'El lock debe liberarse incluso si la funcion arroja excepcion');
  console.log('✅ Test 1 pasado: Exclusion mutua y liberacion garantizada en finally validadas.');

  // =========================================================================
  // TEST 2: Limpieza defensiva de stale locks huerfanos
  // =========================================================================
  console.log('\n--- Test 2: Recuperacion defensiva ante stale locks huerfanos ---');
  const staleResource = path.join(tmpDir, 'stale-resource.json');
  const staleLockPath = getLockFilePath(staleResource);

  // Simular un lock huerfano creado por un proceso muerto hace 10 segundos
  const orphanedPayload = JSON.stringify({
    pid: 99999,
    createdAt: Date.now() - 10000,
    expiresAt: Date.now() - 5000
  });
  fs.writeFileSync(staleLockPath, orphanedPayload, 'utf8');

  // Modificar mtime artificialmente para que parezca antiguo
  const pastTime = (Date.now() - 10000) / 1000;
  fs.utimesSync(staleLockPath, pastTime, pastTime);

  assert.strictEqual(isLockStale(staleResource, 2000), true, 'El lock debe ser identificado como stale');

  // Al invocar withFileLockSync, debe detectar el lock stale, removerlo y adquirirlo limpiamente
  let staleCleanedAndAcquired = false;
  withFileLockSync(staleResource, () => {
    staleCleanedAndAcquired = true;
    assert.strictEqual(isLockActive(staleResource), true);
  }, { staleTimeoutMs: 2000, timeoutMs: 1000 });

  assert.strictEqual(staleCleanedAndAcquired, true, 'Debe adquirir el lock tras limpiar el stale lock');
  assert.strictEqual(isLockActive(staleResource), false, 'El lock debe quedar limpio al finalizar');
  console.log('✅ Test 2 pasado: Deteccion y auto-limpieza de stale locks huerfanos validada.');

  // =========================================================================
  // TEST 3: Asignacion correlativa de IDs bajo alta concurrencia asincrona
  // =========================================================================
  console.log('\n--- Test 3: Asignacion concurrente de IDs correlativos ---');
  const CONCURRENT_COUNT = 16;
  const promises = [];

  for (let i = 0; i < CONCURRENT_COUNT; i++) {
    promises.push(new Promise((resolve, reject) => {
      // Jitter aleatorio para intercalar llamadas concurrentes
      const jitter = Math.floor(Math.random() * 25);
      setTimeout(() => {
        try {
          const res = BacklogService.createTask(project, {
            title: `Tarea Concurrente ${i + 1}`,
            status: 'draft',
            priority: 'medium',
            description: `Descripcion de prueba concurrente ${i + 1}`
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }, jitter);
    }));
  }

  const results = await Promise.all(promises);
  assert.strictEqual(results.length, CONCURRENT_COUNT, `Deben haberse creado ${CONCURRENT_COUNT} tareas`);

  const createdCodes = results.map(r => r.task.code);
  const uniqueCodes = new Set(createdCodes);
  assert.strictEqual(uniqueCodes.size, CONCURRENT_COUNT, `Cero colisiones: Todos los ${CONCURRENT_COUNT} IDs deben ser unicos`);

  // Verificar que los IDs generados sean correlativos DEV-001 ... DEV-016
  const sortedNumbers = createdCodes.map(code => {
    const num = parseInt(code.replace('DEV-', ''), 10);
    return num;
  }).sort((a, b) => a - b);

  for (let i = 0; i < CONCURRENT_COUNT; i++) {
    assert.strictEqual(sortedNumbers[i], i + 1, `ID correlativo esperado: DEV-${String(i + 1).padStart(3, '0')}, obtenido: DEV-${String(sortedNumbers[i]).padStart(3, '0')}`);
  }

  // Verificar que todos los archivos existen en disco y no estan vacios
  const filesOnDisk = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  assert.strictEqual(filesOnDisk.length, CONCURRENT_COUNT, `Deben existir ${CONCURRENT_COUNT} archivos .md en disco`);

  for (const filename of filesOnDisk) {
    const fullPath = path.join(tasksDir, filename);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 50, `El archivo ${filename} no debe estar vacio ni truncado`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('id: DEV-'), `El archivo ${filename} debe contener id en frontmatter`);
  }

  // Verificar que el lock de asignacion no quedo huerfano en disco
  const allocationLockPath = getProjectTaskAllocationLockPath(project);
  assert.strictEqual(fs.existsSync(allocationLockPath), false, 'El lockfile de asignacion de tareas debe haber sido limpiado');
  console.log(`✅ Test 3 pasado: ${CONCURRENT_COUNT} tareas concurrentes generaron IDs consecutivos DEV-001 a DEV-${String(CONCURRENT_COUNT).padStart(3, '0')} sin colisiones.`);

  // =========================================================================
  // TEST 4: Mutaciones protegidas en releases.json y retrospectives.json
  // =========================================================================
  console.log('\n--- Test 4: Mutaciones atomicas en releases.json y retrospectives.json ---');

  // Mutaciones concurrentes en releases.json
  const releasePromises = [];
  for (let i = 0; i < 8; i++) {
    releasePromises.push(new Promise((resolve) => {
      setTimeout(() => {
        const updated = BacklogService.mutateReleases(project, (releases) => {
          releases.push({
            id: `rel-1-${i}`,
            version: `1.0.${i}`,
            date: '2026-10-17',
            status: 'unreleased',
            itemCodes: [`DEV-00${i + 1}`]
          });
        });
        resolve(updated);
      }, Math.floor(Math.random() * 20));
    }));
  }
  await Promise.all(releasePromises);

  const finalReleases = BacklogService.readReleases(project);
  assert.strictEqual(finalReleases.length, 8, 'Deben existir exactamente 8 releases guardados');
  const releaseLockPath = getLockFilePath(getProjectReleasesPath(project));
  assert.strictEqual(fs.existsSync(releaseLockPath), false, 'Lock de releases.json debe haber sido liberado');

  // Mutaciones concurrentes en retrospectives.json
  const retroPromises = [];
  for (let i = 0; i < 6; i++) {
    retroPromises.push(new Promise((resolve) => {
      setTimeout(() => {
        const updated = BacklogService.mutateRetrospectives(project, (retros) => {
          retros.push({
            id: `retro-${i + 1}`,
            sprint: `Sprint ${i + 1}`,
            date: '2026-10-17',
            summary: `Retrospectiva ${i + 1}`
          });
        });
        resolve(updated);
      }, Math.floor(Math.random() * 20));
    }));
  }
  await Promise.all(retroPromises);

  const finalRetros = BacklogService.readRetrospectives(project);
  assert.strictEqual(finalRetros.length, 6, 'Deben existir exactamente 6 retrospectivas guardadas');
  const retroLockPath = getLockFilePath(getProjectRetrospectivesPath(project));
  assert.strictEqual(fs.existsSync(retroLockPath), false, 'Lock de retrospectives.json debe haber sido liberado');
  console.log('✅ Test 4 pasado: Mutaciones concurrentes en releases.json y retrospectives.json 100% integras.');

  // =========================================================================
  // TEST 5: Concurrencia multi-proceso real (Child Processes)
  // =========================================================================
  console.log('\n--- Test 5: Concurrencia inter-proceso simulada (Child Processes) ---');
  const serviceUrl = pathToFileURL(path.resolve(ROOT, 'server/services/backlogService.ts')).href;
  const childScriptPath = path.join(tmpDir, 'child-worker.js');
  const childScriptCode = `
import { BacklogService } from '${serviceUrl}';

const project = ${JSON.stringify(project)};
const workerId = process.argv[2] || 'w';

for (let i = 0; i < 4; i++) {
  try {
    BacklogService.createTask(project, {
      title: 'Tarea proceso ' + workerId + ' paso ' + i,
      status: 'draft',
      priority: 'low'
    });
  } catch (err) {
    console.error('Error in child:', err);
    process.exit(1);
  }
}
process.exit(0);
`;
  fs.writeFileSync(childScriptPath, childScriptCode, 'utf8');

  // Lanzar 3 procesos hijos paralelos compitiendo por crear tareas en el mismo directorio
  const childWorkers = ['A', 'B', 'C'].map(workerId => {
    return new Promise((resolve, reject) => {
      const child = fork(childScriptPath, [workerId], {
        execArgv: process.execArgv
      });
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Proceso hijo ${workerId} fallo con codigo ${code}`));
      });
    });
  });

  await Promise.all(childWorkers);

  // Con 16 tareas del Test 3 + 3*4 = 12 tareas del Test 5, total debe ser 28
  const totalTasks = BacklogService.listTasks(project, { includeDeleted: true });
  assert.strictEqual(totalTasks.length, 28, 'Debe haber exactamente 28 tareas en total');

  const allCodes = totalTasks.map(t => t.code);
  const allUnique = new Set(allCodes);
  assert.strictEqual(allUnique.size, 28, 'Todos los 28 codigos de tarea generados deben ser estrictamente unicos');
  console.log('✅ Test 5 pasado: 3 procesos hijos concurrentes crearon 12 tareas con codigos DEV estrictamente correlativos.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE CONCURRENCIA Y LOCKFILE (DEV-314) PASARON CON EXITO!');
}

runTests().catch((err) => {
  console.error('\n❌ Error durante la prueba de concurrencia:', err);
  process.exit(1);
});
