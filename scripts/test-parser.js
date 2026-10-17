import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseBacklogMd,
  serializeBacklogMd,
  normalizeStatus,
  normalizePriority,
  formatStatusForMd,
  formatPriorityForMd,
  generateTaskFilename,
  generateMonolithicBacklogMd,
  parseInlineList,
  extractSectionBlock
} from './backlogMdParser.ts';

console.log('Testing backlogMdParser...');

// 1. Status normalization
assert.strictEqual(normalizeStatus('Draft'), 'draft');
assert.strictEqual(normalizeStatus('ideas'), 'ideas');
assert.strictEqual(normalizeStatus('Idea'), 'ideas');
assert.strictEqual(normalizeStatus('Discovery'), 'ideas');
assert.strictEqual(normalizeStatus('backlog'), 'draft');
assert.strictEqual(normalizeStatus('To Do'), 'draft');
assert.strictEqual(normalizeStatus('in_progress'), 'doing');
assert.strictEqual(normalizeStatus('In Progress'), 'doing');
assert.strictEqual(normalizeStatus('doing'), 'doing');
assert.strictEqual(normalizeStatus('testing_qa'), 'review');
assert.strictEqual(normalizeStatus('Testing'), 'review');
assert.strictEqual(normalizeStatus('Review'), 'review');
assert.strictEqual(normalizeStatus('finish'), 'ready');
assert.strictEqual(normalizeStatus('Ready for deploy'), 'ready');
assert.strictEqual(normalizeStatus('ready'), 'ready');
assert.strictEqual(normalizeStatus('Done'), 'done');
assert.strictEqual(normalizeStatus('deployed'), 'done');
assert.strictEqual(normalizeStatus('dismissed'), 'dismissed');
assert.strictEqual(normalizeStatus('cancelled'), 'dismissed');
assert.strictEqual(normalizeStatus('blocked'), 'blocked');
assert.strictEqual(normalizeStatus('impediment'), 'blocked');
assert.strictEqual(normalizeStatus('Blocked'), 'blocked');

// DEV-134: serializeBacklogMd canonicalizes uppercase status variants to lowercase
const uppercaseStatusVariants = [
  { input: 'Done', expected: 'done' },
  { input: 'Draft', expected: 'draft' },
  { input: 'In Progress', expected: 'doing' },
  { input: 'Ready', expected: 'ready' },
  { input: 'Testing', expected: 'review' },
  { input: 'Review', expected: 'review' },
  { input: 'Blocked', expected: 'blocked' },
  { input: 'Dismissed', expected: 'dismissed' }
];

for (const variant of uppercaseStatusVariants) {
  const serialized = serializeBacklogMd({
    id: 'DEV-TEST',
    title: 'Test status canonicalization',
    status: variant.input
  });
  assert.ok(
    serialized.includes(`status: ${variant.expected}`),
    `serializeBacklogMd must format status '${variant.input}' as canonical '${variant.expected}'`
  );

  const reparsed = parseBacklogMd(serialized);
  assert.strictEqual(
    reparsed.status,
    variant.expected,
    `Round-trip re-parsing must preserve canonical status '${variant.expected}'`
  );
}

console.log('✅ Status normalization & DEV-134 canonicalization passed');

// 2. Sample real task parsing
const sampleMd = `---
id: BACK-355
title: 'Add task type field (bug, feature, enhancement, etc.)'
status: Done
assignee:
  - '@codex'
created_date: '2026-01-01 23:37'
updated_date: '2026-07-17 06:33'
labels:
  - enhancement
  - core
dependencies: []
priority: medium
milestone: 'Sprint 2'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a mutually exclusive 'type' field to tasks that categorizes them semantically.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Task types are configurable per-project
- [ ] #2 CLI task create supports type flag
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify child records.
2. Run focused tests.
<!-- SECTION:PLAN:END -->
`;

const parsed = parseBacklogMd(sampleMd);
assert.strictEqual(parsed.id, 'BACK-355');
assert.strictEqual(parsed.title, 'Add task type field (bug, feature, enhancement, etc.)');
assert.strictEqual(parsed.status, 'done');
assert.strictEqual(parsed.priority, 'medium');
assert.strictEqual(parsed.milestone, 'Sprint 2');
assert.strictEqual(parsed.assignees?.[0], '@codex');
assert.strictEqual(parsed.labels?.length, 2);
assert.strictEqual(parsed.acceptanceCriteria?.length, 2);
assert.strictEqual(parsed.acceptanceCriteria?.[0].checked, true);
assert.strictEqual(parsed.acceptanceCriteria?.[0].index, 1);
assert.strictEqual(parsed.acceptanceCriteria?.[1].checked, false);
assert.strictEqual(parsed.acceptanceCriteria?.[1].index, 2);
assert.ok(parsed.description?.includes('Add a mutually exclusive'));
assert.ok(parsed.implementationPlan?.includes('1. Verify child records'));

console.log('✅ Backlog.md parsing passed');

// 3. Serialization round-trip
const serialized = serializeBacklogMd(parsed);
const reparsed = parseBacklogMd(serialized);
assert.strictEqual(reparsed.id, parsed.id);
assert.strictEqual(reparsed.title, parsed.title);
assert.strictEqual(reparsed.status, parsed.status);
assert.strictEqual(reparsed.acceptanceCriteria?.length, 2);
assert.strictEqual(reparsed.acceptanceCriteria?.[0].checked, true);
assert.strictEqual(reparsed.acceptanceCriteria?.[1].checked, false);

console.log('✅ Serialization round-trip passed');

// 3.1. Priority lossless round-trip (DEV-044)
for (const p of ['p0', 'p1', 'p2', 'p3']) {
  const formatted = formatPriorityForMd(p);
  const restored = normalizePriority(formatted);
  assert.strictEqual(restored, p, `Priority ${p} must round-trip through Markdown (${formatted}) -> ${restored}`);
}
console.log('✅ Priority lossless round-trip (p0, p1, p2, p3) passed');

// 4. Filename generation (Canonical Backlog.md uppercase ID and clean title preserving casing and spaces)
assert.strictEqual(
  generateTaskFilename('BACK-355', 'Add task type field'),
  'BACK-355 - Add task type field.md'
);
assert.strictEqual(
  generateTaskFilename('dom-spec-001', 'SPEC-001 Arquitectura de Persistencia Real & Sincronización con Supabase'),
  'DOM-SPEC-001 - SPEC-001 Arquitectura de Persistencia Real & Sincronización con Supabase.md'
);
console.log('✅ Filename generation passed');

// 4.1. Status formatting for Markdown (Strictly lowercase, first-class ideas status)
assert.strictEqual(formatStatusForMd('ideas'), 'ideas');
assert.strictEqual(formatStatusForMd('Ideas'), 'ideas');
assert.strictEqual(formatStatusForMd('draft'), 'draft');
assert.strictEqual(formatStatusForMd('doing'), 'doing');
assert.strictEqual(formatStatusForMd('In Progress'), 'doing');
assert.strictEqual(formatStatusForMd('review'), 'review');
assert.strictEqual(formatStatusForMd('ready'), 'ready');
assert.strictEqual(formatStatusForMd('done'), 'done');
assert.strictEqual(formatStatusForMd('blocked'), 'blocked');
assert.strictEqual(formatStatusForMd('Blocked'), 'blocked');
assert.strictEqual(formatStatusForMd('dismissed'), 'dismissed');
console.log('✅ Lowercase status formatting passed');

// 4.2. DEV-312: blocked_reason and dismissed_reason round-trip
const blockedTaskMd = `---
id: DEV-999
title: 'Blocked task with reason'
status: blocked
blocked_reason: 'Waiting on external API credentials'
---

## Description
Task blocked.
`;

const parsedBlocked = parseBacklogMd(blockedTaskMd);
assert.strictEqual(parsedBlocked.status, 'blocked');
assert.strictEqual(parsedBlocked.blockedReason, 'Waiting on external API credentials');

const serializedBlocked = serializeBacklogMd(parsedBlocked);
assert.ok(serializedBlocked.includes('blocked_reason: "Waiting on external API credentials"'));
const reparsedBlocked = parseBacklogMd(serializedBlocked);
assert.strictEqual(reparsedBlocked.status, 'blocked');
assert.strictEqual(reparsedBlocked.blockedReason, 'Waiting on external API credentials');

const dismissedTaskMd = `---
id: DEV-998
title: 'Dismissed task with reason'
status: dismissed
dismissed_reason: 'Obsolete due to architectural change'
---

## Description
Task dismissed.
`;

const parsedDismissed = parseBacklogMd(dismissedTaskMd);
assert.strictEqual(parsedDismissed.status, 'dismissed');
assert.strictEqual(parsedDismissed.dismissedReason, 'Obsolete due to architectural change');

const serializedDismissed = serializeBacklogMd(parsedDismissed);
assert.ok(serializedDismissed.includes('dismissed_reason: "Obsolete due to architectural change"'));
const reparsedDismissed = parseBacklogMd(serializedDismissed);
assert.strictEqual(reparsedDismissed.status, 'dismissed');
assert.strictEqual(reparsedDismissed.dismissedReason, 'Obsolete due to architectural change');

console.log('✅ DEV-312: blocked_reason and dismissed_reason round-trip passed');

// 5. Monolithic export
const monolithic = generateMonolithicBacklogMd('Test Project', [parsed]);
assert.ok(monolithic.includes('# Backlog: Test Project'));
assert.ok(monolithic.includes('Add task type field'));
console.log('✅ Monolithic export passed');

// 6. DEV-116: Port collision detection & multi-stack resolution
const { isPortAvailable, findAvailablePort } = await import('./portUtils.js');
const net = await import('node:net');

const tempServer = net.createServer();
await new Promise((resolve) => tempServer.listen(0, '127.0.0.1', resolve));
const allocatedPort = tempServer.address().port;

// Port should be reported as unavailable while bound
const isAvailWhileBound = await isPortAvailable(allocatedPort);
assert.strictEqual(isAvailWhileBound, false, 'Port should be unavailable while server is listening');

// Next available port should skip the allocated port
const nextPort = await findAvailablePort(allocatedPort, 'localhost');
assert.ok(nextPort > allocatedPort, `findAvailablePort should increment from occupied port ${allocatedPort}`);

// Close server
await new Promise((resolve) => tempServer.close(resolve));
const isAvailAfterClose = await isPortAvailable(allocatedPort);
assert.strictEqual(isAvailAfterClose, true, 'Port should be available after server closes');

console.log('✅ DEV-116: Multi-stack port availability and auto-increment verified');

// 7. DEV-117: Canonical project identity resolution
const { resolveProjectIdentity } = await import('./registryConfig.js');
const os = await import('node:os');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-id-test-m3-'));
try {
  // Case A: Pure folder fallback
  const resFallback = resolveProjectIdentity(tempDir);
  assert.strictEqual(resFallback.name, path.basename(tempDir));
  assert.strictEqual(resFallback.id, path.basename(tempDir).toLowerCase().replace(/[^a-z0-9_-]/g, '-'));

  // Case B: package.json name takes precedence over folder
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: '@acme/dom-engine' }), 'utf8');
  const resPkg = resolveProjectIdentity(tempDir);
  assert.strictEqual(resPkg.name, '@acme/dom-engine');
  assert.strictEqual(resPkg.id, 'dom-engine');
  assert.strictEqual(resPkg.codePrefix, 'DOME');

  // Case C: .gripm/config.json projectName takes top precedence
  fs.mkdirSync(path.join(tempDir, '.gripm'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, '.gripm', 'config.json'), JSON.stringify({ projectName: 'DOM', codePrefix: 'DOM' }), 'utf8');
  const resCfg = resolveProjectIdentity(tempDir);
  assert.strictEqual(resCfg.name, 'DOM');
  assert.strictEqual(resCfg.id, 'dom');
  assert.strictEqual(resCfg.codePrefix, 'DOM');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
console.log('✅ DEV-117: Canonical project identity resolution & priority verified');

// 6. DEV-101 / DEV-173: el auditor estatico debe detectar realmente los
// anti-patrones, y los invariantes del proyecto deben estar cubiertos por tests.
//
// Un linter que no reporta nada tambien "pasa" cuando no mira nada. Estos checks
// verifican comportamiento observable, no la existencia de simbolos internos del
// auditor: cuando gripm dejo de bifurcarlo (DEV-188), verificar ENV_GUTTER en el
// fuente dejo de tener sentido porque ese simbolo ya no existe aca. Un test que ata
// a la forma del motor rompe con cada refactor upstream sin proteger nada.
{
  const ROOT_DIR = path.resolve(process.cwd());
  const auditorPath = path.join(ROOT_DIR, 'scripts', 'audit-ux-code.cjs');

  // 6.1 El invariante de gutter de scrollbar (ENV-001) es un contrato sobre
  //     src/index.css, no una firma de JSX. El auditor no escanea CSS, asi que su
  //     cobertura vive aca y no en el motor.
  const cssNow = fs.readFileSync(path.join(ROOT_DIR, 'src', 'index.css'), 'utf8');
  const htmlBlock = cssNow.match(/(^|[,\s}])html\s*\{([\s\S]*?)\}/);
  assert.ok(htmlBlock, 'DEV-101: debe existir un bloque "html { }" en index.css');
  assert.ok(htmlBlock[2].includes('overflow-y: scroll'), 'DEV-101: html debe declarar overflow-y: scroll');
  assert.ok(htmlBlock[2].includes('scrollbar-gutter: stable'), 'DEV-101: html debe declarar scrollbar-gutter: stable');

  // 6.2 La convencion truncate en dialogos (ENV-002) tampoco es una firma del
  //     catalogo: es una convencion de diseno. Se verifica contra el codigo real,
  //     aceptando las supresiones justificadas que el propio motor documenta.
  const modalDir = path.join(ROOT_DIR, 'src', 'components');
  const truncateOffenders = [];
  for (const file of fs.readdirSync(modalDir)) {
    if (!/Modal|Dialog/.test(file)) continue;
    const lines = fs.readFileSync(path.join(modalDir, file), 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (!/\btruncate\b/.test(line)) return;
      const window = lines.slice(Math.max(0, index - 1), index + 1).join(' ');
      if (window.includes('audit-ux:allow-')) return;
      truncateOffenders.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(
    truncateOffenders,
    [],
    `ENV-002: "truncate" en dialogos sin justificar en ${truncateOffenders.join(', ')}`,
  );

  // 6.3 El motor expone su API publica, asi que un consumidor puede componer sobre
  //     el. Es lo que permitio dejar de bifurcarlo.
  const auditorSrc = fs.readFileSync(auditorPath, 'utf8');
  assert.ok(
    /module\.exports\s*=\s*\{[\s\S]*auditProject/.test(auditorSrc),
    'DEV-188: el auditor debe exponer una API publica (auditProject)',
  );
  assert.ok(
    /require\.main\s*===\s*module/.test(auditorSrc),
    'DEV-188: importar el modulo no debe disparar el CLI como efecto secundario',
  );
}
console.log('✅ DEV-101: gutter de scrollbar, convención truncate en diálogos y API pública del auditor verificados');

// 5. DEV-127: El serializador NUNCA debe fabricar contenido que el usuario no escribió.
//
// Regresión: antes, una tarea creada con sólo el título hacía que el parser escribiera
// "Sin descripción detallada.", un AC de relleno y un plan genérico de 3 pasos.
// Eso contaminaba el .md (fuente de verdad versionada en git) y además
// desactivaba el Plan Guard, que detecta "tiene plan o ACs" para bloquear el
// paso a Doing. Con esos defaults, el guard no podía dispararse nunca.
{
  const minimalTask = {
    id: 'TEST-001',
    title: 'Pruebaa',
    status: 'draft',
    priority: 'medium',
    type: 'feature',
    created_date: '2026-09-29',
    updated_date: '2026-09-29'
  };

  const written = serializeBacklogMd(minimalTask);

  // 5.1 Ninguna de las tres cadenas prefabricadas puede aparecer en el archivo.
  assert.ok(
    !written.includes('Sin descripción detallada.'),
    'DEV-127: el serializador no debe inyectar una descripción de relleno'
  );
  assert.ok(
    !written.includes('Criterio de aceptación inicial definido'),
    'DEV-127: el serializador no debe inyectar un AC de relleno'
  );
  assert.ok(
    !written.includes('Investigar archivos afectados'),
    'DEV-127: el serializador no debe inyectar un plan genérico'
  );

  // 5.2 Los marcadores de sección se conservan aunque el contenido esté vacío.
  assert.ok(written.includes('<!-- SECTION:DESCRIPTION:BEGIN -->'), 'DEV-127: falta el marcador de descripción');
  assert.ok(written.includes('<!-- SECTION:DESCRIPTION:END -->'), 'DEV-127: falta el cierre de descripción');
  assert.ok(written.includes('<!-- AC:BEGIN -->'), 'DEV-127: falta el marcador de AC');
  assert.ok(written.includes('<!-- AC:END -->'), 'DEV-127: falta el cierre de AC');
  assert.ok(written.includes('<!-- SECTION:PLAN:BEGIN -->'), 'DEV-127: falta el marcador de plan');
  assert.ok(written.includes('<!-- SECTION:PLAN:END -->'), 'DEV-127: falta el cierre de plan');

  // 5.3 Round-trip: releer el archivo vacío NO debe resucitar contenido fantasma.
  const reread = parseBacklogMd(written);
  assert.strictEqual(reread.acceptanceCriteria?.length ?? 0, 0, 'DEV-127: un AC vacío no debe parsearse como AC real');
  assert.strictEqual((reread.implementationPlan ?? '').trim(), '', 'DEV-127: un plan vacío no debe parsearse como plan real');
  assert.strictEqual((reread.description ?? '').trim(), '', 'DEV-127: una descripción vacía no debe parsearse como descripción');

  // 5.4 El write path sigue funcionando normal: un ítem especificado no se toca.
  const richTask = {
    ...minimalTask,
    description: 'Descripción redactada por el autor.',
    acceptanceCriteria: [{ index: 1, text: 'Criterio real.', checked: false }],
    implementationPlan: '1. Hacer algo concreto.'
  };
  const richWritten = serializeBacklogMd(richTask);
  assert.ok(richWritten.includes('Descripción redactada por el autor.'), 'DEV-127: se perdió la descripción real');
  assert.ok(richWritten.includes('- [ ] #1 Criterio real.'), 'DEV-127: se perdió el AC real');
  assert.ok(richWritten.includes('1. Hacer algo concreto.'), 'DEV-127: se perdió el plan real');
  assert.ok(!richWritten.includes('Sin descripción detallada.'), 'DEV-127: no debe aparecer relleno cuando hay contenido real');
}
console.log('✅ DEV-127: Serializer no longer fabricates placeholder description/ACs/plan');

// 7. DEV-135: el motor de importacion no puede tener un proyecto embebido.
//
// Regresion: `runMigration` tenia el literal `DOM` en la generacion de codigos y
// `projectId: 'dom'` en cuatro sitios, de modo que el `codePrefix` que declara el
// proyecto se ignoraba por completo y todo proyecto importado recibia codigos con
// el prefijo del proyecto original del desarrollador.
{
  const ROOT_DIR = path.resolve(process.cwd());
  const fsD = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'import-docs.js'), 'utf8');

  assert.ok(!/projectId:\s*['"][^'"]+['"]/.test(fsD), 'DEV-135: no debe haber projectId hardcodeado');
  assert.ok(!/^\s*repoPath:\s*'/m.test(fsD), 'DEV-135: no debe haber repoPath embebido');

  // El prefijo y el projectId deben propagarse a los cuatro parsers.
  for (const fn of ['parseQualityLog', 'parseBacklog', 'parseSpecs', 'parseReleaseNotes']) {
    assert.ok(
      new RegExp(`function ${fn}\\([^)]*ctx\\)`).test(fsD),
      `DEV-135: ${fn} debe recibir el contexto con el prefijo del proyecto`
    );
  }

  // Y debe haber generacion de codigo basada en el prefijo recibido.
  assert.ok(fsD.includes('${ctx.codePrefix}'), 'DEV-135: los codigos deben derivarse de ctx.codePrefix');
  assert.ok(fsD.includes('ctx.projectId'), 'DEV-135: el projectId debe derivarse del contexto');

  // projectMeta sin codePrefix debe fallar de forma explicita.
  assert.ok(fsD.includes('no define codePrefix'), 'DEV-135: debe validarse codePrefix antes de importar');

  // El entrypoint debe exigir projectMeta.
  assert.ok(fsD.includes('projectMeta es obligatorio'), 'DEV-135: projectMeta debe ser obligatorio');
}
console.log('✅ DEV-135: Import engine no longer hardcodes a private project');

// 8. DEV-132: Marcadores literales de sección en texto libre (descripción, plan, notas).
//
// Regresión: si la descripción, plan o notas técnicas de una tarea contienen marcadores
// literales del formato (ej: <!-- AC:BEGIN --> dentro de un bloque de código o texto de
// ejemplo), el parser no debe capturar ese ejemplo como la sección real. El round-trip
// debe preservar los ACs, el plan y la descripción intactos.
{
  const taskWithLiteralMarkers = {
    id: 'DEV-132-TEST',
    title: 'Tarea de prueba con marcadores literales',
    status: 'draft',
    priority: 'high',
    type: 'bug',
    description: [
      'Esta tarea documenta cómo redactar criterios de aceptación.',
      'Por ejemplo, un bloque de criterios tiene este formato:',
      '```markdown',
      '<!-- AC:BEGIN -->',
      '- [ ] #1 Criterio falso dentro de la descripción',
      '<!-- AC:END -->',
      '```',
      'Y un plan tiene:',
      '<!-- SECTION:PLAN:BEGIN -->',
      '1. Plan falso en descripción',
      '<!-- SECTION:PLAN:END -->'
    ].join('\n'),
    acceptanceCriteria: [
      { index: 1, text: 'Primer criterio real y verificado', checked: true },
      { index: 2, text: 'Segundo criterio real pendiente', checked: false }
    ],
    implementationPlan: [
      '1. Implementar la solución real.',
      'Nota: también incluye un marcador de notas de ejemplo:',
      '<!-- SECTION:NOTES:BEGIN --> notas de ejemplo <!-- SECTION:NOTES:END -->'
    ].join('\n'),
    implementationNotes: [
      'Notas técnicas reales.',
      'Ejemplo de resumen:',
      '<!-- SECTION:FINAL_SUMMARY:BEGIN --> resumen ejemplo <!-- SECTION:FINAL_SUMMARY:END -->'
    ].join('\n')
  };

  // Serializar
  const serialized = serializeBacklogMd(taskWithLiteralMarkers);

  // Verificar que los marcadores en texto libre fueron neutralizados/escapados
  assert.ok(serialized.includes('<!\\-- AC:BEGIN -->'), 'DEV-132: el marcador AC:BEGIN en texto libre debe neutralizarse en el write path');
  assert.ok(serialized.includes('<!\\-- SECTION:PLAN:BEGIN -->'), 'DEV-132: el marcador SECTION:PLAN:BEGIN en texto libre debe neutralizarse');

  // Y que los marcadores estructurales reales se conservan intactos
  assert.ok(serialized.includes('## Acceptance Criteria\n\n<!-- AC:BEGIN -->'), 'DEV-132: el marcador estructural real de AC debe preservarse');
  assert.ok(serialized.includes('## Implementation Plan\n\n<!-- SECTION:PLAN:BEGIN -->'), 'DEV-132: el marcador estructural real de PLAN debe preservarse');

  // Re-parsear (Round-trip)
  const reparsed = parseBacklogMd(serialized);

  // ACs reales deben ser los verdaderos, no los del ejemplo
  assert.strictEqual(reparsed.acceptanceCriteria?.length, 2, 'DEV-132: deben recuperarse exactamente los 2 ACs reales');
  assert.strictEqual(reparsed.acceptanceCriteria?.[0].text, 'Primer criterio real y verificado');
  assert.strictEqual(reparsed.acceptanceCriteria?.[0].checked, true);
  assert.strictEqual(reparsed.acceptanceCriteria?.[1].text, 'Segundo criterio real pendiente');
  assert.strictEqual(reparsed.acceptanceCriteria?.[1].checked, false);

  // Plan real debe ser el verdadero
  assert.ok(reparsed.implementationPlan?.includes('1. Implementar la solución real.'), 'DEV-132: el plan real debe preservarse');
  assert.ok(reparsed.implementationPlan?.includes('<!-- SECTION:NOTES:BEGIN -->'), 'DEV-132: el texto literal dentro del plan debe desescaparse');

  // Notas reales deben ser las verdaderas
  assert.ok(reparsed.implementationNotes?.includes('Notas técnicas reales.'), 'DEV-132: las notas reales deben preservarse');
  assert.ok(reparsed.implementationNotes?.includes('<!-- SECTION:FINAL_SUMMARY:BEGIN -->'), 'DEV-132: el texto literal dentro de notas debe desescaparse');

  // Descripción debe haber desescapado sus marcadores
  assert.ok(reparsed.description?.includes('<!-- AC:BEGIN -->'), 'DEV-132: la descripción debe recuperar el texto literal original');
  assert.ok(reparsed.description?.includes('<!-- SECTION:PLAN:BEGIN -->'), 'DEV-132: el plan literal en la descripción debe recuperarse');

  // Caso raw unescaped: tarea legacy o escrita a mano con marcadores crudos en descripción
  const rawLegacyMarkdown = [
    '---',
    'id: DEV-RAW-TEST',
    'title: "Tarea con marcadores crudos"',
    'status: draft',
    'priority: p1',
    'type: bug',
    '---',
    '',
    '## Description',
    '',
    '<!-- SECTION:DESCRIPTION:BEGIN -->',
    'Texto con marcador crudo no escapado:',
    '<!-- AC:BEGIN -->',
    '- [ ] #1 AC intruso',
    '<!-- AC:END -->',
    '<!-- SECTION:DESCRIPTION:END -->',
    '',
    '## Acceptance Criteria',
    '',
    '<!-- AC:BEGIN -->',
    '- [x] #1 AC genuino',
    '<!-- AC:END -->',
    '',
    '## Implementation Plan',
    '',
    '<!-- SECTION:PLAN:BEGIN -->',
    'Plan genuino',
    '<!-- SECTION:PLAN:END -->'
  ].join('\n');

  const parsedRaw = parseBacklogMd(rawLegacyMarkdown);
  assert.strictEqual(parsedRaw.acceptanceCriteria?.length, 1, 'DEV-132: no debe capturar el AC intruso de la descripción');
  assert.strictEqual(parsedRaw.acceptanceCriteria?.[0].text, 'AC genuino');
  assert.strictEqual(parsedRaw.acceptanceCriteria?.[0].checked, true);
  assert.strictEqual(parsedRaw.implementationPlan, 'Plan genuino');
}
console.log('✅ DEV-132: Section markers in free text isolated, escaped and round-tripped without pollution');

// DEV-137: Estimation model, persistence and parsing (Fibonacci & T-shirt)
{
  const fibonacciMd = `---
id: DEV-EST-1
title: "Fibonacci estimation test"
status: draft
estimate: 5
priority: p2
---

## Description
Test
`;
  const parsedFib = parseBacklogMd(fibonacciMd);
  assert.strictEqual(parsedFib.estimate, 5, 'DEV-137: Debe parsear estimación numérica Fibonacci como número');

  const serializedFib = serializeBacklogMd(parsedFib);
  assert.ok(serializedFib.includes('estimate: 5'), 'DEV-137: Debe serializar estimate numérico en frontmatter');
  const roundTripFib = parseBacklogMd(serializedFib);
  assert.strictEqual(roundTripFib.estimate, 5, 'DEV-137: Round-trip numérico debe conservar el valor');

  const tshirtMd = `---
id: DEV-EST-2
title: "T-shirt estimation test"
status: draft
estimate: XL
priority: p1
---

## Description
Test
`;
  const parsedTshirt = parseBacklogMd(tshirtMd);
  assert.strictEqual(parsedTshirt.estimate, 'XL', 'DEV-137: Debe parsear estimación T-shirt como string');

  const serializedTshirt = serializeBacklogMd(parsedTshirt);
  assert.ok(serializedTshirt.includes('estimate: "XL"'), 'DEV-137: Debe serializar estimate string en frontmatter');
  const roundTripTshirt = parseBacklogMd(serializedTshirt);
  assert.strictEqual(roundTripTshirt.estimate, 'XL', 'DEV-137: Round-trip string debe conservar el valor');

  // Alias support: story_points
  const aliasMd = `---
id: DEV-EST-3
title: "Story points alias test"
status: draft
story_points: 13
---

## Description
Test
`;
  const parsedAlias = parseBacklogMd(aliasMd);
  assert.strictEqual(parsedAlias.estimate, 13, 'DEV-137: Debe soportar story_points como alias de estimate');
}
console.log('✅ DEV-137: Estimation model parsing, serialization and aliases passed');

// DEV-281: startDate and dueDate parsing, serialization and round-trip
{
  const timelineMd = `---
id: DEV-TL-1
title: "Timeline task test"
status: doing
start_date: '2026-10-15'
due_date: '2026-10-30'
---

## Description
Timeline test description
`;
  const parsed = parseBacklogMd(timelineMd);
  assert.strictEqual(parsed.startDate, '2026-10-15', 'DEV-281: Debe parsear start_date');
  assert.strictEqual(parsed.dueDate, '2026-10-30', 'DEV-281: Debe parsear due_date');

  const serialized = serializeBacklogMd(parsed);
  assert.ok(serialized.includes('start_date: "2026-10-15"'), 'DEV-281: Debe serializar start_date');
  assert.ok(serialized.includes('due_date: "2026-10-30"'), 'DEV-281: Debe serializar due_date');

  const roundTrip = parseBacklogMd(serialized);
  assert.strictEqual(roundTrip.startDate, '2026-10-15', 'DEV-281: Round-trip debe preservar startDate');
  assert.strictEqual(roundTrip.dueDate, '2026-10-30', 'DEV-281: Round-trip debe preservar dueDate');

  // Alias support (target_date and camelCase)
  const aliasMd = `---
id: DEV-TL-2
title: "Target date alias test"
status: draft
startDate: '2026-11-01'
target_date: '2026-11-20'
---

## Description
Alias test
`;
  const parsedAlias = parseBacklogMd(aliasMd);
  assert.strictEqual(parsedAlias.startDate, '2026-11-01', 'DEV-281: Debe soportar startDate');
  assert.strictEqual(parsedAlias.dueDate, '2026-11-20', 'DEV-281: Debe soportar target_date como alias de dueDate');
}
console.log('✅ DEV-281: Timeline dates parsing, serialization and aliases passed');

// DEV-289 & SEC-01 DEV-292: Parser Integrity, Custom YAML lists, Code fence preservation & Path Traversal Sanitization
{
  // 1. Custom YAML lists and scalar fields preservation (AC #1 & PoC Caso 1)
  const mdWithCustomYaml = `---
id: DEV-999
title: "Task with custom YAML fields"
status: draft
tags:
  - security
  - audit
reviewers:
  - alice
  - bob
custom_scalar: "verified"
custom_empty_list: []
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Test description for custom YAML.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AC test
<!-- AC:END -->
`;

  const parsedCustom = parseBacklogMd(mdWithCustomYaml, 'DEV-999');
  assert.deepStrictEqual(parsedCustom.rawExtraFrontmatter?.tags, ['security', 'audit'], 'DEV-289: tags custom list must be parsed');
  assert.deepStrictEqual(parsedCustom.rawExtraFrontmatter?.reviewers, ['alice', 'bob'], 'DEV-289: reviewers custom list must be parsed');
  assert.strictEqual(parsedCustom.rawExtraFrontmatter?.custom_scalar, 'verified', 'DEV-289: custom_scalar must be parsed');
  assert.deepStrictEqual(parsedCustom.rawExtraFrontmatter?.custom_empty_list, [], 'DEV-289: custom_empty_list must be parsed as empty array');

  const serializedCustom = serializeBacklogMd(parsedCustom);
  assert.ok(serializedCustom.includes('tags:'), 'DEV-289: serialized markdown must include tags');
  assert.ok(serializedCustom.includes('- "security"'), 'DEV-289: serialized markdown must include security tag');
  assert.ok(serializedCustom.includes('reviewers:'), 'DEV-289: serialized markdown must include reviewers');
  assert.ok(serializedCustom.includes('- "alice"'), 'DEV-289: serialized markdown must include alice reviewer');
  assert.ok(serializedCustom.includes('custom_empty_list: []'), 'DEV-289: serialized markdown must include custom_empty_list: []');

  const roundTripCustom = parseBacklogMd(serializedCustom);
  assert.deepStrictEqual(roundTripCustom.rawExtraFrontmatter?.tags, ['security', 'audit'], 'DEV-289: tags must survive round-trip');
  assert.deepStrictEqual(roundTripCustom.rawExtraFrontmatter?.reviewers, ['alice', 'bob'], 'DEV-289: reviewers must survive round-trip');
  assert.strictEqual(roundTripCustom.rawExtraFrontmatter?.custom_scalar, 'verified', 'DEV-289: custom_scalar must survive round-trip');
  assert.deepStrictEqual(roundTripCustom.rawExtraFrontmatter?.custom_empty_list, [], 'DEV-289: custom_empty_list must survive round-trip');

  // 2. Inline lists with quoted commas (AC #2)
  const mdWithInlineLists = `---
id: DEV-INLINE-1
title: "Inline lists test"
status: draft
labels: ["ui/ux", "auth, login"]
tags: ["a", "b, c"]
single_quoted: ['first, item', 'second']
unquoted: [one, two, three]
---

## Description
Test inline.
`;

  const parsedInline = parseBacklogMd(mdWithInlineLists);
  assert.deepStrictEqual(parsedInline.labels, ['ui/ux', 'auth, login'], 'DEV-289: labels with commas in quotes must not be split');
  assert.deepStrictEqual(parsedInline.rawExtraFrontmatter?.tags, ['a', 'b, c'], 'DEV-289: custom inline tags with commas in quotes must not be split');
  assert.deepStrictEqual(parsedInline.rawExtraFrontmatter?.single_quoted, ['first, item', 'second'], 'DEV-289: single quoted inline list with commas must not be split');
  assert.deepStrictEqual(parsedInline.rawExtraFrontmatter?.unquoted, ['one', 'two', 'three'], 'DEV-289: unquoted inline list must be parsed');

  const serializedInline = serializeBacklogMd(parsedInline);
  const reparsedInline = parseBacklogMd(serializedInline);
  assert.deepStrictEqual(reparsedInline.labels, ['ui/ux', 'auth, login'], 'DEV-289: labels must survive round trip');
  assert.deepStrictEqual(reparsedInline.rawExtraFrontmatter?.tags, ['a', 'b, c'], 'DEV-289: tags must survive round trip');

  // Direct parseInlineList tests
  assert.deepStrictEqual(parseInlineList('["a", "b, c"]'), ['a', 'b, c'], 'DEV-289: parseInlineList handles quoted commas');
  assert.deepStrictEqual(parseInlineList("['x', 'y, z']"), ['x', 'y, z'], 'DEV-289: parseInlineList handles single quoted commas');
  assert.deepStrictEqual(parseInlineList('[]'), [], 'DEV-289: parseInlineList handles empty array');

  // 3. Code fence protection in Markdown descriptions (AC #3 & PoC Caso 2)
  const mdWithFencedCode = `---
id: DEV-FENCE-1
title: "Code fence test"
status: draft
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Intro text.
\`\`\`markdown
## Acceptance Criteria
- [ ] fake AC in code
- [ ] another fake AC in code
\`\`\`
Text after code block that must NOT be truncated.
~~~markdown
## Implementation Plan
1. Fake step
~~~
Final description text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Real acceptance criterion
- [ ] #2 Second real criterion
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Real implementation step 1.
<!-- SECTION:PLAN:END -->
`;

  const parsedFenced = parseBacklogMd(mdWithFencedCode);
  assert.ok(parsedFenced.description?.includes('## Acceptance Criteria'), 'DEV-289: description must include code snippet');
  assert.ok(parsedFenced.description?.includes('Text after code block that must NOT be truncated.'), 'DEV-289: text after code block must be preserved');
  assert.ok(parsedFenced.description?.includes('Final description text.'), 'DEV-289: text after second code block must be preserved');

  // Real ACs outside code blocks must be captured accurately
  assert.strictEqual(parsedFenced.acceptanceCriteria?.length, 2, 'DEV-289: only the 2 real ACs outside code blocks must be parsed');
  assert.strictEqual(parsedFenced.acceptanceCriteria?.[0].text, 'Real acceptance criterion');
  assert.strictEqual(parsedFenced.acceptanceCriteria?.[0].checked, true);
  assert.strictEqual(parsedFenced.acceptanceCriteria?.[1].text, 'Second real criterion');
  assert.strictEqual(parsedFenced.acceptanceCriteria?.[1].checked, false);

  // Real plan must be preserved
  assert.ok(parsedFenced.implementationPlan?.includes('Real implementation step 1.'), 'DEV-289: real plan outside code blocks must be preserved');

  // Direct extractSectionBlock test
  const descBlock = extractSectionBlock(mdWithFencedCode, 'Description');
  assert.ok(descBlock.includes('Text after code block that must NOT be truncated.'), 'DEV-289: extractSectionBlock must not cut off at H2 inside code block');

  // 4. Full round-trip of complex task with code blocks and custom YAML metadata (AC #4)
  const complexSerialized = serializeBacklogMd(parsedFenced);
  const complexReparsed = parseBacklogMd(complexSerialized);
  assert.strictEqual(complexReparsed.id, 'DEV-FENCE-1');
  assert.strictEqual(complexReparsed.description, parsedFenced.description, 'DEV-289: complex description must match 100% after round-trip');
  assert.deepStrictEqual(complexReparsed.acceptanceCriteria, parsedFenced.acceptanceCriteria, 'DEV-289: complex ACs must match 100% after round-trip');
  assert.strictEqual(complexReparsed.implementationPlan, parsedFenced.implementationPlan, 'DEV-289: complex plan must match 100% after round-trip');

  // 5. Sanitización de Path Traversal en generateTaskFilename (SEC-01 de DEV-292)
  const fn1 = generateTaskFilename('../../../danger', 'Evil');
  assert.strictEqual(fn1, 'DANGER - Evil.md', 'DEV-292 SEC-01: generateTaskFilename must sanitize path traversal in id');
  assert.ok(!fn1.includes('..') && !fn1.includes('/') && !fn1.includes('\\'), 'Filename must not contain directory traversal characters');

  const tasksBaseDir = path.resolve('backlog/tasks');
  const resolvedTarget = path.resolve(tasksBaseDir, fn1);
  const relPath = path.relative(tasksBaseDir, resolvedTarget);
  assert.ok(!relPath.startsWith('..') && !path.isAbsolute(relPath), 'DEV-292 SEC-01: resolved task file must be strictly contained inside backlog/tasks');

  // Additional traversal edge cases
  const fn2 = generateTaskFilename('..\\..\\etc\\passwd', 'System File');
  assert.strictEqual(fn2, 'ETCPASSWD - System File.md', 'DEV-292 SEC-01: backslashes and dots stripped');

  const fn3 = generateTaskFilename('../..', '../evil');
  assert.strictEqual(fn3, 'TASK - evil.md', 'DEV-292 SEC-01: empty traversal id must fall back to TASK');

  const fn4 = generateTaskFilename('', '');
  assert.strictEqual(fn4, 'TASK - Task.md', 'DEV-292 SEC-01: empty id and title fallback safely');
}
console.log('✅ DEV-289 & SEC-01 DEV-292: Parser Integrity, custom YAML fields, code fence preservation & Path Traversal sanitization verified');

console.log('🎉 All parser tests passed successfully!');



