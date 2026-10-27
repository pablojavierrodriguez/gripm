import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { resolveProjectIdentity } from './registryConfig.js';
import {
  PRESETS,
  COCKPIT_MODULES,
  REPO_ASSETS,
  renderManifest,
  getSkillTemplate,
  getAgentsMdTemplate
} from './init/catalog.js';
import {
  promptLanguage,
  promptSuite,
  promptIdentity,
  promptSpeed,
  promptPreset,
  promptMethodology,
  promptMode,
  promptMultiSelect,
  promptConfirm
} from './init/prompts.js';
import {
  writeConfig,
  ensureTasksDir,
  registerInHub,
  writeSkill,
  writeAgentsMd,
  writePackageJsonScripts,
  writeGitignore
} from './init/writers.js';
import { delegatePlaybookInit } from './init/playbookDelegate.js';

// Re-export templates for full backward compatibility
export { getSkillTemplate, getAgentsMdTemplate };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

/**
 * Runs the interactive or non-interactive init wizard.
 */
export async function runInitWizard(targetRepo = process.cwd(), options = {}) {
  const isInteractive = options.isInteractive !== false && Boolean(process.stdin.isTTY) && !options.yes;
  const detectedIdentity = resolveProjectIdentity(targetRepo);

  let projectName = options.name || detectedIdentity.name;
  let projectId = options.id || detectedIdentity.id;
  let codePrefix = options.codePrefix || detectedIdentity.codePrefix;
  let language = (options.language || options.lang || 'en').toLowerCase();
  if (language !== 'es') language = 'en';

  let isEn = language === 'en';

  console.log(`
  ${isEn ? 'gripm · Repository Initialization Wizard' : 'gripm · Asistente de Inicialización'}

  ➜  ${isEn ? 'Repository:' : 'Repositorio:'}  ${targetRepo}
  ➜  ${isEn ? 'Project:' : 'Proyecto:'}     ${projectName}
`);

  // Product suite flags
  let installBoard = options.board !== undefined ? Boolean(options.board) : (options.noBoard ? false : true);
  let installPlaybook = options.playbook !== undefined
    ? Boolean(options.playbook)
    : (options.withPlaybook ? true : (options.noPlaybook ? false : false));

  // Adoption profile & capabilities setup
  let profile = options.profile || (options.minimal ? 'minimal' : (options.full ? 'full' : null));
  let speedMode = options.speedMode || (profile ? 'quick' : null);
  const basePreset = PRESETS[profile || 'minimal'] || PRESETS.minimal;

  let mode = options.mode || (options.hub || options.multi ? 'multi' : (options.single ? 'single' : basePreset.mode));
  let methodology = options.methodology || basePreset.methodology;
  let modules = { ...basePreset.modules, ...(options.modules || {}) };
  let enabledTabs = {
    ...basePreset.enabledTabs,
    ...(options.enabledTabs || {})
  };

  // Synchronize options overrides if passed
  if (options.enabledTabs?.sprint !== undefined) modules.sprint = options.enabledTabs.sprint;
  if (options.modules?.sprint !== undefined) enabledTabs.sprint = options.modules.sprint;

  let estimation = options.estimation || { ...basePreset.estimation };
  let kanban = options.kanban || { ...basePreset.kanban };

  let installSkill = options.skill !== undefined ? options.skill : basePreset.assets.skill;
  let installAgentsMd = options.agentsMd !== undefined
    ? options.agentsMd
    : (profile === 'minimal' ? false : true);
  let updatePkgJson = options.packageJson !== undefined ? options.packageJson : basePreset.assets.packageJson;
  let updateGitignore = options.gitignore !== undefined ? options.gitignore : basePreset.assets.gitignore;

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log(isEn ? '  Initial configuration:\n' : '  Configuración inicial:\n');

      // 1. Language
      language = await promptLanguage(rl);
      isEn = language === 'en';

      // 2. Suite Products
      const suiteChoice = await promptSuite(rl, isEn);
      if (suiteChoice === 'board') {
        installBoard = true;
        installPlaybook = false;
      } else if (suiteChoice === 'playbook') {
        installBoard = false;
        installPlaybook = true;
      } else if (suiteChoice === 'both') {
        installBoard = true;
        installPlaybook = true;
      } else if (suiteChoice === 'none') {
        installBoard = false;
        installPlaybook = false;
        console.log(isEn ? '\n  ℹ️  Initialization cancelled.' : '\n  ℹ️  Inicialización cancelada.');
        return {
          projectName,
          projectId,
          codePrefix,
          mode,
          language,
          profile: 'none',
          cancelled: true
        };
      }

      // 3. Project Identity
      const identity = await promptIdentity(rl, projectName, codePrefix, isEn);
      projectName = identity.projectName;
      projectId = identity.projectId;
      codePrefix = identity.codePrefix;

      // 4. Configuration Speed (if Board is selected)
      if (installBoard) {
        speedMode = await promptSpeed(rl, isEn);

        if (speedMode === 'quick') {
          profile = await promptPreset(rl, isEn);
          const chosenPreset = PRESETS[profile] || PRESETS.minimal;
          methodology = chosenPreset.methodology;
          mode = chosenPreset.mode;
          modules = { ...chosenPreset.modules };
          enabledTabs = { ...chosenPreset.enabledTabs };
          estimation = { ...chosenPreset.estimation };
          kanban = { ...chosenPreset.kanban };
          installSkill = chosenPreset.assets.skill;
          installAgentsMd = chosenPreset.assets.agentsMd;
          updatePkgJson = chosenPreset.assets.packageJson;
          updateGitignore = chosenPreset.assets.gitignore;

          // Manifest & Confirmation
          console.log('\n' + renderManifest({
            methodology,
            mode,
            modules,
            estimation,
            kanban,
            assets: {
              skill: installSkill,
              agentsMd: installAgentsMd && !installPlaybook,
              packageJson: updatePkgJson,
              gitignore: updateGitignore
            },
            playbook: installPlaybook
          }, isEn));

          const confirmed = await promptConfirm(
            rl,
            isEn ? 'Proceed with this configuration?' : '¿Proceder con esta configuración?',
            true
          );

          if (!confirmed) {
            console.log(isEn ? '  ℹ️  Switching to Component-by-Component mode...\n' : '  ℹ️  Cambiando a modo Componente por Componente...\n');
            speedMode = 'granular';
          }
        }

        if (speedMode === 'granular') {
          profile = 'custom';
          mode = await promptMode(rl, isEn);
          methodology = await promptMethodology(rl, isEn);

          // Modules multi-select
          const defaultModuleIndices = [0]; // releases on by default
          if (methodology === 'scrum' || methodology === 'scrumban') {
            defaultModuleIndices.push(1); // sprints on
          }

          const selectedModules = await promptMultiSelect(
            rl,
            isEn ? '4.3 Cockpit Modules:' : '4.3 Módulos del Cockpit:',
            COCKPIT_MODULES,
            defaultModuleIndices,
            isEn
          );

          const selectedKeys = new Set(selectedModules.map(m => m.key));
          modules = {
            release: selectedKeys.has('release'),
            sprint: selectedKeys.has('sprint'),
            timeline: selectedKeys.has('timeline'),
            metrics: selectedKeys.has('metrics'),
            calendar: selectedKeys.has('calendar')
          };
          enabledTabs = {
            kanban: true,
            release: modules.release,
            sprint: modules.sprint,
            timeline: modules.timeline,
            metrics: modules.metrics
          };
          estimation = {
            enabled: selectedKeys.has('estimation'),
            method: 'fibonacci'
          };
          kanban = {
            showIdeasByDefault: selectedKeys.has('ideas'),
            showDoneHistoryByDefault: false,
            wipLimits: {
              'col-doing': 0,
              'col-review': 0,
              'col-ready': 0
            }
          };

          // Repo Assets multi-select
          const defaultAssetIndices = [0, 2, 3]; // skill, package.json, gitignore
          if (!installPlaybook) {
            defaultAssetIndices.push(1); // agents.md only if playbook is not selected
          }

          const selectedAssets = await promptMultiSelect(
            rl,
            isEn ? '4.4 Repository Assets:' : '4.4 Artefactos en el Repositorio:',
            REPO_ASSETS,
            defaultAssetIndices,
            isEn
          );

          const assetKeys = new Set(selectedAssets.map(a => a.key));
          installSkill = assetKeys.has('skill');
          installAgentsMd = assetKeys.has('agentsMd');
          updatePkgJson = assetKeys.has('packageJson');
          updateGitignore = assetKeys.has('gitignore');
        }
      }
    } finally {
      rl.close();
    }
  } else {
    // Non-interactive fallback: if no profile specified, default to minimal
    if (!profile) {
      profile = 'minimal';
    }
  }

  const results = {
    projectName,
    projectId,
    codePrefix,
    mode,
    language,
    profile,
    methodology,
    modules,
    enabledTabs,
    gripmConfig: false,
    tasksDir: false,
    tasksDirCreated: false,
    tasksSeeded: false,
    skill: false,
    agentsMd: false,
    playbook: false,
    packageJson: false,
    gitignore: false,
    registeredInHub: false
  };

  const isEnOutput = language === 'en';
  console.log(isEnOutput ? '\n  ⚙️  Applying configuration...\n' : '\n  ⚙️  Aplicando configuración elegida...\n');

  // --- Step 1: Gripm Board Configuration ---
  if (installBoard) {
    // 1. Config file (.gripm/config.json)
    const savedConfig = writeConfig(targetRepo, {
      projectName,
      projectId,
      codePrefix,
      language,
      mode,
      methodology,
      modules,
      enabledTabs,
      kanban,
      estimation
    }, isEnOutput);
    results.gripmConfig = true;
    results.enabledTabs = savedConfig.enabledTabs;
    results.modules = savedConfig.modules;

    // 2. Tasks directory
    const dirResult = ensureTasksDir(targetRepo, isEnOutput);
    results.tasksDir = true;
    results.tasksDirCreated = dirResult.created;

    // 3. Multi-project hub registration
    if (mode === 'multi') {
      results.registeredInHub = registerInHub(targetRepo, {
        projectId,
        projectName,
        codePrefix
      }, isEnOutput);
    } else {
      console.log(isEnOutput
        ? '  🔒 Single-Project mode active: Self-contained execution without external dependencies'
        : '  🔒 Modo Mono-Proyecto activo: Ejecución autocontenida sin dependencias externas'
      );
    }

    // 4. Agent skill (.agents/skills/gripm/SKILL.md)
    if (installSkill) {
      writeSkill(targetRepo, language, isEnOutput);
      results.skill = true;
    }

    // 5. AGENTS.md guide:
    // Anti-collision invariant: If Playbook is chosen, Board MUST NOT generate AGENTS.md
    if (installAgentsMd && !installPlaybook) {
      writeAgentsMd(targetRepo, projectName, language, options.force, isEnOutput);
      results.agentsMd = true;
    } else if (installPlaybook) {
      console.log(isEnOutput
        ? '  ℹ️  AGENTS.md generation delegated to Gripm Playbook'
        : '  ℹ️  Generación de AGENTS.md delegada a Gripm Playbook'
      );
    }

    // 6. package.json scripts
    if (updatePkgJson) {
      results.packageJson = writePackageJsonScripts(targetRepo, isEnOutput);
    }

    // 7. .gitignore rules
    if (updateGitignore) {
      results.gitignore = writeGitignore(targetRepo, isEnOutput);
    }
  }

  // --- Step 2: Gripm Playbook Delegation ---
  if (installPlaybook) {
    const playbookSuccess = delegatePlaybookInit(targetRepo, {
      language,
      projectName,
      yes: options.yes,
      mode: profile === 'full' ? 'quick' : (speedMode === 'quick' ? 'quick' : undefined)
    }, isEnOutput);
    results.playbook = playbookSuccess;
  } else {
    console.log(isEnOutput
      ? '  ✨ Clean repository: Gripm Board configured without Playbook.'
      : '  ✨ Repositorio limpio: Gripm Board configurado sin Playbook.'
    );
  }

  // --- Step 3: Success Instructions ---
  if (isEnOutput) {
    console.log(`
  ✔ gripm initialized successfully!

  To open the board:
  • npm run board
    (or direct: npx @gripm/board)

  To start the MCP server:
  • npm run mcp
    (or: npx -p @gripm/board gripm-mcp)

  Tip: Run 'npm install -g @gripm/board'
  to use the global direct command 'gripm'.
`);
  } else {
    console.log(`
  ✔ ¡gripm inicializado con éxito!

  Para abrir el tablero:
  • npm run board
    (o directo: npx @gripm/board)

  Para iniciar el servidor MCP:
  • npm run mcp
    (o: npx -p @gripm/board gripm-mcp)

  Consejo: Ejecuta 'npm install -g @gripm/board'
  para usar el comando global directo 'gripm'.
`);
  }

  return results;
}
