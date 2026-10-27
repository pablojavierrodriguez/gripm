import { useState, useEffect } from 'react';
import type { BacklogItem, Sprint } from '../../types';
import type { TimeScale, ResolvedDateRange, DragState, ActionFeedback, ItemCoordinates } from './types';
import { addDays, formatDisplayDate } from './dateEngine';
import { useTranslation } from '../../utils/i18n';

interface UseTimelineDragOptions {
  scale: TimeScale;
  sortedSprints: Sprint[];
  pxPerDay: number;
  onClickItem: (item: BacklogItem) => void;
  onUpdateItem?: (itemData: Partial<BacklogItem>) => Promise<void> | void;
}

export function useTimelineDrag({
  scale,
  sortedSprints,
  pxPerDay,
  onClickItem,
  onUpdateItem
}: UseTimelineDragOptions) {
  const { t } = useTranslation();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setActionFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: BacklogItem,
    range: ResolvedDateRange,
    initialCoords: ItemCoordinates,
    mode: 'move' | 'resize-start' | 'resize-end' = 'move'
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      itemId: item.id,
      item,
      originalRange: range,
      startX: e.clientX,
      currentX: e.clientX,
      deltaX: 0,
      mode,
      initialLeftPx: initialCoords.leftPx,
      widthPx: initialCoords.widthPx
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const delta = e.clientX - dragState.startX;

    let targetIdx: number | undefined;
    if (scale === 'sprints') {
      const colWidth = 280;
      const centerPos = dragState.initialLeftPx + delta + (dragState.widthPx / 2);
      targetIdx = Math.max(0, Math.min(sortedSprints.length - 1, Math.floor(centerPos / colWidth)));
    }

    setDragState((prev) => (prev ? {
      ...prev,
      currentX: e.clientX,
      deltaX: delta,
      targetSprintIndex: targetIdx
    } : null));
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const { item, originalRange, deltaX, mode, targetSprintIndex } = dragState;
    setDragState(null);

    // If delta is tiny, consider it a click to open modal
    if (Math.abs(deltaX) < 6) {
      onClickItem(item);
      return;
    }

    if (!onUpdateItem) return;

    if (scale === 'sprints') {
      if (targetSprintIndex !== undefined && sortedSprints[targetSprintIndex]) {
        const targetSprint = sortedSprints[targetSprintIndex];
        if (targetSprint.status === 'completed') {
          setActionFeedback({
            message: t('roadmap.sprintInactiveWarning', { sprint: targetSprint.name }) || `El sprint '${targetSprint.name}' está completado.`,
            type: 'warn'
          });
          return;
        }

        await onUpdateItem({
          id: item.id,
          sprint: targetSprint.name,
          targetSprint: targetSprint.name,
          sprints: [targetSprint.name]
        });

        setActionFeedback({
          message: t('roadmap.assignSprintSuccess', { sprint: targetSprint.name }) || `Reasignado a ${targetSprint.name}`,
          type: 'success'
        });
      }
      return;
    }

    // Months or Quarters scale
    const deltaDays = Math.round(deltaX / Math.max(1, pxPerDay));
    if (deltaDays === 0) return;

    if (mode === 'move') {
      const newStart = addDays(originalRange.startDate, deltaDays);
      const newDue = addDays(originalRange.dueDate, deltaDays);
      await onUpdateItem({
        id: item.id,
        startDate: newStart,
        dueDate: newDue
      });
      setActionFeedback({
        message: t('roadmap.datesUpdated', { start: formatDisplayDate(newStart), due: formatDisplayDate(newDue) }) || `Fechas: ${newStart} al ${newDue}`,
        type: 'success'
      });
    } else if (mode === 'resize-end') {
      const newDue = addDays(originalRange.dueDate, deltaDays);
      if (newDue >= originalRange.startDate) {
        await onUpdateItem({
          id: item.id,
          dueDate: newDue
        });
        setActionFeedback({
          message: `Fecha límite actualizada: ${formatDisplayDate(newDue)}`,
          type: 'success'
        });
      }
    } else if (mode === 'resize-start') {
      const newStart = addDays(originalRange.startDate, deltaDays);
      if (newStart <= originalRange.dueDate) {
        await onUpdateItem({
          id: item.id,
          startDate: newStart
        });
        setActionFeedback({
          message: `Fecha de inicio actualizada: ${formatDisplayDate(newStart)}`,
          type: 'success'
        });
      }
    }
  };

  return {
    dragState,
    actionFeedback,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
