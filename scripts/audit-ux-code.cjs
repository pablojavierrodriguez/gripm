#!/usr/bin/env node

/**
 * scripts/audit-ux-code.cjs
 * gripm — Static Code-Level UX & Ergonomics Auditor
 *
 * Escanea archivos en src/ para detectar firmas estáticas de errores de UX,
 * touch targets deficientes (< 44px), colisiones de scroll horizontal,
 * falta de min-w-0, accesibilidad en botones de icono, retroalimentación táctil,
 * texto explicativo truncado en diálogos y pérdida de estabilidad de layout por
 * scrollbar (CLS).
 *
 * Opt-out localizado (DEV-101, UX-009): una regla estática no puede distinguir con
 * certeza un mensaje explicativo de una etiqueta identificatoria de una línea. Para
 * los casos legítimos se permite silenciar el hallazgo escribiendo, en la línea
 * afectada o en la inmediatamente anterior:
 *
 *     {/* audit-ux:allow-UX-009 <razón> * /}
 *
 * El opt-out exige motivo escrito a propósito. No es un mecanismo para tapar
 * hallazgos: es un registro de por qué el hallazgo no aplica en ese punto.
 *
 * Baseline (DEV-166): el proyecto arrastra cientos de observaciones INFO de
 * micro-tipografía deliberada. Emitirlas siempre entrena al equipo a ignorar la
 * salida. `scripts/audit-ux-baseline.json` registra el conjunto aceptado y-known
 * y el auditor solo reporta el delta. Los ERROR nunca se silencian: el baseline
 * aplica exclusivamente a WARNING e INFO.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ROOT is the project being audited. __dirname/.. is correct for the repo and
// for consumers that install the script alongside their source. AUDIT_UX_ROOT
// points the auditor at another project explicitly, which is what the baseline
// regression suite uses to exercise snapshots without touching this repo.
const ROOT = process.env.AUDIT_UX_ROOT
  ? path.resolve(process.env.AUDIT_UX_ROOT)
  : path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
// The baseline lives next to the script, not inside the audited project: it
// describes this auditor's accepted findings, not the consumer's.
const BASELINE_PATH = path.join(__dirname, 'audit-ux-baseline.json');
const BASELINE_VERSION = 1;

const isStrict = process.argv.includes('--strict');
const updateBaseline = process.argv.includes('--update-baseline');
const findings = [];

/** ¿La línea o la anterior silencian este código de regla? Exige motivo escrito. */
function hasOptOut(lines, index, code) {
  const window = lines.slice(Math.max(0, index - 1), index + 1).join(' ');
  return window.includes(`audit-ux:allow-${code}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      auditFile(fullPath);
    }
  }
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(ROOT, filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. [UX-001] Atajo de teclado físico sin clase hidden sm:inline-flex
    if (
      (line.includes('<kbd') || line.includes('⌘') || line.includes('Ctrl+')) &&
      !line.includes('hidden sm:') &&
      !line.includes('hidden md:') &&
      !line.includes('useIsMobile')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-001',
        message: 'Atajo de teclado físico (⌘ / <kbd>) sin "hidden sm:inline-flex" para proteger viewports pequeños.',
      });
    }

    // 2. [UX-002] Touch Target Diminuto (< 36px) en Botones de Acción
    if (
      line.includes('<button') &&
      (line.includes('h-6 ') || line.includes('h-7 ') || line.includes('h-8 ') || line.includes('w-6 ') || line.includes('w-7 ') || line.includes('w-8 ')) &&
      !line.includes('p-') &&
      !line.includes('min-h-[44px]') &&
      !line.includes('min-w-[44px]') &&
      !line.includes('after:')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-002',
        message: 'Botón con altura o anchura ≤ 32px (h-6/h-7/h-8) sin padding compensatorio o hit-slop. Toque difícil en pantallas táctiles.',
      });
    }

    // 3. [UX-003] Botón con Icono sin Accesibilidad (aria-label o title)
    if (
      line.includes('<button') &&
      !line.includes('aria-label=') &&
      !line.includes('title=') &&
      (line.includes('rounded-full') || line.includes('rounded-xl') || line.includes('rounded-lg') || line.includes('p-1') || line.includes('p-1.5') || line.includes('p-2'))
    ) {
      const nextLines = lines.slice(index, index + 5).join(' ');
      if (
        (nextLines.includes('/>') || nextLines.includes('</button>')) &&
        (nextLines.includes('Icon') || nextLines.includes('Plus') || nextLines.includes('Trash') || nextLines.includes('X') || nextLines.includes('Chevron') || nextLines.includes('Settings') || nextLines.includes('Filter'))
      ) {
        findings.push({
          file: relPath,
          line: lineNum,
          severity: 'WARNING',
          code: 'UX-003',
          message: 'Botón iconográfico interactivo sin atributo aria-label ni title explicativo.',
        });
      }
    }

    // 4. [UX-004] Elemento Clickeable sin Feedback Visual Táctil (active:scale)
    if (
      line.includes('cursor-pointer') &&
      line.includes('onClick=') &&
      !line.includes('active:scale-') &&
      !line.includes('active:bg-') &&
      !line.includes('hover:bg-')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-004',
        message: 'Elemento interactivo con onClick sin retroalimentación visual táctil (active:scale-[0.98] o active:bg-...).',
      });
    }

    // 5. [UX-005] Flex Horizontal sin min-w-0 en Hijos desplazables
    if (
      line.includes('flex items-center justify-between') &&
      !line.includes('min-w-0') &&
      (filePath.includes('ItemCard') || filePath.includes('Kanban') || filePath.includes('FilterBar'))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-005',
        message: 'Contenedor flex sin "min-w-0". En títulos extensos puede generar desbordes horizontales o empujar controles fuera de la columna.',
      });
    }

    // 6. [UX-006] Tamaños Arbitrarios de Texto
    const arbitraryTextMatch = line.match(/\btext-\[(?:9|10|11|13|15)px\]/);
    if (arbitraryTextMatch) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-006',
        message: `Uso de tamaño de texto arbitrario "${arbitraryTextMatch[0]}". Se recomienda la escala canónica de Tailwind (text-xs, text-sm, text-base).`,
      });
    }

    // 7. [UX-009] Texto truncado en componentes de diálogo (DEV-101)
    // Un "truncate" en un diálogo corta la oración con elipsis y oculta el impacto
    // real de lo que el usuario está por confirmar. En cajas de detalle o mensajes
    // explicativos corresponde "break-words leading-relaxed" en su lugar.
    const isDialogComponent = /Modal|Dialog/.test(path.basename(filePath));
    if (isDialogComponent && /\btruncate\b/.test(line) && !hasOptOut(lines, index, 'UX-009')) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-009',
        message:
          'Clase "truncate" en un componente de diálogo. Si el texto es explicativo o una caja de detalle, la elipsis oculta el impacto real de la confirmación: usar "break-words leading-relaxed". Si es una etiqueta identificatoria de una línea (nombre de archivo, ruta, código), silenciar con un comentario audit-ux:allow-UX-009 y su motivo.',
      });
    }
  });
}

/**
 * [UX-010] Estabilidad de layout: el elemento raíz `html` debe reservar siempre el
 * espacio de la barra de desplazamiento.
 *
 * Sin `overflow-y: scroll` + `scrollbar-gutter: stable`, la barra aparece y desaparece
 * entre vistas de distinta altura y produce un desplazamiento horizontal brusco del
 * encabezado (CLS). Es un requisito duro documentado en AGENTS.md, no una preferencia.
 */
function auditGlobalCss() {
  const cssPath = path.join(SRC, 'index.css');
  if (!fs.existsSync(cssPath)) {
    findings.push({
      file: 'src/index.css',
      line: 0,
      severity: 'ERROR',
      code: 'UX-010',
      message: 'No se encontró src/index.css. No se puede verificar la estabilidad del gutter de scroll.',
    });
    return;
  }

  const css = fs.readFileSync(cssPath, 'utf8');
  const relPath = 'src/index.css';
  const htmlBlock = css.match(/(^|[,\s}])html\s*\{([\s\S]*?)\}/);
  const block = htmlBlock ? htmlBlock[2] : '';

  const requirements = [
    { prop: 'overflow-y: scroll', why: 'fuerza la barra siempre visible y evita el salto de ancho entre vistas' },
    { prop: 'scrollbar-gutter: stable', why: 'reserva el canal de la barra de forma permanente y previene el CLS horizontal' },
  ];

  if (!htmlBlock) {
    findings.push({
      file: relPath,
      line: 0,
      severity: 'ERROR',
      code: 'UX-010',
      message: 'No se encontró un bloque "html { ... }" en index.css donde declarar la estabilidad del scrollbar.',
    });
    return;
  }

  for (const { prop, why } of requirements) {
    if (!block.includes(prop)) {
      findings.push({
        file: relPath,
        line: 0,
        severity: 'ERROR',
        code: 'UX-010',
        message: `Falta "${prop}" dentro del bloque "html" de index.css: ${why}.`,
      });
    }
  }
}

console.log('\n=====================================================');
console.log('🔍 GRIPM: STATIC UX & ERGONOMICS AUDITOR');
console.log('=====================================================\n');

walk(SRC);
auditGlobalCss();

// ---------------------------------------------------------------------------
// Baseline (DEV-166)
// ---------------------------------------------------------------------------

/**
 * Adjunta la línea fuente a cada hallazgo para poder fingerprintearlo.
 *
 * Lee cada archivo una sola vez: el auditor recorre el árbol entero en cada
 * corrida y un `readFileSync` por hallazgo sería O(n) en disco.
 */
function attachSource(all) {
  const cache = new Map();

  for (const finding of all) {
    if (!cache.has(finding.file)) {
      const full = path.join(ROOT, finding.file);
      try {
        cache.set(finding.file, fs.readFileSync(full, 'utf8').split('\n'));
      } catch {
        cache.set(finding.file, null);
      }
    }

    const lines = cache.get(finding.file);
    finding.source = lines && finding.line > 0 ? lines[finding.line - 1] : '';
  }

  return all;
}

/**
 * Identidad estable de un hallazgo, invariante a la posición en el archivo.
 *
 * Usa el código de regla, la ruta y la línea fuente normalizada en lugar del
 * número de línea: insertar una línea arriba no debe volver obsoleto el
 * snapshot, pero cambiar el código que produce el hallazgo sí debe.
 */
function fingerprint(finding) {
  const source = finding.source || '';
  const normalized = source.replace(/\s+/g, ' ').trim();
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);

  return `${finding.code}|${finding.file}|${digest}`;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return { version: BASELINE_VERSION, entries: {} };

  try {
    const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    if (parsed.version !== BASELINE_VERSION) {
      console.warn(
        `⚠️  Baseline con formato v${parsed.version}, el auditor espera v${BASELINE_VERSION}. ` +
        'Regeneralo con: npm run audit:ux -- --update-baseline',
      );
      return { version: BASELINE_VERSION, entries: {} };
    }
    return parsed;
  } catch (err) {
    console.error(`❌ audit-ux: no se pudo leer ${BASELINE_PATH}: ${err.message}`);
    process.exit(2);
  }
}

function writeBaseline(baselinable) {
  const entries = {};
  for (const finding of baselinable) {
    const key = fingerprint(finding);
    entries[key] = (entries[key] || 0) + 1;
  }

  const sorted = {};
  for (const key of Object.keys(entries).sort()) sorted[key] = entries[key];

  const payload = {
    $comment:
      'Snapshot de observaciones UX conocidas y aceptadas (DEV-166). ' +
      'Regenerar deliberadamente con: npm run audit:ux -- --update-baseline',
    version: BASELINE_VERSION,
    generatedAt: new Date().toISOString(),
    total: baselinable.length,
    entries: sorted,
  };

  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

/**
 * Separa los hallazgos en los ya aceptados por el baseline y los nuevos.
 * Un ERROR jamás se silencia: el baseline solo absorbe WARNING e INFO.
 */
function diffAgainstBaseline(all) {
  const baseline = loadBaseline();
  const accepted = new Set(Object.keys(baseline.entries || {}));
  const remaining = new Map(Object.entries(baseline.entries || {}));

  const baselinable = all.filter(f => f.severity !== 'ERROR');
  const regressions = [];
  const carriedOver = [];

  for (const finding of all) {
    if (finding.severity === 'ERROR' || !accepted.has(fingerprint(finding))) {
      regressions.push(finding);
      continue;
    }

    const key = fingerprint(finding);
    const left = remaining.get(key) || 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      carriedOver.push(finding);
    } else {
      // Más ocurrencias que el snapshot: la primera ya estaba, las extras son nuevas.
      regressions.push(finding);
    }
  }

  return { baseline, baselinable, regressions, carriedOver };
}

const { baselinable, regressions, carriedOver } = diffAgainstBaseline(attachSource(findings));

if (updateBaseline) {
  const written = writeBaseline(baselinable);
  console.log(
    `📸 Baseline actualizado: ${written.total} observaciones conocidas registradas en ` +
    `${path.relative(ROOT, BASELINE_PATH)} (${Object.keys(written.entries).length} firmas únicas).`,
  );
}

const reported = updateBaseline ? [] : regressions;
const knownCount = updateBaseline ? 0 : carriedOver.length;

const errors = reported.filter(f => f.severity === 'ERROR');
const warnings = reported.filter(f => f.severity === 'WARNING');
const infos = reported.filter(f => f.severity === 'INFO');

if (reported.length === 0) {
  console.log('✅ CERO observaciones nuevas de UX en src/.');
  console.log(
    `🎉 Sin regresiones contra el baseline (${knownCount} observaciones conocidas y aceptadas).\n`,
  );
  process.exit(0);
} else {
  console.log(`Se encontraron ${reported.length} observaciones de UX en el código:\n`);
  reported.forEach(f => {
    const icon = f.severity === 'ERROR' ? '❌' : f.severity === 'WARNING' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${f.code}] ${f.file}:${f.line}`);
    console.log(`   ${f.message}\n`);
  });

  console.log('=====================================================');
  console.log(`Resumen: ${errors.length} errores, ${warnings.length} advertencias, ${infos.length} sugerencias.`);
  console.log(`Baseline: ${knownCount} observaciones conocidas omitidas.`);
  console.log('=====================================================\n');

  if (isStrict && (errors.length > 0 || warnings.length > 0)) {
    console.error('⛔ Modo estricto activado: Fallo por advertencias/errores de UX.');
    process.exit(1);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}
