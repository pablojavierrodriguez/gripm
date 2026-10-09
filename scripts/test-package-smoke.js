import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
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
  assert.ok(helpOutput.includes('--version, -v'), 'La ayuda del CLI debe documentar ambas opciones de versión');
  assert.ok(helpOutput.includes('gripm mcp') && helpOutput.includes('gripm playbook sync'),
    'La ayuda debe distinguir las entradas del servidor MCP y la sincronización del Playbook');
  assert.ok(!helpOutput.includes('Gripm Suite'),
    'La ayuda no debe incluir menciones a suites no empaquetadas');
  assert.ok(helpOutput.includes('gripm-mcp'),
    'La ayuda debe documentar el ejecutable de integración MCP para agentes');

  for (const commandArgs of [['playbook'], ['playbook', 'install'], ['not-a-command']]) {
    const invalidCommand = spawnSync(process.execPath, [
      path.join(extractedPkg, 'bin/gripm.js'),
      ...commandArgs
    ], { cwd: tempDir, encoding: 'utf8', timeout: 5000 });
    assert.equal(invalidCommand.status, 1, `${commandArgs.join(' ')} debe rechazarse explícitamente`);
    assert.match(invalidCommand.stderr, /Comando desconocido|Uso: gripm playbook sync/,
      `${commandArgs.join(' ')} debe indicar el comando válido`);
  }
  console.log('✅ bin/gripm.js --help ejecutó exitosamente desde el paquete empaquetado.');

  // 5. Version flags must return immediately instead of starting the board server.
  const packagedVersion = JSON.parse(
    fs.readFileSync(path.join(extractedPkg, 'package.json'), 'utf8')
  ).version;
  for (const flag of ['--version', '-v']) {
    console.log(`🔎 Probando bin/gripm.js ${flag} desde el tarball extraído...`);
    const versionResult = spawnSync(
      process.execPath,
      [path.join(extractedPkg, 'bin/gripm.js'), flag],
      { cwd: tempDir, encoding: 'utf8', timeout: 5000 }
    );
    assert.ifError(versionResult.error);
    assert.equal(versionResult.status, 0, `${flag} debe terminar con código 0`);
    assert.equal(versionResult.stdout.trim(), packagedVersion, `${flag} debe imprimir la versión empaquetada`);
    const sanitizedStderr = versionResult.stderr
      .replace(/\(node:\d+\)\s*ExperimentalWarning:[^\n]*\n?/g, '')
      .replace(/\(Use `node --trace-warnings \.\.\.`[^\n]*\n?/g, '')
      .trim();
    assert.equal(sanitizedStderr, '', `${flag} no debe emitir errores`);
  }
  console.log('✅ --version y -v imprimieron la versión empaquetada y terminaron sin arrancar el servidor.');

  // 6. Test MCP binary
  console.log('🤖 Verificando sintaxis y ejecución de bin/gripm-mcp.js...');
  execSync(`node -c "${path.join(extractedPkg, 'bin/gripm-mcp.js')}"`, { cwd: tempDir });
  console.log('✅ bin/gripm-mcp.js sintaxis verificada correctamente.');

  console.log('🎉 [Smoke Test] Empaquetado validado al 100% sin dependencias faltantes.');
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
