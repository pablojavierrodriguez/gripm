#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  addDays,
  formatDisplayDate,
  resolveTaskDates,
  computeTimeLimitsAndColumns,
  computeTodayMarkerPx,
  calculateItemCoordinates
} from '../src/components/timeline/dateEngine.ts';

console.log('Testing dateEngine pure functions...');

// 1. addDays tests
assert.equal(addDays('2026-03-01', 5), '2026-03-06', 'addDays positive offset');
assert.equal(addDays('2026-03-01', -5), '2026-02-24', 'addDays negative offset across month boundary');
assert.equal(addDays('2026-01-31', 1), '2026-02-01', 'addDays month rollover');
assert.equal(addDays('2026-12-31', 1), '2027-01-01', 'addDays year rollover');
assert.equal(addDays('2028-02-28', 1), '2028-02-29', 'addDays leap year handling');
assert.equal(addDays('invalid-date', 5), 'invalid-date', 'addDays invalid date fallback');
assert.equal(addDays('', 5), '', 'addDays empty date fallback');

// 2. formatDisplayDate tests
assert.equal(formatDisplayDate('2026-10-27'), '27/10/2026', 'formatDisplayDate DD/MM/YYYY');
assert.equal(formatDisplayDate('2026-01-05T12:00:00Z'), '05/01/2026', 'formatDisplayDate ISO string');
assert.equal(formatDisplayDate(''), '', 'formatDisplayDate empty string');
assert.equal(formatDisplayDate('invalid'), '', 'formatDisplayDate short string');

// 3. resolveTaskDates tests
const sprintsMap = new Map([
  ['sprint 1', { id: 'sp-1', name: 'Sprint 1', startDate: '2026-03-01', endDate: '2026-03-14', status: 'completed' }],
  ['sprint 2', { id: 'sp-2', name: 'Sprint 2', startDate: '2026-03-15', endDate: '2026-03-28', status: 'active' }]
]);

const releasesMap = new Map([
  ['v1.0.0', { id: 'rel-1', version: 'v1.0.0', targetDate: '2026-04-30', status: 'planned' }]
]);

// 3.1 Explicit dates
const itemExplicit = {
  id: 'DEV-1',
  code: 'DEV-1',
  title: 'Explicit Dates',
  status: 'doing',
  type: 'task',
  startDate: '2026-03-10',
  dueDate: '2026-03-20'
};
const resExplicit = resolveTaskDates(itemExplicit, sprintsMap, releasesMap);
assert.equal(resExplicit.startDate, '2026-03-10');
assert.equal(resExplicit.dueDate, '2026-03-20');
assert.equal(resExplicit.isInherited, false);

// 3.2 Due date only
const itemDueOnly = {
  id: 'DEV-2',
  code: 'DEV-2',
  title: 'Due Only',
  status: 'doing',
  type: 'task',
  dueDate: '2026-03-20'
};
const resDueOnly = resolveTaskDates(itemDueOnly, sprintsMap, releasesMap);
assert.equal(resDueOnly.startDate, '2026-03-06');
assert.equal(resDueOnly.dueDate, '2026-03-20');
assert.equal(resDueOnly.isInherited, false);

// 3.3 Start date only
const itemStartOnly = {
  id: 'DEV-3',
  code: 'DEV-3',
  title: 'Start Only',
  status: 'doing',
  type: 'task',
  startDate: '2026-03-10'
};
const resStartOnly = resolveTaskDates(itemStartOnly, sprintsMap, releasesMap);
assert.equal(resStartOnly.startDate, '2026-03-10');
assert.equal(resStartOnly.dueDate, '2026-03-24');
assert.equal(resStartOnly.isInherited, false);

// 3.4 Sprint inheritance
const itemSprint = {
  id: 'DEV-4',
  code: 'DEV-4',
  title: 'Sprint Inherited',
  status: 'doing',
  type: 'task',
  sprint: 'Sprint 2'
};
const resSprint = resolveTaskDates(itemSprint, sprintsMap, releasesMap);
assert.equal(resSprint.startDate, '2026-03-15');
assert.equal(resSprint.dueDate, '2026-03-28');
assert.equal(resSprint.isInherited, true);
assert.equal(resSprint.inheritedFrom, 'Sprint 2');

// 3.5 Release inheritance
const itemRelease = {
  id: 'DEV-5',
  code: 'DEV-5',
  title: 'Release Inherited',
  status: 'doing',
  type: 'task',
  release: 'v1.0.0'
};
const resRelease = resolveTaskDates(itemRelease, sprintsMap, releasesMap);
assert.equal(resRelease.startDate, '2026-04-16');
assert.equal(resRelease.dueDate, '2026-04-30');
assert.equal(resRelease.isInherited, true);
assert.equal(resRelease.inheritedFrom, 'Release v1.0.0');

// 3.6 Created fallback
const itemFallback = {
  id: 'DEV-6',
  code: 'DEV-6',
  title: 'Created Fallback',
  status: 'draft',
  type: 'task',
  createdAt: '2026-02-01T10:00:00Z'
};
const resFallback = resolveTaskDates(itemFallback, sprintsMap, releasesMap);
assert.equal(resFallback.startDate, '2026-02-01');
assert.equal(resFallback.dueDate, '2026-02-15');
assert.equal(resFallback.isInherited, true);

// 4. computeTimeLimitsAndColumns tests
const hierarchyRows = [
  {
    item: itemExplicit,
    range: resExplicit,
    isEpic: false,
    progressPercent: 0
  }
];
const sortedSprints = Array.from(sprintsMap.values());

// 4.1 Months scale
const resMonths = computeTimeLimitsAndColumns('months', sortedSprints, hierarchyRows, 'es');
assert(resMonths.timeColumns.length > 0, 'months scale generates columns');
assert(resMonths.totalGridWidthPx >= 900, 'grid width has minimum');
assert(resMonths.pxPerDay > 0, 'pxPerDay is positive');

// 4.2 Quarters scale
const resQuarters = computeTimeLimitsAndColumns('quarters', sortedSprints, hierarchyRows, 'es');
assert(resQuarters.timeColumns.length > 0, 'quarters scale generates columns');
assert(resQuarters.timeColumns[0].label.startsWith('Q'), 'quarter column starts with Q');

// 4.3 Sprints scale
const resSprints = computeTimeLimitsAndColumns('sprints', sortedSprints, hierarchyRows, 'es');
assert.equal(resSprints.timeColumns.length, 2, 'sprints scale generates 2 columns');
assert.equal(resSprints.timeColumns[0].label, 'Sprint 1');

// 5. calculateItemCoordinates tests
const coordsMonths = calculateItemCoordinates(
  'months',
  sortedSprints,
  resMonths.minGlobalDate,
  resMonths.pxPerDay,
  itemExplicit,
  resExplicit,
  false
);
assert(coordsMonths.leftPx >= 0, 'leftPx is non-negative');
assert(coordsMonths.widthPx >= 32, 'widthPx meets minimum');

const coordsSprintAssigned = calculateItemCoordinates(
  'sprints',
  sortedSprints,
  resSprints.minGlobalDate,
  resSprints.pxPerDay,
  itemSprint,
  resSprint,
  false
);
assert.equal(coordsSprintAssigned.leftPx, 280 * 1 + 8, 'sprint 2 positioned at column index 1');
assert.equal(coordsSprintAssigned.isUnassignedSprint, undefined);

const coordsSprintUnassigned = calculateItemCoordinates(
  'sprints',
  sortedSprints,
  resSprints.minGlobalDate,
  resSprints.pxPerDay,
  itemExplicit,
  resExplicit,
  false
);
assert.equal(coordsSprintUnassigned.isUnassignedSprint, true, 'unassigned item has isUnassignedSprint true');

console.log('✔ All dateEngine tests passed successfully!');
