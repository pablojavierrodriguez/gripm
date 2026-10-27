import type { BacklogItem, GripmConfig, ItemStatus, Sprint, Release } from '../../types';

export interface TimelineViewProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  sprints?: Sprint[];
  releases?: Release[];
  onClickItem: (item: BacklogItem) => void;
  onUpdateItem?: (itemData: Partial<BacklogItem>) => Promise<void> | void;
  config?: GripmConfig | null;
}

export type TimeScale = 'quarters' | 'months' | 'sprints';

export interface ResolvedDateRange {
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  isInherited: boolean;
  inheritedFrom?: string;
}

export interface TimelineRow {
  item: BacklogItem;
  range: ResolvedDateRange;
  isEpic: boolean;
  children?: TimelineRow[];
  progressPercent: number;
}

export interface DragState {
  itemId: string;
  item: BacklogItem;
  originalRange: ResolvedDateRange;
  startX: number;
  currentX: number;
  deltaX: number;
  mode: 'move' | 'resize-start' | 'resize-end';
  targetSprintIndex?: number;
  initialLeftPx: number;
  widthPx: number;
}

export interface ActionFeedback {
  message: string;
  type: 'success' | 'warn' | 'info';
}

export interface TimelineTimeColumn {
  label: string;
  sublabel?: string;
  colWidthPx: number;
  dateStr?: string;
  status?: string;
  sprintObj?: Sprint;
}

export interface ItemCoordinates {
  leftPx: number;
  widthPx: number;
  isUnassignedSprint?: boolean;
}

export function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'done':
      return 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/80 text-white';
    case 'ready':
      return 'bg-teal-600/90 hover:bg-teal-600 border-teal-500/80 text-white';
    case 'review':
      return 'bg-purple-600/90 hover:bg-purple-600 border-purple-500/80 text-white';
    case 'doing':
      return 'bg-amber-600/90 hover:bg-amber-600 border-amber-500/80 text-white';
    case 'ideas':
      return 'bg-pink-600/90 hover:bg-pink-600 border-pink-500/80 text-white';
    case 'draft':
    default:
      return 'bg-indigo-600/90 hover:bg-indigo-600 border-indigo-500/80 text-white';
  }
}
