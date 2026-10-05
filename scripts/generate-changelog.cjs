#!/usr/bin/env node

/**
 * scripts/generate-changelog.cjs
 * DEV-122: Genera CHANGELOG.md en formato Keep a Changelog desde releases.json.
 *
 * `backlog/releases.json` es la fuente de verdad del proceso de release. Este
 * script la proyecta a un archivo Markdown legible, de modo que el changelog no
 * pueda desviarse de las releases reales.
 *
 * Decisión de diseño: el encabezado usa el formato `## [x.y.z] — fecha`, que es
 * exactamente el que el servidor MCP ya sabe releer de CHANGELOG.md como fuente
 * alternativa cuando `releases.json` no está disponible
 * (`scripts/mcp-server.ts`, fallback de notas de release). Escribirlo con otro
 * formato rompería ese fallback.
 *
 * Uso:  npm run changelog
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RELEASES_PATH = path.join(ROOT, 'backlog', 'releases.json');
const OUTPUT_PATH = path.join(ROOT, 'CHANGELOG.md');

// Orden de presentación: más reciente primero.
const semverCompare = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
};

/**
 * Normaliza el contenido de una release.
 *
 * Los `markdownContent` escritos a mano pueden traer la secuencia literal `\n` en
 * lugar de saltos de línea reales. Sin esta normalización, toda la release se
 * renderiza como un único párrafo con `\n` visibles en el medio.
 */
const normalizeMarkdown = (raw) => {
  if (!raw) return '';
  return String(raw).replace(/\\r\\n|\\n/g, '\n').trim();
};

function main() {
  if (!fs.existsSync(RELEASES_PATH)) {
    console.error(`❌ No se encontró ${RELEASES_PATH}`);
    process.exit(1);
  }

  let releases;
  try {
    releases = JSON.parse(fs.readFileSync(RELEASES_PATH, 'utf8'));
  } catch (err) {
    console.error(`❌ releases.json no es JSON válido: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(releases) || releases.length === 0) {
    console.error('❌ releases.json no contiene releases.');
    process.exit(1);
  }

  const released = releases
    .filter((r) => r && r.version && r.status === 'released')
    .sort((a, b) => semverCompare(a.version, b.version));

  const pending = releases.filter((r) => r && r.version && r.status !== 'released');

  const sections = released.map((release) => {
    const body = normalizeMarkdown(release.markdownContent);
    const fallbackTitle = `## [${release.version}]${release.date ? ` — ${release.date}` : ''}`;
    return body || `${fallbackTitle}\n\n_${release.summary || 'Sin detalles registrados.'}_`;
  });

  const pendingNote =
    pending.length > 0
      ? `\nEn preparación: ${pending.map((r) => `\`${r.version}\``).join(', ')}.\n`
      : '';

  const output = `# Changelog

Todas las novedades relevantes de gripm se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado es [SemVer](https://semver.org/lang/es/).

**Este archivo se genera automáticamente** desde \`backlog/releases.json\`, que es la
fuente de verdad del proceso de release. No editarlo a mano: para corregir una
entrada, modificar \`releases.json\` y ejecutar \`npm run changelog\`.

## [Unreleased]
${pendingNote}
---

${sections.join('\n\n---\n\n')}

---

## Enlaces

- [Guía de contribución](CONTRIBUTING.md)
- [Código de conducta](CODE_OF_CONDUCT.md)
- [Política de seguridad](SECURITY.md)
`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');

  console.log('📝 [gripm] CHANGELOG.md regenerado desde releases.json');
  console.log(`   Releases liberadas: ${released.length}`);
  if (pending.length > 0) {
    console.log(`   En preparación: ${pending.map((r) => r.version).join(', ')}`);
  }
  console.log(`   Archivo: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
