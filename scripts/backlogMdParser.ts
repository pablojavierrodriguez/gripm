/**
 * backlogMdParser.ts
 * Parser y serializador nativo (zero-dependency) para el estándar Backlog.md (MrLesk/Backlog.md)
 * Compatible con Node.js y navegadores.
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
 * Convierte e.g. `<!-- AC:BEGIN -->` en `<!\-- AC:BEGIN -->` para evitar que un lector simple
 * o el guard confunda el ejemplo con un delimitador estructural real.
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

export interface CodeFenceRange {
  start: number;
  end: number;
}

/**
 * DEV-300: Identifica todos los rangos de caracteres [start, end] correspondientes a bloques
 * de código cercados (fenced code blocks con ``` o ~~~) según la especificación CommonMark.
 * Respeta indentación de 0 a 3 espacios, carácter delimitador y longitud de cierre >= apertura.
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
 * Soporta comillas dobles (con escapes JSON/YAML como \" y \\), comillas simples (con escape '')
 * y escalares planos (unquoted). Elimina la multiplicación de barras invertidas (\" -> \\\").
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

function cleanItem(val: string): string {
  return unquoteYamlScalar(val);
}

/**
 * DEV-289: Parsea listas inline entre corchetes respetando comillas y comas internas.
 * e.g. ["ui/ux", "auth, login"] -> ["ui/ux", "auth, login"]
 */
export function parseInlineList(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];

  // Intento 1: Si es JSON válido, parsearlo directamente con soporte nativo para escapes y comas
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Si falla (por ejemplo con comillas simples YAML o elementos sin entrecomillar), usar tokenizador
  }

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

/**
 * Parsea un archivo de tarea Markdown con YAML frontmatter y secciones
 */
export function parseBacklogMd(content: string, defaultId = ''): BacklogMdTask {
  const result: BacklogMdTask = {
    id: defaultId,
    title: 'Sin título',
    status: 'draft',
    type: 'feature',
    priority: 'p2',
    assignees: [],
    labels: [],
    dependencies: [],
    acceptanceCriteria: [],
    rawExtraFrontmatter: {}
  };

  if (!content) return result;

  // DEV-300: Soportar archivos con UTF-8 BOM (\uFEFF)
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.slice(1);
  }

  // 1. Extraer Frontmatter
  // DEV-300: Soportar archivos sin salto de línea final tras el cierre ---
  let bodyContent = cleanContent;
  const frontmatterMatch = cleanContent.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  
  if (frontmatterMatch) {
    const rawFm = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2] || '';

    const lines = rawFm.split(/\r?\n/);
    let currentKey = '';
    let currentList: string[] = [];
    let inList = false;

    const finalizeList = () => {
      if (inList && currentKey) {
        if (currentKey === 'labels') result.labels = currentList;
        else if (currentKey === 'assignee' || currentKey === 'assignees') result.assignees = currentList;
        else if (currentKey === 'dependencies') result.dependencies = currentList;
        else if (currentKey === 'blocks') result.blocks = currentList;
        else if (currentKey === 'blocked_by' || currentKey === 'blockedby') result.blockedBy = currentList;
        else if (currentKey === 'related_to' || currentKey === 'relatedto') result.relatedTo = currentList;
        else if (currentKey === 'sprints') {
          result.sprints = currentList;
          if (currentList.length > 0 && !result.sprint) {
            result.sprint = currentList[currentList.length - 1];
            result.targetSprint = currentList[currentList.length - 1];
          }
        }
        else if (currentKey === 'releases' || currentKey === 'release') result.releases = currentList;
        else {
          if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
          result.rawExtraFrontmatter[currentKey] = currentList;
        }
      }
      inList = false;
      currentList = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('- ')) {
        // Elemento de lista
        const itemVal = unquoteYamlScalar(trimmed.replace(/^- /, ''));
        currentList.push(itemVal);
        continue;
      }

      // Si teníamos una lista abierta y encontramos una clave nueva, finalizarla
      if (inList && !line.startsWith(' ') && !line.startsWith('\t')) {
        finalizeList();
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const rawKey = line.slice(0, colonIdx).trim();
        // DEV-300: Validar clave contra /^[a-zA-Z0-9_-]+$/ para impedir inyecciones de saltos de línea o directivas no autorizadas
        if (!/^[a-zA-Z0-9_-]+$/.test(rawKey)) {
          continue;
        }
        const key = rawKey.toLowerCase();
        const rawVal = line.slice(colonIdx + 1).trim();
        const cleanVal = unquoteYamlScalar(rawVal);

        currentKey = key;

        if (!rawVal) {
          // Posible inicio de lista en la siguiente línea
          inList = true;
          currentList = [];
          continue;
        }

        if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          // Inline list [a, b, c]
          const items = parseInlineList(rawVal);
          if (key === 'labels') result.labels = items;
          else if (key === 'assignee' || key === 'assignees') result.assignees = items;
          else if (key === 'dependencies') result.dependencies = items;
          else if (key === 'blocks') result.blocks = items;
          else if (key === 'blocked_by' || key === 'blockedby') result.blockedBy = items;
          else if (key === 'related_to' || key === 'relatedto') result.relatedTo = items;
          else if (key === 'sprints') {
            result.sprints = items;
            if (items.length > 0 && !result.sprint) {
              result.sprint = items[items.length - 1];
              result.targetSprint = items[items.length - 1];
            }
          }
          else if (key === 'releases' || key === 'release') result.releases = items;
          else {
            if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
            result.rawExtraFrontmatter[key] = items;
          }
          continue;
        }

        switch (key) {
          case 'id':
            result.id = cleanVal;
            break;
          case 'title':
            result.title = cleanVal;
            break;
          case 'status':
            result.rawStatus = cleanVal;
            result.status = normalizeStatus(cleanVal);
            break;
          case 'type':
            result.type = normalizeType(cleanVal);
            break;
          case 'priority':
            result.priority = cleanVal;
            break;
          case 'milestone':
            result.milestone = cleanVal;
            break;
          case 'module':
            result.module = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.module = cleanVal;
            break;
          case 'epic':
            result.epic = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.epic = cleanVal;
            break;
          case 'category':
            result.category = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.category = cleanVal;
            break;
          case 'impactedfile':
            result.impactedFile = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.impactedFile = cleanVal;
            break;
          case 'risk':
            result.risk = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.risk = cleanVal;
            break;
          case 'fix':
            result.fix = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.fix = cleanVal;
            break;
          case 'parent':
          case 'parentid':
            result.parentId = cleanVal;
            break;
          case 'blocks':
            result.blocks = [cleanVal];
            break;
          case 'blocked_by':
          case 'blockedby':
            result.blockedBy = [cleanVal];
            break;
          case 'blocked_reason':
          case 'blockedreason':
            result.blockedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.blocked_reason = cleanVal;
            break;
          case 'dismissed_reason':
          case 'dismissedreason':
            result.dismissedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.dismissed_reason = cleanVal;
            break;
          case 'related_to':
          case 'relatedto':
            result.relatedTo = [cleanVal];
            break;
          case 'sprints':
            result.sprints = [cleanVal];
            break;
          case 'releases':
            result.releases = [cleanVal];
            break;
          case 'sprint':
          case 'targetsprint':
            result.sprint = cleanVal;
            result.targetSprint = cleanVal;
            if (!result.sprints || result.sprints.length === 0) {
              result.sprints = [cleanVal];
            }
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.sprint = cleanVal;
              result.rawExtraFrontmatter.targetSprint = cleanVal;
            }
            break;
          case 'release':
          case 'targetrelease':
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.release = cleanVal;
              result.rawExtraFrontmatter.targetRelease = cleanVal;
            }
            break;
          case 'created_date':
          case 'createdat':
            result.createdDate = cleanVal;
            break;
          case 'updated_date':
          case 'updatedat':
            result.updatedDate = cleanVal;
            break;
          case 'start_date':
          case 'startdate':
            result.startDate = cleanVal;
            break;
          case 'due_date':
          case 'duedate':
          case 'target_date':
          case 'targetdate':
            result.dueDate = cleanVal;
            break;
          case 'assignee':
            result.assignees = [cleanVal];
            break;
          case 'isdeleted':
            result.isDeleted = cleanVal.toLowerCase() === 'true';
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case 'deletedat':
            result.deletedAt = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case 'previousstatus':
            result.previousStatus = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case 'estimate':
          case 'estimation':
          case 'points':
          case 'story_points':
          case 'storypoints': {
            const num = Number(cleanVal);
            result.estimate = (!isNaN(num) && cleanVal !== '' && !cleanVal.includes(' ')) ? num : cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.estimate = cleanVal;
            }
            break;
          }
          default:
            if (result.rawExtraFrontmatter) {
              if (rawVal === 'true') {
                result.rawExtraFrontmatter[key] = true;
              } else if (rawVal === 'false') {
                result.rawExtraFrontmatter[key] = false;
              } else if (/^-?\d+(?:\.\d+)?$/.test(rawVal)) {
                result.rawExtraFrontmatter[key] = Number(rawVal);
              } else {
                result.rawExtraFrontmatter[key] = cleanVal;
              }
            }
            break;
        }
      }
    }
    finalizeList();
    if (result.sprints && result.sprints.length > 0 && !result.sprint) {
      result.sprint = result.sprints[result.sprints.length - 1];
      result.targetSprint = result.sprint;
    }
  }

  // 2. Extraer Secciones Delimitadas
  // DEV-132 / DEV-300: Extracción determinista de las 5 secciones estándar. Se analizan primero los
  // bloques H2 delimitados fuera de código y luego los marcadores HTML (si existen), ignorando
  // cualquier marcador o encabezado dentro de bloques de código cercados.

  // A. Descripción
  const descBlock = extractSectionBlock(bodyContent, 'Description');
  const descMarker = extractMarkerContent(descBlock || bodyContent, 'SECTION:DESCRIPTION:BEGIN', 'SECTION:DESCRIPTION:END');
  if (descMarker !== null) {
    result.description = unescapeSectionMarkers(descMarker.trim());
  } else if (descBlock) {
    result.description = unescapeSectionMarkers(descBlock.trim());
  }

  // B. Acceptance Criteria (AC)
  const acBlock = extractSectionBlock(bodyContent, 'Acceptance Criteria');
  const acMarker = extractMarkerContent(acBlock || bodyContent, 'AC:BEGIN', 'AC:END');
  let acText = '';
  if (acMarker !== null) {
    acText = acMarker;
  } else if (acBlock) {
    acText = acBlock;
  }

  if (acText) {
    const acFenceRanges = getCodeFenceRanges(acText);
    const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
    let match: RegExpExecArray | null;
    const parsedAC: ParsedAcceptanceCriteria[] = [];
    let autoIndex = 1;

    while ((match = lineRegex.exec(acText)) !== null) {
      const line = match[1];
      const lineStart = match.index;
      if (match[0].length === 0 && lineStart >= acText.length) break;

      if (!isOffsetInFence(lineStart, acFenceRanges)) {
        const itemMatch = line.match(/^-\s*\[([ xX])\]\s*(?:#(\d+)\s+)?(.*)$/);
        if (itemMatch) {
          const checked = itemMatch[1].toLowerCase() === 'x';
          const num = itemMatch[2] ? parseInt(itemMatch[2], 10) : autoIndex++;
          const text = unescapeSectionMarkers(itemMatch[3].trim());
          parsedAC.push({ index: num, text, checked });
        }
      }
    }
    result.acceptanceCriteria = parsedAC;
  }

  // C. Implementation Plan
  const planBlock = extractSectionBlock(bodyContent, 'Implementation Plan');
  const planMarker = extractMarkerContent(planBlock || bodyContent, 'SECTION:PLAN:BEGIN', 'SECTION:PLAN:END');
  if (planMarker !== null) {
    result.implementationPlan = unescapeSectionMarkers(planMarker.trim());
  } else if (planBlock) {
    result.implementationPlan = unescapeSectionMarkers(planBlock.trim());
  }

  // D. Implementation Notes
  const notesBlock = extractSectionBlock(bodyContent, 'Implementation Notes');
  const notesMarker = extractMarkerContent(notesBlock || bodyContent, 'SECTION:NOTES:BEGIN', 'SECTION:NOTES:END');
  if (notesMarker !== null) {
    result.implementationNotes = unescapeSectionMarkers(notesMarker.trim());
  } else if (notesBlock) {
    result.implementationNotes = unescapeSectionMarkers(notesBlock.trim());
  }

  // E. Final Summary
  const summaryBlock = extractSectionBlock(bodyContent, 'Final Summary');
  const summaryMarker = extractMarkerContent(summaryBlock || bodyContent, 'SECTION:FINAL_SUMMARY:BEGIN', 'SECTION:FINAL_SUMMARY:END');
  if (summaryMarker !== null) {
    result.finalSummary = unescapeSectionMarkers(summaryMarker.trim());
  } else if (summaryBlock) {
    result.finalSummary = unescapeSectionMarkers(summaryBlock.trim());
  }

  return result;
}

/**
 * Serializa un objeto BacklogMdTask a un archivo Markdown compatible con el estándar Backlog.md
 */
export function serializeBacklogMd(task: BacklogMdTask): string {
  const frontmatterLines: string[] = ['---'];

  // DEV-300: Sanitizar id y tipo contra inyecciones de saltos de línea (\n)
  const cleanId = (task.id || '').replace(/[\r\n]+/g, '').trim();
  frontmatterLines.push(`id: ${cleanId}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || 'Sin título')}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push('assignee:');
    task.assignees.forEach(a => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const cleanCreated = (task.createdDate || nowStr).replace(/[\r\n']+/g, '').trim();
  const cleanUpdated = (task.updatedDate || nowStr).replace(/[\r\n']+/g, '').trim();
  frontmatterLines.push(`created_date: '${cleanCreated}'`);
  frontmatterLines.push(`updated_date: '${cleanUpdated}'`);

  if (task.labels && task.labels.length > 0) {
    frontmatterLines.push('labels:');
    task.labels.forEach(l => frontmatterLines.push(`  - ${JSON.stringify(l)}`));
  } else {
    frontmatterLines.push('labels: []');
  }

  if (task.dependencies && task.dependencies.length > 0) {
    frontmatterLines.push('dependencies:');
    task.dependencies.forEach(d => frontmatterLines.push(`  - ${JSON.stringify(d)}`));
  } else {
    frontmatterLines.push('dependencies: []');
  }

  frontmatterLines.push(`priority: ${formatPriorityForMd(task.priority || 'p2')}`);

  if (task.type) {
    const cleanType = String(task.type).replace(/[\r\n]+/g, '').trim();
    if (/^[a-zA-Z0-9_-]+$/.test(cleanType)) {
      frontmatterLines.push(`type: ${cleanType}`);
    } else {
      frontmatterLines.push(`type: ${JSON.stringify(cleanType)}`);
    }
  }

  if (task.milestone) {
    frontmatterLines.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }

  if (task.parentId) {
    frontmatterLines.push(`parent: ${JSON.stringify(task.parentId)}`);
  }

  if (task.blocks && task.blocks.length > 0) {
    frontmatterLines.push('blocks:');
    task.blocks.forEach(b => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }

  if (task.blockedBy && task.blockedBy.length > 0) {
    frontmatterLines.push('blocked_by:');
    task.blockedBy.forEach(b => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }

  if (task.blockedReason) {
    frontmatterLines.push(`blocked_reason: ${JSON.stringify(task.blockedReason)}`);
  }

  if (task.dismissedReason) {
    frontmatterLines.push(`dismissed_reason: ${JSON.stringify(task.dismissedReason)}`);
  }

  if (task.relatedTo && task.relatedTo.length > 0) {
    frontmatterLines.push('related_to:');
    task.relatedTo.forEach(r => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }

  const isInvalidSprint = (s: string | undefined | null) => {
    if (!s) return true;
    const clean = s.trim().toLowerCase();
    return clean === 'backlog-futuro' || clean === 'sin-sprint' || clean === 'sin sprint' || clean === 'backlog' || clean === 'none' || clean === 'null';
  };

  if (task.sprints && task.sprints.length > 0) {
    const validSprints = task.sprints.filter(s => !isInvalidSprint(s));
    if (validSprints.length > 0) {
      frontmatterLines.push('sprints:');
      validSprints.forEach(s => frontmatterLines.push(`  - ${JSON.stringify(s)}`));
    }
  }

  if (task.releases && task.releases.length > 0) {
    frontmatterLines.push('releases:');
    task.releases.forEach(r => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }

  if (task.sprint && !isInvalidSprint(task.sprint)) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }

  if (task.targetSprint && task.targetSprint !== task.sprint && !isInvalidSprint(task.targetSprint)) {
    frontmatterLines.push(`targetSprint: ${JSON.stringify(task.targetSprint)}`);
  }

  if (task.isDeleted) {
    frontmatterLines.push('isDeleted: true');
    if (task.deletedAt) {
      frontmatterLines.push(`deletedAt: ${JSON.stringify(task.deletedAt)}`);
    }
    if (task.previousStatus) {
      frontmatterLines.push(`previousStatus: ${JSON.stringify(task.previousStatus)}`);
    }
  }

  if (task.estimate !== undefined && task.estimate !== null && task.estimate !== '') {
    if (typeof task.estimate === 'number') {
      frontmatterLines.push(`estimate: ${task.estimate}`);
    } else {
      frontmatterLines.push(`estimate: ${JSON.stringify(task.estimate)}`);
    }
  }

  if (task.startDate) {
    frontmatterLines.push(`start_date: ${JSON.stringify(task.startDate)}`);
  }

  if (task.dueDate) {
    frontmatterLines.push(`due_date: ${JSON.stringify(task.dueDate)}`);
  }

  if (task.rawExtraFrontmatter) {
    for (const [k, v] of Object.entries(task.rawExtraFrontmatter)) {
      // DEV-300: Validar clave contra /^[a-zA-Z0-9_-]+$/ para impedir inyecciones de saltos de línea o directivas no autorizadas
      if (!/^[a-zA-Z0-9_-]+$/.test(k)) {
        continue;
      }
      if (!['id', 'title', 'status', 'assignee', 'assignees', 'created_date', 'updated_date', 'labels', 'dependencies', 'priority', 'type', 'milestone', 'parent', 'parentid', 'blocks', 'blocked_by', 'blockedby', 'blocked_reason', 'blockedreason', 'dismissed_reason', 'dismissedreason', 'related_to', 'relatedto', 'sprints', 'releases', 'sprint', 'targetsprint', 'isdeleted', 'deletedat', 'previousstatus', 'estimate', 'estimation', 'points', 'story_points', 'storypoints', 'start_date', 'startdate', 'due_date', 'duedate', 'target_date', 'targetdate'].includes(k.toLowerCase())) {
        if (v === undefined || v === null) {
          continue;
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            frontmatterLines.push(`${k}: []`);
          } else {
            frontmatterLines.push(`${k}:`);
            v.forEach(item => frontmatterLines.push(`  - ${JSON.stringify(item)}`));
          }
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          frontmatterLines.push(`${k}: ${v}`);
        } else {
          frontmatterLines.push(`${k}: ${JSON.stringify(v)}`);
        }
      }
    }
  }

  frontmatterLines.push('---');
  frontmatterLines.push('');

  // Cuerpo Markdown con secciones delimitadas
  const bodySections: string[] = [];

  // 1. Description
  // DEV-127: NUNCA fabricar contenido que el usuario no escribió. El .md de cada
  // tarea es la fuente de verdad, se commitea en git y lo leen agentes de IA: si
  // escribimos aquí un relleno, ese texto pasa a ser indistinguible de lo que el
  // autor redactó realmente, y además desactiva el Plan Guard (que detecta "tiene
  // plan o ACs" para bloquear el paso a Doing). La sección se escribe vacía.
  // DEV-132: Escapamos marcadores literales dentro de texto libre para no propagar corrupciones.
  bodySections.push('## Description\n');
  bodySections.push('<!-- SECTION:DESCRIPTION:BEGIN -->');
  bodySections.push(escapeSectionMarkers(task.description || ''));
  bodySections.push('<!-- SECTION:DESCRIPTION:END -->\n');

  // 2. Acceptance Criteria
  // DEV-127: sin ACs, la sección queda vacía (no se inyecta un AC de relleno).
  bodySections.push('## Acceptance Criteria\n');
  bodySections.push('<!-- AC:BEGIN -->');
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, i) => {
      const idx = ac.index || (i + 1);
      const mark = ac.checked ? 'x' : ' ';
      bodySections.push(`- [${mark}] #${idx} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push('<!-- AC:END -->\n');

  // 3. Implementation Plan
  // DEV-127: sin plan, la sección queda vacía (no se inyecta un plan genérico).
  bodySections.push('## Implementation Plan\n');
  bodySections.push('<!-- SECTION:PLAN:BEGIN -->');
  if (task.implementationPlan) {
    bodySections.push(escapeSectionMarkers(task.implementationPlan));
  }
  bodySections.push('<!-- SECTION:PLAN:END -->\n');

  // 4. Implementation Notes (si existen)
  if (task.implementationNotes) {
    bodySections.push('## Implementation Notes\n');
    bodySections.push('<!-- SECTION:NOTES:BEGIN -->');
    bodySections.push(escapeSectionMarkers(task.implementationNotes));
    bodySections.push('<!-- SECTION:NOTES:END -->\n');
  }

  // 5. Final Summary (si existe)
  if (task.finalSummary) {
    bodySections.push('## Final Summary\n');
    bodySections.push('<!-- SECTION:FINAL_SUMMARY:BEGIN -->');
    bodySections.push(escapeSectionMarkers(task.finalSummary));
    bodySections.push('<!-- SECTION:FINAL_SUMMARY:END -->\n');
  }

  return `${frontmatterLines.join('\n')}\n${bodySections.join('\n')}`;
}

/**
 * Genera el nombre estándar canónico de archivo para una tarea Backlog.md:
 * e.g. "DOM-SPEC-001 - SPEC-001 Arquitectura de Persistencia Real & Sincronización con Supabase.md"
 * El nombre DEBE comenzar con el ID en MAYÚSCULAS seguido de " - " y el título limpio preservando mayúsculas y espacios.
 * SEC-01 de DEV-292: Sanitización estricta de Path Traversal para garantizar contención en backlog/tasks.
 */
export function generateTaskFilename(id: string, title: string): string {
  const sanitizedId = (id || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/--+/g, '-')
    .trim()
    .toUpperCase();
  const cleanId = sanitizedId || 'TASK';

  let cleanTitle = (title || 'Task')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTitle.length > 200) {
    cleanTitle = cleanTitle.slice(0, 200).trim();
  }

  return `${cleanId} - ${cleanTitle || 'Task'}.md`;
}

/**
 * Genera un archivo Markdown unificado consolidado (BACKLOG.md) a partir de una lista de tareas.
 */
export function generateMonolithicBacklogMd(projectName: string, items: BacklogMdTask[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Backlog: ${projectName}`,
    `> Consolidado generado el ${now} por gripm`,
    '',
    '## Resumen de Estados',
    ''
  ];

  const statuses: CanonicalStatus[] = ['ideas', 'doing', 'blocked', 'review', 'ready', 'draft', 'done', 'dismissed', 'cancelled'];
  const grouped: Record<CanonicalStatus, BacklogMdTask[]> = {
    ideas: [],
    doing: [],
    blocked: [],
    review: [],
    ready: [],
    draft: [],
    done: [],
    dismissed: [],
    cancelled: []
  };

  for (const item of items) {
    const s = item.status || 'draft';
    if (grouped[s]) grouped[s].push(item);
    else grouped.draft.push(item);
  }

  for (const s of statuses) {
    const list = grouped[s];
    if (list.length === 0) continue;

    const titleMap: Record<string, string> = {
      ideas: '💡 Ideas / Discovery',
      doing: '⚡ In Progress / Doing',
      review: '🔍 Review & QA',
      ready: '🚀 Ready for Deploy',
      draft: '📋 Backlog / Draft',
      done: '✅ Done / Deployed',
      dismissed: '📦 Archivadas / Descartadas',
      cancelled: '🚫 Canceladas / Cancelled'
    };

    lines.push(`### ${titleMap[s] || s.toUpperCase()} (${list.length})`);
    lines.push('');

    for (const item of list) {
      lines.push(`#### [${item.id}] ${item.title}`);
      lines.push(`- **Prioridad**: \`${item.priority || 'p2'}\` | **Tipo**: \`${item.type || 'feature'}\``);
      if (item.milestone) lines.push(`- **Sprint / Milestone**: ${item.milestone}`);
      if (item.description) lines.push(`\n${item.description}\n`);

      if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
        lines.push('**Criterios de Aceptación:**');
        item.acceptanceCriteria.forEach(ac => {
          lines.push(`- [${ac.checked ? 'x' : ' '}] #${ac.index} ${ac.text}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}
