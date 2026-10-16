import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BacklogService, findTaskFile } from '../server/services/backlogService.ts';
import * as storage from '../server/services/storage.ts';
import { serializeBacklogMd } from './backlogMdParser.ts';
import { atomicWriteFileSync } from '../server/services/atomicWrite.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Iniciando verificación de BacklogService y paridad arquitectónica (DEV-299)...');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-backlog-service-'));
const tasksDir = path.join(tmpDir, 'backlog/tasks');
const backlogDir = path.join(tmpDir, 'backlog');
fs.mkdirSync(tasksDir, { recursive: true });

function cleanup() {
  if (fs.existsSync(tmpDir)) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

const project = {
  id: 'test-project',
  name: 'Test Project',
  path: tmpDir,
  repoPath: tmpDir,
  storageType: 'markdown',
  codePrefix: 'DEV'
};

const cliPath = path.resolve(ROOT, 'scripts/gripm-cli.ts');

try {
  // =========================================================================
  // TEST 1: Creación de tareas y generación correlativa (AC 1)
  // =========================================================================
  console.log('\n--- Test 1: Creación de tareas con BacklogService.createTask ---');
  const task1Res = BacklogService.createTask(project, {
    title: 'Primera tarea de prueba',
    status: 'doing',
    priority: 'high',
    acceptanceCriteria: [
      { index: 1, text: 'Criterio inicial incompleto', checked: false }
    ]
  });

  assert.strictEqual(task1Res.ok, true, 'createTask debe retornar ok: true');
  assert.strictEqual(task1Res.task.code, 'DEV-001', 'Primera tarea debe ser DEV-001');
  assert.strictEqual(task1Res.task.status, 'doing', 'Estado debe ser doing');
  assert.ok(fs.existsSync(task1Res.savedFile), 'Archivo de tarea debe existir en disco');

  const task2Res = BacklogService.createTask(project, {
    title: 'Segunda tarea de prueba',
    status: 'draft',
    priority: 'medium',
    acceptanceCriteria: [
      { index: 1, text: 'AC de DEV-002', checked: false }
    ]
  });
  assert.strictEqual(task2Res.task.code, 'DEV-002', 'Segunda tarea debe ser correlativa DEV-002');
  console.log('✅ Test 1 aprobado: Creación y numeración correlativa funcional.');

  // =========================================================================
  // TEST 2: Paridad 1:1 entre BacklogService y delegación en storage.ts (AC 2)
  // =========================================================================
  console.log('\n--- Test 2: Paridad 1:1 con server/services/storage.ts ---');
  const serviceTask = BacklogService.getTask(project, 'DEV-001');
  const storageTask = storage.getTask(project, 'DEV-001');
  assert.deepStrictEqual(storageTask, serviceTask, 'storage.getTask debe ser idéntico a BacklogService.getTask');

  const serviceList = BacklogService.listTasks(project);
  const storageList = storage.listTasks(project);
  assert.strictEqual(storageList.length, serviceList.length, 'storage.listTasks debe devolver misma cantidad');
  assert.strictEqual(storageList[0].code, serviceList[0].code, 'storage.listTasks debe delegar a BacklogService');

  const serviceStats = BacklogService.getStats(project);
  const storageStats = storage.getStats(project);
  assert.deepStrictEqual(storageStats, serviceStats, 'storage.getStats debe ser idéntico a BacklogService.getStats');
  console.log('✅ Test 2 aprobado: Delegación y paridad total en storage.ts.');

  // =========================================================================
  // TEST 3: Gatekeeper de certificación en updateTask (AC 3 / SEC-01 / SEC-09)
  // =========================================================================
  console.log('\n--- Test 3: Gatekeeper en BacklogService.updateTask ---');
  
  // 3.1: Intento de mover a ready con ACs pendientes sin force -> debe fallar
  let gatekeeperBlocked = false;
  try {
    BacklogService.updateTask(project, 'DEV-001', { status: 'ready' });
  } catch (err) {
    gatekeeperBlocked = true;
    assert.ok(err.message.includes('Gatekeeper'), 'El error debe ser emitido por el Gatekeeper');
    assert.ok(err.message.includes('sin cumplir') || err.message.includes('criterio'), 'Debe mencionar ACs sin cumplir');
  }
  assert.strictEqual(gatekeeperBlocked, true, 'updateTask a ready sin ACs completos debe ser bloqueado por Gatekeeper');

  // Verificar que el estado en disco NO cambió
  const unmutatedTask = BacklogService.getTask(project, 'DEV-001');
  assert.strictEqual(unmutatedTask.task.status, 'doing', 'El estado en disco debe permanecer en doing');

  // 3.2: Intento con force: true -> debe permitirlo y emitir auditoría SEC-09
  const forceRes = BacklogService.updateTask(project, 'DEV-001', { status: 'ready' }, { force: true });
  assert.strictEqual(forceRes.ok, true, 'Con force: true debe actualizarse');
  assert.strictEqual(forceRes.updatedTask.status, 'ready', 'El nuevo estado debe ser ready');
  assert.ok(forceRes.warning && forceRes.warning.includes('Gatekeeper Audit'), 'Debe emitir advertencia de auditoría');
  assert.strictEqual(forceRes.audit?.bypassedGatekeeper, true, 'Debe registrar flag de bypass');

  // Devolver a doing y probar transición limpia con ACs completos
  BacklogService.updateTask(project, 'DEV-001', { status: 'doing', checkAllAcs: true }, { force: true });
  const cleanReadyRes = BacklogService.updateTask(project, 'DEV-001', { status: 'ready' });
  assert.strictEqual(cleanReadyRes.ok, true, 'Con ACs completos debe pasar a ready sin force');
  assert.strictEqual(cleanReadyRes.updatedTask.status, 'ready');
  console.log('✅ Test 3 aprobado: Gatekeeper de certificación estricto en updateTask.');

  // =========================================================================
  // TEST 4: Gatekeeper en bulkUpdateTasks (AC 3)
  // =========================================================================
  console.log('\n--- Test 4: Gatekeeper en BacklogService.bulkUpdateTasks ---');
  // DEV-002 tiene ACs incompletos y está en draft
  let bulkBlocked = false;
  try {
    BacklogService.bulkUpdateTasks(project, { taskIds: ['DEV-002'] }, { status: 'ready' });
  } catch (err) {
    bulkBlocked = true;
    assert.ok(err.message.includes('Gatekeeper'), 'bulkUpdateTasks debe aplicar validación de Gatekeeper');
  }
  assert.strictEqual(bulkBlocked, true, 'bulkUpdateTasks debe abortar transición inválida');

  // Con force: true debe permitirlo
  const bulkForceRes = BacklogService.bulkUpdateTasks(
    project,
    { taskIds: ['DEV-002'] },
    { status: 'ready' },
    { force: true }
  );
  assert.strictEqual(bulkForceRes.ok, true, 'bulkUpdateTasks con force debe completar');
  assert.strictEqual(bulkForceRes.updatedCount, 1, 'Debe haber actualizado 1 tarea');
  assert.strictEqual(bulkForceRes.audit?.bypassedGatekeeper, true, 'Debe reportar auditoría');
  console.log('✅ Test 4 aprobado: Gatekeeper aplicado exhaustivamente en bulkUpdateTasks.');

  // =========================================================================
  // TEST 5: Gatekeeper en CLI --update-status (AC 3)
  // =========================================================================
  console.log('\n--- Test 5: Gatekeeper en CLI gripm-cli.ts --update-status ---');
  // Crear DEV-003 con ACs incompletos
  BacklogService.createTask(project, {
    title: 'Tarea para prueba de CLI',
    status: 'doing',
    acceptanceCriteria: [{ index: 1, text: 'Pendiente', checked: false }]
  });

  // Ejecutar CLI sin --force esperando fallo
  const cliResFail = spawnSync(
    process.execPath,
    ['--experimental-strip-types', cliPath, '--update-status', 'ready', '--id', 'DEV-003'],
    { cwd: tmpDir, encoding: 'utf8' }
  );
  assert.notStrictEqual(cliResFail.status, 0, 'CLI --update-status sin --force debe fallar ante ACs incompletos');
  const failCombined = (cliResFail.stdout || '') + (cliResFail.stderr || '');
  assert.ok(failCombined.includes('Gatekeeper') || failCombined.includes('criterios de aceptación'), 'CLI debe mostrar error de Gatekeeper');

  // Ejecutar CLI con --force esperando éxito
  const cliResSuccess = spawnSync(
    process.execPath,
    ['--experimental-strip-types', cliPath, '--update-status', 'ready', '--id', 'DEV-003', '--force'],
    { cwd: tmpDir, encoding: 'utf8' }
  );
  assert.strictEqual(cliResSuccess.status, 0, 'CLI con --force debe salir con código 0');
  const successCombined = (cliResSuccess.stdout || '') + (cliResSuccess.stderr || '');
  assert.ok(successCombined.includes('Actualización masiva completada'), 'CLI con --force debe completar exitosamente');
  assert.ok(successCombined.includes('Gatekeeper Audit'), 'CLI debe mostrar advertencia de auditoría');
  console.log('✅ Test 5 aprobado: Gatekeeper activo y auditado en CLI.');

  // =========================================================================
  // TEST 6: Erradicación de persistencia de verifyCommand (SEC-01)
  // =========================================================================
  console.log('\n--- Test 6: Verificación de no-persistencia de verifyCommand (SEC-01) ---');
  // Intentar actualizar tarea con verifyCommand
  BacklogService.updateTask(project, 'DEV-003', { title: 'Título actualizado', verifyCommand: 'npm test' }, { force: true });
  
  // Inspeccionar archivo crudo en disco
  const task3File = findTaskFile(project, 'DEV-003');
  assert.ok(task3File, 'Archivo DEV-003 debe existir');
  const rawDiskContent = fs.readFileSync(task3File.filePath, 'utf8');
  assert.ok(!rawDiskContent.includes('verifyCommand'), 'verifyCommand NUNCA debe persistirse en el archivo Markdown');
  assert.ok(!rawDiskContent.includes('verify_command'), 'verify_command no debe aparecer en disco');
  console.log('✅ Test 6 aprobado: verifyCommand erradicado de persistencia en disco.');

  // =========================================================================
  // TEST 7: Filtrado de tareas soft-deleted (isDeleted: true) (AC 6)
  // =========================================================================
  console.log('\n--- Test 7: Filtrado estricto de isDeleted (AC 6) ---');
  // Marcar DEV-003 como borrada
  const delRes = BacklogService.deleteTask(project, 'DEV-003');
  assert.strictEqual(delRes.ok, true, 'deleteTask debe retornar ok: true');

  // 7.1 listTasks normal la excluye
  const listActive = BacklogService.listTasks(project);
  assert.ok(!listActive.some(t => t.code === 'DEV-003'), 'listTasks por defecto NO debe incluir tareas borradas');

  // 7.2 listTasks({ includeDeleted: true }) la incluye
  const listAll = BacklogService.listTasks(project, { includeDeleted: true });
  assert.ok(listAll.some(t => t.code === 'DEV-003'), 'listTasks con includeDeleted: true debe incluir la tarea borrada');

  // 7.3 getStats la excluye
  const stats = BacklogService.getStats(project);
  assert.strictEqual(stats.total, 2, 'getStats solo debe contar tareas activas (DEV-001 y DEV-002)');

  // 7.4 exportBacklogMd la excluye
  const exportedRes = BacklogService.exportBacklogMd(project);
  assert.ok(!exportedRes.content.includes('DEV-003'), 'exportBacklogMd NO debe contener tareas borradas');

  // 7.5 CLI list la excluye
  const cliListOutput = execSync(`node --experimental-strip-types "${cliPath}" list`, {
    cwd: tmpDir,
    encoding: 'utf8'
  });
  assert.ok(!cliListOutput.includes('[DEV-003]'), 'CLI list no debe mostrar tareas borradas');

  // 7.6 restoreTask la restaura
  const restoreRes = BacklogService.restoreTask(project, 'DEV-003');
  assert.strictEqual(restoreRes, true, 'restoreTask debe retornar true');
  const restoredList = BacklogService.listTasks(project);
  assert.ok(restoredList.some(t => t.code === 'DEV-003'), 'Tras restoreTask la tarea vuelve a estar activa');
  console.log('✅ Test 7 aprobado: Aislamiento completo de tareas soft-deleted.');

  // =========================================================================
  // TEST 8: Lectura pura en readProjectBacklog (cero mutaciones en disco) (AC 5)
  // =========================================================================
  console.log('\n--- Test 8: Lectura pura en readProjectBacklog (AC 5) ---');
  const sprintsPath = path.join(backlogDir, 'sprints.json');
  const releasesPath = path.join(backlogDir, 'releases.json');

  const initialSprints = [
    {
      id: 'sprint-old',
      name: 'Sprint 0 (Vencido)',
      status: 'active',
      startDate: '2020-01-01',
      endDate: '2020-01-14'
    }
  ];
  atomicWriteFileSync(sprintsPath, JSON.stringify(initialSprints, null, 2), 'utf8');
  atomicWriteFileSync(releasesPath, JSON.stringify([], null, 2), 'utf8');

  const sprintsStatBefore = fs.statSync(sprintsPath);
  const releasesStatBefore = fs.statSync(releasesPath);

  // Ejecutar lectura
  const readData = BacklogService.readProjectBacklog(project);
  assert.ok(Array.isArray(readData.items), 'Debe devolver items');
  assert.ok(Array.isArray(readData.sprints), 'Debe devolver sprints');

  const sprintsStatAfter = fs.statSync(sprintsPath);
  const releasesStatAfter = fs.statSync(releasesPath);

  assert.strictEqual(sprintsStatAfter.mtimeMs, sprintsStatBefore.mtimeMs, 'sprints.json no debe ser modificado al leer');
  assert.strictEqual(releasesStatAfter.mtimeMs, releasesStatBefore.mtimeMs, 'releases.json no debe ser modificado al leer');

  const sprintsContentOnDisk = JSON.parse(fs.readFileSync(sprintsPath, 'utf8'));
  assert.strictEqual(sprintsContentOnDisk[0].status, 'active', 'El sprint vencido NO debe ser auto-cerrado por lectura');
  console.log('✅ Test 8 aprobado: readProjectBacklog es 100% libre de mutaciones en disco.');

  // =========================================================================
  // TEST 9: syncBacklog NO auto-promueve tareas a ready (AC 4)
  // =========================================================================
  console.log('\n--- Test 9: Invariantes de calidad en syncBacklog (AC 4) ---');
  // Crear DEV-004 en doing con todos los ACs completos
  BacklogService.createTask(project, {
    title: 'Tarea con ACs listos pero en doing',
    status: 'doing',
    acceptanceCriteria: [{ index: 1, text: 'AC terminado', checked: true }]
  });

  const syncReport = BacklogService.syncBacklog(project, { autoFix: false });
  const task4AfterSync = BacklogService.getTask(project, 'DEV-004');
  assert.strictEqual(task4AfterSync.task.status, 'doing', 'syncBacklog NO debe auto-promocionar a ready');

  // Incluso con autoFix: true NO debe auto-promocionar a ready
  BacklogService.syncBacklog(project, { autoFix: true });
  const task4AfterFix = BacklogService.getTask(project, 'DEV-004');
  assert.strictEqual(task4AfterFix.task.status, 'doing', 'syncBacklog con autoFix: true NO debe cambiar status a ready');
  console.log('✅ Test 9 aprobado: syncBacklog respeta la soberanía de transición de estados.');

  // =========================================================================
  // TEST 10: Auditoría estática de escrituras no atómicas (AC 7)
  // =========================================================================
  console.log('\n--- Test 10: Auditoría estática de escrituras residuales (AC 7) ---');
  const targetFiles = [
    path.join(ROOT, 'server/services/registry.ts'),
    path.join(ROOT, 'server/routes/api.ts'),
    path.join(ROOT, 'scripts/gripm-cli.ts'),
    path.join(ROOT, 'scripts/updateChecker.js')
  ];

  for (const f of targetFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const writeSyncMatches = content.match(/fs\.writeFileSync/g) || [];
    assert.strictEqual(
      writeSyncMatches.length,
      0,
      `El archivo ${path.relative(ROOT, f)} contiene ${writeSyncMatches.length} llamada(s) a fs.writeFileSync. Debe usar atomicWriteFileSync.`
    );
  }
  console.log('✅ Test 10 aprobado: 0 llamadas directas a fs.writeFileSync en archivos objetivos.');

  console.log('\n🎉 ¡TODOS LOS 10 TESTS DE INTEGRACIÓN DE BACKLOGSERVICE PASARON EXITOSAMENTE!\n');
} finally {
  cleanup();
}
