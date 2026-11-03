import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BacklogItem, ItemStatus, ViewMode, ColumnConfig, GripmConfig, ActiveTab, Sprint } from '../types';
import { isSprintModuleActive } from '../types';
import { useTranslation } from '../utils/i18n';
import { useStatusMeta } from '../utils/useStatusMeta';
import { getKanbanColumnItems } from '../utils/kanbanColumnItems';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from '../utils/storage';
import { updateItem } from '../api';

import {
  IDEAS_COLUMN,
  SIMPLIFIED_BASE_COLUMNS,
  DISMISSED_COLUMN,
  SIMPLIFIED_COLUMNS,
  EXPANDED_COLUMNS,
  SUB_DROP_THEME
} from './kanban/kanbanConstants';
import { KanbanHeader } from './kanban/KanbanHeader';
import { KanbanColumn } from './kanban/KanbanColumn';
import { useKanbanDragAndDrop } from './kanban/useKanbanDragAndDrop';

// Re-export constants for external consumers
export {
  IDEAS_COLUMN,
  SIMPLIFIED_BASE_COLUMNS,
  DISMISSED_COLUMN,
  SIMPLIFIED_COLUMNS,
  EXPANDED_COLUMNS,
  SUB_DROP_THEME
};

export interface KanbanBoardProps {
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
  config?: GripmConfig;
  availableSprints?: string[];
  sprints?: Sprint[];
  onNavigateToTab?: (tab: ActiveTab) => void;
  includePreviousDone?: boolean;
  onTogglePreviousDone?: (include: boolean) => void;
  includeDismissedCancelled?: boolean;
  includeIdeas?: boolean;
  onToggleIdeas?: (include: boolean) => void;
  onAssignSprint?: (item: BacklogItem, targetSprint: string) => Promise<void>;
}

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
  onAssignSprint,
}: KanbanBoardProps) => {
  const { t } = useTranslation();
  const getStatusMeta = useStatusMeta();

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

  const showIdeas = includeIdeas !== undefined ? includeIdeas : internalShowIdeas;

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

  // Sprint options for Scrumban
  const availableSprintsList = useMemo(() => {
    const set = new Set<string>();
    if (availableSprints && availableSprints.length > 0) {
      availableSprints.forEach((s) => set.add(s));
    }
    items.forEach((item) => {
      if (item.sprint) set.add(item.sprint);
      if (item.targetSprint) set.add(item.targetSprint);
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [items, availableSprints]);

  const isSprintActive = isSprintModuleActive(config);

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

  useEffect(() => {
    if (activeSprint !== 'all' && activeSprint !== 'backlog' && availableSprintsList.length > 0 && !availableSprintsList.includes(activeSprint)) {
      setActiveSprint(activeSprintEntity?.name || (availableSprintsList.length >= 2 ? 'all' : (availableSprintsList[0] || 'backlog')));
    } else if (activeSprint === 'all' && availableSprintsList.length < 2) {
      setActiveSprint(availableSprintsList[0] || 'backlog');
    }
  }, [activeSprint, availableSprintsList, activeSprintEntity]);

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

  // DEV-282: Pre-indexación en Map para resolución O(1) de tareas padre
  const parentLookupMap = useMemo(() => {
    const map = new Map<string, BacklogItem>();
    const pool = allItems && allItems.length > 0 ? allItems : items;
    for (const it of pool) {
      if (it.id) map.set(it.id, it);
      if (it.code) map.set(it.code, it);
    }
    return map;
  }, [allItems, items]);

  const dnd = useKanbanDragAndDrop({ items, onUpdateStatus });

  const activeOrAvailableSprintNames = useMemo(() => {
    const nonCompleted = sprints.filter((s) => s.status !== 'completed' && Boolean(s.name)).map((s) => s.name);
    if (nonCompleted.length > 0) {
      return Array.from(new Set(nonCompleted)).sort();
    }
    const set = new Set<string>();
    if (availableSprints && availableSprints.length > 0) {
      availableSprints.forEach((s) => set.add(s));
    }
    sprints.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableSprints, sprints]);

  const handleAssignItemSprint = useCallback(async (item: BacklogItem, targetSprint: string) => {
    const curSprint = item.sprint || item.targetSprint || '';
    if (curSprint === targetSprint) return;
    if (onAssignSprint) {
      await onAssignSprint(item, targetSprint);
      return;
    }
    try {
      await updateItem(item.id, {
        sprint: targetSprint,
        targetSprint: targetSprint,
        sprints: targetSprint ? [targetSprint] : []
      });
      if (onShowToast) {
        onShowToast(targetSprint ? `Asignado a ${targetSprint}` : 'Devuelto al Backlog', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(`Error al asignar sprint: ${err?.message || err}`, 'error');
      }
    }
  }, [onAssignSprint, onShowToast]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const includeIdeasRef = useRef(includeIdeas);
  includeIdeasRef.current = includeIdeas;

  const handleMoveItemWithinColumn = useCallback((
    item: BacklogItem,
    direction: 'up' | 'down' | 'top' | 'bottom'
  ) => {
    const currentCols = columnsRef.current;
    const currentItems = itemsRef.current;
    const col = currentCols.find((c) => c.statuses.includes(item.status)) || currentCols[0];
    const colItems = getKanbanColumnItems(currentItems, col, { showIdeas: Boolean(includeIdeasRef.current), viewMode: viewModeRef.current });
    dnd.handleMoveWithinColumn(item, col, colItems, direction);
  }, [dnd]);

  const handleCardUpdateStatus = useCallback((id: string, newStatus: ItemStatus) => {
    onUpdateStatus(id, newStatus);
  }, [onUpdateStatus]);

  // Mobile state
  const [mobileColId, setMobileColId] = useState<string>('');
  const activeMobileCol = useMemo(() => {
    return columns.find((c) => c.id === mobileColId) || columns[0];
  }, [columns, mobileColId]);
  const activeMobileIndex = useMemo(() => {
    return columns.findIndex((c) => c.id === (activeMobileCol?.id || ''));
  }, [columns, activeMobileCol]);

  const renderColumnNode = (col: ColumnConfig, isMobile: boolean) => {
    const limit = config?.kanban?.wipLimits?.[col.id] ?? col.wipLimit ?? 0;
    const isDoneCol = col.id === 'col-done' || col.statuses.includes('done');
    const colRawItems = getKanbanColumnItems(scopedItems, col, { showIdeas, viewMode });

    const hiddenDoneCount = isDoneCol && !showPreviousDone
      ? colRawItems.filter(isItemHistoricalDone).length
      : 0;

    const colItems = isDoneCol && !showPreviousDone
      ? colRawItems.filter((item) => !isItemHistoricalDone(item))
      : colRawItems;

    const isDropActive = dnd.activeDropColumn === col.id;
    const isOverWip = limit > 0 && colItems.length > limit;
    const isAtWip = limit > 0 && colItems.length === limit;

    return (
      <KanbanColumn
        key={col.id}
        col={col}
        isMobile={isMobile}
        colItems={colItems}
        hiddenDoneCount={hiddenDoneCount}
        totalHistoricalDoneCount={totalHistoricalDoneCount}
        showPreviousDone={showPreviousDone}
        setShowPreviousDone={setShowPreviousDone}
        limit={limit}
        isOverWip={isOverWip}
        isAtWip={isAtWip}
        isDropActive={isDropActive}
        draggedItemId={dnd.draggedItemId}
        dropTarget={dnd.dropTarget}
        activeSubDropTargetStatus={dnd.activeSubDropTargetStatus}
        activeDropColumn={dnd.activeDropColumn}
        setActiveDropColumn={dnd.setActiveDropColumn}
        setActiveSubDropTargetStatus={dnd.setActiveSubDropTargetStatus}
        handleDragEnter={dnd.handleDragEnter}
        handleDragOver={dnd.handleDragOver}
        handleDragLeave={dnd.handleDragLeave}
        handleCardDragOver={dnd.handleCardDragOver}
        handleDrop={dnd.handleDrop}
        setDropTarget={dnd.setDropTarget}
        editingColId={editingColId}
        setEditingColId={setEditingColId}
        editColTitle={editColTitle}
        setEditColTitle={setEditColTitle}
        handleCommitColTitle={handleCommitColTitle}
        parentLookupMap={parentLookupMap}
        onClickItem={onClickItem}
        handleCardUpdateStatus={handleCardUpdateStatus}
        onDeleteItem={onDeleteItem}
        handleDragStart={dnd.handleDragStart}
        handleDragEnd={dnd.handleDragEnd}
        onShowToast={onShowToast}
        config={config}
        handleMoveItemWithinColumn={handleMoveItemWithinColumn}
        activeOrAvailableSprintNames={activeOrAvailableSprintNames}
        handleAssignItemSprint={handleAssignItemSprint}
        onQuickAddItem={onQuickAddItem}
        activeSprint={activeSprint}
        getStatusMeta={getStatusMeta}
        viewMode={viewMode}
      />
    );
  };

  const getRenderColumnTitle = (c: ColumnConfig) => {
    if (c.id === 'col-ideas') return t('kanban.colTitleIdeas');
    if (c.id === 'col-draft') return t('kanban.colTitleDraft');
    if (c.id === 'col-doing') return t('kanban.colTitleDoing');
    if (c.id === 'col-review') return t('kanban.colTitleReview');
    if (c.id === 'col-ready') return t('kanban.colTitleReady');
    if (c.id === 'col-done') return t('kanban.colTitleDone');
    if (c.id === 'col-dismissed') return t('kanban.colTitleDismissed');
    return c.title;
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 min-w-0 max-w-[1680px] mx-auto">
      <KanbanHeader
        isSprintActive={isSprintActive}
        items={items}
        allItems={allItems}
        scopedItems={scopedItems}
        config={config}
        activeSprint={activeSprint}
        setActiveSprint={setActiveSprint}
        availableSprintsList={availableSprintsList}
        sprints={sprints}
        onNavigateToTab={onNavigateToTab}
        viewMode={viewMode}
        onChangeViewMode={onChangeViewMode}
        showIdeas={showIdeas}
        onToggleIdeas={handleToggleIdeas}
        ideasCount={ideasCount}
        sprintStats={sprintStats}
        orphanItems={orphanItems}
        onQuickAddItem={onQuickAddItem}
      />

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
        {activeMobileCol && renderColumnNode(activeMobileCol, true)}

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
          {columns.map((col) => renderColumnNode(col, false))}
        </div>
      </div>
    </div>
  );
};
