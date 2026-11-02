#!/usr/bin/env node

/**
 * scripts/test-audit-service.js
 *
 * Headless test suite for the Unified Static Audit Engine (DEV-353).
 * Verifies LOC scanner, Anti-Slop scanner, test detection, TODO extraction,
 * deterministic scoring, and performance on 500 source files.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { scanCodebase, detectTests, computeHealthScore } from '../server/services/auditService.ts';
import { scanCodebase as scanCodebaseEngine } from './audit-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Iniciando verificación de auditService y audit-engine (DEV-353)...\n');

  // Test 1: Empty repository / edge cases (AC #6)
  console.log('--- Test 1: Repositorio Vacío y Robustez de Scoring (AC #6) ---');
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-empty-'));
  try {
    const report = await scanCodebase(emptyDir);
    assert(report.score === 100, `Score en repo vacío debe ser 100, recibido: ${report.score}`);
    assert(!Number.isNaN(report.score), 'Score no debe ser NaN');
    assert(report.summary.totalFilesScanned === 0, 'No debe haber archivos escaneados');
    assert(report.summary.locViolationsCount === 0, 'No debe haber violaciones de LOC');
    assert(report.summary.suppressionsCount === 0, 'No debe haber supresiones');
    assert(report.summary.todosCount === 0, 'No debe haber TODOs');
    assert(report.tests.detected === false, 'tests.detected debe ser false');
    assert(report.tests.hasTests === false, 'tests.hasTests debe ser false');
    assert(report.tests.framework === null, 'tests.framework debe ser null');
    assert(report.tests.verifyCommand === null, 'tests.verifyCommand debe ser null');
    console.log('✅ Test 1 aprobado: Repositorio vacío manejado sin NaN ni errores.\n');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }

  // Test 2: LOC Budget Scanner (AC #2)
  console.log('--- Test 2: Scanner de Presupuestos de Código LOC (AC #2) ---');
  const locDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-loc-'));
  try {
    // 600 lines file (warning)
    const warnLines = new Array(600).fill('console.log("warn line");').join('\n');
    fs.writeFileSync(path.join(locDir, 'warning-file.js'), warnLines, 'utf8');

    // 1200 lines file (error)
    const errLines = new Array(1200).fill('console.log("error line");').join('\n');
    fs.writeFileSync(path.join(locDir, 'error-file.js'), errLines, 'utf8');

    // Ignored files (node_modules, dist, .git)
    const nodeModulesDir = path.join(locDir, 'node_modules', 'some-pkg');
    fs.mkdirSync(nodeModulesDir, { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'ignored-vendor.js'), errLines, 'utf8');

    const distDir = path.join(locDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'bundle.js'), errLines, 'utf8');

    const gitDir = path.join(locDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'config.js'), errLines, 'utf8');

    const report = await scanCodebase(locDir, { maxLines: 1000, warnLines: 500 });
    assert(report.summary.totalFilesScanned === 2, `Debe escanear 2 archivos (omitiendo node_modules, dist, .git). Escaneó: ${report.summary.totalFilesScanned}`);
    assert(report.loc.violations.length === 2, `Debe reportar 2 violaciones de LOC, reportó: ${report.loc.violations.length}`);

    const errItem = report.loc.violations.find((v) => v.file === 'error-file.js');
    const warnItem = report.loc.violations.find((v) => v.file === 'warning-file.js');

    assert(Boolean(errItem && errItem.status === 'error'), 'error-file.js debe ser marcado como error (>= 1000)');
    assert(Boolean(warnItem && warnItem.status === 'warning'), 'warning-file.js debe ser marcado como warning (>= 500)');
    console.log('✅ Test 2 aprobado: Violaciones de 500 y 1000 líneas detectadas, carpetas ignoradas omitidas.\n');
  } finally {
    fs.rmSync(locDir, { recursive: true, force: true });
  }

  // Test 3: Anti-Slop Scanner for Quality Suppressions (AC #3)
  console.log('--- Test 3: Scanner Anti-Slop / Supresiones de Calidad (AC #3) ---');
  const slopDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-slop-'));
  try {
    const code = [
      '// Line 1: Clean code',
      '// @ts-ignore ignore type error',
      'const a: any = 1;',
      '/* @ts-nocheck full file suppression */',
      '// eslint-disable-next-line no-unused-vars',
      'const b = 2;'
    ].join('\n');
    fs.writeFileSync(path.join(slopDir, 'slop.ts'), code, 'utf8');

    const report = await scanCodebase(slopDir);
    assert(report.quality.suppressions.length === 3, `Debe detectar 3 supresiones, detectó: ${report.quality.suppressions.length}`);

    const tsIgnore = report.quality.suppressions.find((s) => s.type === '@ts-ignore');
    const tsNocheck = report.quality.suppressions.find((s) => s.type === '@ts-nocheck');
    const eslintDisable = report.quality.suppressions.find((s) => s.type === 'eslint-disable');

    assert(Boolean(tsIgnore && tsIgnore.line === 2), `@ts-ignore debe estar en la línea 2, obtenido: ${tsIgnore?.line}`);
    assert(Boolean(tsNocheck && tsNocheck.line === 4), `@ts-nocheck debe estar en la línea 4, obtenido: ${tsNocheck?.line}`);
    assert(Boolean(eslintDisable && eslintDisable.line === 5), `eslint-disable debe estar en la línea 5, obtenido: ${eslintDisable?.line}`);
    console.log('✅ Test 3 aprobado: Supresiones @ts-ignore, @ts-nocheck y eslint-disable reportadas con líneas exactas.\n');
  } finally {
    fs.rmSync(slopDir, { recursive: true, force: true });
  }

  // Test 4: Test Infrastructure Detection (AC #4)
  console.log('--- Test 4: Detector de Infraestructura de Pruebas (AC #4) ---');
  // 4a: Vitest project
  const vitestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-vitest-'));
  try {
    fs.writeFileSync(path.join(vitestDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest run' }
    }), 'utf8');
    const vitestInfo = detectTests(vitestDir);
    assert(vitestInfo.detected === true, 'Vitest debe ser detectado');
    assert(vitestInfo.framework === 'vitest', `Framework debe ser vitest, obtenido: ${vitestInfo.framework}`);
    assert(vitestInfo.verifyCommand === 'npm test', `verifyCommand debe ser npm test, obtenido: ${vitestInfo.verifyCommand}`);
  } finally {
    fs.rmSync(vitestDir, { recursive: true, force: true });
  }

  // 4b: Jest project
  const jestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-jest-'));
  try {
    fs.writeFileSync(path.join(jestDir, 'jest.config.js'), 'module.exports = {};', 'utf8');
    const jestInfo = detectTests(jestDir);
    assert(jestInfo.detected === true, 'Jest debe ser detectado vía jest.config.js');
    assert(jestInfo.framework === 'jest', `Framework debe ser jest, obtenido: ${jestInfo.framework}`);
    assert(jestInfo.verifyCommand === 'npx jest', `verifyCommand debe ser npx jest, obtenido: ${jestInfo.verifyCommand}`);
  } finally {
    fs.rmSync(jestDir, { recursive: true, force: true });
  }

  // 4c: node:test project
  const nodeTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-nodetest-'));
  try {
    fs.writeFileSync(path.join(nodeTestDir, 'package.json'), JSON.stringify({
      scripts: { test: 'node --test' }
    }), 'utf8');
    const nodeTestInfo = detectTests(nodeTestDir);
    assert(nodeTestInfo.detected === true, 'node:test debe ser detectado vía package.json scripts');
    assert(nodeTestInfo.framework === 'node:test', `Framework debe ser node:test, obtenido: ${nodeTestInfo.framework}`);
    assert(nodeTestInfo.verifyCommand === 'npm test', `verifyCommand debe ser npm test, obtenido: ${nodeTestInfo.verifyCommand}`);
  } finally {
    fs.rmSync(nodeTestDir, { recursive: true, force: true });
  }

  // 4d: pytest project
  const pytestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-pytest-'));
  try {
    fs.writeFileSync(path.join(pytestDir, 'pytest.ini'), '[pytest]', 'utf8');
    const pytestInfo = detectTests(pytestDir);
    assert(pytestInfo.detected === true, 'pytest debe ser detectado vía pytest.ini');
    assert(pytestInfo.framework === 'pytest', `Framework debe ser pytest, obtenido: ${pytestInfo.framework}`);
    assert(pytestInfo.verifyCommand === 'pytest', `verifyCommand debe ser pytest, obtenido: ${pytestInfo.verifyCommand}`);
  } finally {
    fs.rmSync(pytestDir, { recursive: true, force: true });
  }
  console.log('✅ Test 4 aprobado: Identificación precisa de vitest, jest, node:test y pytest con verifyCommand.\n');

  // Test 5: Hidden Debt / TODOs Scanner (AC #5)
  console.log('--- Test 5: Scanner de Deuda Oculta (TODOs / FIXMEs / HACKs / BUGs) (AC #5) ---');
  const todoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-todos-'));
  try {
    const code = [
      '// Line 1',
      '// TODO: implement caching strategy',
      '// Line 3',
      '// FIXME: memory leak in unmount listener',
      '// Line 5',
      '/* HACK: bypass sandbox check */',
      '// Line 7',
      '// BUG: crash when input is null'
    ].join('\n');
    fs.writeFileSync(path.join(todoDir, 'tasks.js'), code, 'utf8');

    const report = await scanCodebase(todoDir);
    assert(report.todos.length === 4, `Debe extraer 4 comentarios de deuda, extrajo: ${report.todos.length}`);

    const todo = report.todos.find((t) => t.type === 'TODO');
    const fixme = report.todos.find((t) => t.type === 'FIXME');
    const hack = report.todos.find((t) => t.type === 'HACK');
    const bug = report.todos.find((t) => t.type === 'BUG');

    assert(Boolean(todo && todo.line === 2 && todo.text.includes('implement caching strategy')), 'TODO verificado');
    assert(Boolean(fixme && fixme.line === 4 && fixme.text.includes('memory leak')), 'FIXME verificado');
    assert(Boolean(hack && hack.line === 6 && hack.text.includes('bypass sandbox check')), 'HACK verificado');
    assert(Boolean(bug && bug.line === 8 && bug.text.includes('crash when input is null')), 'BUG verificado');
    console.log('✅ Test 5 aprobado: Marcadores TODO, FIXME, HACK y BUG extraídos con línea, tipo y texto.\n');
  } finally {
    fs.rmSync(todoDir, { recursive: true, force: true });
  }

  // Test 6: Deterministic Health Score (AC #6)
  console.log('--- Test 6: Cálculo de Health Score Determinista (AC #6) ---');
  const cleanScore = computeHealthScore({
    totalFilesScanned: 10,
    locViolations: [],
    suppressions: [],
    todos: [],
    tests: { detected: true, hasTests: true }
  });
  assert(cleanScore === 100, `Score sin defectos debe ser 100, obtenido: ${cleanScore}`);

  const degradedScore = computeHealthScore({
    totalFilesScanned: 10,
    locViolations: [{ status: 'error' }, { status: 'warning' }],
    suppressions: [{ type: '@ts-ignore' }],
    todos: [{ type: 'BUG' }],
    tests: { detected: false, hasTests: false }
  });
  // 100 - 10 (err) - 3 (warn) - 5 (suppression) - 3 (bug) - 15 (no tests) = 64
  assert(degradedScore === 64, `Score degradado debe ser 64, obtenido: ${degradedScore}`);
  assert(degradedScore >= 0 && degradedScore <= 100, 'Score debe permanecer en el rango [0, 100]');
  console.log('✅ Test 6 aprobado: Score determinista y ponderado según penalizaciones de salud.\n');

  // Test 7: Performance Benchmark on 500 Source Files (AC #7)
  console.log('--- Test 7: Rendimiento sobre 500 Archivos Fuente (< 2000 ms) (AC #7) ---');
  const benchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-bench-'));
  try {
    const fileContent = [
      '// Sample source file',
      'export function calculate(a: number, b: number): number {',
      '  return a + b;',
      '}',
      '// TODO: optimize multiplication'
    ].join('\n');

    for (let i = 0; i < 500; i++) {
      fs.writeFileSync(path.join(benchDir, `module_${i}.ts`), fileContent, 'utf8');
    }

    const t0 = performance.now();
    const benchReport = await scanCodebase(benchDir);
    const duration = performance.now() - t0;

    console.log(`  Archivos escaneados: ${benchReport.summary.totalFilesScanned}`);
    console.log(`  Duración del análisis: ${duration.toFixed(2)} ms`);
    assert(benchReport.summary.totalFilesScanned === 500, `Debe escanear exactamente 500 archivos, escaneó: ${benchReport.summary.totalFilesScanned}`);
    assert(duration < 2000, `El escaneo de 500 archivos debe tardar menos de 2000 ms, tardó: ${duration.toFixed(2)} ms`);
    console.log('✅ Test 7 aprobado: Escaneo de 500 archivos completado holgadamente bajo el presupuesto de 2000 ms.\n');
  } finally {
    fs.rmSync(benchDir, { recursive: true, force: true });
  }

  // Test 8: Script and Service Parity (AC #1)
  console.log('--- Test 8: Paridad entre auditService.ts y audit-engine.mjs (AC #1) ---');
  const parityDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-parity-'));
  try {
    fs.writeFileSync(path.join(parityDir, 'sample.ts'), '// @ts-ignore\nconst x = 1;\n// TODO: clean up', 'utf8');
    const r1 = await scanCodebase(parityDir);
    const r2 = await scanCodebaseEngine(parityDir);

    assert(r1.score === r2.score, 'Los scores deben coincidir');
    assert(r1.summary.totalFilesScanned === r2.summary.totalFilesScanned, 'Total de archivos debe coincidir');
    assert(r1.quality.suppressions.length === r2.quality.suppressions.length, 'Supresiones deben coincidir');
    assert(r1.todos.length === r2.todos.length, 'TODOs deben coincidir');
    console.log('✅ Test 8 aprobado: auditService.ts y audit-engine.mjs producen resultados idénticos.\n');
  } finally {
    fs.rmSync(parityDir, { recursive: true, force: true });
  }

  console.log('🎉 Todos los tests de auditService y audit-engine (DEV-353) fueron completados con éxito.');
}

runTests().catch((err) => {
  console.error('❌ Error no controlado en la suite de pruebas:', err);
  process.exit(1);
});
