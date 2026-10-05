import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { loadRegistryFile, saveRegistryFile, resolveProjectIdentity } from './registryConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

/**
 * Embedded canonical SKILL.md template for consumer repositories
 */
export function getSkillTemplate(language = 'en') {
  const isEn = String(language).toLowerCase() === 'en';
  const skillFile = isEn ? 'SKILL.en.md' : 'SKILL.md';
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

/**
 * Embedded canonical AGENTS.md template for consumer repositories
 */
export function getAgentsMdTemplate(projectName, language = 'en') {
  const isEn = String(language).toLowerCase() === 'en';
  const templatePath = path.join(PKG_ROOT, '.agents', isEn ? 'AGENTS.en.md' : 'AGENTS.es.md');
  if (fs.existsSync(templatePath)) {
    try {
      return fs.readFileSync(templatePath, 'utf8').replace(/\{\{projectName\}\}/g, projectName);
    } catch {}
  }

  console.warn(`⚠️  [gripm init] ADVERTENCIA: No se encontró la plantilla canónica de AGENTS.md en "${templatePath}". Generando stub básico.`);
  return `# Guía de Contribución para Agentes de IA (AGENTS.md)\n\nBienvenido a **${projectName}**.\n`;
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

  console.log(`
┌────────────────────────────────────────────────────────────┐
│  🚀 gripm - Asistente de Inicialización de Repositorio      │
│                                                            │
│  📁 Repositorio:  ${targetRepo.slice(0, 40).padEnd(41)}│
│  🏷️  Proyecto:     ${projectName.slice(0, 40).padEnd(41)}│
└────────────────────────────────────────────────────────────┘
  `);

  let mode = options.mode || (options.hub ? 'multi' : 'single');
  let installSkill = options.skill !== undefined ? options.skill : true;
  let installAgentsMd = options.agentsMd !== undefined ? options.agentsMd : true;
  let updatePkgJson = options.packageJson !== undefined ? options.packageJson : true;
  let updateGitignore = options.gitignore !== undefined ? options.gitignore : true;

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('  Configuración inicial personalizada:\n');

      // Question 1: Language
      const langAnswer = await rl.question(
        '  1. Language / Idioma:\n' +
        '     [1] English (en)\n' +
        '     [2] Español (es)\n' +
        '     Select option / Selecciona opción [1]: '
      );
      if (langAnswer.trim() === '2' || langAnswer.trim().toLowerCase() === 'es') {
        language = 'es';
      } else {
        language = 'en';
      }

      // Question 2: Project Name
      const nameAnswer = await rl.question(`\n  2. Nombre del proyecto [${projectName}]: `);
      if (nameAnswer.trim()) {
        projectName = nameAnswer.trim();
        projectId = projectName.toLowerCase().replace(/^@[^/]+\//, '').replace(/[^a-z0-9_-]/g, '-');
        codePrefix = projectName.replace(/^@[^/]+\//, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'PROJ';
      }

      // Question 3: Mode
      const modeAnswer = await rl.question(
        '\n  3. Modo de Instanciación:\n' +
        '     [1] Mono-Proyecto (Recomendado: tablero aislado y autocontenido para este repo)\n' +
        '     [2] Multi-Proyecto (Registrar en el Hub global para verlo junto a otros repositorios)\n' +
        '     Selecciona opción [1]: '
      );
      if (modeAnswer.trim() === '2') {
        mode = 'multi';
      } else {
        mode = 'single';
      }

      // Question 4: Skill
      const skillAnswer = await rl.question('\n  4. ¿Instalar skill para agentes (.agents/skills/gripm/SKILL.md)? (S/n) [S]: ');
      installSkill = skillAnswer.trim().toLowerCase() !== 'n';

      // Question 5: AGENTS.md
      const agentsAnswer = await rl.question('  5. ¿Generar guía de gobernanza para agentes (AGENTS.md)? (S/n) [S]: ');
      installAgentsMd = agentsAnswer.trim().toLowerCase() !== 'n';

      // Question 6: package.json scripts
      const pkgAnswer = await rl.question('  6. ¿Configurar scripts de inicio ("board", "mcp") en package.json? (S/n) [S]: ');
      updatePkgJson = pkgAnswer.trim().toLowerCase() !== 'n';

      // Question 7: .gitignore
      const gitignoreAnswer = await rl.question('  7. ¿Añadir reglas recomendadas a .gitignore? (S/n) [S]: ');
      updateGitignore = gitignoreAnswer.trim().toLowerCase() !== 'n';

    } finally {
      rl.close();
    }
  }

  console.log('\n  ⚙️  Aplicando configuración elegida...\n');
  const results = {
    projectName,
    projectId,
    mode,
    language,
    devboardConfig: false,
    tasksDir: false,
    skill: false,
    agentsMd: false,
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
  const legacyConfigFile = path.join(targetRepo, '.devboard', 'config.json');
  let currentConfig = {
    projectName,
    projectId,
    codePrefix,
    language,
    theme: 'dark',
    density: 'comfortable',
    autoSave: true,
    mode,
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

  const existingConfigPath = fs.existsSync(configFile) ? configFile : (fs.existsSync(legacyConfigFile) ? legacyConfigFile : null);
  if (existingConfigPath) {
    try {
      const existing = JSON.parse(fs.readFileSync(existingConfigPath, 'utf8'));
      currentConfig = {
        ...existing,
        mode,
        language: options.language || options.lang || existing.language || language,
        projectName: existing.projectName || projectName,
        projectId: existing.projectId || projectId,
        codePrefix: existing.codePrefix || codePrefix
      };
    } catch {}
  }
  fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2) + '\n', 'utf8');
  results.devboardConfig = true;
  results.gripmConfig = true;
  console.log(`  ✅ .gripm/config.json guardado (Proyecto: ${projectName}, Idioma: ${currentConfig.language}, Modo: ${mode === 'single' ? 'Mono-Proyecto' : 'Multi-Proyecto Hub'})`);

  // 2. Ensure backlog/tasks directory (Idempotent and non-destructive)
  const tasksDir = path.join(targetRepo, 'backlog/tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
    console.log('  ✅ Directorio backlog/tasks/ creado para tareas Markdown');
  } else {
    console.log('  ℹ️  Directorio backlog/tasks/ existente preservado');
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
      console.log('  ✅ Proyecto registrado en el Hub global (~/.gripm/registry.json)');
    } catch (err) {
      console.warn('  ⚠️ No se pudo registrar en el Hub global:', err.message);
    }
  } else {
    console.log('  🔒 Modo Mono-Proyecto activo: Ejecución autocontenida sin dependencias externas');
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
    console.log(`  ✅ Skill para agentes instalada en .agents/skills/gripm/SKILL.md (${currentConfig.language || language})`);
  }

  // 5. Generate AGENTS.md
  if (installAgentsMd) {
    const agentsMdPath = path.join(targetRepo, 'AGENTS.md');
    if (!fs.existsSync(agentsMdPath) || options.force) {
      fs.writeFileSync(agentsMdPath, getAgentsMdTemplate(projectName, currentConfig.language || language), 'utf8');
      results.agentsMd = true;
      console.log(`  ✅ Guía de gobernanza generada en AGENTS.md (${currentConfig.language || language})`);
    } else {
      console.log('  ℹ️  AGENTS.md existente preservado');
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
          console.log('  ✅ Scripts "board" y "mcp" agregados a package.json');
        } else {
          console.log('  ℹ️  Scripts de package.json ya estaban configurados');
        }
        results.packageJson = true;
      } catch (err) {
        console.warn('  ⚠️ No se pudo actualizar package.json:', err.message);
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
      '.gripm/*.tmp',
      '.devboard/update-cache.json',
      '.devboard/*.tmp'
    ].join('\n');

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.gripm/update-cache.json') && !content.includes('.devboard/update-cache.json')) {
        fs.appendFileSync(gitignorePath, ignoreLines + '\n', 'utf8');
        console.log('  ✅ Reglas de gripm añadidas a .gitignore');
      } else {
        console.log('  ℹ️  .gitignore ya contenía las reglas de gripm');
      }
    } else {
      fs.writeFileSync(gitignorePath, ignoreLines.trim() + '\n', 'utf8');
      console.log('  ✅ Archivo .gitignore creado con reglas de gripm');
    }
    results.gitignore = true;
  }

  console.log(`
┌────────────────────────────────────────────────────────────┐
│  ✨ ¡gripm inicializado con éxito!                          │
│                                                            │
│  Para abrir el tablero:                                    │
│  • npm run board                                           │
│    (o directo: npx @gripm/board)                           │
│                                                            │
│  Para iniciar el servidor MCP:                             │
│  • npm run mcp                                             │
│    (o: npx -p @gripm/board gripm-mcp)                      │
│                                                            │
│  💡 Consejo: Ejecuta 'npm install -g @gripm/board'         │
│  para usar el comando global directo 'gripm'.              │
└────────────────────────────────────────────────────────────┘
  `);

  return results;
}
