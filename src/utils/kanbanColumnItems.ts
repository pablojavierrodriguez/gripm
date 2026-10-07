import type { ItemStatus, ViewMode } from '../types';

export interface KanbanColumnLike {
  id: string;
  statuses: ItemStatus[];
}

export interface KanbanColumnOptions {
  showIdeas: boolean;
  viewMode: ViewMode;
}

export function getKanbanColumnItems<T extends {
  status: ItemStatus;
  labels?: string[];
  order?: number;
}>(
  items: readonly T[],
  column: KanbanColumnLike,
  { showIdeas, viewMode }: KanbanColumnOptions,
): T[] {
  return items
    .filter((item) => {
      const isIdea = item.status === 'ideas' || item.labels?.includes('idea') === true;
      if (column.id === 'col-ideas') return isIdea;
      if (column.id === 'col-draft') {
        if (showIdeas && isIdea) return false;
        if (viewMode === 'simplificada' && !showIdeas && item.status === 'ideas') return false;
      }
      return column.statuses.includes(item.status);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
