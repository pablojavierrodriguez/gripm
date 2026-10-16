import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { pathToFileURL, fileURLToPath } from 'node:url';

console.log('🧪 Iniciando prueba de persistencia de sprints en modo JSON (DEV-261)...');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORAGE_MODULE = pathToFileURL(path.join(ROOT, 'server/services/storage.ts')).href;
const DEMO_FILE = path.join(ROOT, 'src/data/demo-backlog.json');

process.env.GRIPM_MODE = 'multi';

const { readProjectBacklog, writeProjectBacklog } = await import(STORAGE_MODULE);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-json-sprints-'));
const serviceRepo = path.join(tempRoot, 'service');
const apiRepo = path.join(tempRoot, 'api');
fs.mkdirSync(path.join(serviceRepo, '.gripm'), { recursive: true });
fs.mkdirSync(path.join(apiRepo, '.gripm'), { recursive: true });

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const serviceProject = {
  id: 'test-fixture-json-sprint',
  name: 'Test Fixture JSON Sprints',
  codePrefix: 'JSP',
  repoPath: serviceRepo,
  storageType: 'json',
  backlogDir: 'backlog',
  createdAt: new Date().toISOString()
};

let steps = 0;
const TOTAL = 6;
const ok = (msg) => console.log(`✅ [${steps}/${TOTAL}] ${msg}`);

try {
  // 1. El punto de retorno `initial` (archivo inexistente) también debe exponer sprints.
  const serviceFile = path.join(serviceRepo, '.gripm/backlog.json');
  const initial = readProjectBacklog(serviceProject);
  if (!Array.isArray(initial.sprints) || initial.sprints.length !== 0) {
    throw new Error(`El backlog inicial de un proyecto JSON debe traer sprints: [] y no ${JSON.stringify(initial.sprints)}`);
  }
  if (!fs.existsSync(serviceFile)) {
    throw new Error('El backlog inicial de un proyecto JSON no se materializó en disco.');
  }
  const seededOnDisk = JSON.parse(fs.readFileSync(serviceFile, 'utf8'));
  if (!Array.isArray(seededOnDisk.sprints)) {
    throw new Error('El archivo inicial en disco no fue escrito con la clave `sprints`.');
  }
  steps++; ok('El backlog inicial de un proyecto JSON se materializa con `sprints: []`');

  // 2. AC #5 — el ciclo escribir y volver a leer en modo JSON, el que nunca estuvo cubierto.
  const seededSprints = [
    { id: 'sprint-1', projectId: serviceProject.id, name: 'Onboarding', status: 'completed', createdAt: '2026-09-01T09:00:00.000Z' },
    { id: 'sprint-2', projectId: serviceProject.id, name: 'Resiliencia', status: 'active', createdAt: '2026-09-21T09:00:00.000Z' }
  ];
  writeProjectBacklog(serviceProject, {
    ...initial,
    sprints: seededSprints
  });
  const reread = readProjectBacklog(serviceProject);
  if (!Array.isArray(reread.sprints) || reread.sprints.length !== 2) {
    throw new Error(`Escritos 2 sprints y releídos ${JSON.stringify(reread.sprints)}: el read JSON descarta lo que se acaba de escribir.`);
  }
  for (const seeded of seededSprints) {
    const found = reread.sprints.find((s) => s.id === seeded.id);
    if (!found) {
      throw new Error(`El sprint ${seeded.id} no sobrevivió al ciclo escribir → leer en modo JSON.`);
    }
    for (const field of ['id', 'projectId', 'name', 'status', 'createdAt']) {
      if (found[field] !== seeded[field]) {
        throw new Error(`El campo ${field} del sprint ${seeded.id} no sobrevivió al ciclo escribir → leer: ${found[field]} !== ${seeded[field]}`);
      }
    }
  }
  steps++; ok('AC #5 · escribir → releer en modo JSON devuelve los sprints intactos');

  // 3. AC #1 — el guard Array.isArray en los tres puntos de retorno (normal, initial, error).
  fs.writeFileSync(serviceFile, JSON.stringify({ items: [], releases: [], sprints: 'no-es-un-array' }), 'utf8');
  if (JSON.stringify(readProjectBacklog(serviceProject).sprints) !== '[]') {
    throw new Error('Un `sprints` no-array en disco debe normalizarse a [], no propagarse como valor.');
  }
  fs.writeFileSync(serviceFile, '{ esto no es JSON', 'utf8');
  const brokenRead = readProjectBacklog(serviceProject);
  if (!Array.isArray(brokenRead.sprints) || brokenRead.sprints.length !== 0) {
    throw new Error(`El retorno de error del read JSON debe traer sprints: [] y no ${JSON.stringify(brokenRead.sprints)}`);
  }
  if (brokenRead.project.error === undefined) {
    throw new Error('El fixture de JSON corrupto no tomó la rama de error esperada.');
  }
  steps++; ok('AC #1 · `sprints` sale normalizado a [] en los tres retornos (normal, initial, error)');

  // --- Capa HTTP: IDs generados y lista servida por la API ---------------------------
  const viteConfigModule = await import(pathToFileURL(path.join(ROOT, 'vite.config.ts')).href);
  const rawConfig = viteConfigModule.default;
  const config = typeof rawConfig === 'function' ? await rawConfig({ command: 'serve', mode: 'development' }) : rawConfig;
  const gripmPlugin = (config.plugins || []).find(p => p && p.name === 'vite-plugin-gripm-api');
  if (!gripmPlugin || typeof gripmPlugin.configureServer !== 'function') {
    throw new Error('Plugin vite-plugin-gripm-api no encontrado.');
  }

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
    constructor(method, url, body = null) {
      super();
      this.method = method;
      this.url = url;
      this.headers = { host: 'localhost:4100' };
      if (body) {
        this.body = JSON.stringify(body);
        this.headers['content-type'] = 'application/json';
        this.headers['content-length'] = String(Buffer.byteLength(this.body));
      }
    }
  }

  let middlewareHandler = null;
  gripmPlugin.configureServer({ middlewares: { use: (fn) => { middlewareHandler = fn; } } });

  function dispatch(method, url, body = null) {
    return new Promise((resolve) => {
      const req = new MockRequest(method, url, body);
      const res = new MockResponse();
      res.on('finish', () => {
        let parsed = null;
        try { parsed = JSON.parse(res.body); } catch {}
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

  const testRegistryPath = path.join(tempRoot, 'registry.json');
  fs.writeFileSync(testRegistryPath, JSON.stringify({ activeProjectId: '', projects: [] }), 'utf8');
  const prevEnvReg = process.env.GRIPM_REGISTRY_PATH;
  process.env.GRIPM_REGISTRY_PATH = testRegistryPath;

  try {
    const regRes = await dispatch('POST', '/api/projects', {
      id: 'test-fixture-json-sprint',
      name: 'Test Fixture JSON Sprints',
      codePrefix: 'JSP',
      storageType: 'json',
      repoPath: apiRepo
    });
    if (regRes.status !== 200 && regRes.status !== 201) {
      throw new Error(`Error registrando el fixture JSON: ${regRes.status} ${regRes.raw}`);
    }

    // 4. AC #3 — dos sprints consecutivos en modo JSON no pueden compartir ID.
    const firstRes = await dispatch('POST', '/api/sprints', { projectId: 'test-fixture-json-sprint', name: 'Onboarding' });
    if (firstRes.status !== 201 || !firstRes.body?.sprint?.id) {
      throw new Error(`POST /api/sprints devolvió ${firstRes.status} ${firstRes.raw}`);
    }
    const secondRes = await dispatch('POST', '/api/sprints', { projectId: 'test-fixture-json-sprint', name: 'Resiliencia' });
    if (secondRes.status !== 201 || !secondRes.body?.sprint?.id) {
      throw new Error(`POST /api/sprints devolvió ${secondRes.status} ${secondRes.raw}`);
    }
    const firstId = firstRes.body.sprint.id;
    const secondId = secondRes.body.sprint.id;
    if (firstId === secondId) {
      throw new Error(`Dos sprints consecutivos en modo JSON comparten el ID "${firstId}": maxNum partió de una lista vacía.`);
    }
    steps++; ok(`AC #3 · dos sprints consecutivos en JSON producen IDs distintos (${firstId}, ${secondId})`);

    // 5. AC #2 — GET devuelve lo escrito y sobrevive a un proceso totalmente nuevo.
    const listRes = await dispatch('GET', '/api/sprints?projectId=test-fixture-json-sprint');
    const servedIds = (listRes.body?.sprints || []).map((s) => s.id).sort();
    if (JSON.stringify(servedIds) !== JSON.stringify([firstId, secondId].sort())) {
      throw new Error(`GET /api/sprints devolvió ${JSON.stringify(listRes.body?.sprints)} y no los sprints recién creados.`);
    }

    // "Reinicio del daemon": un proceso hijo nuevo, sin ningún estado en memoria heredado,
    // relee el mismo archivo del disco.
    const probePath = path.join(tempRoot, 'restart-probe.mjs');
    fs.writeFileSync(probePath, `
const { readProjectBacklog } = await import(${JSON.stringify(STORAGE_MODULE)});
const project = JSON.parse(process.argv[2]);
const backlog = readProjectBacklog(project);
process.stdout.write(JSON.stringify((backlog.sprints || []).map((s) => s.id)));
`, 'utf8');
    const coldRead = execFileSync(process.execPath, ['--experimental-strip-types', probePath, JSON.stringify({
      ...regRes.body?.projects?.find(p => p.id === 'test-fixture-json-sprint'),
      storageType: 'json',
      repoPath: apiRepo
    })], { encoding: 'utf8' });
    if (JSON.stringify(JSON.parse(coldRead).sort()) !== JSON.stringify(servedIds)) {
      throw new Error(`Tras un proceso nuevo los sprints en disco son ${coldRead} y no ${JSON.stringify(servedIds)}.`);
    }
    steps++; ok(`AC #2 · GET /api/sprints devuelve los 2 sprints y sobrevive a un proceso nuevo (${coldRead})`);

    // 6. AC #4 — el proyecto demo vive en modo JSON y ahora sí expone sus sprints.
    const demoHashBefore = sha256(DEMO_FILE);
    const demoBacklog = readProjectBacklog({ id: 'demo', name: 'Demo', codePrefix: 'DEMO', isDemo: true, createdAt: new Date().toISOString() });
    const demoSprints = demoBacklog.sprints || [];
    if (demoSprints.length === 0) {
      throw new Error('El proyecto demo (isDemo, modo JSON) sigue sin exponer sprints: la vista Sprint no tiene nada que mostrar.');
    }
    if (demoSprints.some((s) => typeof s.id !== 'string' || typeof s.name !== 'string')) {
      throw new Error(`Los sprints del demo llegaron mal formados: ${JSON.stringify(demoSprints)}`);
    }
    if (sha256(DEMO_FILE) !== demoHashBefore) {
      throw new Error('La verificación del proyecto demo modificó src/data/demo-backlog.json.');
    }
    steps++; ok(`AC #4 · el proyecto demo expone ${demoSprints.length} sprints (${demoSprints.map((s) => s.name).join(' | ')})`);
  } finally {
    await dispatch('DELETE', '/api/projects/test-fixture-json-sprint');
    if (prevEnvReg !== undefined) {
      process.env.GRIPM_REGISTRY_PATH = prevEnvReg;
    } else {
      delete process.env.GRIPM_REGISTRY_PATH;
    }
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('🎉 DEV-261 (Persistencia de sprints en modo JSON) completamente validado!');
process.exit(0);