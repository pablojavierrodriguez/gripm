import { useState, useEffect, useMemo, useRef, useLayoutEffect, type FC } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BacklogItem, ItemStatus, Priority, Sprint, GripmConfig } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { SprintModal } from './SprintModal';
import { CompleteSprintModal } from './CompleteSprintModal';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useTranslation } from '../utils/i18n';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from '../utils/storage';
import { fetchRetros, updateItem } from '../api';
import {
  DEFAULT_COLS,
  normalizeVisibleCols,
  type OptionalCol
} from '../utils/sprintVisibleCols';
import { SprintHeaderControls, type GroupBy } from './sprint/SprintHeaderControls';
import { SprintGroupCard } from './sprint/SprintGroupCard';
import { SprintRowMenu } from './sprint/SprintRowMenu';
import { SprintBulkActionBar } from './sprint/SprintBulkActionBar';
import { RetrospectiveModal } from './sprint/RetrospectiveModal';
import { useSprintGrouping } from './sprint/useSprintGrouping';
import { useSprintBulkActions } from './sprint/useSprintBulkActions';

interface SprintViewProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  sprints?: Sprint[];
  onClickItem: (item: BacklogItem) => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onUpdatePriority: (id: string, newPriority: Priority) => void;
  onUpdateSprint?: (id: string, newSprint: string) => void;
  onReorderItem?: (draggedId: string, targetSprint: string, targetIndex: number) => void;
  onCreateSprint?: (sprintData: Partial<Sprint>) => Promise<void>;
  onUpdateSprintMeta?: (id: string, sprintData: Partial<Sprint>) => Promise<void>;
  onDeleteSprint?: (id: string) => Promise<void>;
  onStartSprint?: (sprint: Sprint) => Promise<void>;
  onCompleteSprint?: (sprint: Sprint, destinationSprintName: string, retroData?: any) => Promise<void>;
  onCreateTaskFromAction?: (title: string) => Promise<void>;
  onDeleteItem: (id: string) => void;
  availableSprints?: string[];
  availableReleases?: string[];
  rankingEnabled?: boolean;
  projectId?: string;
  config?: GripmConfig;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SprintView: FC<SprintViewProps> = ({
  items,
  allItems,
  sprints = [],
  onClickItem,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateSprint,
  onReorderItem,
  onCreateSprint,
  onUpdateSprintMeta,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
  onCreateTaskFromAction,
  onDeleteItem,
  availableSprints = [],
  availableReleases = [],
  rankingEnabled = true,
  projectId,
  config,
  onShowToast
}) => {
  const { t, isEs } = useTranslation();
  const hierarchyItems = allItems || items;
  const isEstimationEnabled = config?.estimation?.enabled !== false;
  const [groupBy, setGroupBy] = useState<GroupBy>('sprint');
  const [sortBy, setSortBy] = useState<'order' | 'priority' | 'code' | 'status'>('order');
  const [sortAsc, setSortAsc] = useState(true);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<BacklogItem | null>(null);

  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setLocalToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setLocalToast(null);
    }, 3500);
  };

  // Retrospectives
  const [retros, setRetros] = useState<any[]>([]);
  const [selectedRetro, setSelectedRetro] = useState<{ title: string; date: string; content: string; sprintName: string } | null>(null);
  const retroPanelRef = useFocusTrap<HTMLDivElement>(Boolean(selectedRetro), () => setSelectedRetro(null));

  useEffect(() => {
    fetchRetros(projectId)
      .then((d) => {
        if (d?.retros) setRetros(d.retros);
      })
      .catch(() => {});
  }, [projectId]);

  // Show completed sprints toggle persistence
  const [showCompletedSprints, setShowCompletedSprints] = useState<boolean>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.SPRINTVIEW_SHOW_COMPLETED);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.SPRINTVIEW_SHOW_COMPLETED, JSON.stringify(showCompletedSprints));
  }, [showCompletedSprints]);

  // Grouping and sorting
  const {
    allAvailableSprints,
    activeSprints,
    allAvailableReleases,
    suggestedSprintName,
    completedSprintsCount,
    groupedData
  } = useSprintGrouping({
    items,
    hierarchyItems,
    groupBy,
    sortBy,
    sortAsc,
    sprints,
    showCompletedSprints,
    availableSprints,
    availableReleases
  });

  // Modals state
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);

  const hasOpenModals = Boolean(
    itemToDelete || sprintModalOpen || completingSprint || sprintToDelete || selectedRetro
  );

  // Bulk actions & selection
  const {
    selectedItemIds,
    isBulkProcessing,
    confirmBulkDeleteOpen,
    setConfirmBulkDeleteOpen,
    handleToggleSelectItem,
    handleRowShiftClick,
    handleToggleSelectGroup,
    handleDeselectAll,
    handleBulkMoveTop,
    handleBulkMoveBottom,
    handleBulkAssignSprint,
    handleBulkAssignRelease,
    handleBulkChangeStatus,
    handleBulkChangePriority,
    handleBulkDelete
  } = useSprintBulkActions({
    items,
    groupedData,
    isEs,
    showNotification,
    onReorderItem,
    onUpdateSprint,
    onUpdateStatus,
    onUpdatePriority,
    onDeleteItem,
    setSortBy,
    setSortAsc,
    hasOpenModals
  });

  // Row Menu Portal State
  const [rowMenuState, setRowMenuState] = useState<{
    itemId: string;
    top: number;
    left: number;
    group: { key: string; items: BacklogItem[] };
    rowIdx: number;
  } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowMenuState) return;
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      if (rowMenuRef.current && rowMenuRef.current.contains(e.target as Node)) {
        return;
      }
      setRowMenuState(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRowMenuState(null);
    };
    const handleScroll = (e: Event) => {
      if (rowMenuRef.current && (rowMenuRef.current === e.target || rowMenuRef.current.contains(e.target as Node))) {
        return;
      }
      setRowMenuState(null);
    };
    const handleResize = () => setRowMenuState(null);

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [rowMenuState]);

  const handleTransferSprint = (itemId: string, newSprint: string) => {
    const existing = items.find((it) => it.id === itemId);
    const curSprint = existing ? (existing.sprint || existing.targetSprint || '') : '';
    if (curSprint === newSprint) return;
    if (onUpdateSprint) {
      onUpdateSprint(itemId, newSprint);
    } else {
      updateItem(itemId, {
        sprint: newSprint,
        targetSprint: newSprint,
        sprints: newSprint ? [newSprint] : []
      });
    }
  };

  const handleMoveItemToTop = (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => {
    const targetSprintVal = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar' ? '' : group.key;
    if (onReorderItem) {
      onReorderItem(item.id, targetSprintVal, 0);
      setSortBy('order');
    } else {
      const firstOrder = group.items[0]?.order ?? 10;
      updateItem(item.id, { order: firstOrder - 10 });
    }
  };

  const handleMoveItemToBottom = (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => {
    const targetSprintVal = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar' ? '' : group.key;
    if (onReorderItem) {
      onReorderItem(item.id, targetSprintVal, group.items.length);
      setSortBy('order');
    } else {
      const lastOrder = group.items[group.items.length - 1]?.order ?? (group.items.length * 10);
      updateItem(item.id, { order: lastOrder + 10 });
    }
  };

  // Drag and drop states
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetRow, setDropTargetRow] = useState<{ itemId: string; position: 'before' | 'after' } | null>(null);
  const [activeDropGroup, setActiveDropGroup] = useState<string | null>(null);

  // Columns visibility state
  const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS);
      if (saved) {
        return normalizeVisibleCols(JSON.parse(saved) as string[]);
      }
    } catch {}
    return new Set<OptionalCol>(DEFAULT_COLS);
  });

  const toggleCol = (col: OptionalCol) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSnapshotRef = useRef<{
    clickedEl?: HTMLElement;
    clickedTop?: number;
    windowTop: number;
    containerTop: number;
  } | null>(null);

  const toggleSort = (field: 'order' | 'priority' | 'code' | 'status', e?: React.MouseEvent) => {
    const el = e?.currentTarget as HTMLElement | undefined;
    scrollSnapshotRef.current = {
      clickedEl: el,
      clickedTop: el ? el.getBoundingClientRect().top : undefined,
      windowTop: window.scrollY || document.documentElement.scrollTop || 0,
      containerTop: containerRef.current ? containerRef.current.scrollTop : 0
    };

    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  useLayoutEffect(() => {
    if (scrollSnapshotRef.current) {
      const { clickedEl, clickedTop, windowTop, containerTop } = scrollSnapshotRef.current;
      scrollSnapshotRef.current = null;

      if (clickedEl && typeof clickedTop === 'number' && document.body.contains(clickedEl)) {
        const newTop = clickedEl.getBoundingClientRect().top;
        const delta = newTop - clickedTop;
        if (Math.abs(delta) > 0.5) {
          window.scrollBy({ top: delta, behavior: 'instant' as ScrollBehavior });
        }
      } else {
        if (containerRef.current && containerRef.current.scrollTop !== containerTop) {
          containerRef.current.scrollTop = containerTop;
        }
        if ((window.scrollY || document.documentElement.scrollTop || 0) !== windowTop) {
          window.scrollTo({ top: windowTop, behavior: 'instant' as ScrollBehavior });
        }
      }
    }
  }, [sortBy, sortAsc]);

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsedKeys(new Set());
  const collapseAll = () => setCollapsedKeys(new Set(groupedData.map((g) => g.key)));

  // Row menu trigger
  const handleOpenRowMenu = (e: React.MouseEvent, item: BacklogItem, rowIdx: number) => {
    e.stopPropagation();
    if (rowMenuState?.itemId === item.id) {
      setRowMenuState(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 208;
      const left = Math.max(16, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 16));
      const top = rect.bottom + 4 + 280 > window.innerHeight
        ? Math.max(16, rect.top - 280)
        : rect.bottom + 4;
      const group = groupedData.find(g => g.items.some(i => i.id === item.id)) || { key: '', items: [] };
      setRowMenuState({
        itemId: item.id,
        top,
        left,
        group,
        rowIdx
      });
    }
  };

  const targetRowMenuItem = useMemo(() => {
    if (!rowMenuState) return null;
    return items.find((it) => it.id === rowMenuState.itemId) || null;
  }, [rowMenuState, items]);

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 p-3.5 sm:p-5 max-w-[1680px] mx-auto"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="mb-3">
        <SprintHeaderControls
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          expandAll={expandAll}
          collapseAll={collapseAll}
          completedSprintsCount={completedSprintsCount}
          showCompletedSprints={showCompletedSprints}
          setShowCompletedSprints={setShowCompletedSprints}
          onCreateSprint={onCreateSprint ? () => {
            setEditingSprint(null);
            setSprintModalOpen(true);
          } : undefined}
          visibleCols={visibleCols}
          toggleCol={toggleCol}
          setVisibleCols={setVisibleCols}
          totalItemsCount={items.length}
        />
      </div>

      {/* Tables by Group */}
      <div className="space-y-4">
        {groupedData.map((group) => (
          <SprintGroupCard
            key={group.key}
            group={group}
            groupBy={groupBy}
            sprints={sprints}
            projectId={projectId}
            isEstimationEnabled={isEstimationEnabled}
            isCollapsed={collapsedKeys.has(group.key)}
            isDropTarget={activeDropGroup === group.key}
            selectedItemIds={selectedItemIds}
            draggedItemId={draggedItemId}
            dropTargetRow={dropTargetRow}
            rankingEnabled={rankingEnabled}
            hierarchyItems={hierarchyItems}
            visibleCols={visibleCols}
            allAvailableSprints={allAvailableSprints}
            sortBy={sortBy}
            isEs={isEs}
            activeRowMenuItemId={rowMenuState?.itemId}
            onToggleCollapse={toggleCollapse}
            onToggleSelectGroup={handleToggleSelectGroup}
            onStartSprint={onStartSprint}
            onCompleteSprint={(sp) => setCompletingSprint(sp)}
            onOpenRetroModal={(sp) => {
              const match = retros.find(r => 
                r.sprintId === sp.id || 
                r.sprintId.includes(sp.name.toLowerCase().replace(/[^a-z0-9]/g, '-')) || 
                (r.title && r.title.toLowerCase().includes(sp.name.toLowerCase())) ||
                (r.content && r.content.toLowerCase().includes(sp.name.toLowerCase()))
              );
              if (match) {
                setSelectedRetro({ ...match, sprintName: sp.name });
              } else {
                setSelectedRetro({
                  title: t('sprintView.retroModalTitle', { name: sp.name }),
                  date: sp.completedAt || '',
                  content: t('sprintView.noRetroRecorded', { name: sp.name }),
                  sprintName: sp.name
                });
              }
            }}
            onEditSprint={onUpdateSprintMeta ? (sp) => {
              setEditingSprint(sp);
              setSprintModalOpen(true);
            } : undefined}
            onDeleteSprint={onDeleteSprint ? (sp) => setSprintToDelete(sp) : undefined}
            onGroupDragOver={(e, groupKey) => {
              if (groupBy === 'sprint' && onUpdateSprint) {
                e.preventDefault();
                setActiveDropGroup((prev) => (prev === groupKey ? prev : groupKey));
              }
            }}
            onGroupDragLeave={() => {
              if (activeDropGroup === group.key) setActiveDropGroup(null);
            }}
            onGroupDrop={(e, grp) => {
              e.preventDefault();
              if (draggedItemId && groupBy === 'sprint') {
                const isNoSprint = grp.key === 'Backlog' || grp.key.includes('Sin Sprint') || grp.key === 'Sin Asignar';
                const targetSprintVal = isNoSprint ? '' : grp.key;
                if (onReorderItem) {
                  onReorderItem(draggedItemId, targetSprintVal, grp.items.length);
                  setSortBy('order');
                } else if (onUpdateSprint) {
                  onUpdateSprint(draggedItemId, targetSprintVal);
                }
              }
              setActiveDropGroup(null);
              setDraggedItemId(null);
              setDropTargetRow(null);
            }}
            onRowDragStart={(e, id) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', id);
              setDraggedItemId(id);
            }}
            onRowDragEnd={() => {
              setDraggedItemId(null);
              setDropTargetRow(null);
              setActiveDropGroup(null);
            }}
            onRowDragOver={(e, it) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedItemId && draggedItemId !== it.id) {
                const rect = e.currentTarget.getBoundingClientRect();
                const isUpper = e.clientY < rect.top + rect.height / 2;
                const nextPos: 'before' | 'after' = isUpper ? 'before' : 'after';
                setDropTargetRow((prev) => (prev?.itemId === it.id && prev?.position === nextPos ? prev : { itemId: it.id, position: nextPos }));
              }
            }}
            onRowDragLeave={(e, it) => {
              if (dropTargetRow?.itemId === it.id) {
                const related = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(related)) {
                  setDropTargetRow(null);
                }
              }
            }}
            onRowDrop={(e, _it, rowIdx, grp) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedItemId && draggedItemId !== _it.id) {
                const isUpper = dropTargetRow?.position === 'before';
                const isNoSprint = grp.key === 'Backlog' || grp.key.includes('Sin Sprint') || grp.key === 'Sin Asignar';
                const targetSprintVal = isNoSprint ? '' : grp.key;
                const insertIdx = isUpper ? rowIdx : rowIdx + 1;
                if (onReorderItem) {
                  onReorderItem(draggedItemId, targetSprintVal, insertIdx);
                  setSortBy('order');
                } else if (onUpdateSprint) {
                  onUpdateSprint(draggedItemId, targetSprintVal);
                }
              }
              setDraggedItemId(null);
              setDropTargetRow(null);
              setActiveDropGroup(null);
            }}
            onClickItem={onClickItem}
            onToggleSelectItem={handleToggleSelectItem}
            onRowShiftClick={handleRowShiftClick}
            onUpdatePriority={onUpdatePriority}
            onUpdateStatus={onUpdateStatus}
            onUpdateSprint={onUpdateSprint}
            onToggleSort={toggleSort}
            onOpenRowMenu={handleOpenRowMenu}
            canReorderOrMoveSprint={Boolean(onReorderItem || onUpdateSprint)}
          />
        ))}
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Mover a la Papelera"
        message={`¿Estás seguro de que deseas mover la tarea ${itemToDelete?.code} a la papelera? Podrás restaurarla desde allí en cualquier momento.`}
        detail={itemToDelete?.title}
        confirmText="Mover a la Papelera"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) onDeleteItem(itemToDelete.id);
        }}
        onClose={() => setItemToDelete(null)}
      />

      {rowMenuState && targetRowMenuItem && (
        <SprintRowMenu
          item={targetRowMenuItem}
          group={rowMenuState.group}
          rowIdx={rowMenuState.rowIdx}
          top={rowMenuState.top}
          left={rowMenuState.left}
          menuRef={rowMenuRef}
          rankingEnabled={rankingEnabled}
          activeSprints={activeSprints}
          onMoveToTop={handleMoveItemToTop}
          onMoveToBottom={handleMoveItemToBottom}
          onTransferSprint={handleTransferSprint}
          onEditItem={onClickItem}
          onDeleteItem={(it) => setItemToDelete(it)}
          onClose={() => setRowMenuState(null)}
        />
      )}

      {/* Sprint Modal (Create & Edit) */}
      <SprintModal
        isOpen={sprintModalOpen}
        onClose={() => {
          setSprintModalOpen(false);
          setEditingSprint(null);
        }}
        sprint={editingSprint}
        suggestedName={suggestedSprintName}
        onSave={async (data) => {
          if (editingSprint && onUpdateSprintMeta) {
            await onUpdateSprintMeta(editingSprint.id, data);
          } else if (onCreateSprint) {
            await onCreateSprint(data);
          }
          setSprintModalOpen(false);
          setEditingSprint(null);
        }}
      />

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <CompleteSprintModal
          isOpen={!!completingSprint}
          onClose={() => setCompletingSprint(null)}
          sprint={completingSprint}
          sprintItems={items.filter(
            (i) => i.sprint === completingSprint.name || i.targetSprint === completingSprint.name
          )}
          availablePlannedSprints={sprints.filter(
            (s) => s.status === 'planned' && s.id !== completingSprint.id
          )}
          onCreateTaskFromAction={onCreateTaskFromAction}
          onConfirm={async (destinationSprintName, retroData) => {
            if (onCompleteSprint) {
              await onCompleteSprint(completingSprint, destinationSprintName, retroData);
            }
            setCompletingSprint(null);
          }}
        />
      )}

      {/* Delete Sprint Confirmation Modal */}
      {sprintToDelete && (
        <ConfirmModal
          isOpen={!!sprintToDelete}
          title={t('sprintView.deleteSprintTitle')}
          message={t('sprintView.deleteSprintMessage', { name: sprintToDelete.name })}
          detail={t('sprintView.deleteSprintDetail')}
          confirmText={t('sprintView.deleteSprintConfirm')}
          variant="danger"
          onConfirm={async () => {
            if (onDeleteSprint && sprintToDelete) {
              await onDeleteSprint(sprintToDelete.id);
              setSprintToDelete(null);
            }
          }}
          onClose={() => setSprintToDelete(null)}
        />
      )}

      {/* Retrospective View Modal */}
      <RetrospectiveModal
        retro={selectedRetro}
        panelRef={retroPanelRef}
        onClose={() => setSelectedRetro(null)}
      />

      {/* Floating Bulk Action Bar */}
      <SprintBulkActionBar
        selectedItemIds={selectedItemIds}
        isEs={isEs}
        isBulkProcessing={isBulkProcessing}
        allAvailableSprints={allAvailableSprints}
        allAvailableReleases={allAvailableReleases}
        onDeselectAll={handleDeselectAll}
        onBulkMoveTop={handleBulkMoveTop}
        onBulkMoveBottom={handleBulkMoveBottom}
        onBulkAssignSprint={handleBulkAssignSprint}
        onBulkAssignRelease={handleBulkAssignRelease}
        onBulkChangeStatus={handleBulkChangeStatus}
        onBulkChangePriority={handleBulkChangePriority}
        onConfirmBulkDelete={() => setConfirmBulkDeleteOpen(true)}
      />

      {/* Confirmation modal for bulk delete */}
      <ConfirmModal
        isOpen={confirmBulkDeleteOpen}
        title={isEs ? 'Mover a la Papelera' : 'Move to Trash'}
        message={
          isEs
            ? `¿Estás seguro de que deseas mover ${selectedItemIds.size} tareas a la papelera? Podrás restaurarlas desde allí en cualquier momento.`
            : `Are you sure you want to move ${selectedItemIds.size} tasks to the trash? You can restore them anytime.`
        }
        detail={items
          .filter((it) => selectedItemIds.has(it.id))
          .slice(0, 5)
          .map((it) => `${it.code}: ${it.title}`)
          .join('\n') + (selectedItemIds.size > 5 ? `\n... y ${selectedItemIds.size - 5} más` : '')}
        confirmText={isEs ? `Mover ${selectedItemIds.size} a la Papelera` : `Move ${selectedItemIds.size} to Trash`}
        variant="danger"
        onConfirm={handleBulkDelete}
        onClose={() => setConfirmBulkDeleteOpen(false)}
      />

      {/* Floating local feedback notification */}
      {localToast && createPortal(
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 bg-slate-900/95 text-white border-slate-700"
        >
          {localToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {localToast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {localToast.type === 'info' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
          <span>{localToast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
};
