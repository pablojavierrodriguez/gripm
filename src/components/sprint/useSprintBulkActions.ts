import { useState, useEffect } from 'react';
import type { BacklogItem, ItemStatus, Priority } from '../../types';
import { bulkUpdateItems, deleteItem } from '../../api';

interface UseSprintBulkActionsParams {
  items?: BacklogItem[];
  groupedData: { key: string; items: BacklogItem[] }[];
  isEs: boolean;
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onReorderItem?: (id: string, sprint: string, index: number) => void | Promise<void>;
  onUpdateSprint?: (id: string, sprint: string) => void | Promise<void>;
  onUpdateStatus?: (id: string, status: ItemStatus) => void | Promise<void>;
  onUpdatePriority?: (id: string, priority: Priority) => void | Promise<void>;
  onDeleteItem?: (id: string) => void | Promise<void>;
  setSortBy: (sortBy: 'order' | 'priority' | 'code' | 'status') => void;
  setSortAsc: (sortAsc: boolean) => void;
  hasOpenModals: boolean;
}

export function useSprintBulkActions({
  items: _items,
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
}: UseSprintBulkActionsParams) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const handleRowShiftClick = (clickedId: string, _currentGroupItems?: BacklogItem[]) => {
    if (!lastSelectedId) {
      setSelectedItemIds((prev) => new Set(prev).add(clickedId));
      setLastSelectedId(clickedId);
      return;
    }

    const allFlatItems = groupedData.flatMap((g) => g.items);
    const lastIdx = allFlatItems.findIndex((i) => i.id === lastSelectedId);
    const currentIdx = allFlatItems.findIndex((i) => i.id === clickedId);

    if (lastIdx === -1 || currentIdx === -1) {
      setSelectedItemIds((prev) => new Set(prev).add(clickedId));
      setLastSelectedId(clickedId);
      return;
    }

    const start = Math.min(lastIdx, currentIdx);
    const end = Math.max(lastIdx, currentIdx);
    const itemsInRange = allFlatItems.slice(start, end + 1);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      itemsInRange.forEach((i) => next.add(i.id));
      return next;
    });
    setLastSelectedId(clickedId);
  };

  const handleToggleSelectGroup = (groupItems: BacklogItem[]) => {
    if (groupItems.length === 0) return;
    const allGroupSelected = groupItems.every((i) => selectedItemIds.has(i.id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) {
        groupItems.forEach((i) => next.delete(i.id));
      } else {
        groupItems.forEach((i) => next.add(i.id));
      }
      return next;
    });
    if (!allGroupSelected) {
      setLastSelectedId(groupItems[groupItems.length - 1]?.id || null);
    }
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
    setLastSelectedId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItemIds.size > 0 && !confirmBulkDeleteOpen && !hasOpenModals) {
        handleDeselectAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds.size, confirmBulkDeleteOpen, hasOpenModals]);

  const handleBulkMoveTop = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      for (const group of groupedData) {
        const groupSelected = group.items.filter((it) => selectedItemIds.has(it.id));
        if (groupSelected.length === 0) continue;
        const groupUnselected = group.items.filter((it) => !selectedItemIds.has(it.id));
        const targetSprintVal =
          group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar'
            ? ''
            : group.key;

        if (onReorderItem) {
          for (let i = 0; i < groupSelected.length; i++) {
            await onReorderItem(groupSelected[i].id, targetSprintVal, i);
          }
        } else {
          const reordered = [...groupSelected, ...groupUnselected];
          const patches = reordered.map((it, i) => ({ id: it.id, order: (i + 1) * 10 }));
          await bulkUpdateItems(patches);
        }
      }
      setSortBy('order');
      setSortAsc(true);
      showNotification(
        isEs ? `Se movieron ${count} tareas al inicio` : `Moved ${count} tasks to top`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Error al mover tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkMoveBottom = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      for (const group of groupedData) {
        const groupSelected = group.items.filter((it) => selectedItemIds.has(it.id));
        if (groupSelected.length === 0) continue;
        const groupUnselected = group.items.filter((it) => !selectedItemIds.has(it.id));
        const targetSprintVal =
          group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar'
            ? ''
            : group.key;

        if (onReorderItem) {
          const baseIndex = groupUnselected.length;
          for (let i = 0; i < groupSelected.length; i++) {
            await onReorderItem(groupSelected[i].id, targetSprintVal, baseIndex + i);
          }
        } else {
          const reordered = [...groupUnselected, ...groupSelected];
          const patches = reordered.map((it, i) => ({ id: it.id, order: (i + 1) * 10 }));
          await bulkUpdateItems(patches);
        }
      }
      setSortBy('order');
      setSortAsc(true);
      showNotification(
        isEs ? `Se movieron ${count} tareas al final` : `Moved ${count} tasks to bottom`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Error al mover tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignSprint = async (newSprint: string) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdateSprint) {
        for (const id of ids) {
          await onUpdateSprint(id, newSprint);
        }
      } else {
        await bulkUpdateItems(
          ids.map((id) => ({
            id,
            sprint: newSprint,
            targetSprint: newSprint,
            sprints: newSprint ? [newSprint] : []
          }))
        );
      }
      showNotification(
        isEs
          ? `Se asignó sprint a ${count} tareas`
          : `Assigned sprint to ${count} tasks`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al asignar sprint', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignRelease = async (newRelease: string) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      await bulkUpdateItems(
        ids.map((id) => ({
          id,
          release: newRelease,
          targetRelease: newRelease,
          releases: newRelease ? [newRelease] : []
        }))
      );
      showNotification(
        isEs
          ? `Se asignó release a ${count} tareas`
          : `Assigned release to ${count} tasks`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al asignar release', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkChangeStatus = async (newStatus: ItemStatus) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdateStatus) {
        for (const id of ids) {
          await onUpdateStatus(id, newStatus);
        }
      } else {
        await bulkUpdateItems(ids.map((id) => ({ id, status: newStatus })));
      }
      showNotification(
        isEs
          ? `Se cambió el estado de ${count} tareas a ${newStatus}`
          : `Updated status of ${count} tasks to ${newStatus}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al cambiar estado', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkChangePriority = async (newPriority: Priority) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdatePriority) {
        for (const id of ids) {
          await onUpdatePriority(id, newPriority);
        }
      } else {
        await bulkUpdateItems(ids.map((id) => ({ id, priority: newPriority })));
      }
      showNotification(
        isEs
          ? `Se cambió la prioridad de ${count} tareas a ${newPriority.toUpperCase()}`
          : `Updated priority of ${count} tasks to ${newPriority.toUpperCase()}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al cambiar prioridad', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      for (const id of ids) {
        if (onDeleteItem) {
          await onDeleteItem(id);
        } else {
          await deleteItem(id);
        }
      }
      showNotification(
        isEs ? `Se movieron ${count} tareas a la papelera` : `Moved ${count} tasks to trash`,
        'info'
      );
      setConfirmBulkDeleteOpen(false);
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return {
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
  };
}
