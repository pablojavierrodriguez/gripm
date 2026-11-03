import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import type { 
  BacklogItem, 
  ItemStatus, 
  ActiveTab
} from './types';
import { isSprintModuleActive, isReleaseModuleActive, isTimelineModuleActive, isMetricsModuleActive } from './types';
import { isSandboxMode } from './data/detect';
import { SIMPLIFIED_COLUMNS, EXPANDED_COLUMNS } from './components/KanbanBoard';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { ToastContainer } from './components/Toast';
import { VercelAnalytics } from './components/VercelAnalytics';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppModals } from './components/AppModals';
import { AlertTriangle, Sparkles, Code2, Download } from 'lucide-react';
import { useTranslation } from './utils/i18n';
import { filterItems, getAvailableModules } from './utils/filterItems';
import { useRepoAudit } from './hooks/useRepoAudit';
import { useAppState } from './hooks/useAppState';
import { useProjectMutations } from './hooks/useProjectMutations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy loading for heavy views
const SprintView = lazy(() => import('./components/SprintView').then(m => ({ default: m.SprintView })));
const TimelineView = lazy(() => import('./components/TimelineView').then(m => ({ default: m.TimelineView })));
const MetricsView = lazy(() => import('./components/MetricsView').then(m => ({ default: m.MetricsView })));
const ReleaseAssembler = lazy(() => import('./components/ReleaseAssembler').then(m => ({ default: m.ReleaseAssembler })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const TrashView = lazy(() => import('./components/TrashView').then(m => ({ default: m.TrashView })));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[300px] text-slate-400 dark:text-slate-500 text-xs gap-2">
    <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
  </div>
);

export function App() {
  const { t, language, setLanguage } = useTranslation();

  // App core state
  const {
    boardData,
    setBoardData,
    loading,
    selectedProjectId,
    setSelectedProjectId,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    isDarkMode,
    handleToggleTheme,
    config,
    handleSaveConfig,
    filters,
    setFilters,
    toasts,
    showToast,
    dismissToast,
    liveConnected,
    loadData
  } = useAppState(t, setLanguage);

  // Modals visibility state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [defaultNewStatus, setDefaultNewStatus] = useState<ItemStatus>('draft');
  const [defaultNewSprint, setDefaultNewSprint] = useState<string>('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Plan guard state
  const [planGuardOpen, setPlanGuardOpen] = useState(false);
  const [planGuardItem, setPlanGuardItem] = useState<BacklogItem | null>(null);

  // Project mutations
  const {
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
  } = useProjectMutations({
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
  });

  // Computed tab visibility helpers
  const isSprintModule = isSprintModuleActive(config);
  const isReleaseModule = isReleaseModuleActive(config);
  const isKanbanTabEnabled = true;
  const isSprintTabEnabled = isSprintModule && (config?.enabledTabs?.sprint !== undefined
    ? config.enabledTabs.sprint
    : config?.methodology === 'scrum' || config?.methodology === 'scrumban');
  const isReleaseTabEnabled = isReleaseModule && (config?.enabledTabs?.release !== false);
  const isTimelineTabEnabled = isTimelineModuleActive(config) && (config?.enabledTabs?.timeline !== false);
  const isMetricsTabEnabled = isMetricsModuleActive(config) && (config?.enabledTabs?.metrics !== false);

  // Keyboard shortcuts
  const hasOpenModal = Boolean(
    itemModalOpen ||
    projectModalOpen ||
    importWizardOpen ||
    shortcutsModalOpen ||
    commandPaletteOpen ||
    auditModalOpen ||
    planGuardOpen
  );

  useKeyboardShortcuts({
    config,
    isKanbanTabEnabled,
    isSprintTabEnabled,
    isReleaseTabEnabled,
    hasOpenModal,
    onOpenCommandPalette: () => setCommandPaletteOpen((prev) => !prev),
    onToggleSettingsTab: () => {
      setActiveTab((prev) => (prev === 'settings' ? (config?.defaultView === 'settings' ? 'kanban' : (config?.defaultView || 'kanban')) : 'settings'));
    },
    onOpenShortcuts: () => setShortcutsModalOpen((prev) => !prev),
    onNewItem: () => {
      setEditingItem(null);
      setDefaultNewStatus('draft');
      setItemModalOpen(true);
    },
    onSelectTab: (tab: ActiveTab) => setActiveTab(tab)
  });

  // Codebase Health & Diagnostic Audit Hook
  const {
    report: auditReport,
    isLoading: isAuditLoading,
    isRefreshing: isAuditRefreshing,
    isImporting: isAuditImporting,
    refresh: refreshAuditData,
    importTodos: importTodosAction,
  } = useRepoAudit({
    projectId: selectedProjectId,
    onTodosImported: (count) => {
      showToast(t('audit.importSuccessToast', { count }), 'success');
      loadData(true);
    },
  });

  const handleUpdateColumnTitle = useCallback(async (colId: string, newTitle: string) => {
    if (!config) return;
    const currentColumns = config.kanban?.columns || (viewMode === 'simplificada' ? SIMPLIFIED_COLUMNS : EXPANDED_COLUMNS);
    const updatedCols = currentColumns.map((col) => {
      if (col.id === colId) {
        return { ...col, title: newTitle };
      }
      return col;
    });

    const updatedConfig = {
      ...config,
      kanban: {
        ...config.kanban,
        columns: updatedCols
      }
    };

    try {
      await handleSaveConfig(updatedConfig);
      showToast(t('app.columnUpdated', { title: newTitle }), 'success');
    } catch (err: any) {
      showToast(t('app.columnUpdateError', { error: err.message }), 'error');
    }
  }, [config, viewMode, handleSaveConfig, showToast, t]);

  // Filtered items & collections
  const allProjectItems = useMemo(() => {
    if (!boardData) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.items;
    }
    return boardData.items.filter((i) => i.projectId === selectedProjectId);
  }, [boardData, selectedProjectId]);

  const availableModules = useMemo(() => {
    return getAvailableModules(allProjectItems, config?.modulesList);
  }, [allProjectItems, config?.modulesList]);

  const projectSprints = useMemo(() => {
    if (!boardData?.sprints) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.sprints;
    }
    return boardData.sprints.filter((s) => s.projectId === selectedProjectId || !s.projectId);
  }, [boardData?.sprints, boardData?.singleProject, boardData?.projects, selectedProjectId]);

  const availableSprints = useMemo(() => {
    const set = new Set<string>();
    projectSprints.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    for (const it of allProjectItems) {
      const sp = it.sprint || it.targetSprint;
      if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '-') {
        set.add(sp.trim());
      }
    }
    return Array.from(set).sort();
  }, [projectSprints, allProjectItems]);

  const sprintNamesForAutocomplete = useMemo(() => {
    const set = new Set<string>(availableSprints);
    for (const it of allProjectItems) {
      if (it.sprint) set.add(it.sprint);
      else if (it.targetSprint) set.add(it.targetSprint);
    }
    return Array.from(set).sort();
  }, [availableSprints, allProjectItems]);

  const projectReleases = useMemo(() => {
    if (!boardData?.releases) return [];
    if (selectedProjectId === 'all' || boardData.singleProject || (boardData.projects && boardData.projects.length <= 1)) {
      return boardData.releases;
    }
    return boardData.releases.filter((r) => r.projectId === selectedProjectId);
  }, [boardData?.releases, boardData?.singleProject, boardData?.projects, selectedProjectId]);

  const availableReleases = useMemo(() => {
    const set = new Set<string>();
    for (const r of projectReleases) {
      if (r.version) set.add(r.version);
    }
    return Array.from(set).sort();
  }, [projectReleases]);

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
    return allProjectItems.filter((i) =>
      (i.status === 'dismissed' || i.status === 'cancelled') && !i.isDeleted
    ).length;
  }, [allProjectItems]);

  const trashedItems = useMemo(() => {
    return allProjectItems.filter((i) => Boolean(i.isDeleted));
  }, [allProjectItems]);

  const visibleItems = useMemo(() => {
    return filterItems(allProjectItems, filters);
  }, [allProjectItems, filters]);

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
            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              {t('app.badge')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>{t('app.loadingLocalPersistence')}</span>
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
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
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
        auditReport={auditReport}
        isAuditLoading={isAuditLoading}
        onOpenAudit={() => setAuditModalOpen(true)}
      />

      {/* Demo Sandbox Banner */}
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

      {/* Filter Bar */}
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

      {/* Project Error Warning Banner */}
      {(() => {
        const activeProj = projects.find(p => p.id === selectedProjectId);
        if (!activeProj?.error) return null;
        return (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                {t('app.projectLoadError', { name: activeProj.name })}
              </div>
              <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                {t('app.viteAccessError')} <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs">{activeProj.repoPath}</code>
              </div>
              <div className="mt-1 text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{t('app.detail')}</span> {activeProj.error}
              </div>
              <div className="mt-2 text-slate-700 dark:text-slate-300 bg-amber-500/5 p-2 rounded-lg border border-amber-500/15">
                💡 <strong>{t('app.solution')}</strong> {t('app.solutionHint')}
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
            onToggleIdeas={(val) => setFilters((prev) => ({ ...prev, includeIdeas: val }))}
            onNavigateToTab={setActiveTab}
            onUpdateColumnTitle={handleUpdateColumnTitle}
            onUpdateStatus={(id, status, targetColId, targetIndex, calculatedOrder) => {
              handleUpdateStatus(id, status, false, targetColId, targetIndex, calculatedOrder);
            }}
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
            onAssignSprint={handleAssignSprint}
          />
        )}

        {activeTab === 'sprint' && (
          <Suspense fallback={<ViewLoadingFallback />}>
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
                  await handleAssignSprint(existing || ({ id } as BacklogItem), newSprint);
                  showToast(t('app.taskAssignedToSprint', { code: existing?.code || id, sprint: newSprint || t('filter.noSprint') }), 'info');
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
          </Suspense>
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
            <Suspense fallback={<ViewLoadingFallback />}>
              <TrashView
                trashedItems={trashedItems}
                onRestore={handleRestoreFromTrash}
                onPurge={handlePurgeItem}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'settings' && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <SettingsView
              config={config}
              isDarkMode={isDarkMode}
              onSaveConfig={handleSaveConfig}
              currentProject={projects.find(p => p.id === selectedProjectId) || null}
              onBack={() => setActiveTab(config?.defaultView === 'settings' ? 'kanban' : (config?.defaultView || 'kanban'))}
              onShowToast={(msg, type) => showToast(msg, type === 'warning' ? 'info' : type)}
              onOpenImportWizard={() => setImportWizardOpen(true)}
              onExportMonolithic={handleExportMonolithic}
              onExportJson={handleExportJson}
              availableModules={availableModules}
            />
          </Suspense>
        )}

        {activeTab === 'timeline' && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <TimelineView
              items={visibleItems}
              allItems={allProjectItems}
              sprints={projectSprints}
              releases={projectReleases}
              filters={filters}
              onClickItem={(item) => {
                setEditingItem(item);
                setItemModalOpen(true);
              }}
              onUpdateItem={handleSaveItem}
              config={config}
            />
          </Suspense>
        )}

        {activeTab === 'metrics' && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <MetricsView
              items={allProjectItems}
              sprints={projectSprints}
              releases={projectReleases}
              config={config}
            />
          </Suspense>
        )}
      </main>

      {/* Lazy Modals Portal */}
      <AppModals
        itemModalOpen={itemModalOpen}
        onCloseItemModal={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setDefaultNewSprint('');
        }}
        editingItem={editingItem}
        defaultNewStatus={defaultNewStatus}
        defaultNewSprint={defaultNewSprint}
        projects={projects}
        availableModules={availableModules}
        sprintNamesForAutocomplete={sprintNamesForAutocomplete}
        availableReleases={availableReleases}
        projectSprints={projectSprints}
        projectReleases={projectReleases}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
        onUnlinkChildTask={handleUnlinkChildTask}
        selectedProjectId={selectedProjectId}
        config={config}
        allItems={boardData?.items || []}

        projectModalOpen={projectModalOpen}
        onCloseProjectModal={() => setProjectModalOpen(false)}
        onCreateProject={handleCreateProject}

        planGuardOpen={planGuardOpen}
        planGuardItem={planGuardItem}
        onClosePlanGuard={() => {
          setPlanGuardOpen(false);
          setPlanGuardItem(null);
        }}
        onConfirmStartWithPlan={handleConfirmStartWithPlan}
        onShowToast={showToast}

        importWizardOpen={importWizardOpen}
        onCloseImportWizard={() => setImportWizardOpen(false)}
        onImportComplete={() => {
          loadData(true);
          showToast(t('app.itemsImportedSuccess'), 'success');
        }}

        shortcutsModalOpen={shortcutsModalOpen}
        onCloseShortcutsModal={() => setShortcutsModalOpen(false)}
        updateAvailable={boardData?.updateAvailable}

        commandPaletteOpen={commandPaletteOpen}
        onCloseCommandPalette={() => setCommandPaletteOpen(false)}
        onSelectProject={setSelectedProjectId}
        onSelectItemFromPalette={(item) => {
          setEditingItem(item);
          setItemModalOpen(true);
        }}
        onNewItemFromPalette={() => {
          setEditingItem(null);
          setDefaultNewStatus('draft');
          setItemModalOpen(true);
        }}
        onNewProjectFromPalette={() => setProjectModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onResyncDocs={handleResyncDocs}
        onOpenShortcutsFromPalette={() => setShortcutsModalOpen(true)}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'es' ? 'en' : 'es')}

        auditModalOpen={auditModalOpen}
        onCloseAuditModal={() => setAuditModalOpen(false)}
        auditReport={auditReport}
        isAuditLoading={isAuditLoading}
        isAuditRefreshing={isAuditRefreshing}
        isAuditImporting={isAuditImporting}
        onRefreshAudit={refreshAuditData}
        onImportTodos={importTodosAction}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isKanbanTabEnabled={isKanbanTabEnabled}
        isSprintTabEnabled={isSprintTabEnabled}
        isReleaseTabEnabled={isReleaseTabEnabled}
        isTimelineTabEnabled={isTimelineTabEnabled}
        isMetricsTabEnabled={isMetricsTabEnabled}
        trashedCount={trashedItems.length}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Vercel Web Analytics */}
      <VercelAnalytics />
    </div>
  );
}

export default App;
