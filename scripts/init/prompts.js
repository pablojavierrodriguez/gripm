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

export async function promptChoice(rl, title, choices, defaultValue, isEn = true) {
  const defaultIndex = Math.max(0, choices.findIndex(choice => choice.value === defaultValue));
  console.log(`\n  ${title}`);
  choices.forEach((choice, index) => {
    const marker = index === defaultIndex
      ? (isEn ? ' [Default]' : ' [Predeterminado]')
      : '';
    console.log(`     ${index + 1}. ${choice.label}${marker}`);
  });

  const answer = await rl.question(isEn
    ? `     Select option [${defaultIndex + 1}]: `
    : `     Selecciona opción [${defaultIndex + 1}]: `
  );
  const selectedIndex = Number.parseInt(answer.trim(), 10) - 1;
  return choices[selectedIndex]?.value || choices[defaultIndex].value;
}

export async function promptPlaybookOptions(rl, choices, defaults = {}, isEn = true) {
  const listOptions = ['harnesses', 'skills', 'rules', 'scripts', 'docs'];
  const selected = {};

  for (const key of listOptions) {
    const listTitle = isEn
      ? `Playbook ${key}:`
      : `${key === 'harnesses' ? 'Harnesses' : key} de Playbook:`;
    const options = choices[key].map(choice => ({
      ...choice,
      key: choice.value,
      name: choice.label,
      nameEn: choice.label,
      nameEs: choice.label
    }));
    const values = defaults[key] ?? choices[key].map(choice => choice.value);
    const selectedItems = await promptMultiSelect(
      rl,
      listTitle,
      options,
      options.flatMap((option, index) => values.includes(option.value) ? [index] : []),
      isEn
    );
    selected[key] = selectedItems.map(item => item.value);
  }

  selected.preset = await promptChoice(
    rl,
    isEn ? 'Playbook rigor:' : 'Rigor de Playbook:',
    choices.presets,
    defaults.preset || 'pragmatic',
    isEn
  );
  selected.automation = await promptChoice(
    rl,
    isEn ? 'Playbook automation:' : 'Automatización de Playbook:',
    choices.automation,
    defaults.automation || 'automated',
    isEn
  );

  return selected;
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
 * Prompt for preset selection in Quick Mode with smart recommendation support (DEV-354).
 */
export async function promptPreset(rl, isEn = true, recommendedPreset = 'minimal') {
  const isFullRecommended = recommendedPreset === 'full';
  const defaultOption = isFullRecommended ? '2' : '1';
  const recBadge1 = !isFullRecommended ? (isEn ? ' [Recommended]' : ' [Recomendado]') : '';
  const recBadge2 = isFullRecommended ? (isEn ? ' [Recommended]' : ' [Recomendado]') : '';

  const promptText = isEn
    ? '\n  4.1 Select Preset:\n' +
      `      [1] Minimalist AI-First (Pure Kanban, no timeboxes, skill & clean backlog)${recBadge1}\n` +
      `      [2] Batteries Included (Full Scrum with Sprints, Releases, Timeline & Metrics)${recBadge2}\n` +
      `      Select option [${defaultOption}]: `
    : '\n  4.1 Seleccionar Preset:\n' +
      `      [1] Minimalista AI-First (Kanban puro, sin timeboxes, skill y backlog limpio)${recBadge1}\n` +
      `      [2] Baterías Incluidas (Scrum completo con Sprints, Releases, Timeline y Métricas)${recBadge2}\n` +
      `      Selecciona opción [${defaultOption}]: `;

  const answer = await rl.question(promptText);
  const trimmed = answer.trim();
  if (trimmed === '1') return 'minimal';
  if (trimmed === '2') return 'full';
  return defaultOption === '2' ? 'full' : 'minimal';
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

/**
 * Renders formatted diagnostic box for codebase health and detected capabilities (DEV-354).
 */
export function printDiagnosticSnapshot(report, { hasTypeScript, recommendedProfile, isEn }) {
  const isColorSupported = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));
  const c = {
    bold: (s) => (isColorSupported ? `\x1b[1m${s}\x1b[0m` : s),
    dim: (s) => (isColorSupported ? `\x1b[2m${s}\x1b[0m` : s),
    green: (s) => (isColorSupported ? `\x1b[32m${s}\x1b[0m` : s),
    cyan: (s) => (isColorSupported ? `\x1b[36m${s}\x1b[0m` : s),
    yellow: (s) => (isColorSupported ? `\x1b[33m${s}\x1b[0m` : s),
    red: (s) => (isColorSupported ? `\x1b[31m${s}\x1b[0m` : s),
  };

  const stripAnsi = (str) => String(str).replace(/\x1b\[[0-9;]*m/g, '');
  const makeLine = (label, val = '', width = 68) => {
    const innerWidth = width - 4;
    const pLabel = stripAnsi(label);
    const pVal = stripAnsi(val);
    const sp = Math.max(1, innerWidth - (pLabel.length + pVal.length));
    return `  │ ${label}${' '.repeat(sp)}${val} │`;
  };

  const score = report?.score ?? 100;
  const scoreColor = score >= 80 ? c.green : score >= 50 ? c.yellow : c.red;
  const filesCount = report?.summary?.totalFilesScanned ?? 0;
  const tsText = hasTypeScript
    ? (isEn ? 'Detected' : 'Detectado')
    : (isEn ? 'None' : 'No detectado');
  const testFw = report?.tests?.framework
    ? `${report.tests.framework} (${report.tests.verifyCommand || 'npm test'})`
    : (report?.tests?.hasTests ? (isEn ? 'Detected' : 'Detectado') : (isEn ? 'None' : 'No detectado'));
  const locIssues = report?.summary?.locViolationsCount ?? 0;
  const criticalLoc = report?.loc?.violations?.filter(v => v.status === 'error' || v.lines >= 1000)?.length ?? 0;
  const suppressions = report?.summary?.suppressionsCount ?? 0;
  const todosCount = report?.summary?.todosCount ?? 0;
  const recText = recommendedProfile === 'full'
    ? (isEn ? 'Batteries-Included (Scrum / Sprints)' : 'Baterías Incluidas (Scrum / Sprints)')
    : (isEn ? 'Minimalist AI-First (Kanban)' : 'Minimalista AI-First (Kanban)');

  console.log(`  ${c.bold(isEn ? 'Codebase Health & Diagnostic Snapshot:' : 'Radiografía Inicial y Diagnóstico del Repositorio:')}`);
  console.log('  ┌──────────────────────────────────────────────────────────────────┐');
  console.log(makeLine(isEn ? 'Health Score:' : 'Salud de Código:', scoreColor(`${score}/100`)));
  console.log(makeLine(isEn ? 'Files Scanned:' : 'Archivos Escaneados:', `${filesCount} ${isEn ? 'files' : 'archivos'}`));
  console.log(makeLine('TypeScript:', tsText));
  console.log(makeLine(isEn ? 'Test Runner:' : 'Infraestructura Tests:', testFw));
  console.log(makeLine(isEn ? 'LOC Issues:' : 'Límites LOC:', `${locIssues} (${criticalLoc} ${isEn ? 'critical >= 1000' : 'críticos >= 1000'})`));
  console.log(makeLine(isEn ? 'Suppressions:' : 'Supresiones Calidad:', String(suppressions)));
  console.log(makeLine(isEn ? 'TODO / Debt:' : 'Deuda Oculta:', `${todosCount} ${isEn ? 'markers' : 'marcadores'}`));
  console.log(makeLine(isEn ? 'Recommended Profile:' : 'Perfil Recomendado:', c.cyan(recText)));
  console.log('  └──────────────────────────────────────────────────────────────────┘\n');
}
