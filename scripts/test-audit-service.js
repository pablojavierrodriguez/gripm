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
      '// ' + '@ts-ignore ignore type error',
      'const a: any = 1;',
      '/* ' + '@ts-nocheck full file suppression */',
      '// ' + 'eslint-disable-next-line no-unused-vars',
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
      '// ' + 'TODO: implement caching strategy',
      '// Line 3',
      '// ' + 'FIXME: memory leak in unmount listener',
      '// Line 5',
      '/* ' + 'HACK: bypass sandbox check */',
      '// Line 7',
      '// ' + 'BUG: crash when input is null'
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
    fs.writeFileSync(path.join(parityDir, 'sample.ts'), '// ' + '@ts-ignore\nconst x = 1;\n// ' + 'TODO: clean up', 'utf8');
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

  // Test 9: Config resolution with .gripm/config.json (DEV-359 AC #1 & AC #2)
  console.log('--- Test 9: Resolución de Configuración y Fallback (.gripm/config.json) (DEV-359 AC #1 y AC #2) ---');
  const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-cfg-'));
  try {
    const gripmDir = path.join(cfgDir, '.gripm');
    fs.mkdirSync(gripmDir, { recursive: true });

    const sampleConfig = {
      audit: {
        rules: {
          loc: false,
          suppressions: true,
          debtMarkers: false,
          consoleLog: true,
          testRunner: false
        },
        thresholds: {
          maxLines: 800,
          warnLines: 400
        },
        exclude: ['ignored-folder/**', 'fixtures/*']
      }
    };
    fs.writeFileSync(path.join(gripmDir, 'config.json'), JSON.stringify(sampleConfig, null, 2), 'utf8');

    // Create a 500-line file that would normally violate warnLines (500) or test runner penalty
    const lines = new Array(500).fill('console.log("active console");').join('\n');
    fs.writeFileSync(path.join(cfgDir, 'test-file.js'), lines, 'utf8');

    const report = await scanCodebase(cfgDir);
    assert(report.rules.loc === false, 'rules.loc debe ser false según config');
    assert(report.rules.debtMarkers === false, 'rules.debtMarkers debe ser false según config');
    assert(report.rules.consoleLog === true, 'rules.consoleLog debe ser true según config');
    assert(report.rules.testRunner === false, 'rules.testRunner debe ser false según config');
    assert(report.loc.maxLines === 800, 'loc.maxLines debe ser 800 según thresholds');
    assert(report.loc.warnLines === 400, 'loc.warnLines debe ser 400 según thresholds');
    assert(report.loc.violations.length === 0, 'No debe haber violaciones de LOC porque rules.loc=false');
    assert(report.quality.suppressions.length > 0, 'console.log debe reportarse como supresión cuando consoleLog=true');
    console.log('✅ Test 9 aprobado: Configuración resuelta desde .gripm/config.json con reglas y umbrales.\n');
  } finally {
    fs.rmSync(cfgDir, { recursive: true, force: true });
  }

  // Test 10: Granular Rule Toggles & Health Score Impact (DEV-359 AC #3)
  console.log('--- Test 10: Toggles de Reglas y Omisión de Penalizaciones en Score (DEV-359 AC #3) ---');
  const toggleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-toggle-'));
  try {
    // 1200 lines file with slop and todos, without test runner
    const lines = [
      '// ' + '@ts-ignore',
      '// ' + 'BUG: memory leak',
      ...new Array(1200).fill('const dummy = 1;')
    ].join('\n');
    fs.writeFileSync(path.join(toggleDir, 'heavy.ts'), lines, 'utf8');

    // Baseline: with all rules active, score is penalized (100 - 10 LOC - 5 supp - 3 bug - 15 tests = 67)
    const baseReport = await scanCodebase(toggleDir);
    assert(baseReport.score <= 70, `Score base debe ser <=70, obtenido: ${baseReport.score}`);
    assert(baseReport.loc.violations.length > 0, 'Debe haber violaciones de LOC');
    assert(baseReport.quality.suppressions.length > 0, 'Debe haber supresiones');
    assert(baseReport.todos.length > 0, 'Debe haber TODOs');

    // Scanned with all rules disabled: score must be 100 and findings must be empty
    const relaxedReport = await scanCodebase(toggleDir, {
      rules: {
        loc: false,
        suppressions: false,
        debtMarkers: false,
        testRunner: false
      }
    });
    assert(relaxedReport.score === 100, `Score relajado debe ser 100 al desactivar reglas, obtenido: ${relaxedReport.score}`);
    assert(relaxedReport.loc.violations.length === 0, 'Violaciones de LOC deben estar vacías');
    assert(relaxedReport.quality.suppressions.length === 0, 'Supresiones deben estar vacías');
    assert(relaxedReport.todos.length === 0, 'TODOs deben estar vacíos');
    console.log('✅ Test 10 aprobado: Desactivar reglas omite penalizaciones y vacía hallazgos.\n');
  } finally {
    fs.rmSync(toggleDir, { recursive: true, force: true });
  }

  // Test 11: Thresholds Customization (DEV-359 AC #1 y AC #2)
  console.log('--- Test 11: Personalización de Umbrales de Líneas (DEV-359 AC #1 y AC #2) ---');
  const threshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-thresh-'));
  try {
    const lines150 = new Array(150).fill('const x = 1;').join('\n');
    fs.writeFileSync(path.join(threshDir, 'mod.ts'), lines150, 'utf8');

    // Default thresholds (1000/500): 150 lines is clean
    const defaultRep = await scanCodebase(threshDir);
    assert(defaultRep.loc.violations.length === 0, '150 líneas no debe violar umbral predeterminado');

    // Custom thresholds: max 200, warn 100 -> 150 lines is a warning
    const customRep = await scanCodebase(threshDir, {
      thresholds: { maxLines: 200, warnLines: 100 }
    });
    assert(customRep.loc.violations.length === 1, '150 líneas debe ser advertencia con warnLines=100');
    assert(customRep.loc.violations[0].status === 'warning', 'Estado debe ser warning');
    console.log('✅ Test 11 aprobado: Umbrales personalizados aplicados correctamente.\n');
  } finally {
    fs.rmSync(threshDir, { recursive: true, force: true });
  }

  // Test 12: Audit Exclude Patterns (DEV-359 AC #4)
  console.log('--- Test 12: Patrones de Exclusión audit.exclude (DEV-359 AC #4) ---');
  const exclDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-audit-excl-'));
  try {
    const fixtureDir = path.join(exclDir, 'test-fixtures');
    fs.mkdirSync(fixtureDir, { recursive: true });

    // Fixture file with suppressions and 1200 lines
    const fixtureContent = [
      '// ' + '@ts-ignore test fixture',
      ...new Array(1200).fill('const a = 1;')
    ].join('\n');
    fs.writeFileSync(path.join(fixtureDir, 'fixture.ts'), fixtureContent, 'utf8');

    // Clean source file
    fs.writeFileSync(path.join(exclDir, 'index.ts'), 'export const ready = true;\n', 'utf8');

    // Without exclude: fixture is scanned and penalizes
    const repWith = await scanCodebase(exclDir);
    assert(repWith.summary.totalFilesScanned === 2, 'Debe escanear 2 archivos sin exclusiones');
    assert(repWith.quality.suppressions.length === 1, 'Debe detectar supresión en fixture');

    // With audit.exclude: fixture is completely isolated
    const repExcl = await scanCodebase(exclDir, {
      exclude: ['test-fixtures/**']
    });
    assert(repExcl.summary.totalFilesScanned === 1, `Debe escanear solo 1 archivo con exclusión, escaneó: ${repExcl.summary.totalFilesScanned}`);
    assert(repExcl.quality.suppressions.length === 0, 'Supresiones en fixture deben ser ignoradas');
    assert(repExcl.loc.violations.length === 0, 'Violaciones de LOC en fixture deben ser ignoradas');
    console.log('✅ Test 12 aprobado: audit.exclude aísla fixtures y carpetas de prueba con precisión.\n');
  } finally {
    fs.rmSync(exclDir, { recursive: true, force: true });
  }

  console.log('🎉 Todos los tests de auditService y audit-engine (DEV-353) fueron completados con éxito.');
}

runTests().catch((err) => {
  console.error('❌ Error no controlado en la suite de pruebas:', err);
  process.exit(1);
});
