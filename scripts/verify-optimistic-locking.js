import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';

console.log('🧪 Iniciando prueba de Concurrencia Optimista (DEV-017)...');

process.env.GRIPM_MODE = 'multi';

const viteConfigModule = await import('../vite.config.ts');
const rawConfig = viteConfigModule.default;
const config = typeof rawConfig === 'function' ? await rawConfig({ command: 'serve', mode: 'development' }) : rawConfig;
const devBoardPlugin = (config.plugins || []).find(p => p && p.name === 'vite-plugin-dev-board-api');

if (!devBoardPlugin || typeof devBoardPlugin.configureServer !== 'function') {
  throw new Error('Plugin vite-plugin-dev-board-api no encontrado.');
}

let middlewareHandler = null;
const mockServer = {
  middlewares: {
    use: (fn) => {
      middlewareHandler = fn;
    }
  }
};

devBoardPlugin.configureServer(mockServer);

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 0;
    this.headers = {};
    this.body = '';
  }

  writeHead(status, headers) {
    this.statusCode = status;
    if (headers) Object.assign(this.headers, headers);
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }

  end(chunk) {
    if (chunk) this.body += chunk;
    this.emit('finish');
  }
}

class MockRequest extends EventEmitter {
  constructor(method, url, body = null, headers = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = {
      host: 'localhost:4100',
      ...headers
    };
    if (body) {
      this.body = JSON.stringify(body);
      this.headers['content-type'] = this.headers['content-type'] || 'application/json';
      this.headers['content-length'] = String(Buffer.byteLength(this.body));
    }
  }
}

function dispatch(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new MockRequest(method, url, body, headers);
    const res = new MockResponse();

    res.on('finish', () => {
      let parsed = null;
      try {
        parsed = JSON.parse(res.body);
      } catch {}
      resolve({ status: res.statusCode, body: parsed, raw: res.body });
    });

    middlewareHandler(req, res, () => {});

    if (body) {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    } else {
      req.emit('end');
    }
  });
}

const testRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-lock-'));
const tasksDir = path.join(testRepo, 'backlog/tasks');
fs.mkdirSync(tasksDir, { recursive: true });

try {
  // Registrar fixture de proyecto aislado
  const regRes = await dispatch('POST', '/api/projects', {
    id: 'test-fixture-lock',
    name: 'Test Fixture Lock',
    codePrefix: 'LOCK',
    storageType: 'markdown',
    repoPath: testRepo
  });

  if (regRes.status !== 200 && regRes.status !== 201) {
    throw new Error(`Error registrando fixture de proyecto: ${regRes.status}`);
  }

  const taskFilePath = path.join(tasksDir, 'LOCK-001 - Tarea de prueba concurrencia.md');
  fs.writeFileSync(taskFilePath, `---
id: LOCK-001
title: Tarea de prueba concurrencia
status: draft
priority: p1
type: feature
---
Descripción inicial de prueba.
`, 'utf8');

  // 1. Test GET /api/data to verify mtime presence
  const dataRes = await dispatch('GET', '/api/data');
  if (dataRes.status !== 200 || !Array.isArray(dataRes.body.items)) {
    throw new Error(`GET /api/data falló con status ${dataRes.status}`);
  }

  const item = dataRes.body.items.find(i => i.code === 'LOCK-001');
  if (!item) {
    throw new Error('No se encontró el ítem LOCK-001 para probar.');
  }

  if (typeof item.mtime !== 'number' || item.mtime <= 0) {
    throw new Error(`El ítem ${item.code} no tiene mtime válido: ${item.mtime}`);
  }
  console.log(`✅ [1/4] Ítems incluyen mtime para optimistic locking: ${item.code} (mtime: ${item.mtime})`);

  // 2. Test PUT /api/items/:id con expectedMtime desactualizado -> debe retornar 409 Conflict
  const staleMtime = item.mtime - 50000;
  const conflictRes = await dispatch('PUT', `/api/items/${item.code}`, {
    title: `${item.title} (Intento conflictivo)`,
    expectedMtime: staleMtime
  });

  if (conflictRes.status !== 409 || conflictRes.body?.error !== 'conflict') {
    throw new Error(`Se esperaba 409 Conflict ante edición con mtime desactualizado, se obtuvo: ${conflictRes.status} ${JSON.stringify(conflictRes.body)}`);
  }
  console.log(`✅ [2/4] Detección de colisión exitosa: HTTP 409 Conflict recibido (${conflictRes.body.message})`);

  // 3. Test PUT /api/items/:id con expectedMtime correcto -> debe guardar (200 OK)
  const successRes = await dispatch('PUT', `/api/items/${item.code}`, {
    title: item.title,
    expectedMtime: item.mtime
  });

  if (successRes.status !== 200 || !successRes.body?.ok) {
    throw new Error(`Se esperaba 200 OK ante expectedMtime sincronizado, se obtuvo: ${successRes.status}`);
  }
  console.log(`✅ [3/4] Guardado exitoso con expectedMtime sincronizado (HTTP 200 OK)`);

  // 4. Test PUT /api/items/:id con force: true -> ignora conflicto y sobreescribe
  const forceRes = await dispatch('PUT', `/api/items/${item.code}`, {
    title: item.title,
    expectedMtime: staleMtime,
    force: true
  });

  if (forceRes.status !== 200 || !forceRes.body?.ok) {
    throw new Error(`Se esperaba 200 OK con force: true, se obtuvo: ${forceRes.status}`);
  }
  console.log(`✅ [4/4] Sobreescritura forzada permitida con force: true (HTTP 200 OK)`);

  // 5. A newly created Markdown task must return its persisted canonical ID and
  // keep relationships through create, edit, and a fresh read from disk.
  const createRes = await dispatch('POST', '/api/items', {
    projectId: 'test-fixture-lock',
    title: 'Tarea creada para probar edición y relaciones',
    type: 'feature',
    parentId: 'LOCK-001',
    blocks: ['LOCK-001'],
    blockedBy: ['LOCK-001'],
    relatedTo: ['LOCK-001']
  });

  if (createRes.status !== 201 || !createRes.body?.item) {
    throw new Error(`Se esperaba 201 al crear la tarea de regresión, se obtuvo ${createRes.status}`);
  }
  const created = createRes.body.item;
  if (created.id !== created.code) {
    throw new Error(`La tarea Markdown debe devolver su ID persistido (${created.code}), se obtuvo ${created.id}`);
  }
  for (const relation of ['parentId', 'blocks', 'blockedBy', 'relatedTo']) {
    const expected = relation === 'parentId' ? 'LOCK-001' : ['LOCK-001'];
    if (JSON.stringify(created[relation]) !== JSON.stringify(expected)) {
      throw new Error(`La relación ${relation} no llegó en la respuesta de creación: ${JSON.stringify(created[relation])}`);
    }
  }

  const editRes = await dispatch('PUT', `/api/items/${encodeURIComponent(created.id)}`, {
    title: `${created.title} editada`,
    parentId: created.parentId,
    blocks: created.blocks,
    blockedBy: created.blockedBy,
    relatedTo: created.relatedTo
  });
  if (editRes.status !== 200 || editRes.body?.item?.title !== `${created.title} editada`) {
    throw new Error(`La tarea recién creada no se pudo editar por su ID canónico: ${editRes.status} ${JSON.stringify(editRes.body)}`);
  }

  const persistedRes = await dispatch('GET', '/api/data');
  const persisted = persistedRes.body?.items?.find(i => i.code === created.code);
  if (!persisted || persisted.id !== created.id || persisted.parentId !== 'LOCK-001'
    || JSON.stringify(persisted.blocks) !== '["LOCK-001"]'
    || JSON.stringify(persisted.blockedBy) !== '["LOCK-001"]'
    || JSON.stringify(persisted.relatedTo) !== '["LOCK-001"]') {
    throw new Error(`La edición o sus relaciones no persistieron en el archivo Markdown: ${JSON.stringify(persisted)}`);
  }

  const clearRelationsRes = await dispatch('PUT', `/api/items/${encodeURIComponent(created.id)}`, {
    parentId: '',
    blocks: [],
    blockedBy: [],
    relatedTo: []
  });
  if (clearRelationsRes.status !== 200 || clearRelationsRes.body?.item?.parentId
    || clearRelationsRes.body?.item?.blocks?.length
    || clearRelationsRes.body?.item?.blockedBy?.length
    || clearRelationsRes.body?.item?.relatedTo?.length) {
    throw new Error(`La API no permitió desasignar explícitamente las relaciones: ${JSON.stringify(clearRelationsRes.body)}`);
  }
  console.log('✅ [5/5] Crear → editar → releer y limpiar todas las relaciones conserva identidad y estado');

} finally {
  await dispatch('DELETE', '/api/projects/test-fixture-lock');
  if (fs.existsSync(testRepo)) {
    fs.rmSync(testRepo, { recursive: true, force: true });
  }
}

console.log('🎉 DEV-017 (Optimistic Locking & Concurrency) completamente validado!');
process.exit(0);
