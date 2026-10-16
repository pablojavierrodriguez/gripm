import type { BacklogItem, ItemStatus, ItemType, Priority, AcceptanceCriterion } from '../../types';

export interface BuildSavePayloadInput {
  item: BacklogItem | null;
  title: string;
  code: string;
  projectId: string;
  type: ItemType;
  priority: Priority;
  status: ItemStatus;
  selectedModules: string[];
  impactedFile: string;
  sprint: string;
  release: string;
  selectedReleases: string[];
  parentId: string;
  blocks: string[];
  blockedBy: string[];
  relatedTo: string[];
  description: string;
  risk: string;
  fix: string;
  implementationPlan: string;
  acceptanceCriteriaList: AcceptanceCriterion[];
  labels: string[];
  assignees: string[];
  estimate: string | number | undefined;
  startDate: string;
  dueDate: string;
  force: boolean;
}

export function buildSavePayload(input: BuildSavePayloadInput): Partial<BacklogItem> & { expectedMtime?: number; force?: boolean } {
  const {
    item,
    title,
    code,
    projectId,
    type,
    priority,
    status,
    selectedModules,
    impactedFile,
    sprint,
    release,
    selectedReleases,
    parentId,
    blocks,
    blockedBy,
    relatedTo,
    description,
    risk,
    fix,
    implementationPlan,
    acceptanceCriteriaList,
    labels,
    assignees,
    estimate,
    startDate,
    dueDate,
    force,
  } = input;

  return {
    id: item?.id,
    title: title.trim(),
    code: code.trim() || undefined,
    projectId,
    type,
    priority,
    status,
    module: selectedModules[0] ? selectedModules[0].trim() : '',
    modules: selectedModules,
    impactedFile: impactedFile.trim() || undefined,
    sprint: sprint.trim(),
    release: selectedReleases[0] ? selectedReleases[0].trim() : release.trim() || '',
    targetSprint: sprint.trim(),
    targetRelease: selectedReleases[0] ? selectedReleases[0].trim() : release.trim() || '',
    releases: selectedReleases.length > 0 ? selectedReleases : release.trim() ? [release.trim()] : [],
    milestone: selectedReleases[0] ? selectedReleases[0].trim() : release.trim() || '',
    sprints: sprint.trim() ? [sprint.trim()] : [],
    parentId: parentId.trim(),
    blocks,
    blockedBy,
    relatedTo,
    description: description.trim(),
    risk: risk.trim() || undefined,
    fix: fix.trim() || undefined,
    implementationPlan: implementationPlan.trim() || undefined,
    acceptanceCriteriaList,
    labels: labels.filter(Boolean),
    assignees: assignees.filter(Boolean),
    estimate: estimate !== undefined && estimate !== '' ? estimate : undefined,
    startDate: startDate.trim() || undefined,
    dueDate: dueDate.trim() || undefined,
    expectedMtime: item?.mtime,
    force,
  };
}
