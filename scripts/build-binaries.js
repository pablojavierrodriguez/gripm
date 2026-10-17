import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BIN_DIR = path.join(ROOT_DIR, 'bin');

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

console.log('📦 Empaquetando ejecutables standalone para distribución (DEV-015 y DEV-016)...');

// 1. Bundle mcp-server.ts into bin/gripm-mcp.js (zero-flags, sin --experimental-strip-types)
//    `target: 'node18'` es un nivel de SINTAXIS que declara esbuild, no un piso de runtime
//    medido. El piso real del consumidor es `engines.node` (>=20.0.0), verificado ejecutando
//    el tarball en Node 20.0.0 y 20.20.2. Nadie ha medido 18: no se afirma que funcione.
await esbuild.build({
  entryPoints: [path.join(ROOT_DIR, 'scripts/mcp-server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: path.join(BIN_DIR, 'gripm-mcp.js'),
  external: ['fsevents']
});

// 2. Bundle server/plugin.ts into bin/server.js (pure JS backend middleware, zero TS runtime dependency)
await esbuild.build({
  entryPoints: [path.join(ROOT_DIR, 'server/plugin.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: path.join(BIN_DIR, 'server.js'),
  external: ['fsevents', 'vite']
});

// 3. Bundle scripts/gripm-cli.ts into bin/gripm-cli.js
await esbuild.build({
  entryPoints: [path.join(ROOT_DIR, 'scripts/gripm-cli.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: path.join(BIN_DIR, 'gripm-cli.js'),
  external: ['fsevents']
});

// 4. Bundle scripts/gripm-runner.js into bin/gripm.js (pure standalone CLI, zero scripts/ or src/ runtime dependencies)
await esbuild.build({
  entryPoints: [path.join(ROOT_DIR, 'scripts/gripm-runner.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: path.join(BIN_DIR, 'gripm.js'),
  external: ['fsevents', 'vite']
});

fs.chmodSync(path.join(BIN_DIR, 'gripm-mcp.js'), 0o755);
if (fs.existsSync(path.join(BIN_DIR, 'server.js'))) {
  fs.chmodSync(path.join(BIN_DIR, 'server.js'), 0o755);
}
if (fs.existsSync(path.join(BIN_DIR, 'gripm-cli.js'))) {
  fs.chmodSync(path.join(BIN_DIR, 'gripm-cli.js'), 0o755);
}
if (fs.existsSync(path.join(BIN_DIR, 'gripm.js'))) {
  fs.chmodSync(path.join(BIN_DIR, 'gripm.js'), 0o755);
}

console.log('✅ bin/gripm.js, bin/gripm-mcp.js, bin/server.js y bin/gripm-cli.js generados con éxito.');
console.log('✅ Ejecutables canónicos gripm y gripm-mcp listos en bin/.');

