#!/usr/bin/env node

/**
 * scripts/verify-sandbox.js — DEV-262
 *
 * Cobertura de tests para el adaptador en memoria (sandboxAdapter),
 * el detector de entorno (detect.ts), la paridad del contrato GripmApi
 * y la integridad del dataset demo-backlog.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('🧪 Iniciando verificación del adaptador sandbox y detector de entorno (DEV-262)...');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMO_FILE = path.join(ROOT, 'data/demo-backlog.json');

// --- Mock de window y localStorage para el entorno Node ---------------------
const mockStore = new Map();
const mockLocalStorage = {
  getItem: (key) => (mockStore.has(key) ? mockStore.get(key) : null),
  setItem: (key, val) => mockStore.set(key, String(val)),
  removeItem: (key) => mockStore.delete(key),
  clear: () => mockStore.clear(),
};

globalThis.window = globalThis;
globalThis.localStorage = mockLocalStorage;

// Importar módulos bajo prueba
const { sandboxAdapter, resetSandbox } = await import('../src/data/sandbox.ts');
const { ensureAdapter, isSandboxMode, resetAdapterDecision } = await import('../src/data/detect.ts');
const { getActiveApi } = await import('../src/data/runtime.ts');
const { httpAdapter } = await import('../src/data/httpAdapter.ts');
const { STORAGE_KEYS } = await import('../src/utils/storage.ts');

let stepIndex = 0;
const TOTAL_STEPS = 12;
const ok = (msg) => {
  stepIndex++;
  console.log(`✅ [${stepIndex}/${TOTAL_STEPS}] ${msg}`);
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

try {
  // -------------------------------------------------------------------------
  // AC #1: Generación de correlativos nextCode() y validaciones de creación
  // -------------------------------------------------------------------------
  resetSandbox();
  const created1 = await sandboxAdapter.createItem({ title: 'Nueva tarea A' });
  assert(created1.code === 'DEMO-008', `AC #1: se esperaba DEMO-008, se obtuvo ${created1.code}`);

  const created2 = await sandboxAdapter.createItem({ title: 'Nueva tarea B' });
  assert(created2.code === 'DEMO-009', `AC #1: se esperaba DEMO-009, se obtuvo ${created2.code}`);

  // Si se crea un ítem con correlativo alto explícito, nextCode debe saltar al siguiente
  await sandboxAdapter.createItem({ title: 'Salto manual', code: 'DEMO-015' });
  const createdAfterGap = await sandboxAdapter.createItem({ title: 'Tarea post salto' });
  assert(createdAfterGap.code === 'DEMO-016', `AC #1: tras gap DEMO-015 se esperaba DEMO-016, se obtuvo ${createdAfterGap.code}`);

  // Validación: título obligatorio
  let threwEmptyTitle = false;
  try {
    await sandboxAdapter.createItem({ title: '   ' });
  } catch (err) {
    threwEmptyTitle = true;
    assert(err.message.includes('título es obligatorio'), `AC #1: mensaje inesperado al crear sin título: ${err.message}`);
  }
  assert(threwEmptyTitle, 'AC #1: createItem() debió fallar al recibir título vacío');

  ok('AC #1: nextCode() genera correlativos correlativos correctos (DEMO-008...) y rechaza título vacío');

  // -------------------------------------------------------------------------
  // AC #2: Ciclo borrado lógico -> restaurar -> purgar campo por campo
  // -------------------------------------------------------------------------
  resetSandbox();
  const testItem = await sandboxAdapter.createItem({ title: 'Item para borrado', status: 'review' });
  
  // 2.1 Borrado lógico
  const delOk = await sandboxAdapter.deleteItem(testItem.id);
  assert(delOk === true, 'AC #2: deleteItem debió devolver true');
  
  let board = await sandboxAdapter.fetchBoardData();
  const softDeleted = board.items.find((it) => it.id === testItem.id);
  assert(softDeleted, 'AC #2: el ítem borrado lógicamente debe seguir existiendo en items[]');
  assert(softDeleted.isDeleted === true, 'AC #2: isDeleted debe ser true');
  assert(typeof softDeleted.deletedAt === 'string' && softDeleted.deletedAt.length > 0, 'AC #2: deletedAt debe ser string');
  assert(softDeleted.previousStatus === 'review', `AC #2: previousStatus debió registrar "review", obtuvo ${softDeleted.previousStatus}`);

  // 2.2 Restaurar
  const restoreOk = await sandboxAdapter.restoreItem(testItem.id);
  assert(restoreOk === true, 'AC #2: restoreItem debió devolver true');
  
  board = await sandboxAdapter.fetchBoardData();
  const restored = board.items.find((it) => it.id === testItem.id);
  assert(restored, 'AC #2: el ítem restaurado debe existir');
  assert(restored.status === 'review', `AC #2: status restaurado debió ser "review", obtuvo ${restored.status}`);
  assert(restored.isDeleted === undefined, 'AC #2: isDeleted debe ser undefined');
  assert(restored.deletedAt === undefined, 'AC #2: deletedAt debe ser undefined');
  assert(restored.previousStatus === undefined, 'AC #2: previousStatus debe ser undefined');

  // 2.3 Purga física
  const purgeOk = await sandboxAdapter.purgeItem(testItem.id);
  assert(purgeOk === true, 'AC #2: purgeItem debió devolver true');
  
  board = await sandboxAdapter.fetchBoardData();
  const purged = board.items.find((it) => it.id === testItem.id);
  assert(!purged, 'AC #2: purgeItem debió eliminar físicamente el ítem del array');

  // Intentar borrar o purgar ítem inexistente debe arrojar error
  let threwPurgedNotFound = false;
  try {
    await sandboxAdapter.purgeItem(testItem.id);
  } catch (err) {
    threwPurgedNotFound = true;
  }
  assert(threwPurgedNotFound, 'AC #2: purgar un ítem ya purgado debe lanzar excepción');

  ok('AC #2: ciclo borrado lógico -> restaurar -> purga física verificado campo por campo');

  // -------------------------------------------------------------------------
  // AC #3: Invariante de un solo sprint active al crear y actualizar
  // -------------------------------------------------------------------------
  resetSandbox();
  let sprints = await sandboxAdapter.fetchSprints();
  const initialActive = sprints.filter((s) => s.status === 'active');
  assert(initialActive.length === 1, `AC #3: el seed debe arrancar con 1 sprint active, hay ${initialActive.length}`);
  const prevActiveId = initialActive[0].id;

  // 3.1 Crear nuevo sprint con status: 'active'
  const newActiveSprint = await sandboxAdapter.createSprint({ name: 'Sprint 3 — Expansión', status: 'active' });
  assert(newActiveSprint.status === 'active', 'AC #3: el sprint creado debe ser active');

  sprints = await sandboxAdapter.fetchSprints();
  const activeSprintsAfterCreate = sprints.filter((s) => s.status === 'active');
  assert(activeSprintsAfterCreate.length === 1, `AC #3: tras createSprint(active) debe haber 1 solo active, hay ${activeSprintsAfterCreate.length}`);
  assert(activeSprintsAfterCreate[0].id === newActiveSprint.id, 'AC #3: el active debe ser el recién creado');

  const demotedPrev = sprints.find((s) => s.id === prevActiveId);
  assert(demotedPrev.status === 'planned', `AC #3: el sprint previamente active debió ser degradado a planned, es ${demotedPrev?.status}`);

  // El sprint completed (sprint-demo-1) no debe ser alterado
  const completedSprint = sprints.find((s) => s.id === 'sprint-demo-1');
  assert(completedSprint.status === 'completed', 'AC #3: sprint completed no debe ser tocado por demote');

  // 3.2 Actualizar un sprint planned a 'active'
  await sandboxAdapter.updateSprint(prevActiveId, { status: 'active' });
  sprints = await sandboxAdapter.fetchSprints();
  const activeSprintsAfterUpdate = sprints.filter((s) => s.status === 'active');
  assert(activeSprintsAfterUpdate.length === 1, `AC #3: tras updateSprint(active) debe haber 1 solo active, hay ${activeSprintsAfterUpdate.length}`);
  assert(activeSprintsAfterUpdate[0].id === prevActiveId, 'AC #3: el sprint reactivado debe ser el activo');

  const demotedNew = sprints.find((s) => s.id === newActiveSprint.id);
  assert(demotedNew.status === 'planned', 'AC #3: el sprint activo anterior debió ser demotado a planned');

  // 3.3 Pasar a completed estampa completedAt
  const completedUpdate = await sandboxAdapter.updateSprint(newActiveSprint.id, { status: 'completed' });
  assert(typeof completedUpdate.completedAt === 'string', 'AC #3: status completed debe estampar completedAt');

  ok('AC #3: invariante de un solo sprint active garantizado en create y update');

  // -------------------------------------------------------------------------
  // AC #4: deleteSprint() desasocia ítems limpiando sprint, targetSprint y sprints
  // -------------------------------------------------------------------------
  resetSandbox();
  // DEMO-002 tiene sprint: 'Sprint 2 — Resiliencia'
  board = await sandboxAdapter.fetchBoardData();
  const itemsInSprint2 = board.items.filter((it) => it.sprint === 'Sprint 2 — Resiliencia');
  assert(itemsInSprint2.length > 0, 'AC #4: deben existir ítems asignados a Sprint 2 en el seed');

  await sandboxAdapter.deleteSprint('sprint-demo-2');
  board = await sandboxAdapter.fetchBoardData();
  
  // Ningún ítem debe apuntar a 'Sprint 2 — Resiliencia'
  const lingeringItems = board.items.filter(
    (it) => it.sprint === 'Sprint 2 — Resiliencia' || it.targetSprint === 'Sprint 2 — Resiliencia' || it.sprints?.includes('Sprint 2 — Resiliencia'),
  );
  assert(lingeringItems.length === 0, `AC #4: quedaron ${lingeringItems.length} ítems con referencias muertas al sprint borrado`);

  // Verificar que los ítems afectados quedaron limpios
  for (const orig of itemsInSprint2) {
    const updated = board.items.find((it) => it.id === orig.id);
    assert(updated.sprint === '', `AC #4: item ${orig.code} sprint debe ser ''`);
    assert(updated.targetSprint === '', `AC #4: item ${orig.code} targetSprint debe ser ''`);
    assert(Array.isArray(updated.sprints) && updated.sprints.length === 0, `AC #4: item ${orig.code} sprints debe ser []`);
  }

  // Ítems de otro sprint no deben ser modificados
  const itemInSprint1 = board.items.find((it) => it.code === 'DEMO-001');
  assert(itemInSprint1.sprint === 'Sprint 1 — Onboarding', 'AC #4: ítems de otros sprints no deben alterarse');

  ok('AC #4: deleteSprint() desasocia ítems limpiando sprint, targetSprint y sprints sin punteros muertos');

  // -------------------------------------------------------------------------
  // AC #5: bulkUpdateItems() conteo y blindaje de id y code
  // -------------------------------------------------------------------------
  resetSandbox();
  const bulkResult = await sandboxAdapter.bulkUpdateItems([
    { id: 'item-demo-001', code: 'TAMPER-001', priority: 'p0', title: 'Título Modificado 1' },
    { id: 'item-demo-003', code: 'TAMPER-003', status: 'ready', priority: 'p1' },
    { id: 'id-inexistente-1234', title: 'Ignorado' },
  ]);

  assert(bulkResult === 2, `AC #5: se esperaba conteo de 2 actualizaciones, se obtuvo ${bulkResult}`);

  board = await sandboxAdapter.fetchBoardData();
  const item1 = board.items.find((it) => it.id === 'item-demo-001');
  assert(item1.code === 'DEMO-001', `AC #5: el código no debe ser sobrescribible, es ${item1.code}`);
  assert(item1.id === 'item-demo-001', 'AC #5: el id no debe ser sobrescribible');
  assert(item1.priority === 'p0', 'AC #5: priority debió actualizarse a p0');
  assert(item1.title === 'Título Modificado 1', 'AC #5: title debió actualizarse');

  const item3 = board.items.find((it) => it.id === 'item-demo-003');
  assert(item3.code === 'DEMO-003', 'AC #5: código de item 3 protegido');
  assert(item3.status === 'ready', 'AC #5: status de item 3 actualizado a ready');

  ok('AC #5: bulkUpdateItems() devuelve conteo exacto y protege id y code contra sobrescritura');

  // -------------------------------------------------------------------------
  // AC #6: deleteProject() en cascada elimina ítems, releases y sprints
  // -------------------------------------------------------------------------
  resetSandbox();
  const proj = await sandboxAdapter.createProject({ id: 'proj-cascade', name: 'Proyecto Cascada', codePrefix: 'CAS' });
  const projItem = await sandboxAdapter.createItem({ projectId: 'proj-cascade', title: 'Item en cascada' });
  const projSprint = await sandboxAdapter.createSprint({ projectId: 'proj-cascade', name: 'Sprint Cascada' });
  const projRelease = await sandboxAdapter.createRelease({ projectId: 'proj-cascade', version: '1.0.0' }, [projItem.code]);

  // Verificar creación
  board = await sandboxAdapter.fetchBoardData();
  assert(board.projects.some((p) => p.id === 'proj-cascade'), 'AC #6: proyecto debió crearse');
  assert(board.items.some((it) => it.projectId === 'proj-cascade'), 'AC #6: item debió crearse');
  assert(board.sprints.some((s) => s.projectId === 'proj-cascade'), 'AC #6: sprint debió crearse');
  assert(board.releases.some((r) => r.projectId === 'proj-cascade'), 'AC #6: release debió crearse');

  // Borrar proyecto
  await sandboxAdapter.deleteProject('proj-cascade');
  board = await sandboxAdapter.fetchBoardData();

  assert(!board.projects.some((p) => p.id === 'proj-cascade'), 'AC #6: proyecto debe eliminarse');
  assert(!board.items.some((it) => it.projectId === 'proj-cascade'), 'AC #6: no deben quedar ítems huérfanos');
  assert(!board.sprints.some((s) => s.projectId === 'proj-cascade'), 'AC #6: no deben quedar sprints huérfanos');
  assert(!board.releases.some((r) => r.projectId === 'proj-cascade'), 'AC #6: no deben quedar releases huérfanos');

  ok('AC #6: deleteProject() en cascada limpia proyectos, ítems, releases y sprints huérfanos');

  // -------------------------------------------------------------------------
  // AC #7: resetSandbox() borra claves de localStorage y reestablece el seed
  // -------------------------------------------------------------------------
  resetSandbox();
  // Generar mutaciones para persistir en mockLocalStorage
  await sandboxAdapter.createItem({ title: 'Mutación persistente' });
  const currentConfig = await sandboxAdapter.fetchSettings();
  await sandboxAdapter.saveSettings({ ...currentConfig, theme: 'light' });

  assert(mockLocalStorage.getItem(STORAGE_KEYS.SANDBOX_BOARD) !== null, 'AC #7: SANDBOX_BOARD debió persistir en localStorage');
  assert(mockLocalStorage.getItem(STORAGE_KEYS.SANDBOX_CONFIG) !== null, 'AC #7: SANDBOX_CONFIG debió persistir en localStorage');

  // Reset
  resetSandbox();

  assert(mockLocalStorage.getItem(STORAGE_KEYS.SANDBOX_BOARD) === null, 'AC #7: resetSandbox() debe borrar SANDBOX_BOARD');
  assert(mockLocalStorage.getItem(STORAGE_KEYS.SANDBOX_CONFIG) === null, 'AC #7: resetSandbox() debe borrar SANDBOX_CONFIG');

  board = await sandboxAdapter.fetchBoardData();
  assert(board.items.length === 7, `AC #7: tras reset se esperaban 7 ítems semilla, hay ${board.items.length}`);
  const settings = await sandboxAdapter.fetchSettings();
  assert(settings.theme === 'dark', 'AC #7: config debe volver a los defaults');

  ok('AC #7: resetSandbox() purga claves en localStorage y restituye seed y config originales');

  // -------------------------------------------------------------------------
  // AC #8: fetchBoardData() devuelve clon profundo protegido
  // -------------------------------------------------------------------------
  resetSandbox();
  const clone1 = await sandboxAdapter.fetchBoardData();
  // Mutaciones destructivas en el objeto retornado
  clone1.items[0].title = 'TAMPERED IN-PLACE';
  clone1.items.length = 0;
  clone1.projects[0].name = 'TAMPERED PROJECT NAME';
  clone1.sprints.length = 0;

  const clone2 = await sandboxAdapter.fetchBoardData();
  assert(clone2.items.length === 7, 'AC #8: mutar items.length en el clon no debe vaciar el adaptador');
  assert(clone2.items[0].title !== 'TAMPERED IN-PLACE', 'AC #8: mutar título en el clon no debe alterar el estado interno');
  assert(clone2.projects[0].name !== 'TAMPERED PROJECT NAME', 'AC #8: mutar proyecto no debe alterar el estado interno');
  assert(clone2.sprints.length > 0, 'AC #8: mutar sprints.length no debe alterar el estado interno');

  ok('AC #8: fetchBoardData() entrega clones profundos desacoplados del estado interno');

  // -------------------------------------------------------------------------
  // AC #9: detect.ts probes: JSON -> http, error/timeout -> sandbox, cache única
  // -------------------------------------------------------------------------
  const origFetch = globalThis.fetch;
  try {
    // 9.1 Probe exitoso con JSON -> httpAdapter
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      json: async () => ({ ok: true }),
    });
    resetAdapterDecision();
    await ensureAdapter();
    assert(isSandboxMode() === false, 'AC #9: con probe JSON ok, isSandboxMode() debe ser false');
    assert(getActiveApi() === httpAdapter, 'AC #9: con probe JSON ok, getActiveApi() debe ser httpAdapter');

    // 9.2 Probe con fallo de red / error 500 -> sandboxAdapter
    globalThis.fetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    resetAdapterDecision();
    await ensureAdapter();
    assert(isSandboxMode() === true, 'AC #9: con fallo de red, isSandboxMode() debe ser true');
    assert(getActiveApi() === sandboxAdapter, 'AC #9: con fallo de red, getActiveApi() debe ser sandboxAdapter');

    // 9.3 Probe con timeout / abort -> sandboxAdapter
    globalThis.fetch = async (url, opts) => {
      if (opts?.signal) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }
      throw new Error('Timeout');
    };
    resetAdapterDecision();
    await ensureAdapter();
    assert(isSandboxMode() === true, 'AC #9: con abort/timeout, isSandboxMode() debe ser true');
    assert(getActiveApi() === sandboxAdapter, 'AC #9: con abort/timeout, getActiveApi() debe ser sandboxAdapter');

    // 9.4 Cache única: una sola invocación de fetch ante llamadas concurrentes
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true }),
      };
    };
    resetAdapterDecision();
    await Promise.all([ensureAdapter(), ensureAdapter(), ensureAdapter(), ensureAdapter(), ensureAdapter()]);
    assert(fetchCount === 1, `AC #9: se esperaba exactamente 1 llamada a fetch en llamadas concurrentes, hubo ${fetchCount}`);

  } finally {
    globalThis.fetch = origFetch;
    resetAdapterDecision();
  }

  ok('AC #9: detect.ts resuelve correctamente ante JSON, fallos y timeouts, con promesa cacheada');

  // -------------------------------------------------------------------------
  // AC #10: detect.ts rechaza 200 con content-type no JSON (SPA fallback HTML)
  // -------------------------------------------------------------------------
  const origFetchAc10 = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<!DOCTYPE html><html><body>SPA</body></html>',
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });
    resetAdapterDecision();
    await ensureAdapter();
    assert(isSandboxMode() === true, 'AC #10: 200 con text/html debe activar sandboxAdapter (no httpAdapter)');
    assert(getActiveApi() === sandboxAdapter, 'AC #10: getActiveApi() debe ser sandboxAdapter ante HTML');
  } finally {
    globalThis.fetch = origFetchAc10;
    resetAdapterDecision();
  }

  ok('AC #10: detect.ts rechaza respuestas 200 con content-type no JSON (SPA fallback)');

  // -------------------------------------------------------------------------
  // AC #11: Paridad estricta del contrato GripmApi entre sandboxAdapter y httpAdapter
  // -------------------------------------------------------------------------
  const EXPECTED_API_METHODS = [
    // Tablero
    'fetchBoardData',
    // Ítems
    'createItem',
    'updateItem',
    'deleteItem',
    'restoreItem',
    'purgeItem',
    'bulkUpdateItems',
    // Proyectos
    'createProject',
    'updateProject',
    'deleteProject',
    'setActiveProjectApi',
    'restoreDemoProject',
    // Releases
    'createRelease',
    'syncLegacyReleases',
    'deleteReleaseApi',
    // Sprints
    'fetchSprints',
    'createSprint',
    'updateSprint',
    'deleteSprint',
    // Importación y exportación
    'triggerResync',
    'importLegacyBacklog',
    'convertProjectToMd',
    'convertProjectToJson',
    'exportProjectJson',
    'exportMonolithicMd',
    // Configuración
    'fetchSettings',
    'saveSettings',
    // Retrospectivas
    'fetchRetros',
    // Sistema de archivos
    'browseDirectory',
    'detectPathStorage',
    // Eventos
    'subscribeToBoardEvents',
  ];

  const httpMethods = Object.keys(httpAdapter).filter((k) => typeof httpAdapter[k] === 'function');
  const sandboxMethods = Object.keys(sandboxAdapter).filter((k) => typeof sandboxAdapter[k] === 'function');

  for (const method of EXPECTED_API_METHODS) {
    assert(httpMethods.includes(method), `AC #11: método "${method}" de GripmApi falta en httpAdapter`);
    assert(sandboxMethods.includes(method), `AC #11: método "${method}" de GripmApi falta en sandboxAdapter`);
  }

  // Verificar simetría exacta
  const missingInSandbox = httpMethods.filter((m) => !sandboxMethods.includes(m));
  const missingInHttp = sandboxMethods.filter((m) => !httpMethods.includes(m));
  assert(missingInSandbox.length === 0, `AC #11: métodos presentes en httpAdapter pero ausentes en sandboxAdapter: ${missingInSandbox.join(', ')}`);
  assert(missingInHttp.length === 0, `AC #11: métodos presentes en sandboxAdapter pero ausentes en httpAdapter: ${missingInHttp.join(', ')}`);

  assert(
    EXPECTED_API_METHODS.length === 31,
    `AC #11: se esperaban 31 métodos en GripmApi, se auditaron ${EXPECTED_API_METHODS.length}`,
  );

  ok('AC #11: paridad 100% de los 31 métodos del contrato GripmApi entre httpAdapter y sandboxAdapter');

  // -------------------------------------------------------------------------
  // AC #12: Validación estructural y de tipos de data/demo-backlog.json
  // -------------------------------------------------------------------------
  const rawDemo = fs.readFileSync(DEMO_FILE, 'utf8');
  const demoData = JSON.parse(rawDemo);

  // Proyecto
  assert(demoData.project && typeof demoData.project === 'object', 'AC #12: demo-backlog.json debe contener objeto "project"');
  assert(demoData.project.id === 'demo', 'AC #12: project.id debe ser "demo"');
  assert(demoData.project.codePrefix === 'DEMO', 'AC #12: project.codePrefix debe ser "DEMO"');
  assert(demoData.project.isDemo === true, 'AC #12: project.isDemo debe ser true');
  assert(demoData.project.storageType === 'json', 'AC #12: project.storageType debe ser "json"');
  assert(typeof demoData.project.name === 'string' && demoData.project.name.length > 0, 'AC #12: project.name requerido');

  // Ítems y cobertura de las 5 columnas canónicas
  assert(Array.isArray(demoData.items) && demoData.items.length >= 5, 'AC #12: demoData.items debe contener al menos 5 ítems');
  const CANONICAL_STATUSES = ['draft', 'doing', 'review', 'ready', 'done'];
  const presentStatuses = new Set(demoData.items.map((it) => it.status));
  for (const st of CANONICAL_STATUSES) {
    assert(presentStatuses.has(st), `AC #12: el seed demo debe tener al menos un ítem con status "${st}"`);
  }

  // Validación de campos por ítem
  let hasAcList = false;
  for (const it of demoData.items) {
    assert(typeof it.id === 'string' && it.id.length > 0, `AC #12: id requerido en ítem ${it.code}`);
    assert(/^DEMO-\d{3}$/.test(it.code), `AC #12: código ${it.code} no cumple formato DEMO-XXX`);
    assert(typeof it.title === 'string' && it.title.trim().length > 0, `AC #12: title requerido en ítem ${it.code}`);
    assert(it.projectId === 'demo', `AC #12: projectId debe ser demo en ${it.code}`);
    assert(typeof it.order === 'number', `AC #12: order debe ser número en ${it.code}`);
    assert(['p0', 'p1', 'p2', 'p3'].includes(it.priority), `AC #12: prioridad inválida en ${it.code}`);

    if (Array.isArray(it.acceptanceCriteriaList) && it.acceptanceCriteriaList.length > 0) {
      hasAcList = true;
      for (const ac of it.acceptanceCriteriaList) {
        assert(typeof ac.index === 'number', `AC #12: index numérico en AC de ${it.code}`);
        assert(typeof ac.text === 'string' && ac.text.length > 0, `AC #12: text string en AC de ${it.code}`);
        assert(typeof ac.checked === 'boolean', `AC #12: checked booleano en AC de ${it.code}`);
      }
    }
  }
  assert(hasAcList, 'AC #12: el seed demo debe incluir criterios de aceptación (acceptanceCriteriaList)');

  // Sprints
  assert(Array.isArray(demoData.sprints) && demoData.sprints.length >= 2, 'AC #12: deben existir al menos 2 sprints en demo');
  const sprintStatuses = new Set(demoData.sprints.map((s) => s.status));
  assert(sprintStatuses.has('active'), 'AC #12: debe existir al menos 1 sprint "active"');
  assert(sprintStatuses.has('completed'), 'AC #12: debe existir al menos 1 sprint "completed"');

  // Releases
  assert(Array.isArray(demoData.releases) && demoData.releases.length >= 2, 'AC #12: deben existir al menos 2 releases en demo');
  const relStatuses = new Set(demoData.releases.map((r) => r.status));
  assert(relStatuses.has('released'), 'AC #12: debe existir un release "released"');
  assert(relStatuses.has('unreleased'), 'AC #12: debe existir un release "unreleased"');

  // Metadata
  assert(!isNaN(Date.parse(demoData.lastUpdated)), 'AC #12: lastUpdated debe ser fecha ISO válida');

  ok('AC #12: data/demo-backlog.json cumple esquema, cubre las 5 columnas, sprints y ACs');

  console.log(`\n🎉 Todas las verificaciones (${TOTAL_STEPS}/${TOTAL_STEPS}) pasaron exitosamente.`);
  process.exit(0);
} catch (error) {
  console.error(`\n❌ Error en verificación de sandbox:`, error);
  process.exit(1);
}
