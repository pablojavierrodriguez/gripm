import { useState, useCallback } from 'react';
import type { BacklogItem, ItemStatus, ColumnConfig } from '../../types';

interface UseKanbanDragAndDropOptions {
  items: BacklogItem[];
  onUpdateStatus: (
    id: string,
    newStatus: ItemStatus,
    targetColId?: string,
    targetIndex?: number,
    calculatedOrder?: number
  ) => void;
}

export function useKanbanDragAndDrop({ items, onUpdateStatus }: UseKanbanDragAndDropOptions) {
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

  const handleDragStart = useCallback((e: React.DragEvent, item: BacklogItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    window.setTimeout(() => {
      setDraggedItemId(item.id);
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setActiveDropColumn(null);
    setDropTarget(null);
    setActiveSubDropTargetStatus(null);
  }, []);

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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (activeDropColumn === columnId) {
        setActiveDropColumn(null);
        setDropTarget(null);
        setActiveSubDropTargetStatus(null);
      }
    }
  };

  const handleCardDragOver = (
    e: React.DragEvent,
    colId: string,
    index: number,
    targetItem?: BacklogItem
  ) => {
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
    setDropTarget((prev) => {
      if (
        prev?.colId === colId &&
        prev?.index === targetIdx &&
        prev?.targetItemId === targetItem?.id &&
        prev?.isAbove === isAbove
      ) {
        return prev;
      }
      return {
        colId,
        index: targetIdx,
        targetItemId: targetItem?.id,
        isAbove
      };
    });
  };

  const handleMoveWithinColumn = useCallback((
    item: BacklogItem,
    col: ColumnConfig,
    colItems: BacklogItem[],
    direction: 'up' | 'down' | 'top' | 'bottom'
  ) => {
    const idx = colItems.findIndex((i) => i.id === item.id);
    if (idx < 0) return;

    if (direction === 'top') {
      if (idx === 0) return;
      const firstItem = colItems[0];
      const firstOrder = firstItem.order ?? 10;
      const nextOrder = firstOrder - 10;
      onUpdateStatus(item.id, item.status, col.id, undefined, nextOrder);
      return;
    }

    if (direction === 'bottom') {
      if (idx === colItems.length - 1) return;
      const lastItem = colItems[colItems.length - 1];
      const lastOrder = lastItem.order ?? (colItems.length * 10);
      const nextOrder = lastOrder + 10;
      onUpdateStatus(item.id, item.status, col.id, undefined, nextOrder);
      return;
    }

    const neighbourIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighbourIdx < 0 || neighbourIdx >= colItems.length) return;

    const neighbour = colItems[neighbourIdx];
    const beyondIdx = direction === 'up' ? idx - 2 : idx + 2;
    const beyond = beyondIdx >= 0 && beyondIdx < colItems.length ? colItems[beyondIdx] : null;

    const neighbourOrder = neighbour.order ?? (neighbourIdx + 1) * 10;
    let nextOrder: number;

    if (beyond) {
      const beyondOrder = beyond.order ?? (beyondIdx + 1) * 10;
      nextOrder =
        direction === 'up'
          ? (beyondOrder < neighbourOrder
              ? beyondOrder + (neighbourOrder - beyondOrder) / 2
              : neighbourOrder + 5)
          : (beyondOrder > neighbourOrder
              ? neighbourOrder + (beyondOrder - neighbourOrder) / 2
              : neighbourOrder - 5);
    } else {
      nextOrder = direction === 'up' ? neighbourOrder - 10 : neighbourOrder + 10;
    }

    onUpdateStatus(item.id, item.status, col.id, undefined, nextOrder);
  }, [onUpdateStatus]);

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

      const idx = specificIndex !== undefined
        ? specificIndex
        : (dropTarget?.colId === col.id ? dropTarget.index : undefined);

      onUpdateStatus(itemId, newStatus, col.id, idx, calculatedOrder);
    }
    setDraggedItemId(null);
    setActiveDropColumn(null);
    setDropTarget(null);
  };

  return {
    draggedItemId,
    setDraggedItemId,
    activeDropColumn,
    setActiveDropColumn,
    dropTarget,
    setDropTarget,
    activeSubDropTargetStatus,
    setActiveSubDropTargetStatus,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleCardDragOver,
    handleDrop,
    handleMoveWithinColumn
  };
}
