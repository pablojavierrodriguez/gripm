import assert from 'node:assert';
import {
  parseBacklogMd,
  serializeBacklogMd,
  unquoteYamlScalar,
  getCodeFenceRanges,
  isOffsetInFence,
  extractMarkerContent,
  extractSectionBlock,
  parseInlineList,
  generateMonolithicBacklogMd
} from './backlogMdParser.ts';

console.log('🧪 Iniciando suite de pruebas de integridad round-trip (DEV-300)...');
let testsPassed = 0;

function runTest(name, fn) {
  try {
    fn();
    testsPassed++;
  } catch (err) {
    console.error(`❌ Test falló: "${name}"`);
    throw err;
  }
}

// ============================================================================
// Categoría 1: UTF-8 BOM y Saltos de Línea
// ============================================================================

runTest('1. Soporte para archivo con UTF-8 BOM (\\uFEFF)', () => {
  const md = '\uFEFF---\nid: DEV-BOM-1\ntitle: "Task with BOM"\nstatus: draft\n---\n\n## Description\nHello BOM';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-BOM-1');
  assert.strictEqual(task.title, 'Task with BOM');
  assert.strictEqual(task.description, 'Hello BOM');
});

runTest('2. Soporte para archivo sin salto de línea final tras el cierre ---', () => {
  const md = '---\nid: DEV-NO-NL\ntitle: "Task without trailing newline"\nstatus: draft\n---';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-NO-NL');
  assert.strictEqual(task.title, 'Task without trailing newline');
  assert.strictEqual(task.description, undefined);
});

runTest('3. Soporte para archivo con BOM y sin salto de línea final tras ---', () => {
  const md = '\uFEFF---\nid: DEV-BOM-NO-NL\ntitle: "BOM no newline"\nstatus: doing\n---';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-BOM-NO-NL');
  assert.strictEqual(task.title, 'BOM no newline');
  assert.strictEqual(task.status, 'doing');
});

runTest('4. Archivo con saltos de línea Windows CRLF (\\r\\n)', () => {
  const md = '---\r\nid: DEV-CRLF\r\ntitle: "Windows CRLF"\r\nstatus: ready\r\n---\r\n\r\n## Description\r\n\r\n<!-- SECTION:DESCRIPTION:BEGIN -->\r\nLinea 1\r\nLinea 2\r\n<!-- SECTION:DESCRIPTION:END -->\r\n';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-CRLF');
  assert.strictEqual(task.status, 'ready');
  assert.ok(task.description?.includes('Linea 1'));
  assert.ok(task.description?.includes('Linea 2'));
});

runTest('5. Archivo con saltos de línea mixtos LF y CRLF', () => {
  const md = '---\nid: DEV-MIXED\r\ntitle: "Mixed Linebreaks"\nstatus: draft\r\n---\n## Description\r\nContenido mixto\n';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-MIXED');
  assert.strictEqual(task.description, 'Contenido mixto');
});

// ============================================================================
// Categoría 2: Bloques de Código Cercados y Falsos Delimitadores
// ============================================================================

runTest('6. Descripción con H2 (## Acceptance Criteria) dentro de fence con backticks (```)', () => {
  const md = `---
id: DEV-FENCE-H2
title: "Fence with H2"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Ejemplo de sintaxis:
\`\`\`markdown
## Acceptance Criteria
- [ ] fake ac 1
- [ ] fake ac 2
\`\`\`
Texto posterior que debe preservarse intacto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Criterio real
<!-- AC:END -->
`;
  const task = parseBacklogMd(md);
  assert.ok(task.description?.includes('## Acceptance Criteria'));
  assert.ok(task.description?.includes('Texto posterior que debe preservarse intacto.'));
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'Criterio real');
  assert.strictEqual(task.acceptanceCriteria?.[0].checked, true);
});

runTest('7. Descripción con H2 (## Implementation Plan) dentro de fence con tildes (~~~)', () => {
  const md = `---
id: DEV-TILDE-H2
title: "Tilde fence"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
\`\`\`
code
\`\`\`
~~~markdown
## Implementation Plan
1. Fake step
~~~
Texto final descripción.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
1. Paso real
<!-- SECTION:PLAN:END -->
`;
  const task = parseBacklogMd(md);
  assert.ok(task.description?.includes('## Implementation Plan'));
  assert.ok(task.description?.includes('Texto final descripción.'));
  assert.strictEqual(task.implementationPlan, '1. Paso real');
});

runTest('8. Fence de 4 backticks que encierra bloque de 3 backticks con H2', () => {
  const md = `---
id: DEV-NESTED-FENCE
title: "Nested Fences"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
\`\`\`\`markdown
\`\`\`markdown
## Acceptance Criteria
- [ ] Nested fake AC
\`\`\`
\`\`\`\`
Texto post 4 backticks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AC fuera de código
<!-- AC:END -->
`;
  const task = parseBacklogMd(md);
  assert.ok(task.description?.includes('Texto post 4 backticks.'));
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'AC fuera de código');
});

runTest('9. Marcador HTML <!-- AC:BEGIN --> dentro de bloque de código', () => {
  const md = `---
id: DEV-AC-MARKER-IN-CODE
title: "AC Marker in Code"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Código con marcador:
\`\`\`markdown
<!-- AC:BEGIN -->
- [ ] AC intruso en bloque de código
<!-- AC:END -->
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AC genuino
<!-- AC:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'AC genuino');
});

runTest('10. Marcador HTML <!-- SECTION:PLAN:BEGIN --> dentro de bloque de código', () => {
  const md = `---
id: DEV-PLAN-MARKER-IN-CODE
title: "Plan Marker in Code"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
\`\`\`markdown
<!-- SECTION:PLAN:BEGIN -->
Plan falso
<!-- SECTION:PLAN:END -->
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
Plan auténtico
<!-- SECTION:PLAN:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.implementationPlan, 'Plan auténtico');
});

runTest('11. Marcador HTML <!-- SECTION:NOTES:BEGIN --> dentro de bloque de código', () => {
  const md = `---
id: DEV-NOTES-IN-CODE
title: "Notes in Code"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
\`\`\`
<!-- SECTION:NOTES:BEGIN -->
Notas falsas
<!-- SECTION:NOTES:END -->
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes
<!-- SECTION:NOTES:BEGIN -->
Notas verdaderas
<!-- SECTION:NOTES:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.implementationNotes, 'Notas verdaderas');
});

runTest('12. Marcador HTML <!-- SECTION:FINAL_SUMMARY:BEGIN --> dentro de bloque de código', () => {
  const md = `---
id: DEV-SUMMARY-IN-CODE
title: "Summary in Code"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
\`\`\`
<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resumen falso
<!-- SECTION:FINAL_SUMMARY:END -->
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Final Summary
<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resumen verificado
<!-- SECTION:FINAL_SUMMARY:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.finalSummary, 'Resumen verificado');
});

runTest('13. Acceptance Criteria con checkbox dentro de bloque de código', () => {
  const md = `---
id: DEV-AC-CHECKBOX-IN-CODE
title: "Checkbox in Code"
status: draft
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AC exterior 1
\`\`\`markdown
- [ ] Fake checkbox inside code snippet
\`\`\`
- [ ] #2 AC exterior 2
<!-- AC:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.acceptanceCriteria?.length, 2);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'AC exterior 1');
  assert.strictEqual(task.acceptanceCriteria?.[0].checked, true);
  assert.strictEqual(task.acceptanceCriteria?.[1].text, 'AC exterior 2');
  assert.strictEqual(task.acceptanceCriteria?.[1].checked, false);
});

runTest('14. Implementation Plan con bloque de código mencionando ## Implementation Notes', () => {
  const md = `---
id: DEV-PLAN-WITH-H2
title: "Plan with H2 code"
status: draft
---

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
1. Revisar configuración.
\`\`\`markdown
## Implementation Notes
Nota en código
\`\`\`
2. Ejecutar validación.
<!-- SECTION:PLAN:END -->

## Implementation Notes
<!-- SECTION:NOTES:BEGIN -->
Nota técnica real.
<!-- SECTION:NOTES:END -->
`;
  const task = parseBacklogMd(md);
  assert.ok(task.implementationPlan?.includes('2. Ejecutar validación.'));
  assert.strictEqual(task.implementationNotes, 'Nota técnica real.');
});

runTest('15. Implementation Notes con bloque de código mencionando ## Final Summary', () => {
  const md = `---
id: DEV-NOTES-WITH-H2
title: "Notes with H2 code"
status: draft
---

## Implementation Notes
<!-- SECTION:NOTES:BEGIN -->
Detalles de integración:
\`\`\`markdown
## Final Summary
Resumen en código
\`\`\`
Fin de notas.
<!-- SECTION:NOTES:END -->

## Final Summary
<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resumen final auténtico.
<!-- SECTION:FINAL_SUMMARY:END -->
`;
  const task = parseBacklogMd(md);
  assert.ok(task.implementationNotes?.includes('Fin de notas.'));
  assert.strictEqual(task.finalSummary, 'Resumen final auténtico.');
});

// ============================================================================
// Categoría 3: Extracción de las 5 Secciones con y sin Marcadores HTML
// ============================================================================

runTest('16. Tarea con las 5 secciones completas usando marcadores HTML', () => {
  const md = `---
id: DEV-ALL-WITH-MARKERS
title: "All Sections with Markers"
status: doing
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Descripción detallada con marcadores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Primer criterio
- [ ] #2 Segundo criterio
<!-- AC:END -->

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
1. Paso 1
2. Paso 2
<!-- SECTION:PLAN:END -->

## Implementation Notes
<!-- SECTION:NOTES:BEGIN -->
Notas de arquitectura y rendimiento.
<!-- SECTION:NOTES:END -->

## Final Summary
<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cierre formal y métricas de entrega.
<!-- SECTION:FINAL_SUMMARY:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Descripción detallada con marcadores.');
  assert.strictEqual(task.acceptanceCriteria?.length, 2);
  assert.strictEqual(task.implementationPlan, '1. Paso 1\n2. Paso 2');
  assert.strictEqual(task.implementationNotes, 'Notas de arquitectura y rendimiento.');
  assert.strictEqual(task.finalSummary, 'Cierre formal y métricas de entrega.');
});

runTest('17. Tarea con las 5 secciones estándar SIN marcadores HTML (Markdown puro)', () => {
  const md = `---
id: DEV-ALL-NO-MARKERS
title: "All Sections Pure Markdown"
status: doing
---

## Description
Descripción pura sin marcadores HTML.

## Acceptance Criteria
- [x] #1 Criterio sin marcador
- [ ] #2 Criterio pendiente

## Implementation Plan
1. Paso sin marcador

## Implementation Notes
Nota pura sin marcador

## Final Summary
Resumen puro sin marcador
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Descripción pura sin marcadores HTML.');
  assert.strictEqual(task.acceptanceCriteria?.length, 2);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'Criterio sin marcador');
  assert.strictEqual(task.acceptanceCriteria?.[0].checked, true);
  assert.strictEqual(task.acceptanceCriteria?.[1].text, 'Criterio pendiente');
  assert.strictEqual(task.acceptanceCriteria?.[1].checked, false);
  assert.strictEqual(task.implementationPlan, '1. Paso sin marcador');
  assert.strictEqual(task.implementationNotes, 'Nota pura sin marcador');
  assert.strictEqual(task.finalSummary, 'Resumen puro sin marcador');
});

runTest('18. Tarea con solo Description sin marcadores', () => {
  const md = `---
id: DEV-ONLY-DESC
title: "Only Description"
status: draft
---

## Description
Solo descripción.
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Solo descripción.');
  assert.strictEqual(task.acceptanceCriteria?.length ?? 0, 0);
  assert.strictEqual(task.implementationPlan, undefined);
  assert.strictEqual(task.implementationNotes, undefined);
  assert.strictEqual(task.finalSummary, undefined);
});

runTest('19. Tarea con solo Acceptance Criteria sin marcadores', () => {
  const md = `---
id: DEV-ONLY-AC
title: "Only AC"
status: draft
---

## Acceptance Criteria
- [ ] #1 Criterio único
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'Criterio único');
});

runTest('20. Tarea con solo Implementation Plan sin marcadores', () => {
  const md = `---
id: DEV-ONLY-PLAN
title: "Only Plan"
status: draft
---

## Implementation Plan
1. Paso solitario
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.implementationPlan, '1. Paso solitario');
});

runTest('21. Tarea con solo Implementation Notes sin marcadores', () => {
  const md = `---
id: DEV-ONLY-NOTES
title: "Only Notes"
status: draft
---

## Implementation Notes
Nota solitaria
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.implementationNotes, 'Nota solitaria');
});

runTest('22. Tarea con solo Final Summary sin marcadores', () => {
  const md = `---
id: DEV-ONLY-SUMMARY
title: "Only Summary"
status: draft
---

## Final Summary
Resumen solitario
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.finalSummary, 'Resumen solitario');
});

runTest('23. Tarea con combinación mixta (unas con marcadores, otras sin)', () => {
  const md = `---
id: DEV-MIXED-MARKERS
title: "Mixed Markers"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Descripción con marcador
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
- [x] #1 AC sin marcador

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
Plan con marcador
<!-- SECTION:PLAN:END -->

## Implementation Notes
Notas sin marcador

## Final Summary
<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resumen con marcador
<!-- SECTION:FINAL_SUMMARY:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Descripción con marcador');
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
  assert.strictEqual(task.acceptanceCriteria?.[0].text, 'AC sin marcador');
  assert.strictEqual(task.implementationPlan, 'Plan con marcador');
  assert.strictEqual(task.implementationNotes, 'Notas sin marcador');
  assert.strictEqual(task.finalSummary, 'Resumen con marcador');
});

runTest('24. Encabezados H2 personalizados intercalados', () => {
  const md = `---
id: DEV-CUSTOM-H2
title: "Custom H2"
status: draft
---

## Description
Desc text

## Technical Context
Contexto que no debe pisar ninguna sección

## Acceptance Criteria
- [ ] #1 AC test
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Desc text');
  assert.strictEqual(task.acceptanceCriteria?.length, 1);
});

runTest('25. Secciones vacías con marcadores no fabrican contenido fantasma', () => {
  const md = `---
id: DEV-EMPTY-SECTIONS
title: "Empty Sections"
status: draft
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, '');
  assert.strictEqual(task.acceptanceCriteria?.length ?? 0, 0);
  assert.strictEqual(task.implementationPlan, '');
});

// ============================================================================
// Categoría 4: Escalares YAML, unquoteYamlScalar y Anti-Multiplicación de Barras
// ============================================================================

runTest('26. Título con comillas dobles escapadas no multiplica barras en roundtrip', () => {
  const originalTitle = 'Corregir el bug del "botón" en el modal';
  const task = {
    id: 'DEV-QUOTE-1',
    title: originalTitle,
    status: 'draft',
    type: 'feature',
    createdDate: '2026-10-15 00:00',
    updatedDate: '2026-10-15 00:00'
  };

  const pass1 = serializeBacklogMd(task);
  const parsed1 = parseBacklogMd(pass1);
  assert.strictEqual(parsed1.title, originalTitle);

  const pass2 = serializeBacklogMd(parsed1);
  const parsed2 = parseBacklogMd(pass2);
  assert.strictEqual(parsed2.title, originalTitle);
  assert.strictEqual(pass2, pass1);
});

runTest('27. Título con comillas simples YAML (\'Don\'\'t fail\')', () => {
  const md = `---
id: DEV-SINGLE-QUOTE
title: 'Don''t fail this test'
status: draft
---
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.title, "Don't fail this test");
});

runTest('28. Título con barras invertidas (Rutas de archivo Windows)', () => {
  const pathTitle = 'Ruta: C:\\Work\\projects\\app\\README.md';
  const task = {
    id: 'DEV-PATH-1',
    title: pathTitle,
    status: 'draft',
    type: 'feature',
    createdDate: '2026-10-15 00:00',
    updatedDate: '2026-10-15 00:00'
  };

  const s1 = serializeBacklogMd(task);
  const p1 = parseBacklogMd(s1);
  assert.strictEqual(p1.title, pathTitle);

  const s2 = serializeBacklogMd(p1);
  assert.strictEqual(s2, s1);
});

runTest('29. Caracteres especiales: corchetes, pipes, unicode y emojis', () => {
  const complexTitle = '🚀 [URGENT] Pipeline | Fix issue: #404 & retry';
  const task = {
    id: 'DEV-COMPLEX-TITLE',
    title: complexTitle,
    status: 'draft'
  };
  const s = serializeBacklogMd(task);
  const p = parseBacklogMd(s);
  assert.strictEqual(p.title, complexTitle);
});

runTest('30. Etiquetas con comillas escapadas en listas YAML', () => {
  const md = `---
id: DEV-LABELS-QUOTES
title: "Quoted labels"
status: draft
labels:
  - "ui/ux"
  - "label with \\"nested\\" quotes"
---
`;
  const task = parseBacklogMd(md);
  assert.deepStrictEqual(task.labels, ['ui/ux', 'label with "nested" quotes']);

  const s = serializeBacklogMd(task);
  const p = parseBacklogMd(s);
  assert.deepStrictEqual(p.labels, ['ui/ux', 'label with "nested" quotes']);
});

runTest('31. Inline list con comillas simples y comas internas', () => {
  const md = `---
id: DEV-INLINE-SINGLE
title: "Inline single quoted"
status: draft
labels: ['first, element', 'second']
---
`;
  const task = parseBacklogMd(md);
  assert.deepStrictEqual(task.labels, ['first, element', 'second']);
});

runTest('32. Inline list con comillas dobles y comas internas', () => {
  const md = `---
id: DEV-INLINE-DOUBLE
title: "Inline double quoted"
status: draft
labels: ["tag, with, commas", "standard"]
---
`;
  const task = parseBacklogMd(md);
  assert.deepStrictEqual(task.labels, ['tag, with, commas', 'standard']);
});

runTest('33. Escalares sin entrecomillar (unquoted plain scalars)', () => {
  const md = `---
id: DEV-UNQUOTED
title: Plain title without quotes
status: review
priority: p0
type: bug
---
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.id, 'DEV-UNQUOTED');
  assert.strictEqual(task.title, 'Plain title without quotes');
  assert.strictEqual(task.status, 'review');
  assert.strictEqual(task.priority, 'p0');
  assert.strictEqual(task.type, 'bug');
});

runTest('34. Idempotencia estricta en 10 ciclos consecutivos de lectura/escritura', () => {
  let content = serializeBacklogMd({
    id: 'DEV-IDEMPOTENT-10',
    title: 'Titulo con "comillas", \\barras\\ y \'apóstrofes\'',
    status: 'doing',
    type: 'feature',
    createdDate: '2026-10-15 00:00',
    updatedDate: '2026-10-15 00:00',
    labels: ['tag "1"', 'tag \\ 2'],
    description: 'Descripción con múltiples líneas y \\barras\\.'
  });

  const firstPass = content;
  for (let i = 0; i < 10; i++) {
    const parsed = parseBacklogMd(content);
    content = serializeBacklogMd(parsed);
  }
  assert.strictEqual(content, firstPass, '10 serializaciones deben producir bytes idénticos');
});

runTest('35. unquoteYamlScalar desescapa casos borde simétricos', () => {
  assert.strictEqual(unquoteYamlScalar('"hello"'), 'hello');
  assert.strictEqual(unquoteYamlScalar('"he\\"llo"'), 'he"llo');
  assert.strictEqual(unquoteYamlScalar('"C:\\\\Windows"'), 'C:\\Windows');
  assert.strictEqual(unquoteYamlScalar("'don''t'"), "don't");
  assert.strictEqual(unquoteYamlScalar('plain_scalar'), 'plain_scalar');
  assert.strictEqual(unquoteYamlScalar(''), '');
  assert.strictEqual(unquoteYamlScalar(null), '');
});

// ============================================================================
// Categoría 5: Sanitización de Claves y Prevención de Inyección YAML
// ============================================================================

runTest('36. Frontmatter ignora claves con salto de línea inyectado', () => {
  const md = `---
id: DEV-INJ-1
title: "Test"
status: draft
injected\\nkey: malicious
valid_key: safe
---
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.rawExtraFrontmatter?.['injected\nkey'], undefined);
  assert.strictEqual(task.rawExtraFrontmatter?.['valid_key'], 'safe');
});

runTest('37. Frontmatter ignora claves con espacios', () => {
  const md = `---
id: DEV-SPACE-KEY
title: "Test"
status: draft
bad key: ignored
good_key: accepted
---
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.rawExtraFrontmatter?.['bad key'], undefined);
  assert.strictEqual(task.rawExtraFrontmatter?.['good_key'], 'accepted');
});

runTest('38. Frontmatter ignora claves con caracteres especiales no autorizados', () => {
  const md = `---
id: DEV-SPEC-KEY
title: "Test"
status: draft
evil$directive: blocked
allowed-key_123: ok
---
`;
  const task = parseBacklogMd(md);
  assert.strictEqual(task.rawExtraFrontmatter?.['evil$directive'], undefined);
  assert.strictEqual(task.rawExtraFrontmatter?.['allowed-key_123'], 'ok');
});

runTest('39. serializeBacklogMd sanitiza id eliminando saltos de línea inyectados', () => {
  const maliciousTask = {
    id: 'DEV-999\nstatus: done\n',
    title: 'Injection Attempt',
    status: 'draft'
  };
  const serialized = serializeBacklogMd(maliciousTask);
  assert.ok(!serialized.includes('id: DEV-999\nstatus: done'));
  assert.ok(serialized.includes('id: DEV-999status: done'));
});

runTest('40. serializeBacklogMd sanitiza type contra saltos de línea', () => {
  const maliciousTask = {
    id: 'DEV-TYPE-INJ',
    title: 'Type injection',
    status: 'draft',
    type: 'bug\npriority: urgent'
  };
  const serialized = serializeBacklogMd(maliciousTask);
  assert.ok(!serialized.includes('type: bug\npriority: urgent'));
});

runTest('41. rawExtraFrontmatter preserva claves y valores autorizados', () => {
  const task = {
    id: 'DEV-EXTRA',
    title: 'Extra fields',
    status: 'draft',
    rawExtraFrontmatter: {
      team_lead: 'carol',
      compliance_tags: ['gdpr', 'soc2'],
      security_review_done: true,
      retry_count: 3
    }
  };
  const serialized = serializeBacklogMd(task);
  const reparsed = parseBacklogMd(serialized);
  assert.strictEqual(reparsed.rawExtraFrontmatter?.team_lead, 'carol');
  assert.deepStrictEqual(reparsed.rawExtraFrontmatter?.compliance_tags, ['gdpr', 'soc2']);
  assert.strictEqual(reparsed.rawExtraFrontmatter?.security_review_done, true);
  assert.strictEqual(reparsed.rawExtraFrontmatter?.retry_count, 3);
});

runTest('42. rawExtraFrontmatter omite claves no conformes al serializar', () => {
  const task = {
    id: 'DEV-EXTRA-SAN',
    title: 'Extra fields sanitize',
    status: 'draft',
    rawExtraFrontmatter: {
      'bad\\nkey': 'evil',
      'good_key': 'safe'
    }
  };
  const serialized = serializeBacklogMd(task);
  assert.ok(!serialized.includes('bad\\nkey'));
  assert.ok(serialized.includes('good_key: "safe"'));
});

// ============================================================================
// Categoría 6: Exportación Monolítica y Estado Cancelled
// ============================================================================

runTest('43. generateMonolithicBacklogMd incluye tareas en estado cancelled', () => {
  const tasks = [
    { id: 'DEV-C1', title: 'Tarea cancelada 1', status: 'cancelled' },
    { id: 'DEV-C2', title: 'Tarea cancelada 2', status: 'cancelled' },
    { id: 'DEV-D1', title: 'Tarea en draft', status: 'draft' }
  ];
  const md = generateMonolithicBacklogMd('Test Repo', tasks);
  assert.ok(md.includes('### 🚫 Canceladas / Cancelled (2)'));
  assert.ok(md.includes('#### [DEV-C1] Tarea cancelada 1'));
  assert.ok(md.includes('#### [DEV-C2] Tarea cancelada 2'));
});

runTest('44. generateMonolithicBacklogMd agrupa todos los estados estándar', () => {
  const statuses = ['ideas', 'doing', 'review', 'ready', 'draft', 'done', 'dismissed', 'cancelled'];
  const tasks = statuses.map((st, i) => ({
    id: `DEV-${i}`,
    title: `Tarea en ${st}`,
    status: st
  }));
  const md = generateMonolithicBacklogMd('All Statuses', tasks);
  assert.ok(md.includes('💡 Ideas / Discovery'));
  assert.ok(md.includes('⚡ In Progress / Doing'));
  assert.ok(md.includes('🔍 Review & QA'));
  assert.ok(md.includes('🚀 Ready for Deploy'));
  assert.ok(md.includes('📋 Backlog / Draft'));
  assert.ok(md.includes('✅ Done / Deployed'));
  assert.ok(md.includes('📦 Archivadas / Descartadas'));
  assert.ok(md.includes('🚫 Canceladas / Cancelled'));
});

runTest('45. generateMonolithicBacklogMd no genera secciones para estados sin tareas', () => {
  const tasks = [
    { id: 'DEV-ONLY', title: 'Unica tarea', status: 'doing' }
  ];
  const md = generateMonolithicBacklogMd('Single Task', tasks);
  assert.ok(md.includes('⚡ In Progress / Doing (1)'));
  assert.ok(!md.includes('🚫 Canceladas / Cancelled'));
  assert.ok(!md.includes('📦 Archivadas / Descartadas'));
});

runTest('46. generateMonolithicBacklogMd incluye ACs y prioridades', () => {
  const tasks = [
    {
      id: 'DEV-WITH-ACS',
      title: 'Tarea detallada',
      status: 'ready',
      priority: 'p1',
      acceptanceCriteria: [
        { index: 1, text: 'AC completado', checked: true },
        { index: 2, text: 'AC pendiente', checked: false }
      ]
    }
  ];
  const md = generateMonolithicBacklogMd('Details', tasks);
  assert.ok(md.includes('- **Prioridad**: `p1`'));
  assert.ok(md.includes('- [x] #1 AC completado'));
  assert.ok(md.includes('- [ ] #2 AC pendiente'));
});

// ============================================================================
// Categoría 7: Casos Borde Complejos e Idempotencia Round-Trip
// ============================================================================

runTest('47. Tarea masiva compleja con todas las combinaciones', () => {
  const complexTask = {
    id: 'DEV-MASSIVE-1',
    title: 'Reingeniería del "motor" de parsing (v1.5.0): C:\\Ruta & `código`',
    status: 'doing',
    type: 'architecture',
    priority: 'p0',
    assignees: ['@pablo', '@qa-lead'],
    labels: ['parser', 'data-integrity', 'core/engine'],
    dependencies: ['DEV-100', 'DEV-200'],
    estimate: 13,
    startDate: '2026-10-15',
    dueDate: '2026-10-31',
    description: [
      'Esta es una descripción exhaustiva.',
      'Contiene código cercado con encabezados falsos:',
      '```markdown',
      '## Acceptance Criteria',
      '- [ ] Criterio falso dentro de código',
      '<!-- AC:BEGIN -->',
      '```',
      'Y un segundo bloque:',
      '~~~markdown',
      '## Implementation Notes',
      'Nota falsa',
      '~~~',
      'Texto final de descripción.'
    ].join('\n'),
    acceptanceCriteria: [
      { index: 1, text: 'AC 1 con `backticks` y "comillas"', checked: true },
      { index: 2, text: 'AC 2 pendiente de verificación', checked: false }
    ],
    implementationPlan: '1. Diseñar scanner\n2. Ejecutar suite de pruebas',
    implementationNotes: 'Notas técnicas sobre rendimiento y zero-allocation.',
    finalSummary: 'Entrega completada exitosamente sin regresiones.',
    rawExtraFrontmatter: {
      custom_module: 'core-parser',
      custom_flag: true
    }
  };

  const serialized = serializeBacklogMd(complexTask);
  const parsed = parseBacklogMd(serialized);

  assert.strictEqual(parsed.id, complexTask.id);
  assert.strictEqual(parsed.title, complexTask.title);
  assert.strictEqual(parsed.status, complexTask.status);
  assert.strictEqual(parsed.type, complexTask.type);
  assert.strictEqual(parsed.priority, 'urgent'); // p0 serializa a urgent en Backlog.md
  assert.deepStrictEqual(parsed.assignees, complexTask.assignees);
  assert.deepStrictEqual(parsed.labels, complexTask.labels);
  assert.deepStrictEqual(parsed.dependencies, complexTask.dependencies);
  assert.strictEqual(parsed.estimate, 13);
  assert.strictEqual(parsed.startDate, complexTask.startDate);
  assert.strictEqual(parsed.dueDate, complexTask.dueDate);
  assert.strictEqual(parsed.description, complexTask.description);
  assert.deepStrictEqual(parsed.acceptanceCriteria, complexTask.acceptanceCriteria);
  assert.strictEqual(parsed.implementationPlan, complexTask.implementationPlan);
  assert.strictEqual(parsed.implementationNotes, complexTask.implementationNotes);
  assert.strictEqual(parsed.finalSummary, complexTask.finalSummary);
  assert.strictEqual(parsed.rawExtraFrontmatter?.custom_module, 'core-parser');
  assert.strictEqual(parsed.rawExtraFrontmatter?.custom_flag, true);

  // Idempotencia de segunda pasada
  const pass2 = serializeBacklogMd(parsed);
  assert.strictEqual(pass2, serialized, 'La segunda serialización debe ser idéntica a la primera');
});

runTest('48. Archivo con frontmatter vacío (--- \\n ---)', () => {
  const md = '---\n---\n## Description\nSolo contenido';
  const task = parseBacklogMd(md);
  assert.strictEqual(task.description, 'Solo contenido');
});

runTest('49. Estimaciones Fibonacci numéricas y T-shirt strings', () => {
  const fibTask = { id: 'DEV-FIB', title: 'Fib', status: 'draft', estimate: 5 };
  const sFib = serializeBacklogMd(fibTask);
  assert.ok(sFib.includes('estimate: 5'));
  assert.strictEqual(parseBacklogMd(sFib).estimate, 5);

  const tshirtTask = { id: 'DEV-TSHIRT', title: 'T-shirt', status: 'draft', estimate: 'XXL' };
  const sTshirt = serializeBacklogMd(tshirtTask);
  assert.ok(sTshirt.includes('estimate: "XXL"'));
  assert.strictEqual(parseBacklogMd(sTshirt).estimate, 'XXL');
});

runTest('50. Fechas de cronograma startDate y dueDate en roundtrip', () => {
  const task = {
    id: 'DEV-DATES',
    title: 'Dates test',
    status: 'draft',
    startDate: '2026-11-01',
    dueDate: '2026-11-15'
  };
  const s = serializeBacklogMd(task);
  const p = parseBacklogMd(s);
  assert.strictEqual(p.startDate, '2026-11-01');
  assert.strictEqual(p.dueDate, '2026-11-15');
});

runTest('51. Asignados múltiples con caracteres especiales', () => {
  const task = {
    id: 'DEV-ASSIGNEES',
    title: 'Assignees test',
    status: 'draft',
    assignees: ['@alice_dev', '@bob-qa', '@charlie.lead']
  };
  const s = serializeBacklogMd(task);
  const p = parseBacklogMd(s);
  assert.deepStrictEqual(p.assignees, task.assignees);
});

runTest('52. Idempotencia formal serialize(parse(serialize(x))) === serialize(x)', () => {
  const baseTask = {
    id: 'DEV-CANONICAL-ROUNDTRIP',
    title: 'Tarea de certificación de idempotencia',
    status: 'ready',
    type: 'feature',
    priority: 'p1',
    description: 'Descripción formal para certificación.',
    acceptanceCriteria: [
      { index: 1, text: 'Primer criterio certificado', checked: true },
      { index: 2, text: 'Segundo criterio certificado', checked: true }
    ],
    implementationPlan: 'Paso 1.\nPaso 2.',
    implementationNotes: 'Notas certificadas.',
    finalSummary: 'Cierre formal.'
  };

  const initial = serializeBacklogMd(baseTask);
  const pass1 = serializeBacklogMd(parseBacklogMd(initial));
  const pass2 = serializeBacklogMd(parseBacklogMd(pass1));
  const pass3 = serializeBacklogMd(parseBacklogMd(pass2));

  assert.strictEqual(pass1, initial);
  assert.strictEqual(pass2, pass1);
  assert.strictEqual(pass3, pass2);
});

console.log(`\n🎉 Suite completada con éxito: ${testsPassed}/52 pruebas pasaron cleanly!`);
