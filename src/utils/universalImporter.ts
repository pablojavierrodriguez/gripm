/**
 * universalImporter.ts (DEV-228)
 *
 * Universal Local-First Backlog Importer for Gripm.
 * Supports parsing exports from Jira (JSON & CSV), Linear (JSON & CSV),
 * generic CSVs, and legacy Markdown files with 0 external network dependencies.
 */

import { parseLegacyMarkdown } from './legacyParser.ts';

export type DetectedSource =
  | 'jira-json'
  | 'jira-csv'
  | 'linear-json'
  | 'linear-csv'
  | 'generic-csv'
  | 'markdown'
  | 'unknown';

export interface UniversalAcceptanceCriterion {
  index: number;
  text: string;
  checked: boolean;
}

export interface UniversalImportItem {
  tempId: string;
  originalKey?: string;
  title: string;
  description: string;
  status: 'draft' | 'doing' | 'review' | 'ready' | 'done' | 'cancelled';
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  type: 'feature' | 'bug' | 'tech_debt' | 'ux' | 'epic';
  milestone?: string;
  module?: string;
  sprint?: string;
  release?: string;
  targetSprint?: string;
  targetRelease?: string;
  estimate?: string | number;
  labels?: string[];
  assignees?: string[];
  acceptanceCriteria?: UniversalAcceptanceCriterion[];
  selected: boolean;
}

export interface UniversalImportResult {
  source: DetectedSource;
  label: string;
  totalFound: number;
  items: UniversalImportItem[];
  warnings?: string[];
}

/**
 * DEV-132: Escapes literal section markers in text to prevent syntax corruption.
 */
export function escapeSectionMarkers(text: string): string {
  if (!text) return '';
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, '<!\\-- $1 -->');
}

/**
 * Native RFC 4180 CSV parser supporting:
 * - Double quotes enclosing values
 * - Commas and newlines (both \r\n and \n) within quoted fields
 * - Escaped double quotes ("")
 * - UTF-8 BOM handling
 */
export function parseCsv(text: string): string[][] {
  if (!text || !text.trim()) return [];

  // Strip UTF-8 BOM if present
  const cleaned = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = cleaned.length;

  while (i < len) {
    const char = cleaned[i];

    if (inQuotes) {
      if (char === '"') {
        // Escaped quote: "" -> "
        if (i + 1 < len && cleaned[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        currentRow.push(currentField);
        currentField = '';
        if (i + 1 < len && cleaned[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        rows.push(currentRow);
        currentRow = [];
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field and row
  currentRow.push(currentField);
  rows.push(currentRow);

  // Remove trailing empty row caused by final newline
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0].trim() === '') {
      rows.pop();
    }
  }

  return rows;
}

/**
 * Intelligent Status Normalizer
 * Maps statuses from Jira, Linear, and generic tools to canonical Gripm statuses:
 * draft | doing | review | ready | done | cancelled
 */
export function mapUniversalStatus(
  rawStatus: string | undefined | null
): 'draft' | 'doing' | 'review' | 'ready' | 'done' | 'cancelled' {
  if (!rawStatus) return 'draft';
  const clean = rawStatus.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

  // Review / Testing / QA
  if (
    clean.includes('review') ||
    clean.includes('testing') ||
    clean.includes('qa') ||
    clean.includes('under review') ||
    clean.includes('code review') ||
    clean.includes('in verification') ||
    /\bpr\b/.test(clean)
  ) {
    return 'review';
  }

  // Doing / In Progress / Started
  if (
    clean.includes('in progress') ||
    clean.includes('doing') ||
    clean.includes('started') ||
    clean.includes('in development') ||
    clean.includes('in dev') ||
    clean.includes('active') ||
    clean.includes('wip') ||
    clean === 'working'
  ) {
    return 'doing';
  }

  // Ready / Staged / Resolved
  if (
    clean.includes('ready') ||
    clean.includes('staged') ||
    clean.includes('resolved') ||
    clean.includes('finish')
  ) {
    return 'ready';
  }

  // Done / Completed / Closed
  if (
    clean.includes('done') ||
    clean.includes('complete') ||
    clean.includes('closed') ||
    clean.includes('shipped') ||
    clean.includes('released')
  ) {
    return 'done';
  }

  // Cancelled / Dismissed / Duplicate
  if (
    clean.includes('cancel') ||
    clean.includes('duplicate') ||
    clean.includes('wontfix') ||
    clean.includes("won't fix") ||
    clean.includes('dismissed') ||
    clean.includes('rejected') ||
    clean.includes('abandoned')
  ) {
    return 'cancelled';
  }

  // Draft / Backlog / To Do (Default)
  return 'draft';
}

/**
 * Priority Normalizer
 * Maps Highest/High/Urgent -> p0/p1, Medium -> p2, Low/Lowest -> p3
 */
export function mapUniversalPriority(rawPriority: string | number | undefined | null): 'p0' | 'p1' | 'p2' | 'p3' {
  if (rawPriority === undefined || rawPriority === null) return 'p2';
  const clean = String(rawPriority).trim().toLowerCase();

  if (
    clean === 'p0' ||
    clean === 'urgent' ||
    clean === 'critical' ||
    clean === 'blocker' ||
    clean === 'highest'
  ) {
    return 'p0';
  }
  if (
    clean === 'p1' ||
    clean === 'high' ||
    clean === '1' ||
    clean === 'major'
  ) {
    return 'p1';
  }
  if (
    clean === 'p2' ||
    clean === 'medium' ||
    clean === 'normal' ||
    clean === '2' ||
    clean === 'moderate' ||
    clean === 'med'
  ) {
    return 'p2';
  }
  if (
    clean === 'p3' ||
    clean === 'low' ||
    clean === 'lowest' ||
    clean === '3' ||
    clean === '4' ||
    clean === 'minor' ||
    clean === 'trivial' ||
    clean === 'no priority'
  ) {
    return 'p3';
  }

  return 'p2';
}

/**
 * Issue Type Normalizer
 * Maps Bug -> bug, Story/Feature -> feature, Epic -> epic, Task/Subtask -> tech_debt/chore
 */
export function mapUniversalType(rawType: string | undefined | null): 'feature' | 'bug' | 'tech_debt' | 'ux' | 'epic' {
  if (!rawType) return 'feature';
  const clean = rawType.trim().toLowerCase();

  if (clean.includes('bug') || clean.includes('defect') || clean.includes('incident') || clean.includes('error')) {
    return 'bug';
  }
  if (clean.includes('epic') || clean.includes('initiative')) {
    return 'epic';
  }
  if (clean.includes('ux') || clean.includes('design') || clean.includes('ui')) {
    return 'ux';
  }
  if (
    clean.includes('task') ||
    clean.includes('subtask') ||
    clean.includes('sub-task') ||
    clean.includes('chore') ||
    clean.includes('tech') ||
    clean.includes('refactor') ||
    clean.includes('improvement')
  ) {
    return 'tech_debt';
  }

  return 'feature';
}

/**
 * Extracts Acceptance Criteria embedded in description text.
 * Detects checklists (- [ ] ...), Acceptance Criteria headers, and numbered lists.
 */
export function extractAcceptanceCriteria(
  rawDesc: string
): { acs: UniversalAcceptanceCriterion[]; cleanedDescription: string } {
  if (!rawDesc) return { acs: [], cleanedDescription: '' };

  // Normalize literal escaped newlines if text contains \n but no actual newlines
  let normalized = rawDesc;
  if (!normalized.includes('\n') && normalized.includes('\\n')) {
    normalized = normalized.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }

  const lines = normalized.split(/\r?\n/);
  const acs: UniversalAcceptanceCriterion[] = [];
  const keptLines: string[] = [];

  let inAcSection = false;
  let acIndex = 1;

  const checkboxRegex = /^\s*[-*+•]?\s*\[([ xX])\]\s*(?:#\d+\s+)?(.*)$/;
  const acHeaderRegex = /^(?:#{1,4}\s*)?(?:acceptance\s*criteria|criterios?\s*(?:de\s*)?aceptaci[oó]n|ac)\s*:?\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (acHeaderRegex.test(trimmed)) {
      inAcSection = true;
      continue;
    }

    const checkMatch = line.match(checkboxRegex);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === 'x';
      const text = checkMatch[2].trim();
      if (text) {
        acs.push({
          index: acIndex++,
          text,
          checked
        });
      }
      continue;
    }

    if (inAcSection) {
      // List items in AC section: - ... or 1. ...
      const listItemMatch = line.match(/^\s*(?:[-*+•]|\d+\.)\s+(.*)$/);
      if (listItemMatch && listItemMatch[1].trim()) {
        acs.push({
          index: acIndex++,
          text: listItemMatch[1].trim(),
          checked: false
        });
        continue;
      } else if (trimmed === '') {
        continue;
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        // Next header reached, exit AC section
        inAcSection = false;
        keptLines.push(line);
        continue;
      }
    }

    keptLines.push(line);
  }

  return {
    acs,
    cleanedDescription: keptLines.join('\n').trim()
  };
}

/**
 * Recursively extracts plain text from Atlassian Document Format (ADF) nodes in Jira JSON.
 */
export function extractAdfText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;

  if (Array.isArray(node.content)) {
    const joined = node.content.map(extractAdfText).join(node.type === 'paragraph' ? '\n' : '');
    return joined;
  }

  return '';
}

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

      // 1.1 Jira JSON
      if (isJiraJson(parsedJson)) {
        return parseJiraJson(parsedJson, defaultMilestone);
      }

      // 1.2 Linear JSON
      if (isLinearJson(parsedJson)) {
        return parseLinearJson(parsedJson, defaultMilestone);
      }

      // 1.3 Generic JSON array
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

    // 2.1 Jira CSV
    if (isJiraCsvHeaders(headers)) {
      return parseJiraCsv(csvRows, defaultMilestone);
    }

    // 2.2 Linear CSV
    if (isLinearCsvHeaders(headers)) {
      return parseLinearCsv(csvRows, defaultMilestone);
    }

    // 2.3 Generic CSV
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

// ---------------------------------------------------------------------------
// Format Identification Helpers
// ---------------------------------------------------------------------------

function isJiraJson(obj: any): boolean {
  if (obj && Array.isArray(obj.issues) && obj.issues.length > 0) {
    const first = obj.issues[0];
    return Boolean(first && (first.fields || first.key));
  }
  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0];
    return Boolean(first && (first.fields || (first.key && first.summary)));
  }
  return false;
}

function isLinearJson(obj: any): boolean {
  let list: any[] | null = null;
  if (Array.isArray(obj)) list = obj;
  else if (obj && obj.data && Array.isArray(obj.data.issues)) list = obj.data.issues;
  else if (obj && Array.isArray(obj.issues)) list = obj.issues;

  if (list && list.length > 0) {
    const first = list[0];
    return Boolean(
      first &&
      (first.identifier ||
        (first.title && (first.state || first.priorityLabel || first.cycle || first.project)))
    );
  }
  return false;
}

function isJiraCsvHeaders(headers: string[]): boolean {
  const hasKey = headers.some(h => /^(issue\s*key|key|clave(\s*de\s*la\s*incidencia)?|issue\s*id)$/i.test(h));
  const hasJiraFields = headers.some(h => /^(summary|resumen|issue\s*type|tipo(\s*de\s*incidencia)?)$/i.test(h));
  return hasKey && hasJiraFields;
}

function isLinearCsvHeaders(headers: string[]): boolean {
  const hasIdentifier = headers.some(h => /^(identifier)$/i.test(h));
  const hasLinearFields = headers.some(h => /^(title|estimate|cycle|cycle\s*name)$/i.test(h));
  return hasIdentifier && hasLinearFields;
}

function isGenericCsvHeaders(headers: string[]): boolean {
  return headers.some(h => /^(title|summary|resumen|name|task|asunto|t[ií]tulo)$/i.test(h));
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseJiraJson(json: any, defaultMilestone?: string): UniversalImportResult {
  const rawIssues: any[] = Array.isArray(json) ? json : json.issues || [];
  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (const issue of rawIssues) {
    const fields = issue.fields || issue;
    const key = issue.key || issue.id || `JIRA-${counter}`;
    const rawSummary = fields.summary || fields.title || issue.summary || 'Sin título';

    let rawDesc = '';
    if (typeof fields.description === 'string') {
      rawDesc = fields.description;
    } else if (fields.description && typeof fields.description === 'object') {
      rawDesc = extractAdfText(fields.description);
    }

    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);

    const rawStatus = fields.status?.name || issue.status?.name || fields.status;
    const rawPriority = fields.priority?.name || issue.priority?.name || fields.priority;
    const rawType = fields.issuetype?.name || issue.issuetype?.name || fields.type;

    // Component as module
    const module = fields.components?.[0]?.name;
    // Fix version as release
    const release = fields.fixVersions?.[0]?.name;
    // Sprint
    let sprint: string | undefined = undefined;
    if (fields.sprint?.name) {
      sprint = fields.sprint.name;
    } else if (Array.isArray(fields.customfield_10020) && fields.customfield_10020[0]?.name) {
      sprint = fields.customfield_10020[0].name;
    }

    // Estimate / Story points
    const estimate =
      fields.customfield_10016 ??
      fields.customfield_10026 ??
      fields.storyPoints ??
      fields.story_points;

    // Labels
    const labels = Array.isArray(fields.labels) ? fields.labels : undefined;

    // Assignee
    const assignee = fields.assignee?.displayName || fields.assignee?.name;

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: key,
      title: rawSummary.trim(),
      description: cleanedDescription || rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: release || defaultMilestone || undefined,
      module: module || undefined,
      sprint: sprint || undefined,
      release: release || undefined,
      targetSprint: sprint || undefined,
      targetRelease: release || undefined,
      estimate: estimate !== undefined ? estimate : undefined,
      labels,
      assignees: assignee ? [assignee] : undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'jira-json',
    label: `Jira JSON detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}

function parseLinearJson(json: any, defaultMilestone?: string): UniversalImportResult {
  const rawIssues: any[] = Array.isArray(json)
    ? json
    : json.data?.issues || json.issues || [];
  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (const issue of rawIssues) {
    const key = issue.identifier || issue.id || `LIN-${counter}`;
    const rawTitle = issue.title || 'Sin título';
    const rawDesc = issue.description || '';

    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);

    const rawStatus = issue.state?.name || issue.status?.name || issue.state || issue.status;
    const rawPriority = issue.priorityLabel ?? issue.priority;

    const sprint = issue.cycle?.name || (issue.cycle?.number ? `Cycle ${issue.cycle.number}` : undefined);
    const module = issue.project?.name || issue.team?.name;

    // Labels
    let labels: string[] | undefined = undefined;
    if (Array.isArray(issue.labels)) {
      labels = issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
    }

    const assignee = issue.assignee?.name || issue.assignee?.displayName;

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: key,
      title: rawTitle.trim(),
      description: cleanedDescription || rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: 'feature',
      milestone: defaultMilestone || undefined,
      module: module || undefined,
      sprint: sprint || undefined,
      targetSprint: sprint || undefined,
      estimate: issue.estimate !== undefined ? issue.estimate : undefined,
      labels,
      assignees: assignee ? [assignee] : undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'linear-json',
    label: `Linear JSON detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}

function parseGenericJson(array: any[], defaultMilestone?: string): UniversalImportResult {
  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (const item of array) {
    const title = item.title || item.summary || item.name || item.task || 'Sin título';
    const rawDesc = item.description || item.details || item.notes || '';
    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: item.id || item.code || item.key || undefined,
      title: String(title).trim(),
      description: cleanedDescription || String(rawDesc).trim(),
      status: mapUniversalStatus(item.status || item.state),
      priority: mapUniversalPriority(item.priority),
      type: mapUniversalType(item.type),
      milestone: item.milestone || defaultMilestone || undefined,
      module: item.module || undefined,
      sprint: item.sprint || undefined,
      release: item.release || undefined,
      targetSprint: item.sprint || undefined,
      targetRelease: item.release || undefined,
      estimate: item.estimate !== undefined ? item.estimate : undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'generic-csv',
    label: `JSON genérico detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}

function parseJiraCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const findCol = (regex: RegExp) => headers.findIndex(h => regex.test(h));

  const keyIdx = findCol(/^(issue\s*key|key|clave(\s*de\s*la\s*incidencia)?|issue\s*id)$/i);
  const summaryIdx = findCol(/^(summary|resumen|title|t[ií]tulo)$/i);
  const descIdx = findCol(/^(description|descripci[oó]n|body|details)$/i);
  const statusIdx = findCol(/^(status|estado|state)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const typeIdx = findCol(/^(issue\s*type|tipo(\s*de\s*incidencia)?|type)$/i);
  const sprintIdx = findCol(/^(sprint|sprints)$/i);
  const moduleIdx = findCol(/^(component[s]?|componentes?|module|m[oó]dulo)$/i);
  const releaseIdx = findCol(/^(fix\s*version[s]?|fix\s*version\/s|release|milestone)$/i);
  const estimateIdx = findCol(/^(story\s*points?|puntos(\s*de\s*historia)?|estimate)$/i);
  const acIdx = findCol(/^(acceptance\s*criteria|criterios?(\s*de\s*aceptaci[oó]n)?|ac)$/i);

  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const rawSummary = summaryIdx !== -1 ? row[summaryIdx] : `Tarea ${counter}`;
    if (!rawSummary || !rawSummary.trim()) continue;

    const key = keyIdx !== -1 ? row[keyIdx]?.trim() : undefined;
    let rawDesc = descIdx !== -1 ? (row[descIdx] || '') : '';
    if (!rawDesc.includes('\n') && rawDesc.includes('\\n')) {
      rawDesc = rawDesc.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    }

    // If dedicated AC column exists
    let acs: UniversalAcceptanceCriterion[] = [];
    if (acIdx !== -1 && row[acIdx] && row[acIdx].trim()) {
      const parsedAcs = extractAcceptanceCriteria(row[acIdx]);
      acs = parsedAcs.acs;
    }

    // Also check description for checkboxes
    const parsedDesc = extractAcceptanceCriteria(rawDesc);
    if (parsedDesc.acs.length > 0) {
      acs = [...acs, ...parsedDesc.acs].map((item, idx) => ({ ...item, index: idx + 1 }));
      rawDesc = parsedDesc.cleanedDescription;
    }

    const rawStatus = statusIdx !== -1 ? row[statusIdx] : '';
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : '';
    const rawType = typeIdx !== -1 ? row[typeIdx] : '';
    const sprint = sprintIdx !== -1 ? row[sprintIdx]?.trim() : undefined;
    const module = moduleIdx !== -1 ? row[moduleIdx]?.trim() : undefined;
    const release = releaseIdx !== -1 ? row[releaseIdx]?.trim() : undefined;
    const estimate = estimateIdx !== -1 ? row[estimateIdx]?.trim() : undefined;

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: key || undefined,
      title: rawSummary.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: release || defaultMilestone || undefined,
      module: module || undefined,
      sprint: sprint || undefined,
      release: release || undefined,
      targetSprint: sprint || undefined,
      targetRelease: release || undefined,
      estimate: estimate || undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'jira-csv',
    label: `Jira CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}

function parseLinearCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const findCol = (regex: RegExp) => headers.findIndex(h => regex.test(h));

  const idIdx = findCol(/^(identifier|id)$/i);
  const titleIdx = findCol(/^(title|t[ií]tulo|name|summary)$/i);
  const descIdx = findCol(/^(description|descripci[oó]n)$/i);
  const statusIdx = findCol(/^(status|state|estado)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const estimateIdx = findCol(/^(estimate|estimaci[oó]n|points)$/i);
  const cycleIdx = findCol(/^(cycle(\s*name)?|cycle\s*number|sprint)$/i);
  const projectIdx = findCol(/^(project(\s*name)?|team)$/i);
  const labelsIdx = findCol(/^(labels?|etiquetas?)$/i);
  const assigneeIdx = findCol(/^(assignee(\s*name)?|asignado)$/i);

  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const rawTitle = titleIdx !== -1 ? row[titleIdx] : `Tarea ${counter}`;
    if (!rawTitle || !rawTitle.trim()) continue;

    const key = idIdx !== -1 ? row[idIdx]?.trim() : undefined;
    let rawDesc = descIdx !== -1 ? (row[descIdx] || '') : '';
    if (!rawDesc.includes('\n') && rawDesc.includes('\\n')) {
      rawDesc = rawDesc.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    }

    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    if (acs.length > 0) {
      rawDesc = cleanedDescription;
    }

    const rawStatus = statusIdx !== -1 ? row[statusIdx] : '';
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : '';
    const estimate = estimateIdx !== -1 ? row[estimateIdx]?.trim() : undefined;
    const sprint = cycleIdx !== -1 ? row[cycleIdx]?.trim() : undefined;
    const module = projectIdx !== -1 ? row[projectIdx]?.trim() : undefined;

    let labels: string[] | undefined = undefined;
    if (labelsIdx !== -1 && row[labelsIdx]) {
      labels = row[labelsIdx].split(',').map(s => s.trim()).filter(Boolean);
    }

    const assignee = assigneeIdx !== -1 ? row[assigneeIdx]?.trim() : undefined;

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: key || undefined,
      title: rawTitle.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: 'feature',
      milestone: defaultMilestone || undefined,
      module: module || undefined,
      sprint: sprint || undefined,
      targetSprint: sprint || undefined,
      estimate: estimate || undefined,
      labels,
      assignees: assignee ? [assignee] : undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'linear-csv',
    label: `Linear CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
  };
}

function parseGenericCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const findCol = (regex: RegExp) => headers.findIndex(h => regex.test(h));

  const titleIdx = findCol(/^(title|summary|resumen|name|task|asunto|t[ií]tulo)$/i);
  const descIdx = findCol(/^(description|details|notes|body|descripci[oó]n|notas)$/i);
  const statusIdx = findCol(/^(status|state|estado)$/i);
  const priorityIdx = findCol(/^(priority|prioridad)$/i);
  const typeIdx = findCol(/^(type|tipo|kind)$/i);
  const idIdx = findCol(/^(id|code|key|c[oó]digo)$/i);
  const moduleIdx = findCol(/^(module|m[oó]dulo|component)$/i);
  const sprintIdx = findCol(/^(sprint|milestone|hito)$/i);

  let counter = 1;
  const items: UniversalImportItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const title = titleIdx !== -1 ? row[titleIdx] : `Tarea ${counter}`;
    if (!title || !title.trim()) continue;

    const key = idIdx !== -1 ? row[idIdx]?.trim() : undefined;
    let rawDesc = descIdx !== -1 ? (row[descIdx] || '') : '';
    if (!rawDesc.includes('\n') && rawDesc.includes('\\n')) {
      rawDesc = rawDesc.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    }

    const { acs, cleanedDescription } = extractAcceptanceCriteria(rawDesc);
    if (acs.length > 0) {
      rawDesc = cleanedDescription;
    }

    const rawStatus = statusIdx !== -1 ? row[statusIdx] : '';
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx] : '';
    const rawType = typeIdx !== -1 ? row[typeIdx] : '';
    const module = moduleIdx !== -1 ? row[moduleIdx]?.trim() : undefined;
    const sprint = sprintIdx !== -1 ? row[sprintIdx]?.trim() : undefined;

    items.push({
      tempId: `IMPORT-${String(counter++).padStart(3, '0')}`,
      originalKey: key || undefined,
      title: title.trim(),
      description: rawDesc.trim(),
      status: mapUniversalStatus(rawStatus),
      priority: mapUniversalPriority(rawPriority),
      type: mapUniversalType(rawType),
      milestone: defaultMilestone || undefined,
      module: module || undefined,
      sprint: sprint || undefined,
      targetSprint: sprint || undefined,
      acceptanceCriteria: acs.length > 0 ? acs : undefined,
      selected: true
    });
  }

  return {
    source: 'generic-csv',
    label: `CSV detectado: ${items.length} tareas`,
    totalFound: items.length,
    items
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

  // Description
  bodySections.push('## Description\n');
  bodySections.push('<!-- SECTION:DESCRIPTION:BEGIN -->');
  bodySections.push(escapeSectionMarkers(task.description || ''));
  bodySections.push('<!-- SECTION:DESCRIPTION:END -->\n');

  // Acceptance Criteria
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
