import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const PRESETS = {
  minimal: {
    id: 'minimal',
    nameEn: 'Minimalist AI-First',
    nameEs: 'Minimalista AI-First',
    descriptionEn: 'Pure Kanban, no timeboxes or ceremonies, agent skill & clean backlog',
    descriptionEs: 'Kanban puro, sin timeboxes ni ceremonias, skill de agente y backlog limpio',
    methodology: 'kanban',
    defaultView: 'kanban',
    mode: 'single',
    modules: {
      sprint: false,
      release: true,
      timeline: false,
      metrics: false,
      calendar: false
    },
    enabledTabs: {
      kanban: true,
      sprint: false,
      release: true,
      timeline: false,
      metrics: false
    },
    kanban: {
      showIdeasByDefault: false,
      showDoneHistoryByDefault: false,
      wipLimits: {
        'col-doing': 0,
        'col-review': 0,
        'col-ready': 0
      }
    },
    estimation: {
      enabled: false,
      method: 'fibonacci'
    },
    assets: {
      skill: true,
      agentsMd: false,
      packageJson: true,
      gitignore: true
    }
  },
  full: {
    id: 'full',
    nameEn: 'Batteries Included',
    nameEs: 'Baterias Incluidas',
    descriptionEn: 'Full Scrum with Sprints, Releases, Timeline, Metrics and AGENTS.md',
    descriptionEs: 'Scrum completo con Sprints, Releases, Timeline, Metricas y AGENTS.md',
    methodology: 'scrum',
    defaultView: 'kanban',
    mode: 'single',
    modules: {
      sprint: true,
      release: true,
      timeline: true,
      metrics: true,
      calendar: true
    },
    enabledTabs: {
      kanban: true,
      sprint: true,
      release: true,
      timeline: true,
      metrics: true
    },
    kanban: {
      showIdeasByDefault: true,
      showDoneHistoryByDefault: false,
      wipLimits: {
        'col-doing': 0,
        'col-review': 0,
        'col-ready': 0
      }
    },
    estimation: {
      enabled: true,
      method: 'fibonacci'
    },
    assets: {
      skill: true,
      agentsMd: true,
      packageJson: true,
      gitignore: true
    }
  }
};

export const COCKPIT_MODULES = [
  { key: 'release', nameEn: 'Releases (Version management & changelog)', nameEs: 'Releases (Gestion de versiones y changelog)', defaultOn: true },
  { key: 'sprint', nameEn: 'Sprints (Timeboxes & active iterations)', nameEs: 'Sprints (Timeboxes e iteraciones activas)', defaultOn: false },
  { key: 'timeline', nameEn: 'Timeline / Roadmap (Schedule & milestone view)', nameEs: 'Timeline / Roadmap (Planificacion temporal)', defaultOn: false },
  { key: 'metrics', nameEn: 'Metrics / Analytics (Velocity & throughput)', nameEs: 'Metricas / Analitica (Velocidad y flujo)', defaultOn: false },
  { key: 'calendar', nameEn: 'Calendar Export (.ics integration)', nameEs: 'Exportacion de Calendario (.ics)', defaultOn: false },
  { key: 'estimation', nameEn: 'Estimation (Fibonacci story points)', nameEs: 'Estimacion (Puntos de historia Fibonacci)', defaultOn: false },
  { key: 'ideas', nameEn: 'Ideas / Discovery column in Kanban', nameEs: 'Columna de Ideas / Descubrimiento en Kanban', defaultOn: false }
];

export const REPO_ASSETS = [
  { key: 'skill', nameEn: 'Agent skill (.agents/skills/gripm/SKILL.md)', nameEs: 'Skill de agente (.agents/skills/gripm/SKILL.md)', defaultOn: true },
  { key: 'agentsMd', nameEn: 'AGENTS.md guide (AI contribution rules)', nameEs: 'Guia AGENTS.md (Reglas de contribucion para agentes)', defaultOn: true },
  { key: 'packageJson', nameEn: 'package.json start scripts ("board", "mcp")', nameEs: 'Scripts de inicio en package.json ("board", "mcp")', defaultOn: true },
  { key: 'gitignore', nameEn: '.gitignore rules for local cache & temporary files', nameEs: 'Reglas en .gitignore para cache local y temporales', defaultOn: true }
];

/**
 * Renders an executive [ON] / [OFF] capability manifest table.
 */
export function renderManifest(plan, isEn = true) {
  const on = '[ON] ';
  const off = '[OFF]';

  const rows = [
    { label: isEn ? 'Methodology' : 'Metodologia', state: `${plan.methodology || 'kanban'}` },
    { label: isEn ? 'Mode' : 'Modo', state: plan.mode === 'multi' ? (isEn ? 'Multi-Project Hub' : 'Hub Multi-Proyecto') : (isEn ? 'Single-Project' : 'Mono-Proyecto') },
    { label: isEn ? 'Kanban board' : 'Tablero Kanban', state: on },
    { label: isEn ? 'Releases module' : 'Modulo Releases', state: plan.modules?.release ? on : off },
    { label: isEn ? 'Sprints module' : 'Modulo Sprints', state: plan.modules?.sprint ? on : off },
    { label: isEn ? 'Timeline / Roadmap' : 'Timeline / Roadmap', state: plan.modules?.timeline ? on : off },
    { label: isEn ? 'Metrics / Analytics' : 'Metricas / Analitica', state: plan.modules?.metrics ? on : off },
    { label: isEn ? 'Calendar export (.ics)' : 'Exportacion Calendario', state: plan.modules?.calendar ? on : off },
    { label: isEn ? 'Estimation (Story points)' : 'Estimacion de puntos', state: plan.estimation?.enabled ? `${on} (${plan.estimation?.method || 'fibonacci'})` : off },
    { label: isEn ? 'Ideas / Discovery column' : 'Columna Ideas / Descubrimiento', state: plan.kanban?.showIdeasByDefault ? on : off },
    { label: isEn ? 'Agent skill (.agents/skills/gripm)' : 'Skill de agente (.agents/skills/gripm)', state: plan.assets?.skill ? on : off },
    { label: isEn ? 'AGENTS.md governance guide' : 'Guia AGENTS.md de gobernanza', state: plan.assets?.agentsMd ? on : off },
    { label: isEn ? 'package.json scripts ("board", "mcp")' : 'Scripts en package.json ("board", "mcp")', state: plan.assets?.packageJson ? on : off },
    { label: isEn ? '.gitignore cache rules' : 'Reglas de cache en .gitignore', state: plan.assets?.gitignore ? on : off },
    { label: isEn ? 'Gripm Playbook framework' : 'Framework Gripm Playbook', state: plan.playbook ? on : off }
  ];

  const header = isEn
    ? '  Capability Manifest ([ON] active, [OFF] available in Settings):\n  ' + '-'.repeat(60)
    : '  Manifiesto de Capacidades ([ON] activo, [OFF] disponible en Configuracion):\n  ' + '-'.repeat(60);

  const lines = rows.map(r => `  ${r.state.padEnd(6)} ${r.label}`);
  return `${header}\n${lines.join('\n')}\n  ${'-'.repeat(60)}`;
}

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

  console.warn(`[gripm init] WARNING: Could not find canonical skill template in "${sourceGripmSkill}". Generating basic stub.`);
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
