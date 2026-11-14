import React from 'react';
import { Plus, History, CheckCircle2, Pencil } from 'lucide-react';
import type { BacklogItem, ItemStatus, ColumnConfig, GripmConfig } from '../../types';
import { ItemCard } from '../ItemCard';
import { useTranslation } from '../../utils/i18n';
import { SUB_DROP_THEME } from './kanbanConstants';

interface KanbanColumnProps {
  col: ColumnConfig;
  isMobile?: boolean;
  colItems: BacklogItem[];
  hiddenDoneCount: number;
  totalHistoricalDoneCount: number;
  showPreviousDone: boolean;
  setShowPreviousDone: (val: boolean) => void;
  limit: number;
  isOverWip: boolean;
  isAtWip: boolean;
  isDropActive: boolean;
  draggedItemId: string | null;
  dropTarget: {
    colId: string;
    index: number;
    targetItemId?: string;
    isAbove?: boolean;
  } | null;
  activeSubDropTargetStatus: { colId: string; status: ItemStatus } | null;
  activeDropColumn: string | null;
  setActiveDropColumn: (colId: string | null) => void;
  setActiveSubDropTargetStatus: (val: { colId: string; status: ItemStatus } | null) => void;
  handleDragEnter: (e: React.DragEvent, colId: string) => void;
  handleDragOver: (e: React.DragEvent, colId: string) => void;
  handleDragLeave: (e: React.DragEvent, colId: string) => void;
  handleCardDragOver: (e: React.DragEvent, colId: string, index: number, targetItem?: BacklogItem) => void;
  handleDrop: (e: React.DragEvent, col: ColumnConfig, specificIndex?: number, colItems?: BacklogItem[], explicitStatus?: ItemStatus) => void;
  setDropTarget: React.Dispatch<React.SetStateAction<{
    colId: string;
    index: number;
    targetItemId?: string;
    isAbove?: boolean;
  } | null>>;
  editingColId: string | null;
  setEditingColId: (id: string | null) => void;
  editColTitle: string;
  setEditColTitle: (title: string) => void;
  handleCommitColTitle: (colId: string) => void;
  parentLookupMap: Map<string, BacklogItem>;
  onClickItem: (item: BacklogItem) => void;
  handleCardUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onDeleteItem: (id: string) => void;
  handleDragStart: (e: React.DragEvent, item: BacklogItem) => void;
  handleDragEnd: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  config?: GripmConfig;
  handleMoveItemWithinColumn: (item: BacklogItem, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  activeOrAvailableSprintNames: string[];
  handleAssignItemSprint: (item: BacklogItem, targetSprint: string) => Promise<void>;
  onQuickAddItem: (status: ItemStatus, defaultSprint?: string) => void;
  activeSprint: string;
  getStatusMeta: (status: string) => any;
  viewMode: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  col,
  isMobile = false,
  colItems,
  hiddenDoneCount,
  totalHistoricalDoneCount,
  showPreviousDone,
  setShowPreviousDone,
  limit,
  isOverWip,
  isAtWip,
  isDropActive,
  draggedItemId,
  dropTarget,
  activeSubDropTargetStatus,
  activeDropColumn,
  setActiveDropColumn,
  setActiveSubDropTargetStatus,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleCardDragOver,
  handleDrop,
  setDropTarget,
  editingColId,
  setEditingColId,
  editColTitle,
  setEditColTitle,
  handleCommitColTitle,
  parentLookupMap,
  onClickItem,
  handleCardUpdateStatus,
  onDeleteItem,
  handleDragStart,
  handleDragEnd,
  onShowToast,
  config,
  handleMoveItemWithinColumn,
  activeOrAvailableSprintNames,
  handleAssignItemSprint,
  onQuickAddItem,
  activeSprint,
  getStatusMeta,
  viewMode
}) => {
  const { t } = useTranslation();
  const isDoneCol = col.id === 'col-done' || col.statuses.includes('done');

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

  const getRenderColumnSubtitle = (c: ColumnConfig) => {
    if (c.id === 'col-ideas') return t('kanban.colIdeasSubtitle');
    if (c.id === 'col-draft') {
      return viewMode === 'simplificada' ? t('kanban.colDraftSimplifiedSubtitle') : t('kanban.colDraftSubtitle');
    }
    if (c.id === 'col-doing') {
      return viewMode === 'simplificada' ? t('kanban.colDoingSimplifiedSubtitle') : t('kanban.colDoingSubtitle');
    }
    if (c.id === 'col-review') return t('kanban.colReviewSubtitle');
    if (c.id === 'col-ready') return t('kanban.colReadySubtitle');
    if (c.id === 'col-done') {
      return viewMode === 'simplificada' ? t('kanban.colDoneSimplifiedSubtitle') : t('kanban.colDoneSubtitle');
    }
    if (c.id === 'col-dismissed') return t('kanban.colDismissedSubtitle');
    return c.subtitle;
  };

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
            <button
              type="button"
              className="group/coltitle flex items-center gap-1.5 cursor-pointer py-0.5 text-left rounded hover:bg-slate-100/70 dark:hover:bg-white/[0.04] active:scale-[0.98] transition-transform"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block">
                    {getRenderColumnSubtitle(col)}
                  </p>
                )}
              </div>
              <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/coltitle:opacity-100 transition-opacity" />
            </button>
          )}
          {limit > 0 ? (
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold transition-all border ${
                isOverWip
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse'
                  : isAtWip
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
              title={isOverWip ? t('kanban.wipExceeded', { count: colItems.length, limit }) : t('kanban.wipLimit', { limit })}
            >
              {t('kanban.wipBadge', { count: colItems.length, limit })}
            </span>
          ) : (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-white/[0.04]">
              {colItems.length}
              {hiddenDoneCount > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 font-semibold">
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

      {/* Previous Done Indicator Banner */}
      {isDoneCol && hiddenDoneCount > 0 && !showPreviousDone && (
        <div className="mb-2.5 p-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs transition-all">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
            <History className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate text-xs font-medium">
              +{hiddenDoneCount} {hiddenDoneCount === 1 ? 'completada en iteración previa' : 'completadas en iteraciones previas'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreviousDone(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline shrink-0 px-1 py-0.5"
          >
            Ver anteriores
          </button>
        </div>
      )}
      {isDoneCol && showPreviousDone && totalHistoricalDoneCount > 0 && (
        <div className="mb-2.5 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 flex items-center justify-between gap-2 text-xs transition-all">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span className="truncate text-xs font-medium">
              Mostrando {totalHistoricalDoneCount} completadas previas
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreviousDone(false)}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline shrink-0 px-1 py-0.5"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Dynamic Full-Height Partitioned Drop Zones */}
      {draggedItemId ? (
        <div className="flex-1 flex flex-col w-full h-full min-h-[420px] transition-all duration-200">
          {col.statuses.length === 1 ? (
            (() => {
              const st = col.statuses[0];
              const meta = getStatusMeta(st);
              const isHovered = (activeDropColumn === col.id) || (activeSubDropTargetStatus?.colId === col.id && activeSubDropTargetStatus?.status === st);
              const theme = SUB_DROP_THEME[meta.key] || {
                hoverBg: meta.bg || 'bg-slate-100 dark:bg-slate-800',
                hoverBorder: meta.border || 'border-indigo-500',
                hoverText: 'text-slate-900 dark:text-white font-semibold',
                hoverRing: 'ring-2 ring-indigo-500/40',
                dot: meta.dot || 'bg-slate-500',
              };
              return (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (activeDropColumn !== col.id) setActiveDropColumn(col.id);
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
                  className={`flex-1 w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 gap-3 select-none ${
                    isHovered
                      ? `${theme.hoverBg} ${theme.hoverBorder} ${theme.hoverRing} ${theme.hoverText} scale-[1.01] shadow-md`
                      : 'bg-white/60 dark:bg-white/[0.03] border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 transition-transform duration-200 ${isHovered ? `${theme.dot} scale-125` : meta.dot}`} />
                    <span className="text-sm font-semibold tracking-wide text-inherit">
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                    {st}
                  </span>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col w-full h-full gap-2.5">
              {col.statuses.map((st) => {
                const meta = getStatusMeta(st);
                const isHovered = activeSubDropTargetStatus?.colId === col.id && activeSubDropTargetStatus?.status === st;
                const theme = SUB_DROP_THEME[meta.key] || {
                  hoverBg: meta.bg || 'bg-slate-100 dark:bg-slate-800',
                  hoverBorder: meta.border || 'border-indigo-500',
                  hoverText: 'text-slate-900 dark:text-white font-semibold',
                  hoverRing: 'ring-2 ring-indigo-500/40',
                  dot: meta.dot || 'bg-slate-500',
                };
                return (
                  <div
                    key={st}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      if (activeDropColumn !== col.id) setActiveDropColumn(col.id);
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
                    className={`flex-1 min-h-0 w-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-4 gap-2 select-none ${
                      isHovered
                        ? `${theme.hoverBg} ${theme.hoverBorder} ${theme.hoverRing} ${theme.hoverText} scale-[1.01] shadow-md`
                        : isDropActive
                        ? 'bg-white/70 dark:bg-white/[0.04] border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300'
                        : 'bg-white/40 dark:bg-white/[0.02] border-slate-300/80 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 transition-transform duration-200 ${isHovered ? `${theme.dot} scale-125` : meta.dot}`} />
                      <span className="text-sm font-semibold tracking-wide text-inherit">
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Items List */}
      <div 
        className={draggedItemId ? 'h-0 overflow-hidden opacity-0 pointer-events-none' : `flex flex-col ${config?.density === 'compact' ? 'gap-1.5' : 'gap-2.5'} flex-1 overflow-y-auto pr-0.5`}
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
                  parentItem={item.parentId ? parentLookupMap.get(item.parentId) : undefined}
                  isDragging={isItemDragged}
                  onClick={onClickItem}
                  onUpdateStatus={handleCardUpdateStatus}
                  onDelete={onDeleteItem}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onShowToast={onShowToast}
                  customItemTypes={config?.customItemTypes}
                  density={config?.density}
                  estimationConfig={config?.estimation}
                  visibleCardMetadata={config?.visibleCardMetadata}
                  config={config}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < colItems.length - 1}
                  canMoveToTop={idx > 0}
                  canMoveToBottom={idx < colItems.length - 1}
                  onMoveItemWithinColumn={handleMoveItemWithinColumn}
                  availableSprints={activeOrAvailableSprintNames}
                  onAssignItemSprint={handleAssignItemSprint}
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
              className="mt-2 text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
            >
              + {t('header.newItem')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
