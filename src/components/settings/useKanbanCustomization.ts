import { useState } from 'react';
import type { ColumnConfig, GripmConfig, ItemStatus } from '../../types';
import { EXPANDED_COLUMNS, SIMPLIFIED_BASE_COLUMNS } from '../KanbanBoard';

export interface UseKanbanCustomizationProps {
  config: GripmConfig;
  onShowToast?: (msg: string, type?: any) => void;
  t: any;
}

export function useKanbanCustomization({ config, onShowToast, t }: UseKanbanCustomizationProps) {
  const [kanbanEditMode, setKanbanEditMode] = useState<'ampliada' | 'simplificada'>('ampliada');
  const [customColumns, setCustomColumns] = useState<ColumnConfig[]>(() => {
    if (config.kanban?.columns && config.kanban.columns.length > 0) {
      return JSON.parse(JSON.stringify(config.kanban.columns));
    }
    return JSON.parse(JSON.stringify(EXPANDED_COLUMNS));
  });
  const [customSimplifiedColumns, setCustomSimplifiedColumns] = useState<ColumnConfig[]>(() => {
    if (config.kanban?.simplifiedColumns && config.kanban.simplifiedColumns.length > 0) {
      return JSON.parse(JSON.stringify(config.kanban.simplifiedColumns));
    }
    return JSON.parse(JSON.stringify(SIMPLIFIED_BASE_COLUMNS));
  });
  const [wipLimits, setWipLimits] = useState<Record<string, number>>(config.kanban?.wipLimits || {});

  const [draggingStatus, setDraggingStatus] = useState<{ status: ItemStatus; fromColId: string } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const activeColumnsList = kanbanEditMode === 'ampliada' ? customColumns : customSimplifiedColumns;
  const setActiveColumnsList = (cols: ColumnConfig[]) => {
    if (kanbanEditMode === 'ampliada') {
      setCustomColumns(cols);
    } else {
      setCustomSimplifiedColumns(cols);
    }
  };

  const handleMoveColumn = (index: number, direction: 'left' | 'right' | 'up' | 'down') => {
    const targetIdx = (direction === 'left' || direction === 'up') ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeColumnsList.length) return;
    const updated = [...activeColumnsList];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setActiveColumnsList(updated);
  };

  const handleUpdateColumnField = (index: number, field: keyof ColumnConfig, value: any) => {
    const updated = [...activeColumnsList];
    updated[index] = { ...updated[index], [field]: value };
    setActiveColumnsList(updated);
  };

  const handleRemoveStatusFromColumn = (colId: string, statusToRemove: ItemStatus) => {
    const list = activeColumnsList.map((col) => {
      if (col.id === colId) {
        const nextStatuses = col.statuses.filter((s) => s !== statusToRemove);
        const nextDropTarget = col.dropTargetStatus === statusToRemove
          ? (nextStatuses[0] || 'draft')
          : col.dropTargetStatus;
        return {
          ...col,
          statuses: nextStatuses,
          dropTargetStatus: nextDropTarget
        };
      }
      return col;
    });
    setActiveColumnsList(list);
  };

  const handleAddStatusToColumn = (colId: string, statusToAdd: ItemStatus) => {
    const list = activeColumnsList.map((col) => {
      if (col.id === colId) {
        if (!col.statuses.includes(statusToAdd)) {
          return {
            ...col,
            statuses: [...col.statuses, statusToAdd],
            dropTargetStatus: col.dropTargetStatus || statusToAdd
          };
        }
      } else if (col.statuses.includes(statusToAdd)) {
        const remaining = col.statuses.filter((s) => s !== statusToAdd);
        return {
          ...col,
          statuses: remaining,
          dropTargetStatus: col.dropTargetStatus === statusToAdd ? (remaining[0] || 'draft') : col.dropTargetStatus
        };
      }
      return col;
    });
    setActiveColumnsList(list);
  };

  const handleMoveStatusToColumn = (toColId: string) => {
    if (!draggingStatus || draggingStatus.fromColId === toColId) return;
    handleAddStatusToColumn(toColId, draggingStatus.status);
    setDraggingStatus(null);
    setDragOverColId(null);
  };

  const handleResetColumns = () => {
    if (kanbanEditMode === 'ampliada') {
      setCustomColumns(JSON.parse(JSON.stringify(EXPANDED_COLUMNS)));
      onShowToast?.(t('settings.toastColsResetExpanded'), 'info');
    } else {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(SIMPLIFIED_BASE_COLUMNS)));
      onShowToast?.(t('settings.toastColsResetSimple'), 'info');
    }
  };

  const syncColumnsFromConfig = (cfg: GripmConfig) => {
    if (cfg.kanban?.columns && cfg.kanban.columns.length > 0) {
      setCustomColumns(JSON.parse(JSON.stringify(cfg.kanban.columns)));
    } else {
      setCustomColumns(JSON.parse(JSON.stringify(EXPANDED_COLUMNS)));
    }
    if (cfg.kanban?.simplifiedColumns && cfg.kanban.simplifiedColumns.length > 0) {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(cfg.kanban.simplifiedColumns)));
    } else {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(SIMPLIFIED_BASE_COLUMNS)));
    }
    setWipLimits(cfg.kanban?.wipLimits || {});
  };

  return {
    kanbanEditMode,
    setKanbanEditMode,
    customColumns,
    setCustomColumns,
    customSimplifiedColumns,
    setCustomSimplifiedColumns,
    wipLimits,
    setWipLimits,
    draggingStatus,
    setDraggingStatus,
    dragOverColId,
    setDragOverColId,
    activeColumnsList,
    handleMoveColumn,
    handleUpdateColumnField,
    handleRemoveStatusFromColumn,
    handleAddStatusToColumn,
    handleMoveStatusToColumn,
    handleResetColumns,
    syncColumnsFromConfig,
  };
}
