#!/usr/bin/env node
/**
 * Test Suite: gripm add CLI command (DEV-329)
 * 
 * Verifica la captura rápida de tareas desde la terminal sin abrir el browser:
 * - Mensaje de ayuda (--help)
 * - Rechazo ante directorio no inicializado (AC #3)
 * - Rechazo ante título vacío o fecha inválida
 * - Creación en storage Markdown y sincronización con BACKLOG.md (AC #1 y #2)
 * - Soporte de todos los flags: prioridad, tipo, fecha de vencimiento, estimación, labels (AC #4)
 * - Creación en storage JSON con salida estructurada --json (AC #1)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BIN_GRIPM = path.join(ROOT_DIR, 'bin', 'gripm.js');

console.log('🧪 Iniciando verificación de captura rápida por CLI gripm add (DEV-329)...\n');

// Helper to run gripm command
function runGripm(args, options = {}) {
  const res = spawnSync(process.execPath, [BIN_GRIPM, ...args], {
    cwd: options.cwd || ROOT_DIR,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...options.env }
  });
  return res;
}

// Helper to create clean temp directory
function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// --- Test 1: Ayuda del comando (gripm add --help) ---
console.log('--- Test 1: Ayuda del comando (gripm add --help) ---');
{
  const res = runGripm(['add', '--help']);
  assert.strictEqual(res.status, 0, 'gripm add --help debe salir con código 0');
  assert.ok(res.stdout.includes('gripm add - Captura rápida de tareas'), 'Debe mostrar descripción del comando');
  assert.ok(res.stdout.includes('--priority'), 'Debe documentar --priority');
  assert.ok(res.stdout.includes('--due'), 'Debe documentar --due');
  assert.ok(res.stdout.includes('--type'), 'Debe documentar --type');
  assert.ok(res.stdout.includes('--labels'), 'Debe documentar --labels');
  console.log('✅ Test 1 aprobado: gripm add --help documenta sintaxis y flags correctamente.\n');
}

// --- Test 2: Validación de título obligatorio ---
console.log('--- Test 2: Validación de título obligatorio ---');
{
  const res = runGripm(['add']);
  assert.strictEqual(res.status, 1, 'gripm add sin argumentos debe fallar con código 1');
  assert.ok(res.stderr.includes('Debes especificar el título de la tarea'), 'Debe emitir mensaje de error de título');
  console.log('✅ Test 2 aprobado: Título obligatorio validado correctamente.\n');
}

// --- Test 3: Directorio no inicializado (AC #3) ---
console.log('--- Test 3: Rechazo accionable en directorio no inicializado (AC #3) ---');
{
  const tempDir = createTempDir('gripm-uninit-');
  try {
    const res = runGripm(['add', 'Tarea no inicializada', '--repo', tempDir]);
    assert.strictEqual(res.status, 1, 'Debe salir con código 1 si el directorio no es un proyecto gripm');
    assert.ok(res.stderr.includes('No se encontró un proyecto de gripm inicializado'), 'Debe indicar que no es proyecto gripm');
    assert.ok(res.stderr.includes("Ejecuta 'gripm --init'"), 'Debe sugerir ejecutar gripm --init como acción correctiva');
    console.log('✅ Test 3 aprobado: Falla con mensaje accionable en proyecto no inicializado.\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- Test 4: Validación de formato de fecha inválida ---
console.log('--- Test 4: Validación de formato de fecha inválida ---');
{
  const tempDir = createTempDir('gripm-date-val-');
  try {
    fs.mkdirSync(path.join(tempDir, 'backlog/tasks'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.gripm'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.gripm/config.json'), JSON.stringify({
      projectName: 'date-test',
      codePrefix: 'DATE'
    }), 'utf8');

    const res = runGripm(['add', 'Tarea fecha rota', '--due', 'fecha-invalida', '--repo', tempDir]);
    assert.strictEqual(res.status, 1, 'Debe fallar ante fecha con formato inválido');
    assert.ok(res.stderr.includes('Formato de fecha inválido para --due'), 'Debe explicar el formato esperado YYYY-MM-DD');
    console.log('✅ Test 4 aprobado: Fecha de vencimiento validada con rigor.\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- Test 5: Creación en storage Markdown y coherencia con backlog:check (AC #1 y #2) ---
console.log('--- Test 5: Creación en Markdown y auto-sincronización con BACKLOG.md (AC #1 y #2) ---');
{
  const tempDir = createTempDir('gripm-md-test-');
  try {
    fs.mkdirSync(path.join(tempDir, 'backlog/tasks'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.gripm'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.gripm/config.json'), JSON.stringify({
      projectName: 'markdown-project',
      projectId: 'markdown-project',
      codePrefix: 'MD',
      language: 'en'
    }), 'utf8');
    fs.writeFileSync(path.join(tempDir, 'BACKLOG.md'), '# Backlog: markdown-project\n', 'utf8');

    const res = runGripm(['add', 'Implementar autenticación token', '--priority', 'high', '--repo', tempDir]);
    assert.strictEqual(res.status, 0, `gripm add falló con status ${res.status}: ${res.stderr}`);
    assert.ok(res.stdout.includes('[MD-001]'), 'Debe generar el ID MD-001');

    // Verificar que el archivo existe en disco
    const taskFiles = fs.readdirSync(path.join(tempDir, 'backlog/tasks'));
    assert.strictEqual(taskFiles.length, 1, 'Debe haber exactamente 1 archivo creado');
    const taskFile = taskFiles[0];
    assert.ok(taskFile.startsWith('MD-001 - '), 'El nombre debe seguir el patrón canónico');

    // Verificar contenido del frontmatter
    const content = fs.readFileSync(path.join(tempDir, 'backlog/tasks', taskFile), 'utf8');
    assert.ok(content.includes('id: MD-001'), 'Frontmatter debe tener id');
    assert.ok(content.includes('title: "Implementar autenticación token"'), 'Frontmatter debe tener título');
    assert.ok(content.includes('status: draft'), 'Estado inicial debe ser draft');
    assert.ok(content.includes('priority: high'), 'Prioridad debe ser high');

    // Verificar que BACKLOG.md se actualizó automáticamente
    const backlogMd = fs.readFileSync(path.join(tempDir, 'BACKLOG.md'), 'utf8');
    assert.ok(backlogMd.includes('[MD-001]'), 'BACKLOG.md debe incluir la tarea creada');

    // Verificar que verify-backlog-sync.js pasa con código 0 sin tocar nada (AC #2)
    const verifyScript = path.join(ROOT_DIR, 'scripts/verify-backlog-sync.js');
    const checkRes = spawnSync(process.execPath, [verifyScript], { cwd: tempDir, encoding: 'utf8' });
    assert.strictEqual(checkRes.status, 0, `verify-backlog-sync.js falló: ${checkRes.stderr}\n${checkRes.stdout}`);
    assert.ok(checkRes.stdout.includes('100% sincronizado'), 'Backlog debe reportar 100% sincronizado');

    console.log('✅ Test 5 aprobado: Tarea Markdown creada y BACKLOG.md 100% sincronizado sin intervenciones.\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- Test 6: Cobertura completa de flags (título, fecha, prioridad, tipo, labels, estimate, sprint) (AC #4) ---
console.log('--- Test 6: Cobertura de flags de tarea (AC #4) ---');
{
  const tempDir = createTempDir('gripm-flags-test-');
  try {
    fs.mkdirSync(path.join(tempDir, 'backlog/tasks'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.gripm'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.gripm/config.json'), JSON.stringify({
      projectName: 'flags-project',
      codePrefix: 'FEAT'
    }), 'utf8');

    const res = runGripm([
      'add',
      'Refactorizar capa de persistencia',
      '--priority', 'urgent',
      '--type', 'bug',
      '--due', '2026-12-31',
      '--estimate', '5',
      '--labels', 'db,performance,v2',
      '--sprint', 'Sprint 4',
      '--description', 'Migración del driver SQLite a memoria',
      '--repo', tempDir
    ]);

    assert.strictEqual(res.status, 0, `Falló creación con flags: ${res.stderr}`);
    const taskFiles = fs.readdirSync(path.join(tempDir, 'backlog/tasks'));
    const content = fs.readFileSync(path.join(tempDir, 'backlog/tasks', taskFiles[0]), 'utf8');

    assert.ok(content.includes('priority: urgent'), 'Debe persistir priority: urgent');
    assert.ok(content.includes('type: bug'), 'Debe persistir type: bug');
    assert.ok(content.includes('due_date: "2026-12-31"'), 'Debe persistir due_date');
    assert.ok(content.includes('estimate: 5'), 'Debe persistir estimate: 5');
    assert.ok(content.includes('- "db"'), 'Debe persistir label db');
    assert.ok(content.includes('- "performance"'), 'Debe persistir label performance');
    assert.ok(content.includes('- "v2"'), 'Debe persistir label v2');
    assert.ok(content.includes('sprint: "Sprint 4"'), 'Debe persistir sprint');
    assert.ok(content.includes('Migración del driver SQLite a memoria'), 'Debe persistir descripción');

    console.log('✅ Test 6 aprobado: Todos los flags persistidos correctamente en frontmatter y cuerpo.\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- Test 7: Creación en storage JSON con salida estructurada --json (AC #1) ---
console.log('--- Test 7: Creación en storage JSON y salida estructurada --json (AC #1) ---');
{
  const tempDir = createTempDir('gripm-json-test-');
  try {
    fs.mkdirSync(path.join(tempDir, '.gripm'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.gripm/config.json'), JSON.stringify({
      projectName: 'json-project',
      projectId: 'json-project',
      codePrefix: 'JSN',
      language: 'en'
    }), 'utf8');
    fs.writeFileSync(path.join(tempDir, '.gripm/backlog.json'), JSON.stringify({
      project: { id: 'json-project', name: 'json-project', storageType: 'json' },
      items: []
    }), 'utf8');

    const res = runGripm([
      'add',
      'Tarea en storage JSON',
      '--priority', 'low',
      '--type', 'chore',
      '--json',
      '--repo', tempDir
    ]);

    assert.strictEqual(res.status, 0, `Falló gripm add --json: ${res.stderr}`);
    const jsonOut = JSON.parse(res.stdout);
    assert.strictEqual(jsonOut.ok, true, 'Salida JSON debe tener ok: true');
    assert.strictEqual(jsonOut.task.title, 'Tarea en storage JSON', 'Título coincide');
    assert.strictEqual(jsonOut.task.type, 'chore', 'Tipo chore coincide');

    const storeContent = JSON.parse(fs.readFileSync(path.join(tempDir, '.gripm/backlog.json'), 'utf8'));
    assert.strictEqual(storeContent.items.length, 1, 'Debe haber 1 ítem en el JSON');
    assert.strictEqual(storeContent.items[0].code, 'JSN-001', 'Código asignado canónico');

    console.log('✅ Test 7 aprobado: Soporte de storage JSON con --json verificado con éxito.\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log('🎉 ¡TODOS LOS 7 TESTS DE "gripm add" PASARON EXITOSAMENTE!');
