import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadRegistryFile, saveRegistryFile } from '../registryConfig.js';
import { getSkillTemplate, getAgentsMdTemplate } from './catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findPackageRoot(startDir) {
  let curr = startDir;
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(startDir, '../..');
}

const PKG_ROOT = findPackageRoot(__dirname);

/**
 * Writes the canonical .gripm/config.json with explicit modules and tabs.
 */
export function writeConfig(targetRepo, configData, isEn = true) {
  const gripmDir = path.join(targetRepo, '.gripm');
  if (!fs.existsSync(gripmDir)) {
    fs.mkdirSync(gripmDir, { recursive: true });
  }

  const configFile = path.join(gripmDir, 'config.json');
  let existing = {};
  if (fs.existsSync(configFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch {}
  }

  const explicitConfig = {
    projectName: configData.projectName || existing.projectName,
    projectId: configData.projectId || existing.projectId,
    codePrefix: configData.codePrefix || existing.codePrefix,
    language: configData.language || existing.language || 'en',
    theme: configData.theme || existing.theme || 'dark',
    density: configData.density || existing.density || 'comfortable',
    autoSave: configData.autoSave !== undefined ? configData.autoSave : (existing.autoSave !== undefined ? existing.autoSave : true),
    mode: configData.mode || existing.mode || 'single',
    methodology: configData.methodology || existing.methodology || 'kanban',
    defaultView: configData.defaultView || existing.defaultView || 'kanban',
    modules: {
      sprint: Boolean(configData.modules?.sprint ?? existing.modules?.sprint),
      release: configData.modules?.release !== undefined ? Boolean(configData.modules.release) : (existing.modules?.release !== undefined ? Boolean(existing.modules.release) : true),
      timeline: Boolean(configData.modules?.timeline ?? existing.modules?.timeline),
      metrics: Boolean(configData.modules?.metrics ?? existing.modules?.metrics),
      calendar: Boolean(configData.modules?.calendar ?? existing.modules?.calendar)
    },
    enabledTabs: {
      kanban: configData.enabledTabs?.kanban !== undefined ? Boolean(configData.enabledTabs.kanban) : (existing.enabledTabs?.kanban !== undefined ? Boolean(existing.enabledTabs.kanban) : true),
      sprint: Boolean(configData.enabledTabs?.sprint ?? configData.modules?.sprint ?? existing.enabledTabs?.sprint ?? existing.modules?.sprint),
      release: configData.enabledTabs?.release !== undefined ? Boolean(configData.enabledTabs.release) : (configData.modules?.release !== undefined ? Boolean(configData.modules.release) : (existing.enabledTabs?.release !== undefined ? Boolean(existing.enabledTabs.release) : true)),
      timeline: Boolean(configData.enabledTabs?.timeline ?? configData.modules?.timeline ?? existing.enabledTabs?.timeline ?? existing.modules?.timeline),
      metrics: Boolean(configData.enabledTabs?.metrics ?? configData.modules?.metrics ?? existing.enabledTabs?.metrics ?? existing.modules?.metrics)
    },
    kanban: {
      showIdeasByDefault: Boolean(configData.kanban?.showIdeasByDefault ?? existing.kanban?.showIdeasByDefault),
      showDoneHistoryByDefault: Boolean(configData.kanban?.showDoneHistoryByDefault ?? existing.kanban?.showDoneHistoryByDefault),
      wipLimits: configData.kanban?.wipLimits || existing.kanban?.wipLimits || {
        'col-doing': 0,
        'col-review': 0,
        'col-ready': 0
      }
    },
    estimation: {
      enabled: Boolean(configData.estimation?.enabled ?? existing.estimation?.enabled),
      method: configData.estimation?.method || existing.estimation?.method || 'fibonacci'
    },
    version: '1.0.0'
  };

  if (configData.verifyCommand || existing.verifyCommand) {
    explicitConfig.verifyCommand = configData.verifyCommand || existing.verifyCommand;
  }

  fs.writeFileSync(configFile, JSON.stringify(explicitConfig, null, 2) + '\n', 'utf8');

  console.log(isEn
    ? `  ✅ .gripm/config.json saved (Project: ${explicitConfig.projectName}, Language: ${explicitConfig.language}, Mode: ${explicitConfig.mode === 'single' ? 'Single-Project' : 'Multi-Project Hub'}${explicitConfig.verifyCommand ? `, verify: ${explicitConfig.verifyCommand}` : ''})`
    : `  ✅ .gripm/config.json guardado (Proyecto: ${explicitConfig.projectName}, Idioma: ${explicitConfig.language}, Modo: ${explicitConfig.mode === 'single' ? 'Mono-Proyecto' : 'Multi-Proyecto Hub'}${explicitConfig.verifyCommand ? `, verify: ${explicitConfig.verifyCommand}` : ''})`
  );

  return explicitConfig;
}

/**
 * Ensures the backlog/tasks directory exists.
 */
export function ensureTasksDir(targetRepo, isEn = true) {
  const tasksDir = path.join(targetRepo, 'backlog/tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
    console.log(isEn ? '  ✅ backlog/tasks/ directory created for Markdown tasks' : '  ✅ Directorio backlog/tasks/ creado para tareas Markdown');
    return { created: true };
  }

  console.log(isEn ? '  ℹ️  Existing backlog/tasks/ directory preserved' : '  ℹ️  Directorio backlog/tasks/ existente preservado');
  return { created: false };
}

/**
 * Registers project in global hub if multi-project mode.
 */
export function registerInHub(targetRepo, meta, isEn = true) {
  try {
    const registry = loadRegistryFile(PKG_ROOT);
    const existingIdx = registry.projects.findIndex(p => p.id === meta.projectId || (p.repoPath && path.resolve(p.repoPath) === path.resolve(targetRepo)));

    const projectEntry = {
      id: meta.projectId,
      name: meta.projectName,
      codePrefix: meta.codePrefix,
      repoPath: path.resolve(targetRepo),
      storageType: 'markdown',
      backlogDir: 'backlog',
      createdAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      registry.projects[existingIdx] = { ...registry.projects[existingIdx], ...projectEntry };
    } else {
      registry.projects.unshift(projectEntry);
    }
    registry.activeProjectId = meta.projectId;
    saveRegistryFile(registry, PKG_ROOT);
    console.log(isEn ? '  ✅ Project registered in global Hub (~/.gripm/registry.json)' : '  ✅ Proyecto registrado en el Hub global (~/.gripm/registry.json)');
    return true;
  } catch (err) {
    console.warn(isEn ? '  ⚠️ Could not register in global Hub:' : '  ⚠️ No se pudo registrar en el Hub global:', err.message);
    return false;
  }
}

/**
 * Installs canonical agent skill at .agents/skills/gripm/SKILL.md.
 */
export function writeSkill(targetRepo, language, isEn = true) {
  const skillContent = getSkillTemplate(language);
  const gripmSkillDir = path.join(targetRepo, '.agents/skills/gripm');
  if (!fs.existsSync(gripmSkillDir)) {
    fs.mkdirSync(gripmSkillDir, { recursive: true });
  }
  fs.writeFileSync(path.join(gripmSkillDir, 'SKILL.md'), skillContent, 'utf8');

  console.log(isEn
    ? `  ✅ Agent skill installed at .agents/skills/gripm/SKILL.md (${language})`
    : `  ✅ Skill para agentes instalada en .agents/skills/gripm/SKILL.md (${language})`
  );
  return true;
}

/**
 * Generates AGENTS.md guide for repository.
 */
export function writeAgentsMd(targetRepo, projectName, language, force = false, isEn = true) {
  const agentsMdPath = path.join(targetRepo, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath) || force) {
    fs.writeFileSync(agentsMdPath, getAgentsMdTemplate(projectName, language), 'utf8');
    console.log(isEn
      ? `  ✅ Governance guide generated at AGENTS.md (${language})`
      : `  ✅ Guía de gobernanza generada en AGENTS.md (${language})`
    );
    return true;
  }

  console.log(isEn ? '  ℹ️  Existing AGENTS.md preserved' : '  ℹ️  AGENTS.md existente preservado');
  return true;
}

/**
 * Adds start scripts ("board", "mcp") to package.json.
 */
export function writePackageJsonScripts(targetRepo, isEn = true) {
  const hostPkgPath = path.join(targetRepo, 'package.json');
  if (!fs.existsSync(hostPkgPath)) return false;

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
      console.log(isEn ? '  ✅ Scripts "board" and "mcp" added to package.json' : '  ✅ Scripts "board" y "mcp" agregados a package.json');
    } else {
      console.log(isEn ? '  ℹ️  package.json scripts were already configured' : '  ℹ️  Scripts de package.json ya estaban configurados');
    }
    return true;
  } catch (err) {
    console.warn(isEn ? '  ⚠️ Could not update package.json:' : '  ⚠️ No se pudo actualizar package.json:', err.message);
    return false;
  }
}

/**
 * Adds local cache rules to .gitignore.
 */
export function writeGitignore(targetRepo, isEn = true) {
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
      console.log(isEn ? '  ✅ gripm rules added to .gitignore' : '  ✅ Reglas de gripm añadidas a .gitignore');
    } else {
      console.log(isEn ? '  ℹ️  .gitignore already contained gripm rules' : '  ℹ️  .gitignore ya contenía las reglas de gripm');
    }
  } else {
    fs.writeFileSync(gitignorePath, ignoreLines.trim() + '\n', 'utf8');
    console.log(isEn ? '  ✅ .gitignore file created with gripm rules' : '  ✅ Archivo .gitignore creado con reglas de gripm');
  }
  return true;
}

/**
 * Imports detected TODO comments as draft tasks into backlog/tasks/.
 * Ensures unique IDs matching codePrefix, valid YAML frontmatter, and executes backlog sync.
 */
export function importTodosAsTasks(targetRepo, todos = [], options = {}) {
  const isEn = options.isEn !== false;
  const tasksDir = path.join(targetRepo, 'backlog/tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  const codePrefix = (options.codePrefix || 'DEV').toUpperCase();
  let maxNum = 0;

  try {
    const existingFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
    for (const f of existingFiles) {
      const match = f.match(new RegExp(`^${codePrefix}-(\\d+)`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  } catch {}

  const now = new Date().toISOString().split('T')[0];
  let importedCount = 0;
  const createdFiles = [];

  for (const todo of todos) {
    maxNum++;
    const taskId = `${codePrefix}-${String(maxNum).padStart(3, '0')}`;
    const cleanTitle = (todo.text || `Resolver ${todo.type} en ${todo.file}:${todo.line}`)
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || `Resolver ${todo.type}`;
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'todo';
    const filename = `${taskId} - ${slug}.md`;
    const fullPath = path.join(tasksDir, filename);

    const priority = todo.type === 'BUG' ? 'urgent' : (todo.type === 'FIXME' ? 'high' : 'medium');
    const itemType = (todo.type === 'BUG' || todo.type === 'FIXME') ? 'bug' : 'tech_debt';

    const content = `---
id: ${taskId}
title: ${JSON.stringify(cleanTitle)}
status: draft
created_date: '${now}'
updated_date: '${now}'
labels:
  - "todo"
  - "code-audit"
  - ${JSON.stringify(todo.type.toLowerCase())}
priority: ${priority}
type: ${itemType}
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detectado automáticamente por el escáner estático de código en \`${todo.file}:${todo.line}\`:

\`\`\`
${todo.snippet || todo.text}
\`\`\`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Resolver el marcador ${todo.type} identificado en ${todo.file}:${todo.line}
<!-- AC:END -->
`;

    fs.writeFileSync(fullPath, content, 'utf8');
    createdFiles.push(fullPath);
    importedCount++;
  }

  // Sincronizar BACKLOG.md consolidado si existen utilidades
  try {
    const cliBin = path.join(PKG_ROOT, 'bin', 'gripm-cli.js');
    const cliTs = path.join(PKG_ROOT, 'scripts', 'gripm-cli.ts');
    const syncScript = path.join(PKG_ROOT, 'scripts', 'verify-backlog-sync.js');

    if (fs.existsSync(cliBin)) {
      execFileSync(process.execPath, [cliBin, 'export'], { cwd: targetRepo, stdio: 'pipe' });
    } else if (fs.existsSync(cliTs)) {
      execFileSync(process.execPath, ['--experimental-strip-types', cliTs, 'export'], { cwd: targetRepo, stdio: 'pipe' });
    }

    if (fs.existsSync(syncScript)) {
      execFileSync(process.execPath, [syncScript, '--fix'], { cwd: targetRepo, stdio: 'pipe' });
    }
  } catch {}

  console.log(isEn
    ? `  ✅ ${importedCount} TODOs imported as draft tasks in backlog/tasks/ and synced with BACKLOG.md`
    : `  ✅ ${importedCount} TODOs importados como tareas borrador en backlog/tasks/ y sincronizados en BACKLOG.md`
  );

  return { importedCount, createdFiles };
}
