/**
 * JSON format detectors and parsers (Jira JSON, Linear JSON, Generic JSON) for universalImporter.
 */

import {
  extractAcceptanceCriteria,
  extractAdfText,
  mapUniversalPriority,
  mapUniversalStatus,
  mapUniversalType,
  type UniversalImportItem,
  type UniversalImportResult
} from './importerHelpers.ts';

export function isJiraJson(obj: any): boolean {
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

export function isLinearJson(obj: any): boolean {
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

export function parseJiraJson(json: any, defaultMilestone?: string): UniversalImportResult {
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

    const module = fields.components?.[0]?.name;
    const release = fields.fixVersions?.[0]?.name;
    let sprint: string | undefined = undefined;
    if (fields.sprint?.name) {
      sprint = fields.sprint.name;
    } else if (Array.isArray(fields.customfield_10020) && fields.customfield_10020[0]?.name) {
      sprint = fields.customfield_10020[0].name;
    }

    const estimate =
      fields.customfield_10016 ??
      fields.customfield_10026 ??
      fields.storyPoints ??
      fields.story_points;

    const labels = Array.isArray(fields.labels) ? fields.labels : undefined;
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

export function parseLinearJson(json: any, defaultMilestone?: string): UniversalImportResult {
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

export function parseGenericJson(array: any[], defaultMilestone?: string): UniversalImportResult {
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
