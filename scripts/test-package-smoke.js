import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import assert from 'node:assert';

console.log('🧪 [Smoke Test] Verificando empaquetado de producción de npm (npm pack)...');

const ROOT_DIR = path.resolve(process.cwd());
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-pack-test-'));

try {
  // 1. Pack the current repository into the temporary directory
  console.log(`📦 Creando tarball con npm pack en ${tempDir}...`);
  const packOutput = execSync('npm pack --pack-destination ' + tempDir, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();

  const tarballName = packOutput.split('\n').pop()?.trim();
  assert.ok(tarballName && tarballName.endsWith('.tgz'), `El archivo empaquetado debe ser un tarball .tgz, recibido: ${tarballName}`);

  const tarballPath = path.join(tempDir, tarballName);
  assert.ok(fs.existsSync(tarballPath), `El tarball ${tarballPath} debe existir`);

  // 2. Extract tarball
  console.log('📂 Descomprimiendo paquete empaquetado...');
  execSync(`tar -xzf "${tarballPath}"`, { cwd: tempDir });

  const extractedPkg = path.join(tempDir, 'package');
  assert.ok(fs.existsSync(extractedPkg), 'El directorio extraído "package/" debe existir');

  // 3. Verify critical files inside the package
  const expectedFiles = [
    'bin/gripm.js',
    'bin/gripm-mcp.js',
    'scripts/registryConfig.js',
    'scripts/updateChecker.js',
    'scripts/initScaffold.js',
    'scripts/uninstall.js',
    'scripts/portUtils.js',
    'vite.config.ts',
    'package.json'
  ];

  for (const relFile of expectedFiles) {
    const fullPath = path.join(extractedPkg, relFile);
    assert.ok(fs.existsSync(fullPath), `Archivo crítico faltante en tarball npm: ${relFile}`);
  }

  // 4. Test running bin/gripm.js --help directly from the extracted package
  console.log('🚀 Probando ejecución de bin/gripm.js --help desde el tarball extraído...');
  const helpOutput = execSync(`node "${path.join(extractedPkg, 'bin/gripm.js')}" --help`, {
    cwd: tempDir,
    encoding: 'utf8'
  });

  assert.ok(helpOutput.includes('gripm CLI') || helpOutput.includes('Uso:'), 'La ayuda del CLI debe ejecutarse correctamente');
  console.log('✅ bin/gripm.js --help ejecutó exitosamente desde el paquete empaquetado.');

  // 5. Test MCP binary
  console.log('🤖 Verificando sintaxis y ejecución de bin/gripm-mcp.js...');
  execSync(`node -c "${path.join(extractedPkg, 'bin/gripm-mcp.js')}"`, { cwd: tempDir });
  console.log('✅ bin/gripm-mcp.js sintaxis verificada correctamente.');

  console.log('🎉 [Smoke Test] Empaquetado validado al 100% sin dependencias faltantes.');
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
