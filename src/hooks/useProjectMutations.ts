import { useCallback, useState } from 'react';
import type { BacklogItem, BoardData, ItemStatus, Priority, Project, Release, Sprint, ViewMode } from '../types';
import { SIMPLIFIED_COLUMNS, EXPANDED_COLUMNS } from '../components/KanbanBoard';
import {
  createItem,
  updateItem,
  deleteItem,
  bulkUpdateItems,
  restoreItem,
  purgeItem,
  createSprint,
  updateSprint,
  deleteSprint,
  createProject,
  deleteProject,
  restoreDemoProject,
  setActiveProjectApi,
  triggerResync,
  fetchBoardData,
  convertProjectToMd,
  convertProjectToJson,
  exportMonolithicMd,
  exportProjectJson,
  createRelease,
  deleteReleaseApi
} from '../api';
import { setStoredItem, STORAGE_KEYS } from '../utils/storage';

interface UseProjectMutationsParams {
  boardData: BoardData | null;
  setBoardData: React.Dispatch<React.SetStateAction<BoardData | null>>;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  viewMode: ViewMode;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  loadData: (silent?: boolean) => Promise<void>;
  t: (key: any, params?: any) => string;
  setPlanGuardItem: (item: BacklogItem | null) => void;
  setPlanGuardOpen: (open: boolean) => void;
}

export function useProjectMutations({
  boardData,
  setBoardData,
  selectedProjectId,
  setSelectedProjectId,
  viewMode,
  showToast,
  loadData,
  t,
  setPlanGuardItem,
  setPlanGuardOpen
}: UseProjectMutationsParams) {
  const [isResyncing, setIsResyncing] = useState(false);

  // Re-sync from project docs
  const handleResyncDocs = useCallback(async () => {
    setIsResyncing(true);
    try {
      const result = await triggerResync(selectedProjectId);
      const refreshed = await fetchBoardData();
      setBoardData(refreshed);
      showToast(
        t('app.syncDocsSuccess', { project: result.projectName || 'Project', count: result.importedCount }),
        'success'
      );
    } catch (err: any) {
      showToast(t('app.syncDocsError', { error: err.message }), 'error');
    } finally {
      setIsResyncing(false);
    }
  }, [selectedProjectId, showToast, t, setBoardData]);

  // Update Item Status & Order
  const handleUpdateStatus = useCallback(async (
    id: string, 
    newStatus: ItemStatus, 
    bypassGuard = false, 
    targetColId?: string, 
    targetIndex?: number,
    calculatedOrder?: number
  ) => {
    if (!boardData) return;
    const targetItem = boardData.items.find((i) => i.id === id);
    if (!targetItem) return;

    const statusChanged = targetItem.status !== newStatus;

    if ((newStatus === 'doing' || newStatus === 'in_progress') && statusChanged && !bypassGuard) {
      const hasSpecOrPlan = 
        (targetItem.implementationPlan && targetItem.implementationPlan.trim().length > 10) ||
        (targetItem.acceptanceCriteriaList && targetItem.acceptanceCriteriaList.length > 0) ||
        (targetItem.fix && targetItem.fix.trim().length > 10) || 
        (targetItem.description && targetItem.description.trim().length > 50) ||
        targetItem.sourceDoc;

      if (!hasSpecOrPlan) {
        setPlanGuardItem(targetItem);
        setPlanGuardOpen(true);
        return;
      }
    }

    let newOrder = calculatedOrder;

    if (newOrder === undefined) {
      let targetStatuses: ItemStatus[] = [newStatus];
      if (targetColId) {
        const cols = viewMode === 'simplificada' ? SIMPLIFIED_COLUMNS : EXPANDED_COLUMNS;
        const foundCol = cols.find(c => c.id === targetColId);
        if (foundCol) targetStatuses = foundCol.statuses;
      }

      const colItems = boardData.items
        .filter(it => targetStatuses.includes(it.status) && it.id !== id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const insertIdx = targetIndex !== undefined
        ? Math.max(0, Math.min(targetIndex, colItems.length))
        : colItems.length;

      const prevItem = insertIdx > 0 ? colItems[insertIdx - 1] : null;
      const nextItem = insertIdx < colItems.length ? colItems[insertIdx] : null;

      if (prevItem && nextItem) {
        const p = prevItem.order ?? 0;
        const n = nextItem.order ?? (p + 20);
        newOrder = n > p ? p + (n - p) / 2 : p + 1;
      } else if (nextItem) {
        newOrder = (nextItem.order ?? 10) - 10;
      } else if (prevItem) {
        newOrder = (prevItem.order ?? 0) + 10;
      } else {
        newOrder = 10;
      }
    }

    const orderChanged = targetItem.order !== newOrder;

    if (!statusChanged && !orderChanged) {
      return;
    }

    const newItems = boardData.items.map(it => {
      if (it.id === id) {
        return { ...it, status: newStatus, order: newOrder };
      }
      return it;
    });

    const prevItems = [...boardData.items];
    setBoardData((prev) => (prev ? { ...prev, items: newItems } : null));

    try {
      const updated = await updateItem(id, { status: newStatus, order: newOrder });
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) => (it.id === id ? { ...it, ...updated, order: newOrder } : it))
        };
      });
      if (statusChanged) {
        showToast(t('app.statusUpdated', { code: updated.code, status: newStatus }), 'info');
      } else if (orderChanged) {
        showToast(t('app.itemOrderUpdated', { code: targetItem.code }), 'success');
      }
    } catch (err: any) {
      setBoardData((prev) => (prev ? { ...prev, items: prevItems } : null));
      showToast(t('app.statusUpdateError', { error: err.message }), 'error');
    }
  }, [boardData, viewMode, showToast, t, setPlanGuardItem, setPlanGuardOpen, setBoardData]);

  const handleConfirmStartWithPlan = useCallback(async (itemId: string, updatedPlan?: string) => {
    if (!boardData) return;
    const updates: Partial<BacklogItem> = { status: 'doing' };
    if (updatedPlan) {
      updates.implementationPlan = updatedPlan;
      updates.fix = updatedPlan;
    }
    const updated = await updateItem(itemId, updates);
    setBoardData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? updated : it))
      };
    });
    setPlanGuardOpen(false);
    setPlanGuardItem(null);
  }, [boardData, setBoardData, setPlanGuardOpen, setPlanGuardItem]);

  const handleUpdatePriority = useCallback(async (id: string, newPriority: Priority) => {
    if (!boardData) return;
    const existing = boardData.items.find((it) => it.id === id);
    if (existing && existing.priority === newPriority) return;
    try {
      const updated = await updateItem(id, { priority: newPriority });
      setBoardData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) => (it.id === id ? updated : it))
            }
          : null
      );
      showToast(t('app.priorityUpdated', { code: updated.code, priority: newPriority.toUpperCase() }), 'info');
    } catch (err: any) {
      showToast(t('app.priorityUpdateError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  const handleReorderBacklogItem = useCallback(async (
    draggedId: string, 
    targetSprint: string, 
    targetIndex: number
  ) => {
    if (!boardData) return;
    const item = boardData.items.find((it) => it.id === draggedId);
    if (!item) return;

    const groupItems = boardData.items
      .filter((it) => {
        const itSprint = it.sprint || it.targetSprint || '';
        return itSprint === targetSprint && it.id !== draggedId;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const insertIdx = Math.max(0, Math.min(targetIndex, groupItems.length));
    
    const updatedItem = {
      ...item,
      sprint: targetSprint,
      targetSprint: targetSprint
    };
    groupItems.splice(insertIdx, 0, updatedItem);

    const orderMap = new Map<string, number>();
    groupItems.forEach((it, i) => {
      orderMap.set(it.id, (i + 1) * 10);
    });

    const newOrder = orderMap.get(draggedId) ?? item.order;

    const prevItems = [...boardData.items];
    const newItems = boardData.items.map((it) => {
      if (it.id === draggedId) {
        return { ...it, sprint: targetSprint, targetSprint: targetSprint, order: newOrder };
      }
      if (orderMap.has(it.id)) {
        return { ...it, order: orderMap.get(it.id)! };
      }
      return it;
    });

    setBoardData((prev) => (prev ? { ...prev, items: newItems } : null));

    try {
      const patches = [
        {
          id: draggedId,
          sprint: targetSprint,
          targetSprint: targetSprint,
          order: newOrder
        },
        ...Array.from(orderMap.entries())
          .filter(([id]) => id !== draggedId)
          .map(([id, ord]) => ({ id, order: ord }))
      ];
      await bulkUpdateItems(patches);
      showToast(t('app.taskOrderUpdated'), 'success');
    } catch (err: any) {
      setBoardData((prev) => (prev ? { ...prev, items: prevItems } : null));
      showToast(t('app.taskOrderUpdateError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  const handleAssignSprint = useCallback(async (item: BacklogItem, targetSprint: string) => {
    try {
      await updateItem(item.id, {
        sprint: targetSprint,
        targetSprint: targetSprint,
        sprints: targetSprint ? [targetSprint] : []
      });
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  sprint: targetSprint,
                  targetSprint: targetSprint,
                  sprints: targetSprint ? [targetSprint] : []
                }
              : i
          )
        };
      });
      showToast(targetSprint ? t('app.assignedToSprint', { sprint: targetSprint }) : t('app.returnedToBacklog'), 'success');
    } catch (err: any) {
      showToast(t('app.assignSprintError', { error: err?.message || String(err) }), 'error');
    }
  }, [showToast, t, setBoardData]);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!boardData) return;
    try {
      await deleteItem(id);
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  isDeleted: true,
                  deletedAt: new Date().toISOString(),
                  previousStatus: it.previousStatus || it.status,
                }
              : it
          ),
        };
      });
      showToast(t('app.itemMovedToTrash'), 'success');
    } catch (err: any) {
      showToast(t('app.itemMoveToTrashError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  const handleCreateSprint = useCallback(async (sprintData: Partial<Sprint>) => {
    try {
      const created = await createSprint({
        ...sprintData,
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
      });
      setBoardData((prev) => {
        if (!prev) return prev;
        const existingSprints = prev.sprints || [];
        return {
          ...prev,
          sprints: [...existingSprints, created],
        };
      });
      showToast(t('app.sprintCreated', { name: created.name }), 'success');
    } catch (err: any) {
      showToast(t('app.sprintCreateError', { error: err.message }), 'error');
    }
  }, [selectedProjectId, showToast, t, setBoardData]);

  const handleUpdateSprintMeta = useCallback(async (id: string, sprintData: Partial<Sprint>) => {
    try {
      const existing = boardData?.sprints?.find((s) => s.id === id);
      const updated = await updateSprint(id, {
        ...sprintData,
        projectId: sprintData.projectId || existing?.projectId || (selectedProjectId !== 'all' ? selectedProjectId : undefined),
      });
      setBoardData((prev) => {
        if (!prev) return prev;
        const existingSprints = prev.sprints || [];
        return {
          ...prev,
          sprints: existingSprints.map((s) => (s.id === id ? updated : s)),
        };
      });
      showToast(t('app.sprintUpdated', { name: updated.name }), 'info');
    } catch (err: any) {
      showToast(t('app.sprintUpdateError', { error: err.message }), 'error');
    }
  }, [boardData?.sprints, selectedProjectId, showToast, t, setBoardData]);

  const handleStartSprint = useCallback(async (sprint: Sprint) => {
    try {
      const updated = await updateSprint(sprint.id, {
        status: 'active',
        projectId: sprint.projectId || (selectedProjectId !== 'all' ? selectedProjectId : undefined),
      });
      setBoardData((prev) => {
        if (!prev) return prev;
        const existingSprints = prev.sprints || [];
        return {
          ...prev,
          sprints: existingSprints.map((s) => {
            if (s.id === sprint.id) return updated;
            if (s.status === 'active') return { ...s, status: 'completed' as const };
            return s;
          }),
        };
      });
      showToast(t('app.sprintStarted', { name: sprint.name }), 'success');
    } catch (err: any) {
      showToast(t('app.sprintStartError', { error: err.message }), 'error');
    }
  }, [selectedProjectId, showToast, t, setBoardData]);

  const handleCompleteSprint = useCallback(async (sprint: Sprint, destinationSprintName: string, retroData?: any) => {
    try {
      const updatedSprint = await updateSprint(sprint.id, {
        status: 'completed',
        projectId: sprint.projectId || (selectedProjectId !== 'all' ? selectedProjectId : undefined),
        retro: retroData
      } as any);
      
      const sprintPendingItems = (boardData?.items || []).filter(
        (i) => (i.sprint === sprint.name || i.targetSprint === sprint.name) &&
               !(i.status === 'done' || i.status === 'ready' || i.status === 'finish')
      );

      const sprintPatches: Array<{ id: string } & Partial<BacklogItem>> = [];
      for (const item of sprintPendingItems) {
        const existingSprints = item.sprints || [sprint.name];
        const updatedSprints = Array.from(new Set([...existingSprints, sprint.name, ...(destinationSprintName ? [destinationSprintName] : [])]));
        sprintPatches.push({
          id: item.id,
          sprint: destinationSprintName || '',
          targetSprint: destinationSprintName || '',
          sprints: updatedSprints
        });
      }

      const sprintDoneItems = (boardData?.items || []).filter(
        (i) => (i.sprint === sprint.name || i.targetSprint === sprint.name) &&
               (i.status === 'done' || i.status === 'ready' || i.status === 'finish')
      );

      for (const item of sprintDoneItems) {
        const existingSprints = item.sprints || [sprint.name];
        if (!existingSprints.includes(sprint.name)) {
          sprintPatches.push({
            id: item.id,
            sprints: [...existingSprints, sprint.name]
          });
        }
      }

      if (sprintPatches.length > 0) {
        await bulkUpdateItems(sprintPatches);
      }

      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sprints: (prev.sprints || []).map((s) => (s.id === sprint.id ? updatedSprint : s)),
          items: prev.items.map((i) => {
            const isPendingInThisSprint = (i.sprint === sprint.name || i.targetSprint === sprint.name) &&
              !(i.status === 'done' || i.status === 'ready' || i.status === 'finish');
            if (isPendingInThisSprint) {
              const prevSp = i.sprints || [sprint.name];
              const nextSp = Array.from(new Set([...prevSp, sprint.name, ...(destinationSprintName ? [destinationSprintName] : [])]));
              return { 
                ...i, 
                sprint: destinationSprintName || '', 
                targetSprint: destinationSprintName || '',
                sprints: nextSp 
              };
            }
            if (i.sprint === sprint.name || i.targetSprint === sprint.name) {
              const prevSp = i.sprints || [sprint.name];
              return { ...i, sprints: Array.from(new Set([...prevSp, sprint.name])) };
            }
            return i;
          }),
        };
      });

      const destMsg = destinationSprintName ? t('app.toSprint', { sprint: destinationSprintName }) : t('app.toBacklog');
      showToast(t('app.sprintCompleted', { name: sprint.name, count: sprintPendingItems.length, dest: destMsg }), 'success');
    } catch (err: any) {
      showToast(t('app.sprintCompleteError', { error: err.message }), 'error');
    }
  }, [boardData?.items, selectedProjectId, showToast, t, setBoardData]);

  const handleDeleteSprint = useCallback(async (id: string) => {
    try {
      const sprintToDelete = boardData?.sprints?.find((s) => s.id === id);
      const targetProjectId = sprintToDelete?.projectId || (selectedProjectId !== 'all' ? selectedProjectId : undefined);
      await deleteSprint(id, targetProjectId);
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sprints: (prev.sprints || []).filter((s) => s.id !== id),
          items: prev.items.map((i) => {
            if (sprintToDelete && (i.sprint === sprintToDelete.name || i.targetSprint === sprintToDelete.name)) {
              return { ...i, sprint: '', targetSprint: '' };
            }
            return i;
          }),
        };
      });
      showToast(t('app.sprintDeleted'), 'info');
    } catch (err: any) {
      showToast(t('app.sprintDeleteError', { error: err.message }), 'error');
    }
  }, [boardData?.sprints, selectedProjectId, showToast, t, setBoardData]);

  const handleSaveItem = useCallback(async (itemData: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean }) => {
    if (!boardData) return;
    if (itemData.id) {
      const updated = await updateItem(itemData.id, itemData);
      setBoardData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) => (it.id === updated.id ? updated : it))
            }
          : null
      );
      showToast(t('app.itemSaved', { code: updated.code }), 'success');
    } else {
      const created = await createItem({
        ...itemData,
        projectId: itemData.projectId || (selectedProjectId === 'all' ? (boardData?.projects[0]?.id || '') : selectedProjectId)
      });
      setBoardData((prev) =>
        prev
          ? {
              ...prev,
              items: [created, ...prev.items]
            }
          : null
      );
      showToast(t('app.itemCreated', { code: created.code }), 'success');
    }
  }, [boardData, selectedProjectId, showToast, t, setBoardData]);

  const handleUnlinkChildTask = useCallback(async (childId: string) => {
    if (!boardData) return;
    const child = boardData.items.find((i) => i.id === childId || i.code === childId);
    if (!child) return;
    try {
      const updated = await updateItem(child.id, { parentId: '' });
      setBoardData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) => (it.id === child.id ? updated : it)),
            }
          : null
      );
      showToast(`${t('itemModal.unlinkChild')}: ${child.code || child.id}`, 'info');
    } catch (err: any) {
      showToast(t('app.genericError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  const handleCreateTaskFromAction = useCallback(async (title: string) => {
    try {
      await handleSaveItem({
        title,
        description: 'Acción derivada de retrospectiva de sprint.',
        type: 'feature',
        priority: 'p2',
        status: 'draft'
      });
      showToast(t('app.taskFromRetroCreated'), 'success');
    } catch (err: any) {
      showToast(t('app.taskFromRetroError', { error: err.message }), 'error');
    }
  }, [handleSaveItem, showToast, t]);

  const handleCreateProject = useCallback(async (projectData: Partial<Project>) => {
    const created = await createProject(projectData);
    setBoardData((prev) =>
      prev
        ? {
            ...prev,
            projects: [...prev.projects, created]
          }
        : null
    );
    setSelectedProjectId(created.id);
    showToast(t('app.projectCreated', { name: created.name }), 'success');
  }, [showToast, t, setBoardData, setSelectedProjectId]);

  const handleDeleteProject = useCallback(async (id: string) => {
    try {
      await deleteProject(id);
      showToast(t('app.projectUnlinked'), 'info');
      const refreshed = await fetchBoardData();
      setBoardData(refreshed);
      if (selectedProjectId === id || refreshed.projects.length <= 1) {
        const remaining = refreshed.projects.filter(p => p.id !== id);
        const fallbackId = refreshed.activeProjectId || remaining[0]?.id || '';
        setSelectedProjectId(fallbackId);
        if (fallbackId) {
          setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, fallbackId);
        }
      }
    } catch (err: any) {
      showToast(t('app.projectUnlinkError', { error: err.message }), 'error');
    }
  }, [selectedProjectId, showToast, t, setBoardData, setSelectedProjectId]);

  const handleRestoreDemo = useCallback(async () => {
    try {
      await restoreDemoProject();
      setSelectedProjectId('demo');
      setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, 'demo');
      await setActiveProjectApi('demo');
      showToast(t('app.demoRestored'), 'success');
      const refreshed = await fetchBoardData();
      setBoardData(refreshed);
    } catch (err: any) {
      showToast(t('app.demoRestoreError', { error: err.message }), 'error');
    }
  }, [showToast, t, setSelectedProjectId, setBoardData]);

  const handleConvertToMd = useCallback(async (projId: string) => {
    try {
      const res = await convertProjectToMd(projId);
      showToast(res.message, 'success');
      await loadData();
    } catch (err: any) {
      showToast(t('app.convertToMdError', { error: err.message }), 'error');
    }
  }, [loadData, showToast, t]);

  const handleConvertToJson = useCallback(async (projId: string) => {
    try {
      const res = await convertProjectToJson(projId);
      showToast(res.message, 'success');
      await loadData();
    } catch (err: any) {
      showToast(t('app.convertToJsonError', { error: err.message }), 'error');
    }
  }, [loadData, showToast, t]);

  const handleExportMonolithic = useCallback(async (projId: string) => {
    try {
      const res = await exportMonolithicMd(projId, false);
      const blob = new Blob([res.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BACKLOG.md';
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('app.reportDownloaded'), 'success');
    } catch (err: any) {
      showToast(t('app.reportError', { error: err.message }), 'error');
    }
  }, [showToast, t]);

  const handleExportJson = useCallback(async (projId: string) => {
    try {
      const res = await exportProjectJson(projId);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.project.codePrefix.toLowerCase()}-backlog.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('app.backupDownloaded'), 'success');
    } catch (err: any) {
      showToast(t('app.backupError', { error: err.message }), 'error');
    }
  }, [showToast, t]);

  const handleArchiveRelease = useCallback(async (releaseData: Partial<Release>, itemCodes: string[]) => {
    const created = await createRelease(releaseData, itemCodes);
    await loadData();
    const actionMsg = releaseData.status === 'unreleased' 
      ? t('app.releaseSavedPrep', { version: created.version })
      : t('app.releaseReleased', { version: created.version });
    showToast(actionMsg, 'success');
  }, [loadData, showToast, t]);

  const handleDeleteRelease = useCallback(async (releaseId: string) => {
    try {
      await deleteReleaseApi(releaseId);
      await loadData();
      showToast(t('app.releaseDeleted'), 'info');
    } catch (err: any) {
      showToast(t('app.releaseDeleteError', { error: err.message }), 'error');
    }
  }, [loadData, showToast, t]);

  const handleRestoreFromTrash = useCallback(async (id: string) => {
    if (!boardData) return;
    try {
      await restoreItem(id);
      const item = boardData.items.find((it) => it.id === id);
      const prevStatus = item?.previousStatus || item?.status || ('draft' as ItemStatus);
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === id
              ? { ...it, status: prevStatus, isDeleted: undefined, deletedAt: undefined, previousStatus: undefined }
              : it
          ),
        };
      });
      showToast(t('app.itemRestored'), 'success');
    } catch (err: any) {
      showToast(t('app.itemRestoreError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  const handlePurgeItem = useCallback(async (id: string) => {
    if (!boardData) return;
    try {
      await purgeItem(id);
      setBoardData((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((it) => it.id !== id) };
      });
      showToast(t('app.itemPurged'), 'success');
    } catch (err: any) {
      showToast(t('app.itemPurgeError', { error: err.message }), 'error');
    }
  }, [boardData, showToast, t, setBoardData]);

  return {
    isResyncing,
    handleResyncDocs,
    handleUpdateStatus,
    handleConfirmStartWithPlan,
    handleUpdatePriority,
    handleReorderBacklogItem,
    handleAssignSprint,
    handleDeleteItem,
    handleCreateSprint,
    handleUpdateSprintMeta,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleSaveItem,
    handleUnlinkChildTask,
    handleCreateTaskFromAction,
    handleCreateProject,
    handleDeleteProject,
    handleRestoreDemo,
    handleConvertToMd,
    handleConvertToJson,
    handleExportMonolithic,
    handleExportJson,
    handleArchiveRelease,
    handleDeleteRelease,
    handleRestoreFromTrash,
    handlePurgeItem
  };
}
