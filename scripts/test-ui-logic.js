#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKanbanColumnItems } from '../src/utils/kanbanColumnItems.ts';
import { getStatusMeta, normalizeStatus } from '../src/utils/statusMeta.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readLocale = (language) => JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'locales', `${language}.json`), 'utf8'),
);

const items = [
  { id: 'draft-later', status: 'draft', order: 20 },
  { id: 'idea', status: 'ideas', labels: [], order: 10 },
  { id: 'idea-label', status: 'draft', labels: ['idea'], order: 5 },
  { id: 'doing', status: 'doing', order: 1 },
  { id: 'legacy-draft', status: 'backlog', order: 15 },
];

const draftColumn = { id: 'col-draft', statuses: ['draft', 'backlog'] };
assert.deepEqual(
  getKanbanColumnItems(items, draftColumn, { showIdeas: true, viewMode: 'ampliada' }).map(({ id }) => id),
  ['legacy-draft', 'draft-later'],
  'draft column excludes ideas and sorts remaining items by order',
);
assert.deepEqual(
  getKanbanColumnItems(items, { id: 'col-ideas', statuses: ['ideas'] }, { showIdeas: true, viewMode: 'ampliada' })
    .map(({ id }) => id),
  ['idea-label', 'idea'],
  'ideas column groups explicit idea status and idea labels in order',
);
assert.deepEqual(
  getKanbanColumnItems(items, { id: 'col-doing', statuses: ['doing'] }, { showIdeas: false, viewMode: 'simplificada' })
    .map(({ id }) => id),
  ['doing'],
  'each status belongs only to a matching column',
);

for (const [legacy, canonical] of [
  ['backlog', 'draft'],
  ['in_progress', 'doing'],
  ['testing_qa', 'review'],
  ['finish', 'ready'],
]) {
  assert.equal(normalizeStatus(legacy), canonical, `${legacy} normalizes to ${canonical}`);
}

const english = readLocale('en');
const spanish = readLocale('es');
const statusLabel = (locale) => getStatusMeta('doing', (key) => locale[key] ?? key).label;
assert.equal(statusLabel(english), english['status.doing']);
assert.equal(statusLabel(spanish), spanish['status.doing']);
assert.notEqual(statusLabel(english), statusLabel(spanish), 'status labels change with the selected locale');

// DEV-236: Header stacking context must strictly supersede FilterBar stacking context
const headerSource = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Header.tsx'), 'utf8');
const filterBarSource = fs.readFileSync(path.join(ROOT, 'src', 'components', 'FilterBar.tsx'), 'utf8');
const headerZ = parseInt((headerSource.match(/<header[^>]*className="[^"]*\bz-(\d+)\b/) || [])[1] || '0', 10);
const filterBarZ = parseInt((filterBarSource.match(/className="[^"]*\bz-(\d+)\b/) || [])[1] || '0', 10);
assert(
  headerZ > filterBarZ,
  `Header z-index (${headerZ}) must be strictly greater than FilterBar z-index (${filterBarZ}) to prevent project dropdown occlusion (DEV-236)`,
);

// DEV-239: SettingsView must use SettingsSwitch for all boolean configuration toggles and have zero raw checkboxes
const settingsSource = fs.readFileSync(path.join(ROOT, 'src', 'components', 'SettingsView.tsx'), 'utf8');
assert(settingsSource.includes('export const SettingsSwitch'), 'SettingsSwitch must be defined and exported in SettingsView.tsx (DEV-239)');
const checkboxMatches = [...settingsSource.matchAll(/type="checkbox"/g)];
assert.equal(
  checkboxMatches.length,
  1,
  `SettingsView.tsx must only contain exactly 1 input type="checkbox" (inside SettingsSwitch primitive), found ${checkboxMatches.length} (DEV-239)`,
);
assert(settingsSource.includes('checked={enabledTabs.kanban}'), 'Workflows & Views tab must use SettingsSwitch for kanban (DEV-239)');
assert(settingsSource.includes('checked={showIdeasByDefault}'), 'Kanban tab must use SettingsSwitch for showIdeasByDefault (DEV-239)');
assert(settingsSource.includes('checked={autoSave}'), 'Apariencia tab must use SettingsSwitch for autoSave (DEV-239)');

console.log('✅ UI logic: Kanban grouping, legacy status aliases, localized status labels, Header/FilterBar stacking hierarchy, and unified SettingsSwitch (DEV-239)');
