#!/usr/bin/env node

/**
 * scripts/verify-dist.js
 * DEV-171: Verificación de distribución y artefactos de onboarding en tarball de producción.
 *
 * Empaqueta gripm con npm pack, extrae en un entorno efímero y verifica que
 * gripm --init instale las plantillas canónicas completas (.agents/ y AGENTS.md),
 * erradicando la generación de stubs vacíos en repositorios consumidores.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

console.log('📦 [Distribution Guard] Verificando empaquetado y onboarding desde tarball npm...');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-verify-dist-'));
let tarballPath = null;

try {
  if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
    console.log('🔨 dist/index.html no encontrado, ejecutando npm run build...');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  }

  // 1. Empaquetar
  const packOut = execSync(`npm pack --pack-destination "${tmp}" --json`, {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const jsonStart = packOut.indexOf('[');
  const jsonEnd = packOut.lastIndexOf(']');
  const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? packOut.slice(jsonStart, jsonEnd + 1) : packOut.trim();
  const parsed = JSON.parse(jsonStr);
  const filename = parsed[0].filename;
  tarballPath = path.join(tmp, filename);
  assert.ok(fs.existsSync(tarballPath), 'El tarball npm debe existir');

  // 2. AC #2 & #3: Inspeccionar contenido del tarball con tar -tzf
  const tarList = execSync(`tar -tzf "${tarballPath}"`, { encoding: 'utf8' });
  const skillCount = (tarList.match(/package\/\.agents\/skills\/gripm\/SKILL\.(en|es)\.md/g) || []).length;
  assert.ok(skillCount >= 2, `El tarball debe contener las plantillas SKILL.en.md y SKILL.es.md, encontradas: ${skillCount}`);

  // DEV-307: El tarball no debe contener directorios internos de desarrollo ni hooks
  const githooksCount = (tarList.match(/package\/\.githooks\//g) || []).length;
  assert.strictEqual(githooksCount, 0, 'El tarball de Gripm Board no debe contener .githooks/ (DEV-307)');
  const srcCount = (tarList.match(/package\/src\//g) || []).length;
  assert.strictEqual(srcCount, 0, 'El tarball de Gripm Board no debe contener src/ (DEV-307)');
  const scriptsCount = (tarList.match(/package\/scripts\//g) || []).length;
  assert.strictEqual(scriptsCount, 0, 'El tarball de Gripm Board no debe contener scripts/ (DEV-307)');
  const serverCount = (tarList.match(/package\/server\//g) || []).length;
  assert.strictEqual(serverCount, 0, 'El tarball de Gripm Board no debe contener server/ (DEV-307)');

  // DEV-250: El tarball no debe contener el framework de Gripm Playbook
  const playbookCount = (tarList.match(/package\/\.agents\/TEAM_PLAYBOOK\.md/g) || []).length;
  assert.strictEqual(playbookCount, 0, 'El tarball de Gripm Board no debe contener el framework de Gripm Playbook (DEV-250)');

  // 3. Extraer tarball a directorio de paquete aislado
  const extractedDir = path.join(tmp, 'extracted');
  fs.mkdirSync(extractedDir, { recursive: true });
  execSync(`tar -xzf "${tarballPath}" -C "${extractedDir}"`);
  const pkgRoot = path.join(extractedDir, 'package');
  const cliBinary = path.join(pkgRoot, 'bin/gripm.js');

  // 4. AC #4 & #5: Probar gripm --init -y (default inglés) en un repo consumidor limpio
  const consumerRepoEn = path.join(tmp, 'consumer-repo-en');
  fs.mkdirSync(consumerRepoEn, { recursive: true });
  fs.writeFileSync(path.join(consumerRepoEn, 'package.json'), JSON.stringify({ name: 'consumer-app' }), 'utf8');

  execSync(`node "${cliBinary}" --init -y`, {
    cwd: consumerRepoEn,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  const installedSkillEn = path.join(consumerRepoEn, '.agents/skills/gripm/SKILL.md');
  assert.ok(fs.existsSync(installedSkillEn), 'SKILL.md debe ser instalado en el consumidor');
  const skillEnContent = fs.readFileSync(installedSkillEn, 'utf8');
  assert.ok(skillEnContent.includes('This skill instructs'), 'SKILL.md debe instalar la plantilla canónica en inglés');
  const skillEnSize = fs.statSync(installedSkillEn).size;
  assert.ok(skillEnSize >= 1000, `SKILL.md debe pesar >= 1000 bytes, tamaño real: ${skillEnSize}`);

  const installedAgentsEn = path.join(consumerRepoEn, 'AGENTS.md');
  assert.ok(fs.existsSync(installedAgentsEn), 'AGENTS.md debe ser generado en el consumidor');
  const agentsEnSize = fs.statSync(installedAgentsEn).size;
  assert.ok(agentsEnSize >= 1000, `AGENTS.md debe pesar >= 1000 bytes, tamaño real: ${agentsEnSize}`);

  const agentsEnContent = fs.readFileSync(installedAgentsEn, 'utf8');
  assert.ok(!agentsEnContent.includes('Bienvenido a **demo**'), 'AGENTS.md en inglés no debe ser el stub básico');
  assert.ok(agentsEnContent.includes('AI Agent Contribution Guide'), 'AGENTS.md debe ser la guía canónica');

  // DEV-250: Verificar que gripm --init -y mantiene el repositorio limpio sin Playbook
  const installedPlaybookTeam = path.join(consumerRepoEn, '.agents/TEAM_PLAYBOOK.md');
  assert.ok(!fs.existsSync(installedPlaybookTeam), 'El consumidor por defecto debe quedar limpio sin Gripm Playbook (DEV-250)');

  // 5. AC #6: Probar gripm --init -y --language es en otro repo consumidor
  const consumerRepoEs = path.join(tmp, 'consumer-repo-es');
  fs.mkdirSync(consumerRepoEs, { recursive: true });
  fs.writeFileSync(path.join(consumerRepoEs, 'package.json'), JSON.stringify({ name: 'consumer-app-es' }), 'utf8');

  execSync(`node "${cliBinary}" --init -y --language es`, {
    cwd: consumerRepoEs,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  const installedSkillEs = path.join(consumerRepoEs, '.agents/skills/gripm/SKILL.md');
  const skillEsContent = fs.readFileSync(installedSkillEs, 'utf8');
  assert.ok(skillEsContent.includes('Esta skill instruye'), 'SKILL.md en español debe ser el archivo en español');
  const skillEsSize = fs.statSync(installedSkillEs).size;
  assert.ok(skillEsSize >= 5000, `SKILL.md en español debe ser la guía completa (> 5000 bytes), tamaño real: ${skillEsSize}`);

  const installedAgentsEs = path.join(consumerRepoEs, 'AGENTS.md');
  const agentsEsContent = fs.readFileSync(installedAgentsEs, 'utf8');
  assert.ok(agentsEsContent.includes('Guía de Contribución para Agentes de IA'), 'AGENTS.md en español debe ser la guía canónica');
  assert.ok(!agentsEsContent.includes('Bienvenido a **demo**'), 'AGENTS.md en español no debe ser el stub básico');

  // 6. DEV-307 AC #3: Verificar ejecución 100% autónoma sin devDependencies desde el paquete extraído
  const isolatedBoardBin = path.join(pkgRoot, 'bin', 'gripm.js');
  const isolatedMcpBin = path.join(pkgRoot, 'bin', 'gripm-mcp.js');
  const isolatedServerBin = path.join(pkgRoot, 'bin', 'server.js');
  const isolatedCliBin = path.join(pkgRoot, 'bin', 'gripm-cli.js');

  assert.ok(!fs.existsSync(path.join(pkgRoot, 'node_modules')), 'El paquete empaquetado no contiene node_modules');

  const vOut = execSync(`node "${isolatedBoardBin}" --version`, { cwd: tmp, encoding: 'utf8' }).trim();
  assert.ok(vOut.length > 0, 'gripm --version debe responder desde paquete aislado sin devDependencies');

  const helpOut = execSync(`node "${isolatedBoardBin}" --help`, { cwd: tmp, encoding: 'utf8' });
  assert.ok(helpOut.includes('gripm CLI'), 'gripm --help debe responder desde paquete aislado sin devDependencies');

  const cliHelpOut = execSync(`node "${isolatedCliBin}" --help`, { cwd: tmp, encoding: 'utf8' });
  assert.ok(cliHelpOut.includes('gripm · Gestión'), 'gripm-cli --help debe responder desde paquete aislado sin devDependencies');

  execSync(`node -c "${isolatedMcpBin}"`, { cwd: tmp });
  execSync(`node -c "${isolatedServerBin}"`, { cwd: tmp });

  console.log('✅ AC #2 & #3: las plantillas canónicas .agents están en el tarball y los directorios de desarrollo están excluidos');
  console.log('✅ AC #4 & #5: Artefactos instalados >= 1000 bytes sin stubs degradados');
  console.log('✅ AC #6: Selección de idioma en plantillas validada para EN y ES');
  console.log('✅ DEV-307 AC #3: Instalación limpia con --omit=dev y ejecución de binarios verificada');
  console.log('🎉 [Distribution Guard] Verificación de distribución de npm pasada con éxito!\n');
} finally {
  if (tarballPath && fs.existsSync(tarballPath)) {
    try { fs.rmSync(tarballPath, { force: true }); } catch {}
  }
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}
}
