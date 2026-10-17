import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadRegistryFile, saveRegistryFile, resolveProjectIdentity } from './registryConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

/**
 * Embedded canonical SKILL.md template for consumer repositories
 */
export function getSkillTemplate(language = 'en') {
  const isEn = String(language).toLowerCase() === 'en';
  const skillFile = isEn ? 'SKILL.en.md' : 'SKILL.es.md';
  const sourceGripmSkill = path.join(PKG_ROOT, '.agents/skills/gripm', skillFile);
  if (fs.existsSync(sourceGripmSkill)) {
    try {
      return fs.readFileSync(sourceGripmSkill, 'utf8');
    } catch {}
  }

  const baseGripm = path.join(PKG_ROOT, '.agents/skills/gripm/SKILL.md');
  if (fs.existsSync(baseGripm)) {
    try {
      return fs.readFileSync(baseGripm, 'utf8');
    } catch {}
  }

  console.warn(`⚠️  [gripm init] ADVERTENCIA: No se encontró la plantilla canónica de skill en "${sourceGripmSkill}". Generando stub básico.`);
  return '# gripm Agent Skill\n';
}

const CANONICAL_AGENTS_EN = `# AI Agent Contribution Guide (AGENTS.md)

Welcome to **{{projectName}}**. When working on this repository, AI agents (Antigravity, Cursor, Claude Code) and human developers must strictly adhere to the following guidelines:

## 1. Dogfooding and Living Backlog
- **Every code modification must be associated with a task in \`backlog/tasks/\`**.
- Move the task to \`doing\` before writing code.
- Check acceptance criteria (\`- [x]\`) live as they are completed.
- **Canonical Limit of Development: Only up to \`ready\`**. The agent NEVER promotes a task to \`done\` during the sprint. The \`ready\` status (Ready for Release) is the terminal development state in a sprint.
- The \`done\` status belongs exclusively to formally released versions.
- Include the task \`.md\` file in the same commit as the code changes.

## 2. gripm MCP Server
Use gripm tools (\`gripm-mcp\` or \`npm run mcp\`):
- \`gripm_list_tasks\`: Token-efficient task listing and filtering.
- \`gripm_get_task\`: Read full task details and acceptance criteria.
- \`gripm_update_task\`: Update status, plan, and check criteria sequentially.
- \`gripm_sync_backlog\`: Automatically reconcile tasks and regenerate \`BACKLOG.md\`.

## 3. Pre-Commit Safeguards & Developer Sovereignty
- **Prohibited \`git commit\` by Deduction**: The agent only stages workspace changes and validates tests and typing (\`tsc\`). Execute \`git commit\` **solely upon explicit textual instruction from the user**.
- **Zero Inferred Releases**: Belonging to a sprint does not imply having a release assigned. Release fields remain unassigned until explicitly set by the user.
`;

const CANONICAL_AGENTS_ES = `# Guía de Contribución para Agentes de IA (AGENTS.md)

Bienvenido a **{{projectName}}**. Al trabajar en este repositorio, tanto agentes de IA (Antigravity, Cursor, Claude Code) como desarrolladores humanos deben adherirse a las siguientes normas:

## 1. Dogfooding y Backlog Vivo
- **Toda modificación de código debe estar asociada a una tarea en \`backlog/tasks/\`**.
- Pasa la tarea a \`doing\` antes de comenzar a codificar.
- Tilda los criterios de aceptación (\`- [x]\`) en vivo a medida que se cumplan.
- **Límite Canónico del Desarrollo: Sólo hasta \`ready\`**. El agente NUNCA promueve una tarea a \`done\` durante el sprint. El estado \`ready\` (Ready for Release) es el estado terminal del desarrollo en el sprint.
- El estado \`done\` pertenece exclusivamente al Release formalmente liberado.
- Incluye el archivo \`.md\` de la tarea en el mismo commit que el código.

## 2. Servidor MCP de gripm
Usa las herramientas de gripm (\`gripm-mcp\` o \`npm run mcp\`):
- \`gripm_list_tasks\`: Lista y filtra tareas con mínimo consumo de tokens.
- \`gripm_get_task\`: Lee detalles y criterios de aceptación.
- \`gripm_update_task\`: Actualiza estado, plan y tilda criterios secuencialmente.
- \`gripm_sync_backlog\`: Reconcilia tareas y regenera \`BACKLOG.md\` automáticamente.

## 3. Salvaguarda Pre-Commit y Soberanía del Desarrollador
- **Prohibido \`git commit\` por deducción**: El agente solo prepara los cambios en el árbol de trabajo y valida pruebas y tipado (\`tsc\`). Se ejecuta \`git commit\` **única y exclusivamente ante una orden textual y explícita del usuario**.
- **Cero Releases Falsos**: Pertenecer a un sprint no implica tener versión asignada. Los campos de release permanecen sin asignar hasta decisión expresa del usuario.
`;

/**
 * Embedded canonical AGENTS.md template for consumer repositories
 */
export function getAgentsMdTemplate(projectName, language = 'en') {
  const isEn = String(language).toLowerCase() === 'en';
  const filename = isEn ? 'AGENTS.en.md' : 'AGENTS.es.md';
  const primaryPath = path.join(PKG_ROOT, 'scripts', 'templates', filename);
  const fallbackPath = path.join(PKG_ROOT, '.agents', filename);
  const templatePath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;
  if (fs.existsSync(templatePath)) {
    try {
      return fs.readFileSync(templatePath, 'utf8').replace(/\{\{projectName\}\}/g, projectName);
    } catch {}
  }

  const embedded = isEn ? CANONICAL_AGENTS_EN : CANONICAL_AGENTS_ES;
  return embedded.replace(/\{\{projectName\}\}/g, projectName);
}

/**
 * Runs the interactive or non-interactive init wizard.
 */
export async function runInitWizard(targetRepo = process.cwd(), options = {}) {
  const isInteractive = options.isInteractive !== false && process.stdin.isTTY && !options.yes;
  const detectedIdentity = resolveProjectIdentity(targetRepo);
  let projectName = options.name || detectedIdentity.name;
  let projectId = options.id || detectedIdentity.id;
  let codePrefix = options.codePrefix || detectedIdentity.codePrefix;
  let language = (options.language || options.lang || 'en').toLowerCase();
  if (language !== 'es') language = 'en';

  const isEn = language === 'en';
  console.log(`
  ${isEn ? 'gripm · Repository Initialization Wizard' : 'gripm · Asistente de Inicialización'}

  ➜  ${isEn ? 'Repository:' : 'Repositorio:'}  ${targetRepo}
  ➜  ${isEn ? 'Project:' : 'Proyecto:'}     ${projectName}
`);

  let mode = options.mode || (options.hub ? 'multi' : 'single');
  let profile = options.profile || (options.minimal ? 'minimal' : (options.full ? 'full' : null));
  let methodology = options.methodology || (profile === 'full' ? 'scrum' : 'kanban');
  let enabledTabs = options.enabledTabs || {
    kanban: true,
    sprint: profile === 'full',
    release: true
  };
  let installSkill = options.skill !== undefined ? options.skill : true;
  let installAgentsMd = options.agentsMd !== undefined ? options.agentsMd : (profile === 'minimal' ? false : true);
  let installPlaybook = options.playbook !== undefined ? Boolean(options.playbook) : (options.withPlaybook ? true : false);
  let updatePkgJson = options.packageJson !== undefined ? options.packageJson : true;
  let updateGitignore = options.gitignore !== undefined ? options.gitignore : true;

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('  Initial configuration / Configuración inicial:\n');

      // Question 1: Language
      const langAnswer = await rl.question(
        '  1. Language / Idioma:\n' +
        '     [1] English (en) [Default]\n' +
        '     [2] Español (es)\n' +
        '     Select option / Selecciona opción [1]: '
      );
      if (langAnswer.trim() === '2' || langAnswer.trim().toLowerCase() === 'es') {
        language = 'es';
      } else {
        language = 'en';
      }
      const isEn = language === 'en';

      // Question 2: Project Name
      const nameAnswer = await rl.question(
        isEn
          ? `\n  2. Project name [${projectName}]: `
          : `\n  2. Nombre del proyecto [${projectName}]: `
      );
      if (nameAnswer.trim()) {
        projectName = nameAnswer.trim();
        projectId = projectName.toLowerCase().replace(/^@[^/]+\//, '').replace(/[^a-z0-9_-]/g, '-');
        codePrefix = projectName.replace(/^@[^/]+\//, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'PROJ';
      }

      // Question 3: Adoption Profile
      const profilePrompt = isEn
        ? '\n  3. Adoption Profile:\n' +
          '     [1] Minimalist AI-First (Recommended: Pure Kanban, no timeboxes or ceremonies, tasks & skill only)\n' +
          '     [2] Batteries Included (Full Scrum with Sprints, Releases and AGENTS.md)\n' +
          '     [3] Custom (Manual configuration of each add-on and setting)\n' +
          '     Select option [1]: '
        : '\n  3. Perfil de Adopción:\n' +
          '     [1] Minimalista AI-First (Recomendado: Kanban puro, sin timeboxes ni ceremonias, solo tareas y skill)\n' +
          '     [2] Baterías Incluidas (Scrum completo con Sprints, Releases y AGENTS.md)\n' +
          '     [3] Personalizado (Configuración manual de cada add-on y opción)\n' +
          '     Selecciona opción [1]: ';
      const profileAnswer = await rl.question(profilePrompt);

      const trimmedProfile = profileAnswer.trim();
      if (trimmedProfile === '2') {
        profile = 'full';
        methodology = 'scrum';
        enabledTabs = { kanban: true, sprint: true, release: true };
        installAgentsMd = true;
      } else if (trimmedProfile === '3') {
        profile = 'custom';
      } else {
        profile = 'minimal';
        methodology = 'kanban';
        enabledTabs = { kanban: true, sprint: false, release: true };
        installAgentsMd = false;
      }

      if (profile === 'custom') {
        // Mode
        const modePrompt = isEn
          ? '\n  3.1 Instantiation Mode:\n' +
            '      [1] Single-Project (Recommended: isolated, self-contained board for this repo)\n' +
            '      [2] Multi-Project (Register in global Hub to view alongside other repositories)\n' +
            '      Select option [1]: '
          : '\n  3.1 Modo de Instanciación:\n' +
            '      [1] Mono-Proyecto (Recomendado: tablero aislado y autocontenido para este repo)\n' +
            '      [2] Multi-Proyecto (Registrar en el Hub global para verlo junto a otros repositorios)\n' +
            '      Selecciona opción [1]: ';
        const modeAnswer = await rl.question(modePrompt);
        if (modeAnswer.trim() === '2') {
          mode = 'multi';
        } else {
          mode = 'single';
        }

        // Methodology
        const methPrompt = isEn
          ? '\n  3.2 Methodology:\n' +
            '      [1] Pure Kanban (Continuous flow, no sprint timeboxes)\n' +
            '      [2] Scrum / Sprints (Timeboxes and active sprints)\n' +
            '      Select option [1]: '
          : '\n  3.2 Metodología:\n' +
            '      [1] Kanban puro (Flujo continuo, sin timeboxes de sprint)\n' +
            '      [2] Scrum / Sprints (Timeboxes y sprints activos)\n' +
            '      Selecciona opción [1]: ';
        const methAnswer = await rl.question(methPrompt);
        if (methAnswer.trim() === '2') {
          methodology = 'scrum';
          enabledTabs.sprint = true;
        } else {
          methodology = 'kanban';
          enabledTabs.sprint = false;
        }

        // Skill
        const skillPrompt = isEn
          ? '\n  3.3 Install agent skill (.agents/skills/gripm/SKILL.md)? (Y/n) [Y]: '
          : '\n  3.3 ¿Instalar skill para agentes (.agents/skills/gripm/SKILL.md)? (S/n) [S]: ';
        const skillAnswer = await rl.question(skillPrompt);
        installSkill = skillAnswer.trim().toLowerCase() !== 'n';

        // AGENTS.md
        const agentsPrompt = isEn
          ? '  3.4 Generate agent governance guide (AGENTS.md)? (Y/n) [Y]: '
          : '  3.4 ¿Generar guía de gobernanza para agentes (AGENTS.md)? (S/n) [S]: ';
        const agentsAnswer = await rl.question(agentsPrompt);
        installAgentsMd = agentsAnswer.trim().toLowerCase() !== 'n';

        // package.json scripts
        const pkgPrompt = isEn
          ? '  3.5 Configure start scripts ("board", "mcp") in package.json? (Y/n) [Y]: '
          : '  3.5 ¿Configurar scripts de inicio ("board", "mcp") en package.json? (S/n) [S]: ';
        const pkgAnswer = await rl.question(pkgPrompt);
        updatePkgJson = pkgAnswer.trim().toLowerCase() !== 'n';

        // Gripm Playbook
        const playbookPrompt = isEn
          ? '  3.7 Install Gripm Playbook (@gripm/playbook) with agent roles & UX audit? (y/N) [N]: '
          : '  3.7 ¿Instalar Gripm Playbook (@gripm/playbook) con roles de equipo de agentes y auditoría de UX? (s/N) [N]: ';
        const playbookAnswer = await rl.question(playbookPrompt);
        installPlaybook = isEn
          ? /^y(es)?$/i.test(playbookAnswer.trim())
          : /^(s|si|sí)$/i.test(playbookAnswer.trim());
      } else {
        // Question 4 for standard profiles (Minimalist / Full)
        const playbookPrompt = isEn
          ? '\n  4. Do you want to install Gripm Playbook (@gripm/playbook) with agent roles (PM, Principal Engineer, QA, Designer) and UX audit? (y/N) [N]: '
          : '\n  4. ¿Deseas instalar también Gripm Playbook (@gripm/playbook) con roles de agentes (PM, Principal Engineer, QA, Designer) y auditoría de UX? (s/N) [N]: ';
        const playbookAnswer = await rl.question(playbookPrompt);
        installPlaybook = isEn
          ? /^y(es)?$/i.test(playbookAnswer.trim())
          : /^(s|si|sí)$/i.test(playbookAnswer.trim());
      }

    } finally {
      rl.close();
    }
  }

  const isEnOutput = language === 'en';
  console.log(isEnOutput ? '\n  ⚙️  Applying configuration...\n' : '\n  ⚙️  Aplicando configuración elegida...\n');
  const results = {
    projectName,
    projectId,
    mode,
    language,
    profile,
    methodology,
    enabledTabs,
    gripmConfig: false,
    tasksDir: false,
    skill: false,
    agentsMd: false,
    playbook: false,
    packageJson: false,
    gitignore: false,
    registeredInHub: false
  };

  // 1. Ensure .gripm/ directory and config.json (canonical)
  const gripmDir = path.join(targetRepo, '.gripm');
  if (!fs.existsSync(gripmDir)) {
    fs.mkdirSync(gripmDir, { recursive: true });
  }

  const configFile = path.join(gripmDir, 'config.json');
  let currentConfig = {
    projectName,
    projectId,
    codePrefix,
    language,
    theme: 'dark',
    density: 'comfortable',
    autoSave: true,
    mode,
    methodology,
    enabledTabs,
    kanban: {
      showIdeasByDefault: false,
      showDoneHistoryByDefault: false,
      wipLimits: {
        'col-doing': 0,
        'col-review': 0,
        'col-ready': 0
      }
    },
    version: '1.0.0'
  };

  const existingConfigPath = fs.existsSync(configFile) ? configFile : null;
  if (existingConfigPath) {
    try {
      const existing = JSON.parse(fs.readFileSync(existingConfigPath, 'utf8'));
      currentConfig = {
        ...existing,
        mode,
        language: options.language || options.lang || existing.language || language,
        projectName: existing.projectName || projectName,
        projectId: existing.projectId || projectId,
        codePrefix: existing.codePrefix || codePrefix,
        methodology: options.methodology || (profile ? methodology : (existing.methodology || methodology)),
        enabledTabs: options.enabledTabs || (profile ? enabledTabs : (existing.enabledTabs || enabledTabs))
      };
    } catch {}
  }
  fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2) + '\n', 'utf8');
  results.gripmConfig = true;
  const isEnCurrent = (currentConfig.language || language) === 'en';
  console.log(isEnCurrent
    ? `  ✅ .gripm/config.json saved (Project: ${projectName}, Language: ${currentConfig.language}, Mode: ${mode === 'single' ? 'Single-Project' : 'Multi-Project Hub'})`
    : `  ✅ .gripm/config.json guardado (Proyecto: ${projectName}, Idioma: ${currentConfig.language}, Modo: ${mode === 'single' ? 'Mono-Proyecto' : 'Multi-Proyecto Hub'})`
  );

  // 2. Ensure backlog/tasks directory (Idempotent and non-destructive)
  const tasksDir = path.join(targetRepo, 'backlog/tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
    console.log(isEnCurrent ? '  ✅ backlog/tasks/ directory created for Markdown tasks' : '  ✅ Directorio backlog/tasks/ creado para tareas Markdown');
  } else {
    console.log(isEnCurrent ? '  ℹ️  Existing backlog/tasks/ directory preserved' : '  ℹ️  Directorio backlog/tasks/ existente preservado');
  }
  results.tasksDir = true;

  // 3. Handle Hub Registration if multi mode, or isolate if single
  if (mode === 'multi') {
    try {
      const registry = loadRegistryFile(PKG_ROOT);
      const existingIdx = registry.projects.findIndex(p => p.id === projectId || (p.repoPath && path.resolve(p.repoPath) === path.resolve(targetRepo)));

      const meta = {
        id: projectId,
        name: projectName,
        codePrefix,
        repoPath: path.resolve(targetRepo),
        storageType: 'markdown',
        backlogDir: 'backlog',
        createdAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...meta };
      } else {
        registry.projects.unshift(meta);
      }
      registry.activeProjectId = projectId;
      saveRegistryFile(registry, PKG_ROOT);
      results.registeredInHub = true;
      console.log(isEnCurrent ? '  ✅ Project registered in global Hub (~/.gripm/registry.json)' : '  ✅ Proyecto registrado en el Hub global (~/.gripm/registry.json)');
    } catch (err) {
      console.warn(isEnCurrent ? '  ⚠️ Could not register in global Hub:' : '  ⚠️ No se pudo registrar en el Hub global:', err.message);
    }
  } else {
    console.log(isEnCurrent ? '  🔒 Single-Project mode active: Self-contained execution without external dependencies' : '  🔒 Modo Mono-Proyecto activo: Ejecución autocontenida sin dependencias externas');
  }

  // 4. Install Agent Skill
  if (installSkill) {
    const skillContent = getSkillTemplate(currentConfig.language || language);

    // Canonical skill installation (.agents/skills/gripm)
    const gripmSkillDir = path.join(targetRepo, '.agents/skills/gripm');
    if (!fs.existsSync(gripmSkillDir)) {
      fs.mkdirSync(gripmSkillDir, { recursive: true });
    }
    fs.writeFileSync(path.join(gripmSkillDir, 'SKILL.md'), skillContent, 'utf8');

    results.skill = true;
    console.log(isEnCurrent
      ? `  ✅ Agent skill installed at .agents/skills/gripm/SKILL.md (${currentConfig.language || language})`
      : `  ✅ Skill para agentes instalada en .agents/skills/gripm/SKILL.md (${currentConfig.language || language})`
    );
  }

  // 5. Generate AGENTS.md
  if (installAgentsMd) {
    const agentsMdPath = path.join(targetRepo, 'AGENTS.md');
    if (!fs.existsSync(agentsMdPath) || options.force) {
      fs.writeFileSync(agentsMdPath, getAgentsMdTemplate(projectName, currentConfig.language || language), 'utf8');
      results.agentsMd = true;
      console.log(isEnCurrent
        ? `  ✅ Governance guide generated at AGENTS.md (${currentConfig.language || language})`
        : `  ✅ Guía de gobernanza generada en AGENTS.md (${currentConfig.language || language})`
      );
    } else {
      console.log(isEnCurrent ? '  ℹ️  Existing AGENTS.md preserved' : '  ℹ️  AGENTS.md existente preservado');
      results.agentsMd = true;
    }
  }

  // 6. Configure package.json scripts
  if (updatePkgJson) {
    const hostPkgPath = path.join(targetRepo, 'package.json');
    if (fs.existsSync(hostPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(hostPkgPath, 'utf8'));
        pkg.scripts = pkg.scripts || {};
        let modified = false;

        const canonicalBoard = 'gripm 2>/dev/null || npx -y @gripm/board';
        const canonicalMcp = 'gripm-mcp 2>/dev/null || npx -y -p @gripm/board gripm-mcp';

        if (!pkg.scripts.board || !pkg.scripts.board.includes('gripm')) {
          pkg.scripts.board = canonicalBoard;
          modified = true;
        }
        if (!pkg.scripts.mcp || !pkg.scripts.mcp.includes('gripm')) {
          pkg.scripts.mcp = canonicalMcp;
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(hostPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
          console.log(isEnCurrent ? '  ✅ Scripts "board" and "mcp" added to package.json' : '  ✅ Scripts "board" y "mcp" agregados a package.json');
        } else {
          console.log(isEnCurrent ? '  ℹ️  package.json scripts were already configured' : '  ℹ️  Scripts de package.json ya estaban configurados');
        }
        results.packageJson = true;
      } catch (err) {
        console.warn(isEnCurrent ? '  ⚠️ Could not update package.json:' : '  ⚠️ No se pudo actualizar package.json:', err.message);
      }
    }
  }

  // 7. Configure .gitignore
  if (updateGitignore) {
    const gitignorePath = path.join(targetRepo, '.gitignore');
    const ignoreLines = [
      '',
      '# gripm local cache',
      '.gripm/update-cache.json',
      '.gripm/*.tmp'
    ].join('\n');

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.gripm/update-cache.json')) {
        fs.appendFileSync(gitignorePath, ignoreLines + '\n', 'utf8');
        console.log(isEnCurrent ? '  ✅ gripm rules added to .gitignore' : '  ✅ Reglas de gripm añadidas a .gitignore');
      } else {
        console.log(isEnCurrent ? '  ℹ️  .gitignore already contained gripm rules' : '  ℹ️  .gitignore ya contenía las reglas de gripm');
      }
    } else {
      fs.writeFileSync(gitignorePath, ignoreLines.trim() + '\n', 'utf8');
      console.log(isEnCurrent ? '  ✅ .gitignore file created with gripm rules' : '  ✅ Archivo .gitignore creado con reglas de gripm');
    }
    results.gitignore = true;
  }

  // 8. Gripm Playbook optional installation (DEV-250)
  if (installPlaybook) {
    try {
      console.log(isEnCurrent ? '  📦 Synchronizing Gripm Playbook (@gripm/playbook)...' : '  📦 Sincronizando Gripm Playbook (@gripm/playbook)...');
      const syncScript = path.join(PKG_ROOT, 'scripts', 'sync-playbook.mjs');
      if (fs.existsSync(syncScript)) {
        const { runPlaybookSync } = await import(pathToFileURL(syncScript).href);
        await runPlaybookSync(targetRepo, { yes: true });
        results.playbook = true;
        console.log(isEnCurrent ? '  ✅ Gripm Playbook synchronized successfully.' : '  ✅ Gripm Playbook sincronizado con éxito.');
      } else {
        const { execFileSync } = await import('node:child_process');
        const isWin = process.platform === 'win32';
        execFileSync(isWin ? 'npx.cmd' : 'npx', ['-y', '@gripm/playbook', 'sync', '--repo', targetRepo, '--yes'], { stdio: 'inherit', shell: isWin });
        results.playbook = true;
        console.log(isEnCurrent ? '  ✅ Gripm Playbook synchronized successfully via npm (@gripm/playbook).' : '  ✅ Gripm Playbook sincronizado con éxito desde npm (@gripm/playbook).');
      }
    } catch (err) {
      console.warn(isEnCurrent ? '  ⚠️ Could not synchronize Gripm Playbook automatically:' : '  ⚠️ No se pudo sincronizar Gripm Playbook automáticamente:', err.message);
    }
  } else {
    console.log(isEnCurrent ? '  ✨ Clean repository: Gripm Board configured without Playbook.' : '  ✨ Repositorio limpio: Gripm Board configurado sin Playbook.');
  }

  if (isEnCurrent) {
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
    (or: npx -p @gripm/board gripm-mcp)

  Consejo: Ejecuta 'npm install -g @gripm/board'
  para usar el comando global directo 'gripm'.
`);
  }

  return results;
}
