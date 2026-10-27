/**
 * Parser for multi-select terminal inputs.
 * Supports: comma/space separated numbers (1,3,5), "all", "none", or empty string (default).
 */
export function parseMultiSelectInput(input, totalCount, defaultIndices = []) {
  if (input === undefined || input === null || input.trim() === '') {
    return [...defaultIndices];
  }

  const normalized = input.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'todos' || normalized === '*') {
    return Array.from({ length: totalCount }, (_, i) => i);
  }

  if (normalized === 'none' || normalized === 'ninguno' || normalized === '0') {
    return [];
  }

  const tokens = input.split(/[, \t]+/).filter(Boolean);
  const selected = new Set();

  for (const token of tokens) {
    const num = parseInt(token, 10);
    if (!Number.isNaN(num)) {
      const idx = num - 1; // 1-based to 0-based
      if (idx >= 0 && idx < totalCount) {
        selected.add(idx);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Interactive prompt for multi-select options.
 */
export async function promptMultiSelect(rl, title, items, defaultIndices, isEn = true) {
  console.log(`\n  ${title}`);
  const defaultSet = new Set(defaultIndices);

  items.forEach((item, index) => {
    const isChecked = defaultSet.has(index);
    const mark = isChecked ? '[x]' : '[ ]';
    const label = isEn ? (item.nameEn || item.name) : (item.nameEs || item.name || item.nameEn);
    console.log(`     ${index + 1}. ${mark} ${label}`);
  });

  const promptText = isEn
    ? '     Select items (e.g. 1,3,5 | all | none | Enter for default): '
    : '     Selecciona items (ej. 1,3,5 | all | none | Enter para default): ';

  const answer = await rl.question(promptText);
  const selectedIndices = parseMultiSelectInput(answer, items.length, defaultIndices);
  return selectedIndices.map(idx => items[idx]);
}

/**
 * Prompt for language selection.
 */
export async function promptLanguage(rl) {
  const answer = await rl.question(
    '  1. Language / Idioma:\n' +
    '     [1] English (en) [Default]\n' +
    '     [2] Español (es)\n' +
    '     Select option / Selecciona opción [1]: '
  );
  const trimmed = answer.trim().toLowerCase();
  return (trimmed === '2' || trimmed === 'es') ? 'es' : 'en';
}

/**
 * Prompt for Gripm Suite products selection.
 */
export async function promptSuite(rl, isEn = true) {
  const promptText = isEn
    ? '\n  2. Suite Products to configure:\n' +
      '     [1] Gripm Board & MCP (Kanban board, MCP server & Cockpit) [Default]\n' +
      '     [2] Gripm Playbook (Multi-agent agile framework & UX auditor)\n' +
      '     [3] Both (Gripm Board + Gripm Playbook)\n' +
      '     [4] None (Cancel)\n' +
      '     Select option [1]: '
    : '\n  2. Productos de la Suite a configurar:\n' +
      '     [1] Gripm Board & MCP (Tablero Kanban, servidor MCP y Cockpit) [Default]\n' +
      '     [2] Gripm Playbook (Framework agil multi-agente y auditor UX)\n' +
      '     [3] Ambos (Gripm Board + Gripm Playbook)\n' +
      '     [4] Ninguno (Cancelar)\n' +
      '     Selecciona opción [1]: ';

  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === '2') return 'playbook';
  if (trimmed === '3') return 'both';
  if (trimmed === '4') return 'none';
  return 'board';
}

/**
 * Prompt for project identity (name and editable task prefix).
 */
export async function promptIdentity(rl, defaultName, defaultPrefix, isEn = true) {
  const namePrompt = isEn
    ? `\n  3. Project name [${defaultName}]: `
    : `\n  3. Nombre del proyecto [${defaultName}]: `;
  const nameAnswer = await rl.question(namePrompt);
  const projectName = nameAnswer.trim() || defaultName;

  // Derive suggested prefix from project name if changed, or use defaultPrefix
  let suggestedPrefix = defaultPrefix;
  if (nameAnswer.trim()) {
    suggestedPrefix = projectName
      .replace(/^@[^/]+\//, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'PROJ';
  }

  const prefixPrompt = isEn
    ? `     Task code prefix [${suggestedPrefix}] (2-10 alphanumeric chars): `
    : `     Prefijo de código para tareas [${suggestedPrefix}] (2-10 caracteres alfanuméricos): `;
  const prefixAnswer = await rl.question(prefixPrompt);
  let codePrefix = prefixAnswer.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

  if (codePrefix.length < 2) {
    codePrefix = suggestedPrefix;
  } else if (codePrefix.length > 10) {
    codePrefix = codePrefix.substring(0, 10);
  }

  const projectId = projectName.toLowerCase().replace(/^@[^/]+\//, '').replace(/[^a-z0-9_-]/g, '-');

  return { projectName, projectId, codePrefix };
}

/**
 * Prompt for configuration speed: Quick Mode vs Component-by-Component.
 */
export async function promptSpeed(rl, isEn = true) {
  const promptText = isEn
    ? '\n  4. Configuration Speed:\n' +
      '     [1] Quick Mode (Presets: Minimalist AI-First or Batteries Included) [Default]\n' +
      '     [2] Component-by-Component (Full granular control)\n' +
      '     Select option [1]: '
    : '\n  4. Velocidad de Configuración:\n' +
      '     [1] Modo Rápido (Presets: Minimalista AI-First o Baterías Incluidas) [Default]\n' +
      '     [2] Componente por Componente (Control granular total)\n' +
      '     Selecciona opción [1]: ';

  const answer = await rl.question(promptText);
  return answer.trim() === '2' ? 'granular' : 'quick';
}

/**
 * Prompt for preset selection in Quick Mode.
 */
export async function promptPreset(rl, isEn = true) {
  const promptText = isEn
    ? '\n  4.1 Select Preset:\n' +
      '      [1] Minimalist AI-First (Pure Kanban, no timeboxes, skill & clean backlog) [Default]\n' +
      '      [2] Batteries Included (Full Scrum with Sprints, Releases, Timeline & Metrics)\n' +
      '      Select option [1]: '
    : '\n  4.1 Seleccionar Preset:\n' +
      '      [1] Minimalista AI-First (Kanban puro, sin timeboxes, skill y backlog limpio) [Default]\n' +
      '      [2] Baterías Incluidas (Scrum completo con Sprints, Releases, Timeline y Métricas)\n' +
      '      Selecciona opción [1]: ';

  const answer = await rl.question(promptText);
  return answer.trim() === '2' ? 'full' : 'minimal';
}

/**
 * Prompt for methodology in granular mode.
 */
export async function promptMethodology(rl, isEn = true) {
  const promptText = isEn
    ? '\n  4.1 Methodology:\n' +
      '      [1] Pure Kanban (Continuous flow, no sprint timeboxes) [Default]\n' +
      '      [2] Scrum (Timeboxes and active sprints)\n' +
      '      [3] Scrumban (Mixed flow with sprint planning & continuous board)\n' +
      '      Select option [1]: '
    : '\n  4.1 Metodología:\n' +
      '      [1] Kanban puro (Flujo continuo, sin timeboxes de sprint) [Default]\n' +
      '      [2] Scrum (Timeboxes y sprints activos)\n' +
      '      [3] Scrumban (Flujo mixto con planificación de sprint y tablero continuo)\n' +
      '      Selecciona opción [1]: ';

  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === '2') return 'scrum';
  if (trimmed === '3') return 'scrumban';
  return 'kanban';
}

/**
 * Prompt for instantiation mode (single vs multi).
 */
export async function promptMode(rl, isEn = true) {
  const promptText = isEn
    ? '\n  4.2 Instantiation Mode:\n' +
      '      [1] Single-Project (Recommended: isolated, self-contained board) [Default]\n' +
      '      [2] Multi-Project (Register in global Hub to view alongside other repositories)\n' +
      '      Select option [1]: '
    : '\n  4.2 Modo de Instanciación:\n' +
      '      [1] Mono-Proyecto (Recomendado: tablero aislado y autocontenido) [Default]\n' +
      '      [2] Multi-Proyecto (Registrar en el Hub global para verlo junto a otros repositorios)\n' +
      '      Selecciona opción [1]: ';

  const answer = await rl.question(promptText);
  return answer.trim() === '2' ? 'multi' : 'single';
}

/**
 * Prompt for confirmation (Y/n).
 */
export async function promptConfirm(rl, question, defaultYes = true) {
  const suffix = defaultYes ? ' (Y/n) [Y]: ' : ' (y/N) [N]: ';
  const answer = await rl.question(`\n  ${question}${suffix}`);
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return defaultYes;
  return trimmed === 'y' || trimmed === 'yes' || trimmed === 's' || trimmed === 'si' || trimmed === 'sí';
}
