import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Lightbulb, AlertTriangle, Layers, Target, CheckCircle2, Clock, ChevronDown, Pencil, History } from 'lucide-react';
import type { BacklogItem, ItemStatus, ViewMode, ColumnConfig, DevBoardConfig, ActiveTab, Sprint } from '../types';
import { ItemCard } from './ItemCard';
import { useTranslation } from '../utils/i18n';
import { useStatusMeta } from '../utils/statusMeta';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from '../utils/storage';

interface KanbanBoardProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  viewMode: ViewMode;
  onChangeViewMode?: (mode: ViewMode) => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus, targetColId?: string, targetIndex?: number, calculatedOrder?: number) => void;
  onUpdateColumnTitle?: (colId: string, newTitle: string) => void;
  onDeleteItem: (id: string) => void;
  onClickItem: (item: BacklogItem) => void;
  onQuickAddItem: (status: ItemStatus, defaultSprint?: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  config?: DevBoardConfig;
  availableSprints?: string[];
  sprints?: Sprint[];
  onNavigateToTab?: (tab: ActiveTab) => void;
  includePreviousDone?: boolean;
  onTogglePreviousDone?: (include: boolean) => void;
  includeDismissedCancelled?: boolean;
  includeIdeas?: boolean;
  onToggleIdeas?: (include: boolean) => void;
}


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
    statuses: ['draft', 'backlog'],
    dropTargetStatus: 'draft'
  },
  {
    id: 'col-doing',
    title: 'In Progress',
    subtitle: 'Doing & Review',
    color: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    statuses: ['doing', 'in_progress', 'review', 'testing_qa'],
    dropTargetStatus: 'doing'
  },
  {
    id: 'col-done',
    title: 'Done',
    subtitle: 'Deployed & Liberado',
    color: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    statuses: ['done', 'ready', 'finish'],
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
  dropTargetStatus: 'dismissed',
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
    statuses: ['draft', 'ideas', 'backlog'],
    dropTargetStatus: 'draft'
  },
  {
    id: 'col-doing',
    title: 'Doing',
    subtitle: 'Desarrollo activo',
    color: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    statuses: ['doing', 'in_progress'],
    dropTargetStatus: 'doing'
  },
  {
    id: 'col-review',
    title: 'Review',
    subtitle: 'Testing & Code Review',
    color: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
    statuses: ['review', 'testing_qa'],
    dropTargetStatus: 'review'
  },
  {
    id: 'col-ready',
    title: 'Ready',
    subtitle: 'Ready for deploy',
    color: 'border-teal-500/30',
    dotColor: 'bg-teal-500',
    statuses: ['ready', 'finish'],
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

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  items,
  allItems,
  viewMode,
  onChangeViewMode,
  onUpdateStatus,
  onUpdateColumnTitle,
  onDeleteItem,
  onClickItem,
  onQuickAddItem,
  onShowToast,
  config,
  availableSprints,
  sprints = [],
  onNavigateToTab,
  includePreviousDone,
  onTogglePreviousDone,
  includeDismissedCancelled,
  includeIdeas,
  onToggleIdeas,
}: KanbanBoardProps) => {
  const { t } = useTranslation();
  const getStatusMeta = useStatusMeta();
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ 
    colId: string; 
    index: number; 
    targetItemId?: string; 
    isAbove?: boolean; 
  } | null>(null);
  const [activeSubDropTargetStatus, setActiveSubDropTargetStatus] = useState<{
    colId: string;
    status: ItemStatus;
  } | null>(null);

  // Column inline title editing (DEV-036)
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState<string>('');

  // Preference to show/hide raw Ideas in both views (DEV-008 & DEV-036)
  const [internalShowIdeas, setInternalShowIdeas] = useState<boolean>(() => {
    if (config?.kanban?.showIdeasByDefault !== undefined) {
      return config.kanban.showIdeasByDefault;
    }
    try {
      const stored = getStoredItem(STORAGE_KEYS.KANBAN_SHOW_IDEAS);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const showIdeas = includeIdeas !== undefined
    ? includeIdeas
    : internalShowIdeas;

  const handleToggleIdeas = (val: boolean) => {
    if (onToggleIdeas) {
      onToggleIdeas(val);
    }
    setInternalShowIdeas(val);
    setStoredItem(STORAGE_KEYS.KANBAN_SHOW_IDEAS, JSON.stringify(val));
  };

  // Preference to show/hide previous Done cards (DEV-058 & DEV-067: Clarificación Semántica)
  const [internalShowPreviousDone, setInternalShowPreviousDone] = useState<boolean>(() => {
    if (config?.kanban?.showDoneHistoryByDefault !== undefined) {
      return config.kanban.showDoneHistoryByDefault;
    }
    try {
      const stored = getStoredItem(STORAGE_KEYS.KANBAN_SHOW_DONE_HISTORY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const showPreviousDone = includePreviousDone !== undefined
    ? includePreviousDone
    : internalShowPreviousDone;

  const setShowPreviousDone = (val: boolean) => {
    if (onTogglePreviousDone) {
      onTogglePreviousDone(val);
    }
    setInternalShowPreviousDone(val);
    setStoredItem(STORAGE_KEYS.KANBAN_SHOW_DONE_HISTORY, JSON.stringify(val));
  };

  const columns = useMemo(() => {
    let baseCols: ColumnConfig[];
    if (viewMode === 'simplificada') {
      if (config?.kanban?.simplifiedColumns && config.kanban.simplifiedColumns.length > 0) {
        baseCols = config.kanban.simplifiedColumns.filter((c) => c.id !== 'col-ideas');
      } else {
        baseCols = SIMPLIFIED_BASE_COLUMNS;
      }
    } else if (config?.kanban?.columns && config.kanban.columns.length > 0) {
      baseCols = config.kanban.columns.filter((c) => c.id !== 'col-ideas');
    } else {
      baseCols = EXPANDED_COLUMNS.filter((c) => c.id !== 'col-ideas');
    }
    const finalCols = [...baseCols];
    if (showIdeas) {
      finalCols.unshift(IDEAS_COLUMN);
    }
    if (includeDismissedCancelled) {
      finalCols.push(DISMISSED_COLUMN);
    }
    return finalCols;
  }, [viewMode, showIdeas, includeDismissedCancelled, config]);

  const handleCommitColTitle = (colId: string) => {
    const trimmed = editColTitle.trim();
    const currentCol = columns.find((c: ColumnConfig) => c.id === colId);
    if (trimmed && onUpdateColumnTitle && currentCol?.title !== trimmed) {
      onUpdateColumnTitle(colId, trimmed);
    }
    setEditingColId(null);
  };

  const assignedStatuses = useMemo(() => {
    const set = new Set<ItemStatus>();
    columns.forEach((col) => {
      col.statuses.forEach((st) => set.add(st));
    });
    return set;
  }, [columns]);

  const orphanItems = useMemo(() => {
    return items.filter(
      (item) => !assignedStatuses.has(item.status) && item.status !== 'dismissed' && item.status !== 'cancelled'
    );
  }, [items, assignedStatuses]);

  // Sprint options for Scrumban (DEV-033 & DEV-038: desacople estricto de sprints y releases)
  const availableSprintsList = useMemo(() => {
    const set = new Set<string>();
    if (availableSprints && availableSprints.length > 0) {
      availableSprints.forEach(s => set.add(s));
    }
    items.forEach((item) => {
      if (item.sprint) set.add(item.sprint);
      if (item.targetSprint) set.add(item.targetSprint);
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [items, availableSprints]);

  const [activeSprint, setActiveSprint] = useState<string>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.KANBAN_SPRINT);
      if (saved) return saved;
    } catch {}
    if (config?.methodology !== 'kanban' && sprints && sprints.length > 0) {
      const active = sprints.find((s) => s.status === 'active');
      if (active) return active.name;
    }
    return 'all';
  });

  useEffect(() => {
    if (activeSprint) {
      setStoredItem(STORAGE_KEYS.KANBAN_SPRINT, activeSprint);
    }
  }, [activeSprint]);

  const activeSprintEntity = useMemo(() => {
    return sprints?.find((s) => s.status === 'active');
  }, [sprints]);

  const hasInitializedSprintRef = useRef(false);
  // Auto-filtrar al Sprint Activo en modo Scrumban solo en el primer render si no había preferencia previa
  useEffect(() => {
    if (hasInitializedSprintRef.current) return;
    if (config?.methodology !== 'kanban' && activeSprintEntity) {
      const saved = getStoredItem(STORAGE_KEYS.KANBAN_SPRINT);
      if (saved === null) {
        setActiveSprint(activeSprintEntity.name);
      }
      hasInitializedSprintRef.current = true;
    }
  }, [config?.methodology, activeSprintEntity]);

  // Si el sprint específico seleccionado deja de existir en el proyecto (y no es 'all' ni 'backlog')
  useEffect(() => {
    if (activeSprint !== 'all' && activeSprint !== 'backlog' && availableSprintsList.length > 0 && !availableSprintsList.includes(activeSprint)) {
      setActiveSprint(activeSprintEntity?.name || 'all');
    }
  }, [activeSprint, availableSprintsList, activeSprintEntity]);

  // In pure Kanban: shows all items continuously.
  // In Scrumban: board can show all items or focus on a specific Sprint Goal.
  const scopedItems = useMemo(() => {
    if (config?.methodology === 'kanban' || !activeSprint || activeSprint === 'all') {
      return items;
    }
    if (activeSprint === 'backlog') {
      return items.filter((i) => !i.sprint && !i.targetSprint);
    }
    return items.filter(
      (i) => i.sprint === activeSprint || i.targetSprint === activeSprint
    );
  }, [items, activeSprint, config?.methodology]);

  const ideasCount = useMemo(() => {
    const sourceItems = allItems && allItems.length > 0 ? allItems : items;
    const scopedSource = (config?.methodology === 'kanban' || !activeSprint || activeSprint === 'all')
      ? sourceItems
      : activeSprint === 'backlog'
        ? sourceItems.filter((i) => !i.sprint && !i.targetSprint)
        : sourceItems.filter((i) => i.sprint === activeSprint || i.targetSprint === activeSprint);
    return scopedSource.filter((i) => (i.status === 'ideas' || i.labels?.includes('idea')) && !i.isDeleted).length;
  }, [allItems, items, activeSprint, config?.methodology]);

  const sprintStats = useMemo(() => {
    if (config?.methodology === 'kanban' || !activeSprint || activeSprint === 'all') return null;
    const total = scopedItems.length;
    const done = scopedItems.filter((i) => i.status === 'ready' || i.status === 'done' || i.status === 'finish').length;
    const inProgress = scopedItems.filter((i) =>
      ['doing', 'in_progress', 'review', 'testing_qa'].includes(i.status)
    ).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, pct };
  }, [scopedItems, activeSprint, config?.methodology]);

  // Done history classification (DEV-058)
  const isItemHistoricalDone = useMemo(() => {
    const recentLimit = config?.kanban?.doneHistoryLimit ?? 5;
    const currentSprint = (activeSprint && activeSprint !== 'all' && activeSprint !== 'backlog')
      ? activeSprint
      : (availableSprintsList[0] || null);

    return (item: BacklogItem): boolean => {
      const isDone = item.status === 'done' || item.status === 'finish';
      if (!isDone) return false;

      // Viewing all sprints
      if (activeSprint === 'all' && currentSprint) {
        const itemSprint = item.sprint || item.targetSprint;
        if (itemSprint && itemSprint !== currentSprint) return true;
        if (!itemSprint) {
          const unsprintedDone = scopedItems.filter(
            (i) => (i.status === 'done' || i.status === 'finish') && !i.sprint && !i.targetSprint
          );
          const idx = unsprintedDone.indexOf(item);
          if (idx >= recentLimit) return true;
        }
      }

      // In simplified view or scoped to specific iteration:
      if (viewMode === 'simplificada') {
        if (currentSprint) {
          const itemSprint = item.sprint || item.targetSprint;
          if (itemSprint && itemSprint !== currentSprint) return true;
        }
        const doneInScope = scopedItems.filter((i) => i.status === 'done' || i.status === 'finish');
        const idx = doneInScope.indexOf(item);
        if (idx >= recentLimit) return true;
      }

      return false;
    };
  }, [activeSprint, availableSprintsList, viewMode, scopedItems, config?.kanban?.doneHistoryLimit]);

  const totalHistoricalDoneCount = useMemo(() => {
    return scopedItems.filter(isItemHistoricalDone).length;
  }, [scopedItems, isItemHistoricalDone]);

  const handleDragStart = (e: React.DragEvent, item: BacklogItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    window.setTimeout(() => {
      setDraggedItemId(item.id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setActiveDropColumn(null);
    setDropTarget(null);
    setActiveSubDropTargetStatus(null);
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveDropColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== columnId) {
      setActiveDropColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    // Only clear if the cursor actually leaves the column element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (activeDropColumn === columnId) {
        setActiveDropColumn(null);
        setDropTarget(null);
        setActiveSubDropTargetStatus(null);
      }
    }
  };

  const handleCardDragOver = (e: React.DragEvent, colId: string, index: number, targetItem?: BacklogItem) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;
    const targetIdx = isAbove ? index : index + 1;
    setDropTarget({ 
      colId, 
      index: targetIdx,
      targetItemId: targetItem?.id,
      isAbove
    });
  };

  const handleDrop = (
    e: React.DragEvent, 
    col: ColumnConfig, 
    specificIndex?: number, 
    colItems: BacklogItem[] = [],
    explicitStatus?: ItemStatus
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (itemId) {
      const draggedItem = items.find((i) => i.id === itemId);
      let newStatus: ItemStatus;

      if (explicitStatus) {
        newStatus = explicitStatus;
      } else if (draggedItem && col.statuses.includes(draggedItem.status)) {
        newStatus = draggedItem.status;
      } else {
        newStatus = col.dropTargetStatus || col.statuses[0] || 'draft';
      }

      const otherItems = colItems.filter((i) => i.id !== itemId);
      let calculatedOrder: number | undefined;

      if (dropTarget && dropTarget.colId === col.id && dropTarget.targetItemId) {
        const targetIdx = otherItems.findIndex((i) => i.id === dropTarget.targetItemId);
        if (targetIdx !== -1) {
          const insertIdx = dropTarget.isAbove ? targetIdx : targetIdx + 1;
          const prevItem = insertIdx > 0 ? otherItems[insertIdx - 1] : null;
          const nextItem = insertIdx < otherItems.length ? otherItems[insertIdx] : null;

          if (prevItem && nextItem) {
            const p = prevItem.order ?? 0;
            const n = nextItem.order ?? (p + 20);
            calculatedOrder = n > p ? p + (n - p) / 2 : p + 1;
          } else if (nextItem) {
            calculatedOrder = (nextItem.order ?? 10) - 10;
          } else if (prevItem) {
            calculatedOrder = (prevItem.order ?? 0) + 10;
          } else {
            calculatedOrder = 10;
          }
        }
      }

      if (calculatedOrder === undefined) {
        const lastItem = otherItems[otherItems.length - 1];
        calculatedOrder = lastItem ? (lastItem.order ?? 0) + 10 : 10;
      }

      const idx = specificIndex !== undefined ? specificIndex : (dropTarget?.colId === col.id ? dropTarget.index : undefined);
      onUpdateStatus(itemId, newStatus, col.id, idx, calculatedOrder);
    }
    setDraggedItemId(null);
    setActiveDropColumn(null);
    setDropTarget(null);
  };

  const [mobileColId, setMobileColId] = useState<string>('');
  const activeMobileCol = useMemo(() => {
    return columns.find(c => c.id === mobileColId) || columns[0];
  }, [columns, mobileColId]);
  const activeMobileIndex = useMemo(() => {
    return columns.findIndex(c => c.id === (activeMobileCol?.id || ''));
  }, [columns, activeMobileCol]);

  const getRenderColumnTitle = (col: ColumnConfig) => {
    if (col.id === 'col-ideas') return t('kanban.colTitleIdeas');
    if (col.id === 'col-draft') return t('kanban.colTitleDraft');
    if (col.id === 'col-doing') return t('kanban.colTitleDoing');
    if (col.id === 'col-review') return t('kanban.colTitleReview');
    if (col.id === 'col-ready') return t('kanban.colTitleReady');
    if (col.id === 'col-done') return t('kanban.colTitleDone');
    if (col.id === 'col-dismissed') return t('kanban.colTitleDismissed');
    return col.title;
  };

  const getRenderColumnSubtitle = (col: ColumnConfig) => {
    if (col.id === 'col-ideas') return t('kanban.colIdeasSubtitle');
    if (col.id === 'col-draft') {
      return viewMode === 'simplificada' ? t('kanban.colDraftSimplifiedSubtitle') : t('kanban.colDraftSubtitle');
    }
    if (col.id === 'col-doing') {
      return viewMode === 'simplificada' ? t('kanban.colDoingSimplifiedSubtitle') : t('kanban.colDoingSubtitle');
    }
    if (col.id === 'col-review') return t('kanban.colReviewSubtitle');
    if (col.id === 'col-ready') return t('kanban.colReadySubtitle');
    if (col.id === 'col-done') {
      return viewMode === 'simplificada' ? t('kanban.colDoneSimplifiedSubtitle') : t('kanban.colDoneSubtitle');
    }
    if (col.id === 'col-dismissed') return t('kanban.colDismissedSubtitle');
    return col.subtitle;
  };

  const renderColumn = (col: ColumnConfig, isMobile: boolean = false) => {
    const limit = config?.kanban?.wipLimits?.[col.id] ?? col.wipLimit ?? 0;
    const isDoneCol = col.id === 'col-done' || col.statuses.includes('done');
    const colRawItems = scopedItems
      .filter((item) => {
        if (col.id === 'col-ideas') {
          return item.status === 'ideas' || item.labels?.includes('idea');
        }
        if (col.id === 'col-draft') {
          if (showIdeas && (item.status === 'ideas' || item.labels?.includes('idea'))) {
            return false;
          }
          if (viewMode === 'simplificada' && !showIdeas && item.status === 'ideas') {
            return false;
          }
          return col.statuses.includes(item.status);
        }
        return col.statuses.includes(item.status);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const hiddenDoneCount = isDoneCol && !showPreviousDone
      ? colRawItems.filter(isItemHistoricalDone).length
      : 0;

    const colItems = isDoneCol && !showPreviousDone
      ? colRawItems.filter((item) => !isItemHistoricalDone(item))
      : colRawItems;

    const isDropActive = activeDropColumn === col.id;
    const isOverWip = limit > 0 && colItems.length > limit;
    const isAtWip = limit > 0 && colItems.length === limit;

    return (
      <div
        key={col.id}
        onDragEnter={(e) => handleDragEnter(e, col.id)}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDragLeave={(e) => handleDragLeave(e, col.id)}
        onDrop={(e) => handleDrop(e, col, undefined, colItems)}
        className={`flex flex-col rounded-2xl p-3 kanban-col transition-all duration-200 min-h-[520px] ${
          isMobile ? 'w-full' : ''
        } ${isDropActive ? 'drop-target-active' : ''} ${
          isOverWip ? 'ring-1 ring-rose-500/40 bg-rose-500/[0.02]' : ''
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
            {editingColId === col.id ? (
              <input
                autoFocus
                type="text"
                value={editColTitle}
                onChange={(e) => setEditColTitle(e.target.value)}
                onBlur={() => handleCommitColTitle(col.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitColTitle(col.id);
                  if (e.key === 'Escape') setEditingColId(null);
                }}
                className="px-1.5 py-0.5 text-xs font-semibold rounded bg-white dark:bg-slate-800 border border-indigo-500 text-slate-900 dark:text-white outline-none w-28 shadow-xs"
              />
            ) : (
              <div 
                className="group/coltitle flex items-center gap-1.5 cursor-pointer py-0.5"
                onClick={() => {
                  setEditingColId(col.id);
                  setEditColTitle(col.title);
                }}
                title={t('settings.editColTitle')}
              >
                <div>
                  <h3 className="font-semibold text-xs tracking-tight text-slate-800 dark:text-slate-200 group-hover/coltitle:text-indigo-600 dark:group-hover/coltitle:text-indigo-400 transition-colors">
                    {getRenderColumnTitle(col)}
                  </h3>
                  {col.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:block">
                      {getRenderColumnSubtitle(col)}
                    </p>
                  )}
                </div>
                <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/coltitle:opacity-100 transition-opacity" />
              </div>
            )}
            {limit > 0 ? (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all border ${
                  isOverWip
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse'
                    : isAtWip
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
                title={isOverWip ? t('kanban.wipExceeded', { count: colItems.length, limit }) : t('kanban.wipLimit', { limit })}
              >
                {colItems.length}/{limit} WIP
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-white/[0.04]">
                {colItems.length}
                {hiddenDoneCount > 0 && (
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1 font-semibold">
                    (+{hiddenDoneCount})
                  </span>
                )}
              </span>
            )}
          </div>

          {col.id !== 'col-dismissed' && (
            <button
              onClick={() => onQuickAddItem(col.dropTargetStatus || col.statuses[0] || 'draft', config?.methodology !== 'kanban' && activeSprint !== 'all' && activeSprint !== 'backlog' ? activeSprint : undefined)}
              title={t('kanban.newItemInCol', { title: getRenderColumnTitle(col) })}
              aria-label={t('kanban.newItemInCol', { title: getRenderColumnTitle(col) })}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Previous Done Indicator Banner (DEV-058 & DEV-067: Clarificación Semántica sin 'Archivo') */}
        {isDoneCol && hiddenDoneCount > 0 && !showPreviousDone && (
          <div className="mb-2.5 p-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs transition-all">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
              <History className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="truncate text-[11px] font-medium">
                +{hiddenDoneCount} {hiddenDoneCount === 1 ? 'completada en iteración previa' : 'completadas en iteraciones previas'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviousDone(true)}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline shrink-0 px-1 py-0.5"
            >
              Ver anteriores
            </button>
          </div>
        )}
        {isDoneCol && showPreviousDone && totalHistoricalDoneCount > 0 && (
          <div className="mb-2.5 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 flex items-center justify-between gap-2 text-xs transition-all">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span className="truncate text-[11px] font-medium">
                Mostrando {totalHistoricalDoneCount} completadas previas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviousDone(false)}
              className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline shrink-0 px-1 py-0.5"
            >
              Ocultar
            </button>
          </div>
        )}
        {/* Dynamic Multi-Status Sub-Drop Zones (DEV-052) */}
        {isDropActive && draggedItemId && col.statuses.length > 1 && (
          <div className="mb-2.5 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-indigo-500/40 dark:border-indigo-400/40 shadow-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                Soltar en estado específico:
              </span>
              <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                {col.statuses.length} estados disponibles
              </span>
            </div>
            <div className="grid gap-1.5 grid-cols-2">
              {col.statuses.map((st) => {
                const meta = getStatusMeta(st);
                const isHovered = activeSubDropTargetStatus?.colId === col.id && activeSubDropTargetStatus?.status === st;
                return (
                  <div
                    key={st}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      if (activeSubDropTargetStatus?.colId !== col.id || activeSubDropTargetStatus?.status !== st) {
                        setActiveSubDropTargetStatus({ colId: col.id, status: st as ItemStatus });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (activeSubDropTargetStatus?.colId === col.id && activeSubDropTargetStatus?.status === st) {
                        setActiveSubDropTargetStatus(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(e, col, undefined, colItems, st as ItemStatus);
                      setActiveSubDropTargetStatus(null);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isHovered
                        ? `${meta.bg} ${meta.border} ring-2 ring-indigo-500 text-indigo-900 dark:text-white font-bold scale-[1.02] shadow-sm`
                        : 'bg-white/90 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-indigo-400/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                    <span className="text-[11px] font-medium truncate">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items List */}
        <div 
          className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-0.5"
          onDragOver={(e) => {
            e.preventDefault();
            if (activeDropColumn !== col.id) setActiveDropColumn(col.id);
            if (e.target === e.currentTarget) {
              setDropTarget({ colId: col.id, index: colItems.length, isAbove: false });
            }
          }}
          onDrop={(e) => handleDrop(e, col, colItems.length, colItems)}
        >
          {colItems.map((item, idx) => {
            const isItemDragged = draggedItemId === item.id;
            return (
              <div 
                key={item.id} 
                className={`relative transition-all duration-150 ${isItemDragged ? 'h-0 overflow-hidden opacity-0 pointer-events-none' : ''}`}
              >
                {/* Top drop indicator */}
                {isDropActive && dropTarget?.colId === col.id && dropTarget?.targetItemId === item.id && dropTarget.isAbove && !isItemDragged && (
                  <div className="drop-indicator" />
                )}

                <div
                  onDragOver={(e) => handleCardDragOver(e, col.id, idx, item)}
                  onDrop={(e) => handleDrop(e, col, dropTarget?.index ?? idx, colItems)}
                >
                  <ItemCard
                    item={item}
                    isDragging={isItemDragged}
                    onClick={() => onClickItem(item)}
                    onUpdateStatus={(id, s) => onUpdateStatus(id, s)}
                    onDelete={onDeleteItem}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onShowToast={onShowToast}
                    customItemTypes={config?.customItemTypes}
                  />
                </div>

                {/* Bottom drop indicator */}
                {isDropActive && dropTarget?.colId === col.id && !isItemDragged && (
                  (dropTarget.targetItemId === item.id && !dropTarget.isAbove) ||
                  (!dropTarget.targetItemId && idx === colItems.length - 1)
                ) && (
                  <div className="drop-indicator mt-1" />
                )}
              </div>
            );
          })}

          {colItems.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.06] text-slate-400 dark:text-slate-600 text-xs">
              <p>{t('kanban.emptyColumn')}</p>
              <button
                onClick={() => onQuickAddItem(col.dropTargetStatus || col.statuses[0] || 'draft')}
                className="mt-2 text-[11px] text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
              >
                + {t('header.newItem')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 min-w-0 max-w-[1680px] mx-auto">
      {/* Workflow Toolbar: Cleaned up for Kanban Continuo vs Sprint Board for Scrumban */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 w-full border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          {config?.methodology === 'kanban' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('kanban.continuousFlow')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                {t('kanban.tasksCount', { count: items.length })}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('kanban.sprintBoard')}</span>
              </div>

              {/* Selector de Sprint Goal */}
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('kanban.activeSprintGoal')}</span>
                <div className="relative flex items-center">
                  <select
                    value={activeSprint}
                    onChange={(e) => setActiveSprint(e.target.value)}
                    className="appearance-none bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/[0.1] rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer"
                  >
                    <option value="all" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('kanban.allSprints')}</option>
                    {availableSprintsList.map((s) => {
                      const spObj = sprints?.find((sp) => sp.name?.toLowerCase().trim() === s.toLowerCase().trim() || sp.id === s);
                      const sprintItems = (allItems || items).filter(i => (i.sprint || i.targetSprint || '').toLowerCase().trim() === s.toLowerCase().trim());
                      const allDone = sprintItems.length > 0 && sprintItems.every(i => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
                      const hasDoing = sprintItems.some(i => i.status === 'doing' || i.status === 'review');
                      const status = spObj?.status || (allDone ? 'completed' : (hasDoing ? 'active' : 'planned'));
                      return (
                        <option key={s} value={s} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                          {s} {status === 'active' ? `🟢 (${t('common.active')})` : status === 'completed' ? `⚪ (${t('common.completed')})` : '🟡 (Plan)'}
                        </option>
                      );
                    })}
                    <option value="backlog" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('sprint.noSprint')}</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
                {(() => {
                  const currentSprintObj = sprints?.find((sp) => sp.name === activeSprint);
                  if (currentSprintObj?.goal) {
                    return (
                      <span
                        className="hidden lg:inline-block text-xs text-slate-500 dark:text-slate-400 italic font-normal truncate max-w-xs xl:max-w-md"
                        title={currentSprintObj.goal}
                      >
                        🎯 "{currentSprintObj.goal}"
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('sprint')}
                  title={t('kanban.goToSprintPlanning')}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <span>{t('sprint.planSprint')}</span>
                  <span className="text-[10px]">→</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side controls: Column View Mode Switcher + Ideas toggle (DEV-034) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Column View Mode Switcher */}
          {onChangeViewMode && (
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onChangeViewMode('simplificada')}
                title={t('kanban.simpleModeTooltip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'simplificada'
                    ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>⚡</span>
                <span>{t('kanban.simpleMode')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('ampliada')}
                title={t('kanban.extendedModeTooltip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'ampliada'
                    ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🔍</span>
                <span>{t('kanban.extendedMode')}</span>
              </button>
            </div>
          )}

          {/* Ideas toggle (DEV-008 & DEV-036: Estable y visible en ambas vistas, DEV-045: Cero CLS con ancho fijo w-8) */}
          <button
            type="button"
            onClick={() => handleToggleIdeas(!showIdeas)}
            title={showIdeas ? t('kanban.hideIdeasTooltip') : t('kanban.showIdeasTooltip')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 select-none ${
              showIdeas
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Lightbulb className={`w-3.5 h-3.5 shrink-0 ${showIdeas ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'}`} />
            <span>{t('kanban.ideas')}</span>
            <span className={`w-8 inline-flex items-center justify-center py-0.5 rounded-full text-[10px] font-mono font-semibold transition-colors ${
              showIdeas ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              {showIdeas ? 'ON' : 'OFF'}
            </span>
            {ideasCount > 0 && (
              <span className={`min-w-[18px] inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                showIdeas ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {ideasCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sprint Goal Progress Indicator in Scrumban */}
      {config?.methodology !== 'kanban' && activeSprint && activeSprint !== 'all' && sprintStats && sprintStats.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] text-xs w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('kanban.activeSprintGoal')}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  {activeSprint === 'backlog' ? t('sprint.noSprint') : activeSprint}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t('kanban.sprintGoalNotice')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('kanban.progress')}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {sprintStats.done} / {sprintStats.total} ({sprintStats.pct}%)
              </span>
            </div>
            <div className="w-28 sm:w-36 bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  sprintStats.pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${sprintStats.pct}%` }}
              />
            </div>
            {sprintStats.inProgress > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3 h-3" /> {t('kanban.inProgressCount', { count: sprintStats.inProgress })}
              </span>
            )}
            {sprintStats.pct === 100 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> {t('kanban.goalAchieved')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty State when Sprint Goal has no items */}
      {config?.methodology !== 'kanban' && scopedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 mb-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-center w-full animate-fade-in">
          <Target className="w-8 h-8 text-indigo-400 mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t('kanban.emptyGoalTitle', { sprint: activeSprint === 'backlog' ? t('sprint.noSprint') : activeSprint || 'actual' })}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            {t('kanban.emptyGoalDesc')}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActiveSprint('all')}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs transition-colors"
            >
              {t('kanban.viewAllBoard')}
            </button>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('sprint')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium transition-colors"
              >
                {t('kanban.goToSprints')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onQuickAddItem('draft', activeSprint !== 'all' && activeSprint !== 'backlog' ? activeSprint : undefined)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium transition-colors"
            >
              {t('kanban.createTask')}
            </button>
          </div>
        </div>
      )}

      {/* Orphan items warning banner (DEV-009) */}
      {orphanItems.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs w-full animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{t('kanban.orphanAttention')}</span>{' '}
            {t('kanban.orphanNotice', { count: orphanItems.length })}
          </div>
        </div>
      )}

      {/* Mobile Column Tabs / Pills Bar (DEV-007) */}
      <div className="md:hidden pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6">
          {columns.map((col) => {
            const isSelected = activeMobileCol?.id === col.id;
            const count = scopedItems.filter((item) => {
              if (col.id === 'col-ideas') return item.status === 'ideas' || item.labels?.includes('idea');
              if (col.id === 'col-draft') {
                if (showIdeas && (item.status === 'ideas' || item.labels?.includes('idea'))) return false;
                if (viewMode === 'simplificada' && !showIdeas && item.status === 'ideas') return false;
                return col.statuses.includes(item.status);
              }
              if ((col.id === 'col-done' || col.statuses.includes('done')) && !showPreviousDone) {
                if (isItemHistoricalDone(item)) return false;
              }
              return col.statuses.includes(item.status);
            }).length;

            return (
              <button
                key={col.id}
                onClick={() => setMobileColId(col.id)}
                className={`min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span>{getRenderColumnTitle(col)}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isSelected 
                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Single-Column Focused View (DEV-007) */}
      <div className="md:hidden flex flex-col pb-6">
        {activeMobileCol && renderColumn(activeMobileCol, true)}

        {/* Mobile Column Navigation Footer */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            onClick={() => {
              if (activeMobileIndex > 0) {
                setMobileColId(columns[activeMobileIndex - 1].id);
              }
            }}
            disabled={activeMobileIndex <= 0}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all active:scale-95"
          >
            ← {activeMobileIndex > 0 ? columns[activeMobileIndex - 1].title : 'Inicio'}
          </button>

          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {activeMobileIndex + 1} de {columns.length}
          </span>

          <button
            onClick={() => {
              if (activeMobileIndex < columns.length - 1) {
                setMobileColId(columns[activeMobileIndex + 1].id);
              }
            }}
            disabled={activeMobileIndex >= columns.length - 1}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all active:scale-95"
          >
            {activeMobileIndex < columns.length - 1 ? columns[activeMobileIndex + 1].title : 'Fin'} →
          </button>
        </div>
      </div>

      {/* Desktop Multi-column Grid with horizontal scroll */}
      <div className="hidden md:block w-full flex-1 overflow-x-auto pb-6">
        <div 
          className="grid gap-4 min-w-[960px]"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`
          }}
        >
          {columns.map((col) => renderColumn(col, false))}
        </div>
      </div>
    </div>
  );
};
