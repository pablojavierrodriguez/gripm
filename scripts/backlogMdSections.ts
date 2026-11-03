/**
 * scripts/backlogMdSections.ts
 *
 * Types, normalizers, section markers, code fence parsers, and YAML scalar helpers
 * for the Backlog.md format.
 */

export type CanonicalStatus = 'draft' | 'doing' | 'review' | 'ready' | 'done' | 'dismissed' | 'cancelled' | 'ideas' | 'blocked';

export interface ParsedAcceptanceCriteria {
  index: number;
  text: string;
  checked: boolean;
}

export interface BacklogMdTask {
  id: string;
  title: string;
  status: CanonicalStatus;
  rawStatus?: string;
  type?: string;
  priority?: string;
  assignees?: string[];
  labels?: string[];
  dependencies?: string[];
  milestone?: string;
  sprint?: string;
  targetSprint?: string;
  parentId?: string;
  blocks?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  dismissedReason?: string;
  relatedTo?: string[];
  sprints?: string[];
  releases?: string[];
  createdDate?: string;
  updatedDate?: string;
  description?: string;
  acceptanceCriteria?: ParsedAcceptanceCriteria[];
  implementationPlan?: string;
  implementationNotes?: string;
  finalSummary?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  previousStatus?: string;
  module?: string;
  epic?: string;
  category?: string;
  impactedFile?: string;
  risk?: string;
  fix?: string;
  estimate?: string | number;
  startDate?: string;
  dueDate?: string;
  rawExtraFrontmatter?: Record<string, any>;
}

export interface CodeFenceRange {
  start: number;
  end: number;
}

/**
 * Normaliza cualquier estado (legacy o comunidad) al estándar unificado:
 * 'draft' | 'doing' | 'review' | 'ready' | 'done' | 'dismissed' | 'cancelled' | 'ideas' | 'blocked'
 */
export function normalizeStatus(raw: string | undefined | null): CanonicalStatus {
  if (!raw) return 'draft';
  const clean = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');

  switch (clean) {
    case 'ideas':
    case 'idea':
    case 'discovery':
      return 'ideas';

    case 'draft':
    case 'drafts':
    case 'backlog':
    case 'todo':
    case 'open':
      return 'draft';

    case 'doing':
    case 'inprogress':
    case 'wip':
    case 'inprog':
    case 'active':
    case 'started':
      return 'doing';

    case 'blocked':
    case 'impediment':
    case 'block':
    case 'hold':
    case 'onhold':
      return 'blocked';

    case 'review':
    case 'testing':
    case 'testingqa':
    case 'qa':
    case 'test':
    case 'inreview':
      return 'review';

    case 'ready':
    case 'finish':
    case 'readyfordeploy':
    case 'staged':
    case 'resolved':
      return 'ready';

    case 'done':
    case 'deployed':
    case 'closed':
    case 'completed':
    case 'shipped':
      return 'done';

    case 'dismissed':
    case 'cancelled':
    case 'canceled':
    case 'abandoned':
    case 'archived':
    case 'archive':
      return 'dismissed';

    default:
      return 'draft';
  }
}

/**
 * Convierte un estado canónico al formato legible para Backlog.md
 */
export function formatStatusForMd(status: CanonicalStatus | string): string {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'ideas':
      return 'ideas';
    case 'draft':
      return 'draft';
    case 'doing':
      return 'doing';
    case 'blocked':
      return 'blocked';
    case 'review':
      return 'review';
    case 'ready':
      return 'ready';
    case 'done':
      return 'done';
    case 'dismissed':
      return 'dismissed';
    default:
      return 'draft';
  }
}

/**
 * Normaliza prioridad hacia p0..p3
 */
export function normalizePriority(raw: string | undefined | null): 'p0' | 'p1' | 'p2' | 'p3' {
  if (!raw) return 'p2';
  const clean = raw.trim().toLowerCase();
  if (clean === 'p0' || clean === 'urgent' || clean === 'critical') return 'p0';
  if (clean === 'p1' || clean === 'high') return 'p1';
  if (clean === 'p2' || clean === 'medium' || clean === 'med') return 'p2';
  if (clean === 'p3' || clean === 'low') return 'p3';
  return 'p2';
}

/**
 * Formatea prioridad para Backlog.md frontmatter
 */
export function formatPriorityForMd(p: 'p0' | 'p1' | 'p2' | 'p3' | string): string {
  if (p === 'p0') return 'urgent';
  if (p === 'p1') return 'high';
  if (p === 'p2') return 'medium';
  if (p === 'p3') return 'low';
  return p || 'medium';
}

/**
 * Normaliza el tipo de tarea al vocabulario estándar de gripm
 * (bug, feature, tech_debt, ux, epic, initiative)
 */
export function normalizeType(raw: string | undefined | null): string {
  if (!raw) return 'feature';
  const clean = raw.trim().toLowerCase();
  if (clean === 'bugfix' || clean === 'defect' || clean === 'fix') return 'bug';
  return clean;
}

/**
 * DEV-132: Escapa marcadores de sección literales que aparezcan dentro de texto libre del usuario.
 */
export function escapeSectionMarkers(text: string): string {
  if (!text) return text;
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, '<!\\-- $1 -->');
}

/**
 * DEV-132: Desescapa marcadores literales que fueron neutralizados durante la serialización.
 */
export function unescapeSectionMarkers(text: string): string {
  if (!text) return text;
  return text.replace(/<!\\--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, '<!-- $1 -->');
}

/**
 * DEV-300: Identifica todos los rangos de caracteres [start, end] correspondientes a bloques
 * de código cercados (fenced code blocks con ``` o ~~~) según la especificación CommonMark.
 */
export function getCodeFenceRanges(text: string): CodeFenceRange[] {
  const ranges: CodeFenceRange[] = [];
  if (!text) return ranges;

  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match: RegExpExecArray | null;

  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;
  let fenceStart = -1;

  while ((match = lineRegex.exec(text)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;

    if (match[0].length === 0 && lineStart >= text.length) {
      break;
    }

    if (!inFence) {
      const openMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})/);
      if (openMatch) {
        const char = openMatch[1][0];
        const restOfLine = line.slice(openMatch.index! + openMatch[0].length);
        if (char === '`' && restOfLine.includes('`')) {
          continue;
        }
        inFence = true;
        fenceChar = char;
        fenceLength = openMatch[1].length;
        fenceStart = lineStart;
      }
    } else {
      const closeMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLength) {
        ranges.push({ start: fenceStart, end: lineEnd });
        inFence = false;
        fenceChar = '';
        fenceLength = 0;
        fenceStart = -1;
      }
    }
  }

  if (inFence && fenceStart !== -1) {
    ranges.push({ start: fenceStart, end: text.length });
  }

  return ranges;
}

/**
 * DEV-300: Determina si un offset de caracteres se encuentra dentro de alguno de los rangos de bloques de código cercados.
 */
export function isOffsetInFence(offset: number, fenceRanges: CodeFenceRange[]): boolean {
  for (const range of fenceRanges) {
    if (offset >= range.start && offset < range.end) {
      return true;
    }
  }
  return false;
}

/**
 * DEV-300: Extrae el contenido delimitado por marcadores HTML (e.g. <!-- AC:BEGIN --> ... <!-- AC:END -->),
 * ignorando rigurosamente cualquier marcador ubicado dentro de bloques de código cercados.
 */
export function extractMarkerContent(text: string, beginMarkerName: string, endMarkerName: string): string | null {
  if (!text) return null;

  const fenceRanges = getCodeFenceRanges(text);
  const beginRegex = new RegExp(`<!--\\s*${beginMarkerName}\\s*-->`, 'gi');
  const endRegex = new RegExp(`<!--\\s*${endMarkerName}\\s*-->`, 'gi');

  let beginMatch: RegExpExecArray | null = null;
  while ((beginMatch = beginRegex.exec(text)) !== null) {
    if (!isOffsetInFence(beginMatch.index, fenceRanges)) {
      break;
    }
  }

  if (!beginMatch) {
    return null;
  }

  const payloadStart = beginMatch.index + beginMatch[0].length;
  endRegex.lastIndex = payloadStart;

  let endMatch: RegExpExecArray | null = null;
  while ((endMatch = endRegex.exec(text)) !== null) {
    if (!isOffsetInFence(endMatch.index, fenceRanges)) {
      break;
    }
  }

  if (!endMatch) {
    return text.slice(payloadStart);
  }

  return text.slice(payloadStart, endMatch.index);
}

/**
 * DEV-132 / DEV-289 / DEV-300: Extrae el bloque de contenido delimitado bajo un encabezado H2 específico (## HeaderName)
 * hasta el siguiente encabezado H2 fuera de bloques de código cercados (``` o ~~~) o el fin del documento.
 */
export function extractSectionBlock(body: string, headerName: string): string {
  if (!body) return '';

  const fenceRanges = getCodeFenceRanges(body);
  const escapedHeader = headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const targetHeaderRegex = new RegExp(`^[ ]{0,3}##\\s+${escapedHeader}\\b[^\r\n]*`, 'i');

  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match: RegExpExecArray | null;

  let sectionFound = false;
  let startIndex = -1;
  let endIndex = body.length;

  while ((match = lineRegex.exec(body)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;

    if (match[0].length === 0 && lineStart >= body.length) {
      break;
    }

    if (!isOffsetInFence(lineStart, fenceRanges)) {
      const isH2 = /^[ ]{0,3}##\s+[^\r\n]*/.test(line);
      if (isH2) {
        if (!sectionFound) {
          if (targetHeaderRegex.test(line)) {
            sectionFound = true;
            startIndex = lineEnd;
          }
        } else {
          endIndex = lineStart;
          break;
        }
      }
    }
  }

  if (!sectionFound || startIndex === -1) {
    return '';
  }

  return body.slice(startIndex, endIndex);
}

/**
 * DEV-300: Desescapa y desentrecomilla de forma simétrica y determinista un escalar YAML.
 */
export function unquoteYamlScalar(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

export function cleanItem(val: string): string {
  return unquoteYamlScalar(val);
}

/**
 * DEV-289: Parsea listas inline entre corchetes respetando comillas y comas internas.
 */
export function parseInlineList(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch {}

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];

  const items: string[] = [];
  let currentToken = '';
  let inQuote: null | '"' | "'" = null;
  let escaped = false;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];

    if (escaped) {
      currentToken += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      currentToken += char;
      continue;
    }

    if (inQuote) {
      currentToken += char;
      if (char === inQuote) {
        inQuote = null;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = char;
        currentToken += char;
      } else if (char === ',') {
        const item = cleanItem(currentToken);
        if (item) items.push(item);
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
  }

  const lastItem = cleanItem(currentToken);
  if (lastItem) items.push(lastItem);

  return items;
}
