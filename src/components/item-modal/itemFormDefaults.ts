import type { BacklogItem, GripmConfig, Project, ItemStatus, ItemType, Priority, AcceptanceCriterion } from '../../types';
import { DEFAULT_FIBONACCI, DEFAULT_TSHIRT } from '../../types';

export interface ItemFormValues {
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
  estimate: string | number | undefined;
  customEstimateInput: string;
  startDate: string;
  dueDate: string;
  labels: string[];
  assignees: string[];
  acExpanded: boolean;
  planExpanded: boolean;
  riskFixExpanded: boolean;
  relationsExpanded: boolean;
}

export function parseItemToFormValues(
  source: BacklogItem,
  projects: Project[],
  activeProjectId?: string,
  config?: GripmConfig
): ItemFormValues {
  const initialMods = source.modules && source.modules.length > 0
    ? source.modules
    : source.module ? [source.module] : [];
  const sVal = source.sprint || source.targetSprint || (source.sprints && source.sprints.length > 0 ? source.sprints[source.sprints.length - 1] : '') || '';
  const rawRVal = source.release || source.targetRelease || '';
  const rVal = rawRVal.toLowerCase().includes('sprint') ? '' : rawRVal;
  const rels = (source.releases && source.releases.length > 0 ? source.releases : rVal ? [rVal] : []).filter(
    (r) => !r.toLowerCase().includes('sprint')
  );
  const sourceEst = source.estimate !== undefined ? source.estimate : undefined;
  const baseEstOptions: (string | number)[] =
    config?.estimation?.method === 'tshirt'
      ? config?.estimation?.customTshirt || DEFAULT_TSHIRT
      : config?.estimation?.customFibonacci || DEFAULT_FIBONACCI;

  const customEstimateInput =
    sourceEst !== undefined && sourceEst !== '' && !baseEstOptions.some((v) => String(v) === String(sourceEst))
      ? String(sourceEst)
      : '';

  return {
    title: source.title || '',
    code: source.code || '',
    projectId: source.projectId || activeProjectId || projects[0]?.id || '',
    type: source.type || 'feature',
    priority: source.priority || 'p2',
    status: source.status || 'draft',
    selectedModules: Array.from(new Set(initialMods.map((m) => m.trim()).filter(Boolean))),
    impactedFile: source.impactedFile || '',
    sprint: sVal,
    release: rVal,
    selectedReleases: rels,
    parentId: source.parentId || '',
    blocks: source.blocks || [],
    blockedBy: source.blockedBy || [],
    relatedTo: source.relatedTo || [],
    description: source.description || '',
    risk: source.risk || '',
    fix: source.fix || '',
    implementationPlan: source.implementationPlan || '',
    acceptanceCriteriaList: source.acceptanceCriteriaList || [],
    estimate: sourceEst,
    customEstimateInput,
    startDate: source.startDate || '',
    dueDate: source.dueDate || '',
    labels: source.labels || [],
    assignees: source.assignees || [],
    acExpanded: true,
    planExpanded: Boolean(source.implementationPlan?.trim()),
    riskFixExpanded: Boolean(source.risk?.trim() || source.fix?.trim()),
    relationsExpanded: Boolean(
      Boolean(source.parentId) ||
      (source.blocks && source.blocks.length > 0) ||
      (source.blockedBy && source.blockedBy.length > 0) ||
      (source.relatedTo && source.relatedTo.length > 0)
    ),
  };
}

export function getInitialFormValues(
  projects: Project[],
  defaultStatus: ItemStatus = 'draft',
  defaultSprint: string = '',
  activeProjectId?: string
): ItemFormValues {
  return {
    title: '',
    code: '',
    projectId: activeProjectId || projects[0]?.id || '',
    type: 'feature',
    priority: 'p2',
    status: defaultStatus,
    selectedModules: [],
    impactedFile: '',
    sprint: defaultSprint || '',
    release: '',
    selectedReleases: [],
    parentId: '',
    blocks: [],
    blockedBy: [],
    relatedTo: [],
    description: '',
    risk: '',
    fix: '',
    implementationPlan: '',
    acceptanceCriteriaList: [],
    estimate: undefined,
    customEstimateInput: '',
    startDate: '',
    dueDate: '',
    labels: [],
    assignees: [],
    acExpanded: true,
    planExpanded: false,
    riskFixExpanded: false,
    relationsExpanded: false,
  };
}
