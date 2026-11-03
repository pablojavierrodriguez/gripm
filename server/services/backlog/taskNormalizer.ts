/**
 * server/services/backlog/taskNormalizer.ts
 *
 * Task filter and mutation options, conflict error type,
 * and unified task updates normalization.
 */

import type { ProjectMeta } from '../../types.ts';
import {
  normalizeStatus,
  normalizePriority,
  normalizeType
} from '../../../scripts/backlogMdParser.ts';
import { resolveLegibleSprint } from './backlogCycles.ts';

export interface TaskFilterOptions {
  status?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  label?: string;
  sprint?: string;
  release?: string;
  milestone?: string;
  prefix?: string;
  taskIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  openOnly?: boolean;
}

export class ConflictError extends Error {
  public readonly conflict = true;
  public readonly currentMtime: number;
  public readonly currentItem: any;

  constructor(message: string, currentMtime: number, currentItem: any) {
    super(message);
    this.name = 'ConflictError';
    this.currentMtime = currentMtime;
    this.currentItem = currentItem;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export interface NormalizedTaskUpdates {
  status?: string;
  rawStatus?: string;
  title?: string;
  description?: string;
  priority?: string;
  type?: string;
  implementationPlan?: string;
  implementationNotes?: string;
  milestone?: string;
  release?: string;
  targetRelease?: string;
  releases?: string[];
  sprint?: string;
  targetSprint?: string;
  sprints?: string[];
  clearSprint?: boolean;
  estimate?: string | number | null;
  labels?: string[];
  assignees?: string[];
  parentId?: string;
  blocks?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  dismissedReason?: string;
  relatedTo?: string[];
  dependencies?: string[];
  module?: string;
  epic?: string;
  category?: string;
  impactedFile?: string;
  risk?: string;
  checkAllAcs?: boolean;
  toggleAcIndex?: number;
  usedUpdatesObject: boolean;
}

export function normalizeTaskUpdates(project: ProjectMeta, updates: any): NormalizedTaskUpdates {
  const u = updates || {};
  const inner = u.updates && typeof u.updates === 'object' ? u.updates : null;
  const usedUpdatesObject = Boolean(inner && !u.status && inner.status);

  // Status
  const rawStatus = u.status || inner?.status;
  const status = rawStatus ? normalizeStatus(rawStatus) : undefined;

  // Title & description
  const title = u.title !== undefined ? u.title : inner?.title;
  const description = u.description !== undefined ? u.description : inner?.description;

  // Priority & type
  const rawPriority = u.priority || inner?.priority;
  const priority = rawPriority ? normalizePriority(rawPriority) : undefined;
  const rawType = u.type || inner?.type;
  const type = rawType ? normalizeType(rawType) : undefined;

  // Implementation plan & notes
  const implementationPlan = u.implementationPlan !== undefined ? u.implementationPlan : inner?.implementationPlan;
  const implementationNotes = u.implementationNotes !== undefined
    ? u.implementationNotes
    : (u.notes !== undefined
      ? u.notes
      : (u.fix !== undefined ? u.fix : inner?.implementationNotes));

  // Sprints
  let sprint: string | undefined;
  let targetSprint: string | undefined;
  let sprints: string[] | undefined;
  let clearSprint = false;

  const rawSprint = u.sprint !== undefined ? u.sprint : (u.targetSprint !== undefined ? u.targetSprint : inner?.sprint);
  if (rawSprint !== undefined) {
    const legSprint = resolveLegibleSprint(project, rawSprint);
    if (legSprint) {
      sprint = legSprint;
      targetSprint = legSprint;
      sprints = [legSprint];
    } else {
      clearSprint = true;
      sprint = undefined;
      targetSprint = undefined;
      sprints = [];
    }
  } else if (u.sprints !== undefined || inner?.sprints !== undefined) {
    const explicitSprints = Array.isArray(u.sprints) ? u.sprints : (Array.isArray(inner?.sprints) ? inner.sprints : []);
    sprints = explicitSprints;
    sprint = explicitSprints.length > 0 ? explicitSprints[0] : undefined;
    targetSprint = sprint;
  }

  // Releases & Milestone
  let release: string | undefined;
  let targetRelease: string | undefined;
  let milestone: string | undefined;
  let releases: string[] | undefined;

  if (u.release !== undefined || u.targetRelease !== undefined || u.milestone !== undefined || u.releases !== undefined ||
      inner?.release !== undefined || inner?.targetRelease !== undefined || inner?.milestone !== undefined || inner?.releases !== undefined) {
    const rawRel = (
      u.release || u.targetRelease || u.milestone ||
      inner?.release || inner?.targetRelease || inner?.milestone ||
      (Array.isArray(u.releases) && u.releases.length > 0 ? u.releases[0] : '') ||
      (Array.isArray(inner?.releases) && inner.releases.length > 0 ? inner.releases[0] : '') ||
      ''
    ).trim();

    const rawRelArr = Array.isArray(u.releases)
      ? u.releases
      : (Array.isArray(inner?.releases)
        ? inner.releases
        : (rawRel ? [rawRel] : []));

    releases = rawRelArr.filter(Boolean).filter((r: string) => !r.toLowerCase().includes('sprint'));
    release = rawRel || undefined;
    targetRelease = rawRel || undefined;
    milestone = rawRel || undefined;
  }

  // Estimate
  let estimate: string | number | null | undefined;
  const rawEstimate = u.estimate !== undefined ? u.estimate : inner?.estimate;
  if (rawEstimate !== undefined) {
    if (rawEstimate === '' || rawEstimate === null) {
      estimate = null;
    } else {
      const num = Number(rawEstimate);
      estimate = (!isNaN(num) && typeof rawEstimate !== 'boolean' && !String(rawEstimate).includes(' '))
        ? num
        : rawEstimate;
    }
  }

  // Labels & Assignees
  const labels = Array.isArray(u.labels) ? u.labels : (Array.isArray(inner?.labels) ? inner.labels : undefined);
  const assignees = Array.isArray(u.assignees) ? u.assignees : (Array.isArray(inner?.assignees) ? inner.assignees : undefined);

  // Relationships & Graph
  const parentId = u.parentId !== undefined ? u.parentId : inner?.parentId;
  const blocks = Array.isArray(u.blocks) ? u.blocks : (Array.isArray(inner?.blocks) ? inner.blocks : undefined);
  const blockedBy = Array.isArray(u.blockedBy) ? u.blockedBy : (Array.isArray(inner?.blockedBy) ? inner.blockedBy : undefined);
  const blockedReason = u.blockedReason !== undefined ? u.blockedReason : inner?.blockedReason;
  const dismissedReason = u.dismissedReason !== undefined ? u.dismissedReason : inner?.dismissedReason;
  const relatedTo = Array.isArray(u.relatedTo) ? u.relatedTo : (Array.isArray(inner?.relatedTo) ? inner.relatedTo : undefined);
  const dependencies = Array.isArray(u.dependencies) ? u.dependencies : (Array.isArray(inner?.dependencies) ? inner.dependencies : undefined);

  // Metadata
  const module = u.module !== undefined ? u.module : inner?.module;
  const epic = u.epic !== undefined ? u.epic : inner?.epic;
  const category = u.category !== undefined ? u.category : inner?.category;
  const impactedFile = u.impactedFile !== undefined ? u.impactedFile : inner?.impactedFile;
  const risk = u.risk !== undefined ? u.risk : inner?.risk;

  // ACs
  const checkAllAcs = u.checkAllAcs !== undefined ? u.checkAllAcs : inner?.checkAllAcs;
  const toggleAcIndex = u.toggleAcIndex !== undefined ? u.toggleAcIndex : inner?.toggleAcIndex;

  return {
    status,
    rawStatus,
    title,
    description,
    priority,
    type,
    implementationPlan,
    implementationNotes,
    milestone,
    release,
    targetRelease,
    releases,
    sprint,
    targetSprint,
    sprints,
    clearSprint,
    estimate,
    labels,
    assignees,
    parentId,
    blocks,
    blockedBy,
    blockedReason,
    dismissedReason,
    relatedTo,
    dependencies,
    module,
    epic,
    category,
    impactedFile,
    risk,
    checkAllAcs,
    toggleAcIndex,
    usedUpdatesObject
  };
}
