/**
 * universalImporter.ts (DEV-228)
 *
 * Universal Local-First Backlog Importer for Gripm.
 * Supports parsing exports from Jira (JSON & CSV), Linear (JSON & CSV),
 * generic CSVs, and legacy Markdown files with 0 external network dependencies.
 */

import { parseLegacyMarkdown } from './legacyParser.ts';
import {
  escapeSectionMarkers,
  extractAcceptanceCriteria,
  extractAdfText,
  mapUniversalPriority,
  mapUniversalStatus,
  mapUniversalType,
  parseCsv,
  type DetectedSource,
  type UniversalAcceptanceCriterion,
  type UniversalImportItem,
  type UniversalImportResult
} from './importers/importerHelpers.ts';
import {
  isJiraJson,
  isLinearJson,
  parseGenericJson,
  parseJiraJson,
  parseLinearJson
} from './importers/jsonImporters.ts';
import {
  isGenericCsvHeaders,
  isJiraCsvHeaders,
  isLinearCsvHeaders,
  parseGenericCsv,
  parseJiraCsv,
  parseLinearCsv
} from './importers/csvImporters.ts';

export {
  escapeSectionMarkers,
  extractAcceptanceCriteria,
  extractAdfText,
  mapUniversalPriority,
  mapUniversalStatus,
  mapUniversalType,
  parseCsv,
  type DetectedSource,
  type UniversalAcceptanceCriterion,
  type UniversalImportItem,
  type UniversalImportResult
};

/**
 * Detects the format of export data and parses all items with intelligent mapping.
 */
export function parseUniversalExport(
  rawContent: string,
  defaultMilestone?: string
): UniversalImportResult {
  if (!rawContent || !rawContent.trim()) {
    return {
      source: 'unknown',
      label: 'Sin contenido detectable',
      totalFound: 0,
      items: []
    };
  }

  const trimmed = rawContent.trim();

  // 1. Try parsing as JSON (Jira or Linear JSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(trimmed);

      if (isJiraJson(parsedJson)) {
        return parseJiraJson(parsedJson, defaultMilestone);
      }

      if (isLinearJson(parsedJson)) {
        return parseLinearJson(parsedJson, defaultMilestone);
      }

      if (Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
        return parseGenericJson(parsedJson, defaultMilestone);
      }
    } catch {
      // Not valid JSON, continue to CSV/Markdown checks
    }
  }

  // 2. Parse as CSV
  const csvRows = parseCsv(trimmed);
  if (csvRows.length >= 2 && csvRows[0].length >= 2) {
    const headers = csvRows[0].map(h => h.trim().toLowerCase());

    if (isJiraCsvHeaders(headers)) {
      return parseJiraCsv(csvRows, defaultMilestone);
    }

    if (isLinearCsvHeaders(headers)) {
      return parseLinearCsv(csvRows, defaultMilestone);
    }

    if (isGenericCsvHeaders(headers)) {
      return parseGenericCsv(csvRows, defaultMilestone);
    }
  }

  // 3. Fallback to Legacy Markdown
  if (trimmed.includes('#') || trimmed.includes('- [ ]') || trimmed.includes('- [x]')) {
    const legacyItems = parseLegacyMarkdown(trimmed, defaultMilestone);
    if (legacyItems.length > 0) {
      const items: UniversalImportItem[] = legacyItems.map(it => ({
        tempId: it.tempId,
        title: it.title,
        description: it.description,
        status: it.status,
        priority: it.priority,
        type: it.type,
        milestone: it.milestone,
        module: it.module,
        sprint: it.sprint,
        release: it.release,
        targetSprint: it.targetSprint,
        targetRelease: it.targetRelease,
        selected: it.selected
      }));

      return {
        source: 'markdown',
        label: `Markdown Legacy detectado: ${items.length} tareas`,
        totalFound: items.length,
        items
      };
    }
  }

  return {
    source: 'unknown',
    label: 'Formato no reconocido',
    totalFound: 0,
    items: []
  };
}

/**
 * Formats a UniversalImportItem into standard Backlog.md markdown format for writing to backlog/tasks/*.md
 */
export function formatTaskMarkdown(task: UniversalImportItem, id: string): string {
  const now = new Date().toISOString().split('T')[0];

  const frontmatter: string[] = [
    '---',
    `id: ${id}`,
    `title: ${JSON.stringify(task.title || 'Sin título')}`,
    `status: ${task.status}`,
    `created_date: '${now}'`,
    `updated_date: '${now}'`
  ];

  if (task.labels && task.labels.length > 0) {
    frontmatter.push('labels:');
    task.labels.forEach(l => frontmatter.push(`  - ${JSON.stringify(l)}`));
  }

  const priorityMap: Record<string, string> = {
    p0: 'urgent',
    p1: 'high',
    p2: 'medium',
    p3: 'low'
  };
  frontmatter.push(`priority: ${priorityMap[task.priority] || 'medium'}`);
  frontmatter.push(`type: ${task.type || 'feature'}`);

  if (task.estimate !== undefined && task.estimate !== null && task.estimate !== '') {
    if (typeof task.estimate === 'number') {
      frontmatter.push(`estimate: ${task.estimate}`);
    } else {
      frontmatter.push(`estimate: ${JSON.stringify(task.estimate)}`);
    }
  }

  if (task.sprint) {
    frontmatter.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }

  if (task.milestone) {
    frontmatter.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }

  if (task.assignees && task.assignees.length > 0) {
    frontmatter.push('assignees:');
    task.assignees.forEach(a => frontmatter.push(`  - ${JSON.stringify(a)}`));
  }

  if (task.originalKey) {
    frontmatter.push(`original_key: ${JSON.stringify(task.originalKey)}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  const bodySections: string[] = [];

  bodySections.push('## Description\n');
  bodySections.push('<!-- SECTION:DESCRIPTION:BEGIN -->');
  bodySections.push(escapeSectionMarkers(task.description || ''));
  bodySections.push('<!-- SECTION:DESCRIPTION:END -->\n');

  bodySections.push('## Acceptance Criteria\n');
  bodySections.push('<!-- AC:BEGIN -->');
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, idx) => {
      const index = ac.index || idx + 1;
      const mark = ac.checked ? 'x' : ' ';
      bodySections.push(`- [${mark}] #${index} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push('<!-- AC:END -->\n');

  return `${frontmatter.join('\n')}\n${bodySections.join('\n')}`;
}
