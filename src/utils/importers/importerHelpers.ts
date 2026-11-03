/**
 * Shared types, CSV parser, field normalizers, and AC extractors for universalImporter.
 */

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
        if (i + 1 < len && cleaned[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
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

  currentRow.push(currentField);
  rows.push(currentRow);

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

  if (
    clean.includes('ready') ||
    clean.includes('staged') ||
    clean.includes('resolved') ||
    clean.includes('finish')
  ) {
    return 'ready';
  }

  if (
    clean.includes('done') ||
    clean.includes('complete') ||
    clean.includes('closed') ||
    clean.includes('shipped') ||
    clean.includes('released')
  ) {
    return 'done';
  }

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
