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
  // 1. Empaquetar
  const packOut = execSync(`npm pack --pack-destination "${tmp}" --json`, {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(packOut);
  const filename = parsed[0].filename;
  tarballPath = path.join(tmp, filename);
  assert.ok(fs.existsSync(tarballPath), 'El tarball npm debe existir');

  // 2. AC #2 & #3: Inspeccionar contenido del tarball con tar -tzf
  const tarList = execSync(`tar -tzf "${tarballPath}"`, { encoding: 'utf8' });
  const skillCount = (tarList.match(/package\/\.agents\/skills\/gripm\/SKILL\.(en|es)\.md/g) || []).length;
  assert.ok(skillCount >= 2, `El tarball debe contener las plantillas SKILL.en.md y SKILL.es.md, encontradas: ${skillCount}`);

  const githooksCount = (tarList.match(/package\/\.githooks\/pre-commit/g) || []).length;
  assert.strictEqual(githooksCount, 1, `El tarball debe contener .githooks/pre-commit exactamente 1 vez, encontrados: ${githooksCount}`);

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

  console.log('✅ AC #2 & #3: las plantillas canónicas .agents y .githooks están en el tarball');
  console.log('✅ AC #4 & #5: Artefactos instalados >= 1000 bytes sin stubs degradados');
  console.log('✅ AC #6: Selección de idioma en plantillas validada para EN y ES');
  console.log('🎉 [Distribution Guard] Verificación de distribución de npm pasada con éxito!\n');
} finally {
  if (tarballPath && fs.existsSync(tarballPath)) {
    try { fs.rmSync(tarballPath, { force: true }); } catch {}
  }
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}
}
