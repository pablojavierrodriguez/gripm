/**
 * CSV format detectors and parsers (Jira CSV, Linear CSV, Generic CSV) for universalImporter.
 */

import {
  extractAcceptanceCriteria,
  mapUniversalPriority,
  mapUniversalStatus,
  mapUniversalType,
  type UniversalAcceptanceCriterion,
  type UniversalImportItem,
  type UniversalImportResult
} from './importerHelpers.ts';

export function isJiraCsvHeaders(headers: string[]): boolean {
  const hasKey = headers.some(h => /^(issue\s*key|key|clave(\s*de\s*la\s*incidencia)?|issue\s*id)$/i.test(h));
  const hasJiraFields = headers.some(h => /^(summary|resumen|issue\s*type|tipo(\s*de\s*incidencia)?)$/i.test(h));
  return hasKey && hasJiraFields;
}

export function isLinearCsvHeaders(headers: string[]): boolean {
  const hasIdentifier = headers.some(h => /^(identifier)$/i.test(h));
  const hasLinearFields = headers.some(h => /^(title|estimate|cycle|cycle\s*name)$/i.test(h));
  return hasIdentifier && hasLinearFields;
}

export function isGenericCsvHeaders(headers: string[]): boolean {
  return headers.some(h => /^(title|summary|resumen|name|task|asunto|t[ií]tulo)$/i.test(h));
}

export function parseJiraCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
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

    let acs: UniversalAcceptanceCriterion[] = [];
    if (acIdx !== -1 && row[acIdx] && row[acIdx].trim()) {
      const parsedAcs = extractAcceptanceCriteria(row[acIdx]);
      acs = parsedAcs.acs;
    }

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

export function parseLinearCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
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

export function parseGenericCsv(rows: string[][], defaultMilestone?: string): UniversalImportResult {
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
