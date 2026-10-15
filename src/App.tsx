import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import type { 
  BacklogItem, 
  BoardData, 
  FilterState, 
  ItemStatus, 
  Priority, 
  Project, 
  Release, 
  ViewMode,
  GripmConfig,
  ActiveTab,
  Sprint
} from './types';
import { isSprintModuleActive, isReleaseModuleActive, isTimelineModuleActive } from './types';
// DEV-222: solo se usa para etiquetar el Header. `loadData` ya espera `ensureAdapter()`
// a través de la fachada de `./api`, así que para el primer render ya está resuelto.
import { isSandboxMode } from './data/detect';
import { 
  fetchBoardData, 
  createItem, 
  updateItem, 
  deleteItem, 
  createProject, 
  deleteProject,
  createRelease, 
  triggerResync,
  convertProjectToMd,
  convertProjectToJson,
  exportMonolithicMd,
  exportProjectJson,
  restoreDemoProject,
  deleteReleaseApi,
  subscribeToBoardEvents,
  setActiveProjectApi,
  fetchSettings,
  saveSettings,
  createSprint,
  updateSprint,
  deleteSprint,
  restoreItem,
  purgeItem
} from './api';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard, SIMPLIFIED_COLUMNS, EXPANDED_COLUMNS } from './components/KanbanBoard';
import { SprintView } from './components/SprintView';
import { TimelineView } from './components/TimelineView';
import { ItemModal } from './components/ItemModal';
import { ProjectModal } from './components/ProjectModal';
import { PlanGuardModal } from './components/PlanGuardModal';
import { ImportWizardModal } from './components/ImportWizardModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TrashView } from './components/TrashView';
import { MetricsView } from './components/MetricsView';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AlertTriangle, LayoutGrid, Target, Rocket, Trash2, Sparkles, Code2, Download, Calendar, BarChart2 } from 'lucide-react';
import { useTranslation } from './utils/i18n';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from './utils/storage';

type AppActiveTab = ActiveTab | 'metrics';

const ReleaseAssembler = lazy(() => import('./components/ReleaseAssembler').then(m => ({ default: m.ReleaseAssembler })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[300px] text-slate-400 dark:text-slate-500 text-xs gap-2">
    <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
  </div>
);

export function App() {
  const { t, setLanguage } = useTranslation();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (!boardData) return;
    if (boardData.singleProject) return;
    if (selectedProjectId && selectedProjectId !== 'all') {
      setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, selectedProjectId);
      setActiveProjectApi(selectedProjectId).catch(() => {});
    }
  }, [selectedProjectId, boardData]);
  const [activeTab, setActiveTab] = useState<AppActiveTab>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.ACTIVE_TAB) as AppActiveTab | null;
      if (saved === 'archive') return 'trash';
      if (saved === 'kanban' || saved === 'sprint' || saved === 'release' || saved === 'trash' || saved === 'settings' || saved === 'timeline' || saved === 'metrics') return saved;
    } catch {}
    return 'kanban';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('simplificada');

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  // Theme state: default dark mode, persist in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = getStoredItem(STORAGE_KEYS.THEME);
    return saved ? saved !== 'light' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    setStoredItem(STORAGE_KEYS.THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleToggleTheme = useCallback(() => {
    const applyThemeToggle = () => {
      setIsDarkMode((prev) => {
        const nextDark = !prev;
        setConfig((prevCfg) => prevCfg ? { ...prevCfg, theme: nextDark ? 'dark' : 'light' } : prevCfg);
        return nextDark;
      });
    };

    // Respeta la preferencia del sistema: cambio instantaneo, sin animacion.
    const prefersReducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      applyThemeToggle();
      return;
    }

    const root = typeof document !== 'undefined'
      ? document.documentElement
      : null;
    const doc = typeof document !== 'undefined'
      ? (document as Document & {
          startViewTransition?: (cb: () => void) => { finished: Promise<void> };
        })
      : null;

    if (doc?.startViewTransition) {
      // Suspende las transiciones CSS por debajo del crossfade (ver index.css).
      root?.classList.add('theme-animating');
      const transition = doc.startViewTransition(() => {
        flushSync(() => {
          applyThemeToggle();
        });
      });
      // cleanup garantizado tanto en exito como en error
      transition.finished
        .catch(() => {})
        .finally(() => root?.classList.remove('theme-animating'));
    } else {
      // Fallback: CSS transitions only when View Transitions API is not available
      root?.classList.add('theme-transitioning');
      window.setTimeout(() => {
        root?.classList.remove('theme-transitioning');
      }, 350);
      applyThemeToggle();
    }
  }, []);

  // Filters
  const [filters, setFilters] = useState<FilterState>(() => {
    let initialIdeas = false;
    try {
      const stored = getStoredItem(STORAGE_KEYS.KANBAN_SHOW_IDEAS);
      if (stored !== null) initialIdeas = JSON.parse(stored);
    } catch {}
    return {
      search: '',
      type: 'all',
      types: [],
      priority: 'all',
      priorities: [],
      statuses: [],
      includeIdeas: initialIdeas,
      includePreviousDone: false,
      includeDismissedCancelled: false,
      module: 'all',
      modules: [],
      sprint: 'all',
      sprints: [],
      release: 'all',
      releases: [],
    };
  });

  // Modals & Popups
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [defaultNewStatus, setDefaultNewStatus] = useState<ItemStatus>('draft');
  const [defaultNewSprint, setDefaultNewSprint] = useState<string>('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Settings / Config State (DEV-006 & DEV-009)
  const [config, setConfig] = useState<GripmConfig>({});

  // Computed tab visibility helpers (DEV-218, DEV-241: Decoupled module capability vs UI visible tabs)
  const isSprintModule = isSprintModuleActive(config);
  const isReleaseModule = isReleaseModuleActive(config);

  const isKanbanTabEnabled = true;

  const isSprintTabEnabled = isSprintModule && (config?.enabledTabs?.sprint !== undefined
    ? config.enabledTabs.sprint
    : config?.methodology === 'scrum' || config?.methodology === 'scrumban');

  const isReleaseTabEnabled = isReleaseModule && (config?.enabledTabs?.release !== false);
  const isTimelineTabEnabled = isTimelineModuleActive(config) && (config?.enabledTabs?.timeline !== false);
  const isMetricsTabEnabled = (config?.enabledTabs as any)?.metrics !== false;

  // Auto-redirect activeTab if current tab became disabled
  useEffect(() => {
    if (activeTab === 'kanban' && !isKanbanTabEnabled) {
      const fallback = isSprintTabEnabled ? 'sprint' : (isReleaseTabEnabled ? 'release' : 'settings');
      setActiveTab(fallback);
    } else if (activeTab === 'sprint' && !isSprintTabEnabled) {
      const fallback = isKanbanTabEnabled ? 'kanban' : (isReleaseTabEnabled ? 'release' : 'settings');
      setActiveTab(fallback);
    } else if (activeTab === 'release' && !isReleaseTabEnabled) {
      const fallback = isKanbanTabEnabled ? 'kanban' : (isSprintTabEnabled ? 'sprint' : 'settings');
      setActiveTab(fallback);
    } else if (activeTab === 'timeline' && !isTimelineTabEnabled) {
      const fallback = isKanbanTabEnabled ? 'kanban' : (isSprintTabEnabled ? 'sprint' : 'settings');
      setActiveTab(fallback);
    } else if (activeTab === 'metrics' && !isMetricsTabEnabled) {
      const fallback = isKanbanTabEnabled ? 'kanban' : (isSprintTabEnabled ? 'sprint' : 'settings');
      setActiveTab(fallback);
    }
  }, [activeTab, isKanbanTabEnabled, isSprintTabEnabled, isReleaseTabEnabled, isTimelineTabEnabled, isMetricsTabEnabled]);

  const loadSettings = useCallback(async (projId?: string) => {
    try {
      const cfg = await fetchSettings(projId && projId !== 'all' ? projId : undefined);
      if (cfg.theme) {
        // La eleccion explicita del usuario tiene prioridad sobre la config
        // del proyecto: de lo contrario recargar reverte al tema del proyecto.
        const userChoice = getStoredItem(STORAGE_KEYS.THEME);
        if (userChoice !== 'dark' && userChoice !== 'light') {
          setIsDarkMode(cfg.theme === 'dark');
        } else {
          cfg.theme = userChoice as 'dark' | 'light';
        }
      }
      setConfig(cfg);
      if (cfg.locale && (cfg.locale === 'es' || cfg.locale === 'en')) {
        setLanguage(cfg.locale);
      }
    } catch (err: any) {
      console.warn('[gripm] Failed to load config:', err.message);
    }
  }, [setLanguage]);

  const handleSaveConfig = useCallback(async (newConfig: GripmConfig) => {
    const saved = await saveSettings(
      newConfig, 
      selectedProjectId !== 'all' ? selectedProjectId : undefined
    );
    setConfig(saved);
    if (saved.locale && (saved.locale === 'es' || saved.locale === 'en')) {
      setLanguage(saved.locale);
    }
    if (saved.theme) {
      if (saved.theme === 'system') {
        const systemDark = typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
        setIsDarkMode(systemDark);
      } else if (saved.theme === 'dark' || saved.theme === 'light') {
        setIsDarkMode(saved.theme === 'dark');
      }
    }
  }, [selectedProjectId, setLanguage]);

  // Plan Guard Modal (validates plan/spec before in_progress)
  const [planGuardOpen, setPlanGuardOpen] = useState(false);
  const [planGuardItem, setPlanGuardItem] = useState<BacklogItem | null>(null);

  // Syncing & Notifications
  const [isResyncing, setIsResyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleUpdateColumnTitle = useCallback(async (colId: string, newTitle: string) => {
    if (!config) return;
    const currentColumns = config.kanban?.columns || (viewMode === 'simplificada' ? SIMPLIFIED_COLUMNS : EXPANDED_COLUMNS);
    const updatedCols = currentColumns.map((col) => {
      if (col.id === colId) {
        return { ...col, title: newTitle };
      }
      return col;
    });

    const updatedConfig: GripmConfig = {
      ...config,
      kanban: {
        ...config.kanban,
        columns: updatedCols
      }
    };

    try {
      await handleSaveConfig(updatedConfig);
      showToast(`Columna actualizada a "${newTitle}"`, 'success');
    } catch (err: any) {
      showToast(`Error al actualizar columna: ${err.message}`, 'error');
    }
  }, [config, viewMode, handleSaveConfig, showToast]);

  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  // Initial & Live Load
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchBoardData();
      setBoardData(data);
      setEditingItem((prevEditing) => {
        if (!prevEditing) return null;
        const updated = data.items.find((it) => it.id === prevEditing.id);
        if (!updated) return prevEditing;
        if (updated.mtime && prevEditing.mtime && updated.mtime !== prevEditing.mtime) {
          showToast(`Tarea ${updated.code || updated.id} sincronizada con cambios en disco`, 'info');
        }
        return {
          ...prevEditing,
          mtime: updated.mtime ?? prevEditing.mtime,
        };
      });
      if (data.projects.length > 0) {
        if (data.singleProject || data.projects.length <= 1) {
          const activeId = data.activeProjectId || data.projects[0].id;
          setSelectedProjectId(activeId);
          setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, activeId);
        } else {
          const savedLocal = getStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
          if (selectedProjectId === 'all') {
            setSelectedProjectId('all');
          } else {
            const candidate = (selectedProjectId && selectedProjectId !== 'all')
              ? selectedProjectId
              : (savedLocal || data.activeProjectId || data.projects[0]?.id || '');
            if (candidate === 'all') {
              setSelectedProjectId('all');
            } else {
              const exists = candidate && data.projects.some((p) => p.id === candidate);
              const fallback = exists 
                ? candidate 
                : (data.activeProjectId && data.projects.some(p => p.id === data.activeProjectId) ? data.activeProjectId : (data.projects[0]?.id || ''));
              setSelectedProjectId(fallback);
              if (fallback && fallback !== 'all') {
                setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, fallback);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (!silent) showToast(`Error al cargar datos: ${err.message}`, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedProjectId, showToast]);

  useEffect(() => {
    loadData();
    loadSettings(selectedProjectId);
  }, [selectedProjectId]);

  // SSE Real-time Live Watcher Subscription (DEV-014 & DEV-006)
  useEffect(() => {
    const unsubscribe = subscribeToBoardEvents((event) => {
      if (event.type === 'connected') {
        setLiveConnected(true);
      } else if (event.type === 'disconnected') {
        setLiveConnected(false);
      } else if (event.type === 'backlog_changed') {
        loadData(true);
        showToast('Tablero sincronizado con cambios en disco', 'info');
      } else if (event.type === 'settings_changed') {
        loadSettings(selectedProjectId);
        loadData(true);
        showToast('Configuración sincronizada con cambios en disco', 'info');
      }
    });

    return unsubscribe;
  }, [loadData, loadSettings, selectedProjectId, showToast]);

  // Keyboard Shortcuts: 'N' for new item, '1'-'4' for tabs, '⌘+,' for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'settings' ? (config?.defaultView === 'settings' ? 'kanban' : (config?.defaultView || 'kanban')) : 'settings'));
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingItem(null);
        setDefaultNewStatus('backlog');
        setItemModalOpen(true);
      } else if (e.key === '1') {
        setActiveTab('kanban');
      } else if (e.key === '2') {
        setActiveTab('sprint');
      } else if (e.key === '3') {
        setActiveTab('release');
      } else if (e.key === '4') {
        setActiveTab('trash');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Re-sync from project docs (DEV-012)
  const handleResyncDocs = useCallback(async () => {
    setIsResyncing(true);
    try {
      const result = await triggerResync(selectedProjectId);
      const refreshed = await fetchBoardData();
      setBoardData(refreshed);
      showToast(
        `¡${result.projectName || 'Proyecto'} sincronizado: ${result.importedCount} tareas actualizadas!`,
        'success'
      );
    } catch (err: any) {
      showToast(`Fallo al sincronizar docs: ${err.message}`, 'error');
    } finally {
      setIsResyncing(false);
    }
  }, [selectedProjectId, showToast]);

  // Item Handlers
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

    // Validate if item moving to doing/in_progress has a defined plan/spec
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

    // Determine new order
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

    // Si ni el estado ni el orden cambiaron, no hacer nada
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

    // Optimistic update
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
        showToast(`Estado actualizado: ${updated.code} → ${newStatus}`, 'info');
      } else if (orderChanged) {
        showToast(`Orden de ${targetItem.code} actualizado`, 'success');
      }
    } catch (err: any) {
      // Rollback
      setBoardData((prev) => (prev ? { ...prev, items: prevItems } : null));
      showToast(`Error al actualizar estado: ${err.message}`, 'error');
    }
  }, [boardData, viewMode, showToast]);

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
  }, [boardData]);

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
      showToast(`Prioridad de ${updated.code} cambiada a ${newPriority.toUpperCase()}`, 'info');
    } catch (err: any) {
      showToast(`Error al cambiar prioridad: ${err.message}`, 'error');
    }
  }, [boardData, showToast]);

  const handleReorderBacklogItem = useCallback(async (
    draggedId: string, 
    targetSprint: string, 
    targetIndex: number
  ) => {
    if (!boardData) return;
    const item = boardData.items.find((it) => it.id === draggedId);
    if (!item) return;

    // Items belonging to target group (excluding dragged item), sorted by order
    const groupItems = boardData.items
      .filter((it) => {
        const itSprint = it.sprint || it.targetSprint || '';
        return itSprint === targetSprint && it.id !== draggedId;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Clamp insert index
    const insertIdx = Math.max(0, Math.min(targetIndex, groupItems.length));
    
    // Insert dragged item at exact target position
    const updatedItem = {
      ...item,
      sprint: targetSprint,
      targetSprint: targetSprint
    };
    groupItems.splice(insertIdx, 0, updatedItem);

    // Compute sequential orders (10, 20, 30, ...)
    const orderMap = new Map<string, number>();
    groupItems.forEach((it, i) => {
      orderMap.set(it.id, (i + 1) * 10);
    });

    const newOrder = orderMap.get(draggedId) ?? item.order;

    // Optimistic UI state update
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
      // 1. Update dragged item via API
      await updateItem(draggedId, {
        sprint: targetSprint,
        targetSprint: targetSprint,
        order: newOrder
      });

      // 2. Persist updated sibling orders in parallel
      const siblingUpdates = Array.from(orderMap.entries())
        .filter(([id]) => id !== draggedId)
        .map(([id, ord]) => updateItem(id, { order: ord }));
      if (siblingUpdates.length > 0) {
        await Promise.all(siblingUpdates);
      }
      showToast('Orden de tareas actualizado', 'success');
    } catch (err: any) {
      setBoardData((prev) => (prev ? { ...prev, items: prevItems } : null));
      showToast('Error al reordenar tarea: ' + err.message, 'error');
    }
  }, [boardData, showToast]);

  // DEV-049/DEV-096: Soft delete (send to trash)
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
      showToast('Ítem enviado a la papelera', 'success');
    } catch (err: any) {
      showToast(`Error al enviar a la papelera: ${err.message}`, 'error');
    }
  }, [boardData, showToast]);

  // Sprint lifecycle handlers (DEV-055)
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
      showToast(`Sprint "${created.name}" creado con éxito`, 'success');
    } catch (err: any) {
      showToast(`Error al crear sprint: ${err.message}`, 'error');
    }
  }, [selectedProjectId, showToast]);

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
      showToast(`Sprint "${updated.name}" actualizado`, 'info');
    } catch (err: any) {
      showToast(`Error al actualizar sprint: ${err.message}`, 'error');
    }
  }, [boardData?.sprints, selectedProjectId, showToast]);

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
      showToast(`Sprint "${sprint.name}" iniciado (Activo)`, 'success');
    } catch (err: any) {
      showToast(`Error al iniciar sprint: ${err.message}`, 'error');
    }
  }, [selectedProjectId, showToast]);

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

      for (const item of sprintPendingItems) {
        const existingSprints = item.sprints || [sprint.name];
        const updatedSprints = Array.from(new Set([...existingSprints, sprint.name, ...(destinationSprintName ? [destinationSprintName] : [])]));
        await updateItem(item.id, {
          sprint: destinationSprintName || '',
          targetSprint: destinationSprintName || '',
          sprints: updatedSprints
        });
      }

      // Preserve sprint history on completed tasks as well (DEV-056)
      const sprintDoneItems = (boardData?.items || []).filter(
        (i) => (i.sprint === sprint.name || i.targetSprint === sprint.name) &&
               (i.status === 'done' || i.status === 'ready' || i.status === 'finish')
      );
      for (const item of sprintDoneItems) {
        const existingSprints = item.sprints || [sprint.name];
        if (!existingSprints.includes(sprint.name)) {
          await updateItem(item.id, {
            sprints: [...existingSprints, sprint.name]
          });
        }
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

      const destMsg = destinationSprintName ? `al ${destinationSprintName}` : 'al Backlog';
      showToast(`Sprint "${sprint.name}" completado. ${sprintPendingItems.length} tareas pendientes movidas ${destMsg}.`, 'success');
    } catch (err: any) {
      showToast(`Error al completar sprint: ${err.message}`, 'error');
    }
  }, [boardData?.items, selectedProjectId, showToast]);

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
      showToast('Sprint eliminado. Las tareas fueron devueltas al Backlog.', 'info');
    } catch (err: any) {
      showToast(`Error al eliminar sprint: ${err.message}`, 'error');
    }
  }, [boardData?.sprints, selectedProjectId, showToast]);

  const handleSaveItem = useCallback(async (itemData: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean }) => {
    if (!boardData) return;
    if (itemData.id) {
      // Update
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
      // Create
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
  }, [boardData, selectedProjectId, showToast, t]);

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
      showToast(`Error: ${err.message}`, 'error');
    }
  }, [boardData, showToast, t]);

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
  }, [showToast, t]);

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
  }, [selectedProjectId, showToast, t]);

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
  }, [showToast, t]);

  const handleConvertToMd = useCallback(async (projectId: string) => {
    try {
      const res = await convertProjectToMd(projectId);
      showToast(res.message, 'success');
      await loadData();
    } catch (err: any) {
      showToast(t('app.convertToMdError', { error: err.message }), 'error');
    }
  }, [loadData, showToast, t]);

  const handleConvertToJson = useCallback(async (projectId: string) => {
    try {
      const res = await convertProjectToJson(projectId);
      showToast(res.message, 'success');
      await loadData();
    } catch (err: any) {
      showToast(t('app.convertToJsonError', { error: err.message }), 'error');
    }
  }, [loadData, showToast, t]);

  const handleExportMonolithic = useCallback(async (projectId: string) => {
    try {
      const res = await exportMonolithicMd(projectId, false);
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

  const handleExportJson = useCallback(async (projectId: string) => {
    try {
      const res = await exportProjectJson(projectId);
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



  // DEV-049/DEV-096: Restore from trash via the new /restore endpoint
  const handleRestoreFromTrash = useCallback(async (id: string) => {
    if (!boardData) return;
    try {
      await restoreItem(id);
      // Optimistically: find previousStatus from item data
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
  }, [boardData, showToast, t]);

  // DEV-049: Physical purge (irreversible)
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
  }, [boardData, showToast, t]);

  // Filtered Items Calculation
  const allProjectItems = useMemo(() => {
    if (!boardData) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.items;
    }
    return boardData.items.filter((i) => i.projectId === selectedProjectId);
  }, [boardData, selectedProjectId]);

  // Unique modules for filtering dropdown
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    for (const it of allProjectItems) {
      if (it.module) set.add(it.module);
    }
    return Array.from(set).sort();
  }, [allProjectItems]);

  // Sprints pertenecientes al proyecto seleccionado (o todos si selectedProjectId === 'all' o singleProject)
  const projectSprints = useMemo(() => {
    if (!boardData?.sprints) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.sprints;
    }
    return boardData.sprints.filter((s) => s.projectId === selectedProjectId || !s.projectId);
  }, [boardData?.sprints, boardData?.singleProject, boardData?.projects, selectedProjectId]);

  // Sprints disponibles para filtros (oficiales registrados + sprints presentes en tareas del proyecto)
  const availableSprints = useMemo(() => {
    const set = new Set<string>();
    projectSprints.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    for (const it of allProjectItems) {
      const sp = it.sprint || it.targetSprint;
      if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '—') {
        set.add(sp.trim());
      }
    }
    return Array.from(set).sort();
  }, [projectSprints, allProjectItems]);

  // Nombres de sprints enriquecidos (oficiales + históricos de tareas) para autocompletar en ItemModal
  const sprintNamesForAutocomplete = useMemo(() => {
    const set = new Set<string>(availableSprints);
    for (const it of allProjectItems) {
      if (it.sprint) set.add(it.sprint);
      else if (it.targetSprint) set.add(it.targetSprint);
    }
    return Array.from(set).sort();
  }, [availableSprints, allProjectItems]);

  // Releases pertenecientes al proyecto seleccionado (DEV-056, DEV-087)
  const projectReleases = useMemo(() => {
    if (!boardData?.releases) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.releases;
    }
    return boardData.releases.filter((r) => r.projectId === selectedProjectId);
  }, [boardData?.releases, boardData?.singleProject, boardData?.projects, selectedProjectId]);

  // Versiones canónicas oficiales para autocompletar y chips (DEV-033, DEV-087)
  // NUNCA incluir strings arbitrarios/corruptos inferidos de tareas para evitar DEV-087
  const availableReleases = useMemo(() => {
    const set = new Set<string>();
    for (const r of projectReleases) {
      if (r.version) set.add(r.version);
    }
    return Array.from(set).sort();
  }, [projectReleases]);

  // Metrics
  const stats = useMemo(() => {
    const active = allProjectItems.filter((i) => !i.isDeleted && i.status !== 'dismissed' && i.status !== 'cancelled');
    const pending = active.filter((i) => i.status === 'draft' || i.status === 'ideas' || i.status === 'backlog').length;
    const inProgress = active.filter((i) => i.status === 'doing' || i.status === 'in_progress' || i.status === 'review' || i.status === 'testing_qa').length;
    const completed = active.filter((i) => i.status === 'ready' || i.status === 'done' || i.status === 'finish').length;
    return {
      total: active.length,
      pending,
      inProgress,
      completed
    };
  }, [allProjectItems]);

  const archivedCount = useMemo(() => {
    // Archived = dismissed/cancelled but NOT soft-deleted (those go to Trash)
    return allProjectItems.filter((i) =>
      (i.status === 'dismissed' || i.status === 'cancelled') && !i.isDeleted
    ).length;
  }, [allProjectItems]);

  // DEV-049/DEV-096: Trashed items (soft-deleted)
  const trashedItems = useMemo(() => {
    return allProjectItems.filter((i) => Boolean(i.isDeleted));
  }, [allProjectItems]);

  // Visible items after search/type/priority/module/status filters
  const visibleItems = useMemo(() => {
    return allProjectItems.filter((item) => {
      if (item.isDeleted) return false;
      const isDismissedOrCancelled = item.status === 'dismissed' || item.status === 'cancelled';

      // Canonical status normalization
      const canonicalStatus: ItemStatus =
        item.status === 'ideas' ? 'ideas'
        : (item.status === 'draft' || item.status === 'backlog') ? 'draft'
        : (item.status === 'doing' || item.status === 'in_progress') ? 'doing'
        : (item.status === 'review' || item.status === 'testing_qa') ? 'review'
        : (item.status === 'ready' || item.status === 'finish') ? 'ready'
        : (item.status === 'done') ? 'done'
        : (item.status === 'dismissed' || item.status === 'cancelled') ? 'dismissed'
        : item.status;

      // In non-archive tabs, verify if item's status is selected
      if (canonicalStatus === 'ideas') {
        if (!filters.includeIdeas && !filters.statuses?.includes('ideas')) {
          return false;
        }
      } else if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(canonicalStatus) && !filters.statuses.includes(item.status)) {
          return false;
        }
      } else {
        // If statuses list is somehow empty, exclude dismissed by default
        if (isDismissedOrCancelled && !filters.includeDismissedCancelled) {
          return false;
        }
      }

      // Search
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchModule = item.module ? item.module.toLowerCase().includes(q) : false;
        const matchDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchCode && !matchModule && !matchDesc) return false;
      }

      // Types (multiselect)
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(item.type)) return false;
      } else if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // Priorities (multiselect)
      if (filters.priorities && filters.priorities.length > 0) {
        if (!filters.priorities.includes(item.priority)) return false;
      } else if (filters.priority !== 'all' && item.priority !== filters.priority) {
        return false;
      }

      // Sprints
      if (filters.sprint && filters.sprint !== 'all') {
        if (filters.sprint === 'no_sprint' || filters.sprint === 'backlog') {
          if (item.sprint || item.targetSprint) return false;
        } else {
          if (item.sprint !== filters.sprint && item.targetSprint !== filters.sprint) return false;
        }
      }

      // Releases
      if (filters.release && filters.release !== 'all') {
        if (item.release !== filters.release && item.targetRelease !== filters.release && item.milestone !== filters.release) {
          return false;
        }
      }

      // Module
      if (filters.module !== 'all' && item.module !== filters.module) return false;

      // Estimation
      if (filters.estimates && filters.estimates.length > 0) {
        if (item.estimate === undefined || !filters.estimates.includes(item.estimate)) {
          return false;
        }
      }

      return true;
    });
  }, [allProjectItems, activeTab, filters]);

  if (loading && !boardData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 gap-4 transition-colors">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-2xl border border-indigo-500/25 border-t-indigo-500 dark:border-indigo-400/20 dark:border-t-indigo-400 animate-spin" />
          <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/20 bg-[#080c14] border border-indigo-400/30">
            <img src="/logo.png" alt="gripm" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-800 dark:text-white">gripm</span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              {t('app.badge')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>Cargando gripm &amp; persistencia local...</span>
          </div>
        </div>
      </div>
    );
  }

  const projects = boardData?.projects || [];
  const releases = (boardData?.releases || []).filter(
    (r) => selectedProjectId === 'all' || r.projectId === selectedProjectId
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      
      {/* Header */}
      <Header
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewItem={() => {
          setEditingItem(null);
          setDefaultNewStatus('draft');
          setItemModalOpen(true);
        }}
        onNewProject={() => setProjectModalOpen(true)}
        onResyncDocs={handleResyncDocs}
        isResyncing={isResyncing}
        trashedCount={trashedItems.length}
        archivedCount={archivedCount}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        onRestoreDemo={handleRestoreDemo}
        isSandbox={isSandboxMode()}
        onConvertToMd={handleConvertToMd}
        onConvertToJson={handleConvertToJson}
        onOpenImportWizard={() => setImportWizardOpen(true)}
        liveConnected={liveConnected}
        config={config}
        singleProject={boardData ? Boolean(boardData.singleProject) : (config?.mode === 'single')}
        updateAvailable={boardData?.updateAvailable}
      />

      {/* DEV-222 — Banner de demo. La URL raíz ES la sandbox, así que quien llega no
          tiene contexto de qué está mirando ni salida hacia el repo o la instalación.
          Este banner resuelve las dos cosas sin agregar una landing que mantener.
          Se oculta cuando el detector encuentra daemon, o sea nunca en local. */}
      {isSandboxMode() && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('app.sandboxBannerTitle')}
          </span>
          <span className="text-slate-600 dark:text-slate-400 leading-relaxed min-w-0 flex-1">
            {t('app.sandboxBannerBody')}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <a
              href="https://github.com/pablojavierrodriguez/gripm"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 min-h-[44px] px-2.5 rounded-lg font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {t('app.sandboxBannerRepo')}
            </a>
            <a
              href="https://www.npmjs.com/package/@gripm/board"
              target="_blank"
              rel="noreferrer"
              title="npm install -g @gripm/board"
              className="flex items-center gap-1.5 min-h-[44px] px-2.5 rounded-lg font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="font-mono">{t('app.sandboxBannerInstall')}</span>
            </a>
          </span>
        </div>
      )}

      {/* Filter Bar (Active in Kanban and Sprint tabs) */}
      {activeTab !== 'release' && activeTab !== 'settings' && activeTab !== 'trash' && activeTab !== 'metrics' && (
        <FilterBar
          filters={filters}
          onChangeFilters={setFilters}
          availableModules={availableModules}
          availableSprints={availableSprints}
          availableReleases={availableReleases}
          stats={stats}
          customItemTypes={config?.customItemTypes}
          showSprint={isSprintTabEnabled}
          estimationConfig={config?.estimation}
          showStats={config?.showFilterBarStats !== false}
        />
      )}

      {/* Project Error Warning Banner (e.g. EPERM or missing path) */}
      {(() => {
        const activeProj = projects.find(p => p.id === selectedProjectId);
        if (!activeProj?.error) return null;
        return (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                No se pudieron cargar las tareas de {activeProj.name}
              </div>
              <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                El proceso del servidor Vite no pudo acceder a la carpeta: <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]">{activeProj.repoPath}</code>
              </div>
              <div className="mt-1 text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">Detalle:</span> {activeProj.error}
              </div>
              <div className="mt-2 text-slate-700 dark:text-slate-300 bg-amber-500/5 p-2 rounded-lg border border-amber-500/15">
                💡 <strong>Solución:</strong> Si el servidor Vite fue iniciado dentro de un sandbox o proceso aislado, reinicia el servidor en tu terminal habitual con <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-bold">npm run dev</code> para que cuente con permisos de acceso a las carpetas de otros repositorios en tu máquina.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {activeTab === 'kanban' && (
          <KanbanBoard
            items={visibleItems}
            allItems={allProjectItems}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            config={config}
            availableSprints={availableSprints}
            sprints={projectSprints}
            includePreviousDone={filters.includePreviousDone}
            onTogglePreviousDone={(val) => setFilters((prev) => ({ ...prev, includePreviousDone: val }))}
            includeDismissedCancelled={filters.includeDismissedCancelled}
            includeIdeas={filters.includeIdeas}
            onToggleIdeas={(val) => setFilters((prev) => ({
              ...prev,
              includeIdeas: val,
            }))}
            onNavigateToTab={setActiveTab}
            onUpdateColumnTitle={handleUpdateColumnTitle}
            onUpdateStatus={(id, status, targetColId, targetIndex, calculatedOrder) => handleUpdateStatus(id, status, false, targetColId, targetIndex, calculatedOrder)}
            onDeleteItem={handleDeleteItem}
            onClickItem={(item) => {
              setEditingItem(item);
              setItemModalOpen(true);
            }}
            onQuickAddItem={(status, defaultSprint) => {
              setEditingItem(null);
              setDefaultNewStatus(status);
              setDefaultNewSprint(defaultSprint || '');
              setItemModalOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'sprint' && (
          <SprintView
            config={config}
            projectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
            items={visibleItems}
            allItems={allProjectItems}
            sprints={projectSprints}
            onClickItem={(item) => {
              setEditingItem(item);
              setItemModalOpen(true);
            }}
            onUpdateStatus={(id, s) => handleUpdateStatus(id, s)}
            onUpdatePriority={handleUpdatePriority}
            onReorderItem={handleReorderBacklogItem}
            onUpdateSprint={async (id, newSprint) => {
              const existing = boardData?.items.find((it) => it.id === id);
              const curSprint = existing ? (existing.sprint || existing.targetSprint || '') : '';
              if (curSprint === newSprint) return;
              try {
                const updated = await updateItem(id, { 
                  sprint: newSprint, 
                  targetSprint: newSprint,
                  sprints: newSprint ? [newSprint] : []
                });
                setBoardData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    items: prev.items.map((it) => (it.id === id ? { ...it, ...updated } : it))
                  };
                });
                showToast(t('app.taskAssignedToSprint', { code: updated.code, sprint: newSprint || t('filter.noSprint') }), 'info');
              } catch (err: any) {
                showToast(t('app.taskFromRetroError', { error: err.message }), 'error');
              }
            }}
            onCreateSprint={handleCreateSprint}
            onUpdateSprintMeta={handleUpdateSprintMeta}
            onStartSprint={handleStartSprint}
            onCompleteSprint={handleCompleteSprint}
            onCreateTaskFromAction={handleCreateTaskFromAction}
            onDeleteSprint={handleDeleteSprint}
            onDeleteItem={handleDeleteItem}
            availableSprints={availableSprints}
            rankingEnabled={config.rankingEnabled !== false}
          />
        )}

        {activeTab === 'release' && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ReleaseAssembler
              items={allProjectItems}
              releases={releases}
              projectId={selectedProjectId}
              onArchiveRelease={handleArchiveRelease}
              onDeleteRelease={handleDeleteRelease}
              onShowToast={showToast}
            />
          </Suspense>
        )}

        {activeTab === 'trash' && (
          <div className="flex-1 flex flex-col min-h-0">
            <TrashView
              trashedItems={trashedItems}
              onRestore={handleRestoreFromTrash}
              onPurge={handlePurgeItem}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <SettingsView
              config={config}
              isDarkMode={isDarkMode}
              onSaveConfig={handleSaveConfig}
              currentProject={projects.find(p => p.id === selectedProjectId)}
              onBack={() => setActiveTab(config?.defaultView === 'settings' ? 'kanban' : (config?.defaultView || 'kanban'))}
              onShowToast={showToast}
              onOpenImportWizard={() => setImportWizardOpen(true)}
              onExportMonolithic={handleExportMonolithic}
              onExportJson={handleExportJson}
            />
          </Suspense>
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            items={visibleItems}
            allItems={allProjectItems}
            sprints={projectSprints}
            releases={projectReleases}
            onClickItem={(item) => {
              setEditingItem(item);
              setItemModalOpen(true);
            }}
            onUpdateItem={handleSaveItem}
            config={config}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsView
            items={allProjectItems}
            sprints={projectSprints}
            releases={projectReleases}
            config={config}
          />
        )}
      </main>

      {/* Item Detail / Edit / Create Modal */}
      <ItemModal
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setDefaultNewSprint('');
        }}
        item={editingItem}
        defaultStatus={defaultNewStatus}
        defaultSprint={defaultNewSprint}
        projects={projects}
        availableModules={availableModules}
        availableSprints={sprintNamesForAutocomplete}
        availableReleases={availableReleases}
        sprints={projectSprints}
        releases={projectReleases}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onUnlinkChild={handleUnlinkChildTask}
        activeProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
        config={config}
        allItems={boardData?.items || []}
      />

      {/* Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleCreateProject}
      />

      {/* Plan Guard Modal (verifies plan before moving to In Progress) */}
      <PlanGuardModal
        isOpen={planGuardOpen}
        item={planGuardItem}
        onClose={() => {
          setPlanGuardOpen(false);
          setPlanGuardItem(null);
        }}
        onConfirmStart={handleConfirmStartWithPlan}
        onShowToast={showToast}
      />

      {/* Import Wizard Modal (DEV-018: Legacy Markdown Import) */}
      <ImportWizardModal
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        projects={boardData?.projects || []}
        activeProjectId={selectedProjectId === 'all' ? (boardData?.projects[0]?.id || '') : selectedProjectId}
        onImportComplete={() => {
          loadData(true);
          showToast(t('app.itemsImportedSuccess'), 'success');
        }}
      />

      {/* Keyboard Shortcuts Modal (DEV-254) */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        updateAvailable={boardData?.updateAvailable}
      />

      {/* Mobile Bottom Navigation Bar (DEV-007) */}
      <nav 
        aria-label={t('app.mobileNav')}
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#090d15]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/[0.08] px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg"
      >
        {isKanbanTabEnabled && (
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
              activeTab === 'kanban'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{t('header.kanban')}</span>
          </button>
        )}

        {isSprintTabEnabled && (
          <button
            onClick={() => setActiveTab('sprint')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
              activeTab === 'sprint'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Target className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{t('header.sprints')}</span>
          </button>
        )}

        {isReleaseTabEnabled && (
          <button
            onClick={() => setActiveTab('release')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
              activeTab === 'release'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Rocket className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{t('header.releases')}</span>
          </button>
        )}

        {isTimelineTabEnabled && (
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
              activeTab === 'timeline'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-xs tracking-tight">{t('header.timeline') || 'Roadmap'}</span>
          </button>
        )}

        {isMetricsTabEnabled && (
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
              activeTab === 'metrics'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-5 h-5 mb-0.5" />
            <span className="text-xs tracking-tight">{t('header.metrics')}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('trash')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === 'trash'
              ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Trash2 className="w-5 h-5 mb-0.5" />
            {trashedItems.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-rose-600 text-white">
                {trashedItems.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">{t('header.trash')}</span>
        </button>
      </nav>

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}

export default App;
