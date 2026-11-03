import type { ColumnConfig } from '../../types';

export const IDEAS_COLUMN: ColumnConfig = {
  id: 'col-ideas',
  title: 'Ideas',
  subtitle: 'Discovery & Raw',
  color: 'border-pink-500/30 dark:border-pink-500/20',
  dotColor: 'bg-pink-500',
  statuses: ['ideas'],
  dropTargetStatus: 'ideas'
};

export const SIMPLIFIED_BASE_COLUMNS: ColumnConfig[] = [
  {
    id: 'col-draft',
    title: 'Backlog',
    subtitle: 'Priorizado y Refinado',
    color: 'border-slate-300 dark:border-slate-700/60',
    dotColor: 'bg-indigo-500',
    statuses: ['draft'],
    dropTargetStatus: 'draft'
  },
  {
    id: 'col-doing',
    title: 'In Progress',
    subtitle: 'Doing & Review',
    color: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    statuses: ['doing', 'review', 'blocked'],
    dropTargetStatus: 'doing'
  },
  {
    id: 'col-done',
    title: 'Done',
    subtitle: 'Deployed & Liberado',
    color: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    statuses: ['ready', 'done'],
    dropTargetStatus: 'ready'
  }
];

export const DISMISSED_COLUMN: ColumnConfig = {
  id: 'col-dismissed',
  title: 'Descartadas',
  subtitle: 'Canceladas & Archivadas',
  color: 'border-rose-500/30 dark:border-rose-500/20',
  dotColor: 'bg-rose-500',
  statuses: ['dismissed', 'cancelled'],
  dropTargetStatus: 'dismissed'
};

export const SIMPLIFIED_COLUMNS: ColumnConfig[] = [
  IDEAS_COLUMN,
  ...SIMPLIFIED_BASE_COLUMNS
];

export const EXPANDED_COLUMNS: ColumnConfig[] = [
  {
    id: 'col-draft',
    title: 'Draft',
    subtitle: 'Backlog & Triaged',
    color: 'border-slate-300 dark:border-slate-700/60',
    dotColor: 'bg-indigo-500',
    statuses: ['draft'],
    dropTargetStatus: 'draft'
  },
  {
    id: 'col-doing',
    title: 'Doing',
    subtitle: 'Desarrollo activo',
    color: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    statuses: ['doing', 'blocked'],
    dropTargetStatus: 'doing'
  },
  {
    id: 'col-review',
    title: 'Review',
    subtitle: 'Testing & Code Review',
    color: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
    statuses: ['review'],
    dropTargetStatus: 'review'
  },
  {
    id: 'col-ready',
    title: 'Ready',
    subtitle: 'Ready for deploy',
    color: 'border-teal-500/30',
    dotColor: 'bg-teal-500',
    statuses: ['ready'],
    dropTargetStatus: 'ready'
  },
  {
    id: 'col-done',
    title: 'Done',
    subtitle: 'Deployed & Cerrado',
    color: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    statuses: ['done'],
    dropTargetStatus: 'done'
  }
];

export const SUB_DROP_THEME: Record<string, {
  hoverBg: string;
  hoverBorder: string;
  hoverText: string;
  hoverRing: string;
  dot: string;
}> = {
  draft: {
    hoverBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
    hoverBorder: 'border-indigo-500 dark:border-indigo-400',
    hoverText: 'text-indigo-900 dark:text-indigo-100 font-semibold',
    hoverRing: 'ring-2 ring-indigo-500/40',
    dot: 'bg-indigo-500 ring-2 ring-indigo-500/30',
  },
  doing: {
    hoverBg: 'bg-amber-500/15 dark:bg-amber-500/25',
    hoverBorder: 'border-amber-500 dark:border-amber-400',
    hoverText: 'text-amber-900 dark:text-amber-100 font-semibold',
    hoverRing: 'ring-2 ring-amber-500/40',
    dot: 'bg-amber-500 ring-2 ring-amber-500/30',
  },
  blocked: {
    hoverBg: 'bg-rose-500/15 dark:bg-rose-500/25',
    hoverBorder: 'border-rose-500 dark:border-rose-400',
    hoverText: 'text-rose-900 dark:text-rose-100 font-semibold',
    hoverRing: 'ring-2 ring-rose-500/40',
    dot: 'bg-rose-500 ring-2 ring-rose-500/30',
  },
  review: {
    hoverBg: 'bg-purple-500/15 dark:bg-purple-500/25',
    hoverBorder: 'border-purple-500 dark:border-purple-400',
    hoverText: 'text-purple-900 dark:text-purple-100 font-semibold',
    hoverRing: 'ring-2 ring-purple-500/40',
    dot: 'bg-purple-500 ring-2 ring-purple-500/30',
  },
  ready: {
    hoverBg: 'bg-teal-500/15 dark:bg-teal-500/25',
    hoverBorder: 'border-teal-500 dark:border-teal-400',
    hoverText: 'text-teal-900 dark:text-teal-100 font-semibold',
    hoverRing: 'ring-2 ring-teal-500/40',
    dot: 'bg-teal-500 ring-2 ring-teal-500/30',
  },
  done: {
    hoverBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    hoverBorder: 'border-emerald-500 dark:border-emerald-400',
    hoverText: 'text-emerald-900 dark:text-emerald-100 font-semibold',
    hoverRing: 'ring-2 ring-emerald-500/40',
    dot: 'bg-emerald-500 ring-2 ring-emerald-500/30',
  },
  dismissed: {
    hoverBg: 'bg-slate-500/15 dark:bg-slate-500/25',
    hoverBorder: 'border-slate-500 dark:border-slate-400',
    hoverText: 'text-slate-900 dark:text-slate-100 font-semibold',
    hoverRing: 'ring-2 ring-slate-500/40',
    dot: 'bg-slate-500 ring-2 ring-slate-500/30',
  },
  cancelled: {
    hoverBg: 'bg-rose-500/15 dark:bg-rose-500/25',
    hoverBorder: 'border-rose-500 dark:border-rose-400',
    hoverText: 'text-rose-900 dark:text-rose-100 font-semibold',
    hoverRing: 'ring-2 ring-rose-500/40',
    dot: 'bg-rose-500 ring-2 ring-rose-500/30',
  },
  ideas: {
    hoverBg: 'bg-pink-500/15 dark:bg-pink-500/25',
    hoverBorder: 'border-pink-500 dark:border-pink-400',
    hoverText: 'text-pink-900 dark:text-pink-100 font-semibold',
    hoverRing: 'ring-2 ring-pink-500/40',
    dot: 'bg-pink-500 ring-2 ring-pink-500/30',
  },
};
