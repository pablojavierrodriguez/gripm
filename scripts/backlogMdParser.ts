/**
 * backlogMdParser.ts
 * Parser y serializador nativo (zero-dependency) para el estándar Backlog.md (MrLesk/Backlog.md)
 * Compatible con Node.js y navegadores.
 */

export * from './backlogMdSections.ts';
export * from './backlogMdSerializer.ts';

import {
  type BacklogMdTask,
  type ParsedAcceptanceCriteria,
  normalizeStatus,
  normalizeType,
  unquoteYamlScalar,
  parseInlineList,
  extractSectionBlock,
  extractMarkerContent,
  unescapeSectionMarkers,
  getCodeFenceRanges,
  isOffsetInFence,
} from './backlogMdSections.ts';

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
