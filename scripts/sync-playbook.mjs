#!/usr/bin/env node

/**
 * Agentic Team Playbook Synchronizer & Updater
 * 
 * Fetches and synchronizes the canonical skills, rules, and methodology
 * from https://github.com/pablojavierrodriguez/gripm-playbook
 * 
 * Architecture Principle: Separation of Layers
 * - Framework Layer (Updated): .agents/skills/*, .agents/TEAM_PLAYBOOK.md
 * - Project Layer (Preserved): AGENTS.md, backlog/*, project-specific settings
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REMOTE = 'pablojavierrodriguez/gripm-playbook';
const DEFAULT_BRANCH = 'main';

// Canonical framework files to synchronize
export const CANONICAL_FRAMEWORK_FILES = [
  '.agents/TEAM_PLAYBOOK.md',
  '.agents/rules/git-workflow.md',
  '.agents/skills/pm-orchestrator/SKILL.md',
  '.agents/skills/market-researcher/SKILL.md',
  '.agents/skills/worldclass-product-designer/SKILL.md',
  '.agents/skills/principal-engineer/SKILL.md',
  '.agents/skills/rigorous-qa-auditor/SKILL.md',
  '.agents/skills/code-level-ux-auditor/SKILL.md',
  '.agents/skills/mobile-ux-design/SKILL.md',
  '.agents/skills/forms-rhf-zod/SKILL.md',
  '.agents/skills/pwa-assets-audit/SKILL.md',
  '.agents/skills/recharts-reporting/SKILL.md',
  '.agents/skills/ui-radix-tailwind/SKILL.md',
  'docs/sprints/SPRINT_SPEC_TEMPLATE.md'
];

/**
 * Downloads a single file from GitHub raw content
 */
async function fetchRemoteFile(remoteRepo, branch, relativePath) {
  const url = `https://raw.githubusercontent.com/${remoteRepo}/${branch}/${relativePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } catch (err) {
    throw new Error(`No se pudo descargar ${url}: ${err.message}`);
  }
}

/**
 * Main synchronizer function
 */
export async function runPlaybookSync(targetRepo = process.cwd(), options = {}) {
  const remote = options.remote || DEFAULT_REMOTE;
  const branch = options.branch || DEFAULT_BRANCH;
  const isDryRun = !!options.dryRun;
  const force = !!options.force;

  console.log(`
┌────────────────────────────────────────────────────────────┐
│  ⚡ Agentic Team Playbook Synchronizer                      │
│                                                            │
│  📁 Repositorio local: ${path.resolve(targetRepo).slice(0, 36).padEnd(36)}│
│  🌐 Upstream:          ${`${remote}@${branch}`.slice(0, 36).padEnd(36)}│
└────────────────────────────────────────────────────────────┘
  `);

  console.log(`🔍 Conectando con ${remote} (rama: ${branch})...`);

  let updatedCount = 0;
  let skippedCount = 0;
  let createdCount = 0;
  const errors = [];

  for (const relativePath of CANONICAL_FRAMEWORK_FILES) {
    const targetFile = path.join(targetRepo, relativePath);
    const targetDir = path.dirname(targetFile);

    try {
      const remoteContent = await fetchRemoteFile(remote, branch, relativePath);
      if (remoteContent === null) {
        // File doesn't exist on remote, skip
        continue;
      }

      const fileExisted = fs.existsSync(targetFile);
      let isIdentical = false;

      if (fileExisted) {
        const localContent = fs.readFileSync(targetFile, 'utf8');
        isIdentical = localContent === remoteContent;
      }

      if (isIdentical && !force) {
        skippedCount++;
        continue;
      }

      if (!isDryRun) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(targetFile, remoteContent, 'utf8');
      }

      if (fileExisted) {
        console.log(`  🔄 [Actualizado] ${relativePath}`);
        updatedCount++;
      } else {
        console.log(`  ✨ [Creado]      ${relativePath}`);
        createdCount++;
      }
    } catch (err) {
      console.error(`  ❌ [Error]       ${relativePath}: ${err.message}`);
      errors.push({ file: relativePath, error: err.message });
    }
  }

  // Capa de Proyecto: Gestión segura de AGENTS.md
  const agentsMdPath = path.join(targetRepo, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    console.log(`  🛡️  [Preservado]   AGENTS.md (configuraciones específicas del proyecto conservadas intactas).`);
  } else {
    // Si no existe, podemos inicializarlo con la plantilla base si el usuario lo desea
    try {
      const template = await fetchRemoteFile(remote, branch, 'AGENTS.md');
      if (template && !isDryRun) {
        fs.writeFileSync(agentsMdPath, template, 'utf8');
        console.log(`  ✨ [Inicializado] AGENTS.md (plantilla base creada; personalizala con tu stack).`);
        createdCount++;
      }
    } catch {
      // Ignorar si falla la plantilla de AGENTS.md
    }
  }

  console.log('\n📊 Resumen de sincronización:');
  console.log(`   - Archivos creados:      ${createdCount}`);
  console.log(`   - Archivos actualizados: ${updatedCount}`);
  console.log(`   - Archivos sin cambios:  ${skippedCount}`);
  if (errors.length > 0) {
    console.log(`   - Errores de descarga:   ${errors.length}`);
  }

  if (errors.length === 0) {
    console.log('\n✅ El repositorio cuenta ahora con la última versión canónica del Agentic Team Playbook.\n');
  } else {
    console.log('\n⚠️  La sincronización concluyó con algunas advertencias.\n');
  }

  return { createdCount, updatedCount, skippedCount, errors };
}

// Standalone execution support
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = process.argv.slice(2);
  let targetRepo = process.cwd();
  const repoIdx = args.findIndex(a => a === '--repo' || a === '-r');
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    targetRepo = path.resolve(args[repoIdx + 1]);
  }

  const branchIdx = args.findIndex(a => a === '--branch' || a === '-b');
  const branch = branchIdx !== -1 ? args[branchIdx + 1] : DEFAULT_BRANCH;

  const remoteIdx = args.findIndex(a => a === '--remote');
  const remote = remoteIdx !== -1 ? args[remoteIdx + 1] : DEFAULT_REMOTE;

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  runPlaybookSync(targetRepo, { branch, remote, dryRun, force }).catch(err => {
    console.error('Error fatal al sincronizar Playbook:', err);
    process.exit(1);
  });
}
