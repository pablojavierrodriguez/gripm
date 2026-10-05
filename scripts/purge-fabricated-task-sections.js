#!/usr/bin/env node
/**
 * DEV-127: Migración que purga el contenido fabricado por el serializador.
 *
 * Hasta DEV-127, `scripts/backlogMdParser.ts` inyectaba tres valores por defecto
 * en los archivos .md de tareas cuando el campo venía vacío:
 *
 *   - Description:  "Sin descripción detallada."
 *   - AC:           "- [ ] #1 Criterio de aceptación inicial definido."
 *   - Plan:         "1. Investigar archivos afectados. / 2. Implementar solución
 *                    y pruebas. / 3. Validar con criterios de aceptación."
 *
 * Esos textos no los escribió nunca el autor, pero quedaron indistinguibles de su
 * contenido real y desactivaron el Plan Guard (que bloquea el paso a Doing de
 * ítems sin especificación).
 *
 * SEGURIDAD: el script es quirúrgico e idempotente.
 *   - Sólo borra cuando el contenido de la sección es EXACTAMENTE igual al
 *     default inyectado (comparación tras `trim`). Si el usuario escribió algo
 *     parecido pero distinto, no se toca.
 *   - Sólo borra la línea de AC de relleno si es el ÚNICO AC de la sección: si
 *     el usuario redactó ACs reales, se conservan todos.
 *   - Nunca toca menciones de esos textos en la prosa de una tarea (por ejemplo,
 *     una tarea que documenta este mismo bug).
 *   - No borra los marcadores de sección: la estructura del archivo se mantiene.
 *
 * Uso:
 *   npm run backlog:purge-fabricated                 # aplica los cambios
 *   npm run backlog:purge-fabricated -- --dry-run    # sólo informa
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const BACKLOG_DIR = join(process.cwd(), 'backlog');
const DRY_RUN = process.argv.includes('--dry-run');

// Defaults exactos que inyectaba el serializador. Deben coincidir con los
// históricos de scripts/backlogMdParser.ts y bin/devboard-mcp.js.
const FABRICATED_DESCRIPTION = 'Sin descripción detallada.';
const FABRICATED_AC_LINE = '- [ ] #1 Criterio de aceptación inicial definido.';
const FABRICATED_PLAN =
  '1. Investigar archivos afectados.\n2. Implementar solución y pruebas.\n3. Validar con criterios de aceptación.';

/** Patrones de las tres secciones delimitadas del formato de tarea. */
const DESCRIPTION_RE = /(<!--\s*SECTION:DESCRIPTION:BEGIN\s*-->)([\s\S]*?)(<!--\s*SECTION:DESCRIPTION:END\s*-->)/i;
const AC_RE = /(<!--\s*AC:BEGIN\s*-->)([\s\S]*?)(<!--\s*AC:END\s*-->)/i;
const PLAN_RE = /(<!--\s*SECTION:PLAN:BEGIN\s*-->)([\s\S]*?)(<!--\s*SECTION:PLAN:END\s*-->)/i;

/** Lista recursivamente los .md dentro de un directorio. */
const collectMarkdown = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectMarkdown(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Vacía el contenido capturado (grupo 2) de la sección, conservando los marcadores
 * de apertura y cierre, sólo si el contenido coincide exactamente con lo
 * fabricado. `mode` define la condición de coincidencia.
 *
 * Además normaliza el espaciado: una sección vacía se deja siempre como
 * `<!-- APERTURA -->\n<!-- CIERRE -->`, nunca con los marcadores pegados, para
 * que el archivo siga siendo legible y editable a mano.
 *
 * @param {string} content  Contenido completo del archivo
 * @param {RegExp} sectionRe Regex con grupos: (apertura)(contenido)(cierre)
 * @param {'exact'|'singleLine'} mode
 * @param {string} expected Texto fabricado esperado
 */
const purgeSection = (content, sectionRe, mode, expected) => {
  const match = content.match(sectionRe);
  if (!match) return { next: content, changed: false, normalized: false };

  const captured = match[2];
  const trimmed = captured.trim();

  // Sección ya vacía: sólo se normaliza el espaciado entre marcadores.
  if (trimmed.length === 0) {
    if (captured.includes('\n')) return { next: content, changed: false, normalized: false };
    const rebuilt = `${match[1]}\n${match[3]}`;
    const next = content.slice(0, match.index) + rebuilt + content.slice(match.index + match[0].length);
    return { next, changed: false, normalized: true };
  }

  const matches =
    mode === 'exact'
      ? trimmed === expected
      : trimmed.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') === expected;

  if (!matches) return { next: content, changed: false, normalized: false };

  // Se reconstruye la sección completa: se conserva el contenido fabricado fuera
  // y los marcadores sobreviven intactos, uno por línea.
  const rebuilt = `${match[1]}\n${match[3]}`;
  const next = content.slice(0, match.index) + rebuilt + content.slice(match.index + match[0].length);

  return { next, changed: true, normalized: false };
};

const targets = [];
for (const sub of ['tasks', 'archive']) {
  const dir = join(BACKLOG_DIR, sub);
  try {
    targets.push(...collectMarkdown(dir));
  } catch {
    // El subdirectorio puede no existir en un repo sin archive.
  }
}

let touched = 0;
const report = [];

for (const file of targets) {
  const original = readFileSync(file, 'utf8');
  const notes = [];

  const desc = purgeSection(original, DESCRIPTION_RE, 'exact', FABRICATED_DESCRIPTION);
  let next = desc.next;
  if (desc.changed) notes.push('descripción');
  else if (desc.normalized) notes.push('descripción (normalizada)');

  const ac = purgeSection(next, AC_RE, 'singleLine', FABRICATED_AC_LINE);
  next = ac.next;
  if (ac.changed) notes.push('AC de relleno');
  else if (ac.normalized) notes.push('AC (normalizada)');

  const plan = purgeSection(next, PLAN_RE, 'exact', FABRICATED_PLAN);
  next = plan.next;
  if (plan.changed) notes.push('plan genérico');
  else if (plan.normalized) notes.push('plan (normalizado)');

  if (next === original) continue;

  touched += 1;
  report.push({ file: basename(file), notes });
  if (!DRY_RUN) writeFileSync(file, next, 'utf8');
}

console.log('🔍 [DevBoard Migration] Purgando contenido fabricado de tareas (DEV-127)...');
console.log(`   Modo: ${DRY_RUN ? 'dry-run (sin escribir)' : 'aplicando'}`);
console.log(`   Archivos analizados: ${targets.length}`);

if (touched === 0) {
  console.log('   ℹ️  Ningún archivo contenía contenido fabricado. Nada que hacer.\n');
  process.exit(0);
}

for (const entry of report) {
  console.log(`   ✂️  ${entry.file}  [${entry.notes.join(', ')}]`);
}
console.log(`\n   ${DRY_RUN ? 'Se habrían purgado' : 'Purgados'} ${touched} archivo(s).`);
if (DRY_RUN) {
  console.log('   ℹ️  Ejecutá sin --dry-run para aplicar los cambios.\n');
} else {
  console.log('   ✅ Contenido fabricado eliminado. Los .md ahora reflejan sólo lo redactado.\n');
}
