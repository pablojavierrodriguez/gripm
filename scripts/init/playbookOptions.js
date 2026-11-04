import { HARNESS_CHOICES } from '@gripm/playbook/scripts/lib/adapters.mjs';
import {
  AUTOMATION_CHOICES,
  PRESET_CHOICES,
  getDocChoices,
  getRuleChoices,
  getScriptChoices,
  getSkillChoices,
  loadCatalogFromManifest,
  parseSelectionList
} from '@gripm/playbook/scripts/lib/selection.mjs';

const catalog = loadCatalogFromManifest();

export const PLAYBOOK_INIT_CHOICES = {
  harnesses: HARNESS_CHOICES,
  skills: getSkillChoices(catalog.skills),
  rules: getRuleChoices(),
  scripts: getScriptChoices(),
  docs: getDocChoices(),
  presets: PRESET_CHOICES,
  automation: AUTOMATION_CHOICES
};

const selectionCatalog = {
  harnesses: HARNESS_CHOICES.map(({ value }) => value),
  skills: catalog.skills,
  rules: catalog.rules,
  scripts: catalog.scripts,
  docs: catalog.docs
};

const selectionType = {
  harnesses: 'harness',
  skills: 'skill',
  rules: 'rule',
  scripts: 'script',
  docs: 'doc'
};

const choiceCatalog = {
  preset: PRESET_CHOICES.map(({ value }) => value),
  automation: AUTOMATION_CHOICES.map(({ value }) => value)
};

export const DEFAULT_PLAYBOOK_SELECTION = {
  harnesses: selectionCatalog.harnesses,
  preset: 'pragmatic',
  automation: 'automated'
};

export const DEFAULT_GRANULAR_PLAYBOOK_SELECTION = {
  ...DEFAULT_PLAYBOOK_SELECTION,
  skills: selectionCatalog.skills,
  rules: selectionCatalog.rules,
  scripts: selectionCatalog.scripts,
  docs: selectionCatalog.docs
};

export function normalizePlaybookOptions(options = {}) {
  const normalized = {};

  for (const [key, validValues] of Object.entries(selectionCatalog)) {
    if (options[key] === undefined) continue;
    normalized[key] = [...new Set(parseSelectionList(options[key], validValues, selectionType[key]))];
  }

  if (normalized.harnesses && normalized.harnesses.length === 0) {
    throw new Error('Select at least one Playbook harness.');
  }

  for (const [key, validValues] of Object.entries(choiceCatalog)) {
    const value = options[key];
    if (value === undefined) continue;
    if (!validValues.includes(value)) {
      throw new Error(`Unknown Playbook ${key} "${value}". Available: ${validValues.join(', ')}`);
    }
    normalized[key] = value;
  }

  return normalized;
}

export function parsePlaybookCliOptions(args) {
  const parsed = {};
  const listFlags = {
    '--playbook-harness': 'harnesses',
    '--playbook-skills': 'skills',
    '--playbook-rules': 'rules',
    '--playbook-scripts': 'scripts',
    '--playbook-docs': 'docs'
  };
  const valueFlags = {
    '--playbook-preset': 'preset',
    '--playbook-automation': 'automation'
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const key = listFlags[flag] || valueFlags[flag];
    if (!key) {
      if (flag.startsWith('--playbook-')) {
        throw new Error(`Unknown Playbook option "${flag}".`);
      }
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Option "${flag}" requires a value.`);
    }
    index += 1;

    if (listFlags[flag]) {
      if (parsed[key] === undefined) parsed[key] = [];
      if (value === 'all' || value === 'none') {
        if (parsed[key].length > 0 || parsed[`${key}Mode`] !== undefined) {
          throw new Error(`Option "${flag}" cannot combine "${value}" with other selections.`);
        }
        parsed[`${key}Mode`] = value;
      } else {
        if (parsed[`${key}Mode`] !== undefined) {
          throw new Error(`Option "${flag}" cannot combine "${parsed[`${key}Mode`]}" with other selections.`);
        }
        parsed[key].push(...value.split(',').map((item) => item.trim()).filter(Boolean));
      }
    } else {
      if (parsed[key] !== undefined) {
        throw new Error(`Option "${flag}" can only be provided once.`);
      }
      parsed[key] = value;
    }
  }

  for (const key of Object.keys(selectionCatalog)) {
    if (parsed[`${key}Mode`] === 'all') parsed[key] = selectionCatalog[key];
    if (parsed[`${key}Mode`] === 'none') parsed[key] = [];
    delete parsed[`${key}Mode`];
  }

  return parsed;
}
