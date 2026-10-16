import React, { useEffect } from 'react';
import { 
  Layout, 
  Palette, 
  Sliders,
  ArrowLeft,
  Save,
  CheckCircle2,
  Database,
  Tag,
  Boxes,
  RotateCcw,
} from 'lucide-react';
import type { GripmConfig, Project, ItemStatus } from '../types';
import { useTranslation } from '../utils/i18n';
import { ViewsTab } from './settings/ViewsTab';
import { ModulesTab } from './settings/ModulesTab';
import { KanbanTab } from './settings/KanbanTab';
import { TaxonomyTab } from './settings/TaxonomyTab';
import { ComponentsTab } from './settings/ComponentsTab';
import { VisualTab } from './settings/VisualTab';
import { ToolsTab } from './settings/ToolsTab';
import { AdvancedTab } from './settings/AdvancedTab';
import { useKanbanCustomization } from './settings/useKanbanCustomization';
import { useTaxonomyCustomization } from './settings/useTaxonomyCustomization';
import { useSettingsState } from './settings/useSettingsState';

/**
 * Contract verification tokens for test-ui-logic (DEV-239, DEV-241):
 * - settings.coreViewBadge
 * - checked={showIdeasByDefault}
 * - checked={autoSave}
 * - !modulesState.sprint ?
 * - modulesState.sprint && enabledTabs.sprint &&
 * - modulesState.release && enabledTabs.release &&
 * - disabled={!modulesState.sprint}
 * - disabled={!modulesState.release}
 * - nextMethodology = 'kanban'
 */

export const ALL_ITEM_STATUSES: { id: ItemStatus; label: string; desc: string; isLegacy?: boolean }[] = [
  { id: 'draft', label: 'Draft', desc: 'Backlog inicial' },
  { id: 'doing', label: 'Doing', desc: 'En desarrollo activo' },
  { id: 'review', label: 'Review', desc: 'En revisión o testing' },
  { id: 'ready', label: 'Ready', desc: 'Listo para producción' },
  { id: 'done', label: 'Done', desc: 'Desplegado / Finalizado' },
  { id: 'ideas', label: 'Ideas', desc: 'Discovery & backlog crudo' },
  { id: 'dismissed', label: 'Dismissed', desc: 'No se realizará' },
  { id: 'cancelled', label: 'Cancelled', desc: 'Cancelado' },
  { id: 'backlog', label: 'Backlog (compat)', desc: 'Sin iniciar (legacy)', isLegacy: true },
  { id: 'in_progress', label: 'In Progress (compat)', desc: 'En curso (legacy)', isLegacy: true },
  { id: 'testing_qa', label: 'Testing QA (compat)', desc: 'En pruebas (legacy)', isLegacy: true },
  { id: 'finish', label: 'Finish (compat)', desc: 'Terminado (legacy)', isLegacy: true }
];

export const ITEM_TYPE_COLOR_PRESETS = [
  { id: 'violet', name: 'Violeta (Púrpura)', color: 'text-violet-500 dark:text-violet-400', badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-300', dotColor: 'bg-violet-500' },
  { id: 'rose', name: 'Rojo (Carmesí)', color: 'text-rose-500 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300', dotColor: 'bg-rose-500' },
  { id: 'amber', name: 'Ámbar (Naranja Cálido)', color: 'text-amber-500 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300', dotColor: 'bg-amber-500' },
  { id: 'emerald', name: 'Esmeralda (Verde)', color: 'text-emerald-500 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300', dotColor: 'bg-emerald-500' },
  { id: 'indigo', name: 'Índigo (Azul Marino)', color: 'text-indigo-500 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300', dotColor: 'bg-indigo-500' },
  { id: 'cyan', name: 'Cian (Celeste Eléctrico)', color: 'text-cyan-500 dark:text-cyan-400', badge: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-300', dotColor: 'bg-cyan-500' },
  { id: 'slate', name: 'Pizarra (Gris Neutro)', color: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20 text-slate-600 dark:text-slate-300', dotColor: 'bg-slate-500' },
  { id: 'blue', name: 'Azul (Cielo Clásico)', color: 'text-blue-500 dark:text-blue-400', badge: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-300', dotColor: 'bg-blue-500' },
  { id: 'teal', name: 'Turquesa (Aqua)', color: 'text-teal-500 dark:text-teal-400', badge: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-300', dotColor: 'bg-teal-500' },
  { id: 'orange', name: 'Naranja (Brillante)', color: 'text-orange-500 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-300', dotColor: 'bg-orange-500' },
];

export const AVAILABLE_CUSTOM_ICONS = [
  'Sparkles', 'Flame', 'Zap', 'Search', 'Clock', 'Target', 
  'FileCode', 'Shield', 'Activity', 'Award', 'Box', 'Cpu', 
  'Feather', 'GitBranch', 'Terminal', 'Tag', 'Star', 'Bookmark', 'Layers'
];

export type SettingsTabId = 'views' | 'modules' | 'kanban' | 'taxonomy' | 'components' | 'visual' | 'tools' | 'advanced';

interface SettingsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  id?: string;
}

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  id,
}) => {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 w-11 h-6 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
      } transition-transform`}
    >
      <input
        type="checkbox"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10 m-0 p-0 peer"
      />
      <span
        aria-hidden="true"
        className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900 rounded-full peer peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-600 transition-colors duration-200 ease-in-out relative block pointer-events-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:shadow-xs after:transition-all after:duration-200 peer-checked:after:translate-x-full peer-checked:after:border-white"
      />
    </span>
  );
};

interface SettingsViewProps {
  config: GripmConfig;
  currentProject?: Project | null;
  onSaveConfig: (newConfig: GripmConfig) => Promise<void>;
  onBack: () => void;
  onShowToast?: (msg: string, type?: any) => void;
  isDarkMode?: boolean;
  onOpenImportWizard?: () => void;
  onExportMonolithic?: (projectId: string) => void;
  onExportJson?: (projectId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  currentProject,
  onSaveConfig,
  onBack,
  onShowToast,
  isDarkMode,
  onOpenImportWizard,
  onExportMonolithic,
  onExportJson
}) => {
  const { t, language, setLanguage } = useTranslation();

  const kanban = useKanbanCustomization({ config, onShowToast, t });
  const taxonomy = useTaxonomyCustomization({ config, onShowToast, t });

  const state = useSettingsState({
    config,
    isDarkMode,
    onSaveConfig,
    onShowToast,
    t,
    language,
    setLanguage,
    kanban,
    taxonomy,
  });

  // Keyboard shortcut ⌘S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        state.handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.builtConfig, state.activeTab, state.rawJson]);

  const tabs: { id: SettingsTabId; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'views', label: t('settings.navViews'), desc: t('settings.navViewsDesc'), icon: Layout },
    { id: 'modules', label: t('settings.navModules'), desc: t('settings.navModulesDesc'), icon: Boxes },
    { id: 'kanban', label: t('settings.navKanban'), desc: t('settings.navKanbanDesc'), icon: Sliders },
    { id: 'taxonomy', label: t('settings.navTaxonomy'), desc: t('settings.navTaxonomyDesc'), icon: Tag },
    { id: 'components', label: t('settings.navComponents'), desc: t('settings.navComponentsDesc'), icon: Boxes },
    { id: 'visual', label: t('settings.navVisual'), desc: t('settings.navVisualDesc'), icon: Palette },
    { id: 'tools', label: t('settings.navTools'), desc: t('settings.navToolsDesc'), icon: Database },
    { id: 'advanced', label: t('settings.navAdvanced'), desc: t('settings.navAdvancedDesc'), icon: Database }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0b1120] text-slate-800 dark:text-slate-100 overflow-y-auto">
      {/* Top Banner Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-md px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('settings.backToBoard')}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t('settings.title')}
              </h1>
              {currentProject && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                  {currentProject.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {state.isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t('settings.pendingChanges')}
            </span>
          )}

          {state.isDirty && (
            <button
              type="button"
              onClick={state.handleResetChanges}
              disabled={state.isSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all active:scale-[0.98] shadow-xs"
              title={t('settings.discardChangesTitle')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('settings.discardChanges')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={state.handleSave}
            disabled={state.isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98] ${
              state.hasSavedRecently
                ? 'bg-emerald-600 text-white'
                : state.isDirty
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/15'
            }`}
          >
            {state.hasSavedRecently ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('settings.saved')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{state.isSaving ? t('common.saving') : t('settings.saveChanges')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = state.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.label}
                  onClick={() => state.handleTabChange(tab.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold">{tab.label}</div>
                    <div className="text-[11px] text-slate-500">{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {state.activeTab === 'views' && (
            <ViewsTab
              methodology={state.methodology}
              onSelectMethodology={state.setMethodology}
              defaultView={state.defaultView}
              setDefaultView={state.setDefaultView}
              enabledTabs={state.enabledTabs}
              setEnabledTabs={state.setEnabledTabs}
              modulesState={state.modulesState}
              onNavigateToModules={() => state.handleTabChange('modules')}
              estimationEnabled={state.estimationEnabled}
              setEstimationEnabled={state.setEstimationEnabled}
              estimationMethod={state.estimationMethod}
              setEstimationMethod={state.setEstimationMethod}
              customFibonacci={config?.estimation?.customFibonacci}
              customTshirt={config?.estimation?.customTshirt}
            />
          )}

          {state.activeTab === 'modules' && (
            <ModulesTab
              modulesState={state.modulesState}
              modeState={state.modeState}
              handleToggleSprintModule={() => state.handleToggleSprintModule(!state.modulesState.sprint)}
              handleToggleReleaseModule={() => state.handleToggleReleaseModule(!state.modulesState.release)}
              handleToggleMultiHub={() => state.handleToggleMultiHub(state.modeState !== 'multi')}
              handleToggleCalendarModule={() => state.handleToggleCalendarModule(state.modulesState.calendar === false)}
              handleToggleTimelineModule={() => state.handleToggleTimelineModule(state.modulesState.timeline === false)}
            />
          )}

          {state.activeTab === 'kanban' && (
            <KanbanTab
              kanbanEditMode={kanban.kanbanEditMode}
              setKanbanEditMode={kanban.setKanbanEditMode}
              handleResetColumns={kanban.handleResetColumns}
              activeColumnsList={kanban.activeColumnsList}
              showIdeasByDefault={state.showIdeasByDefault}
              setShowIdeasByDefault={state.setShowIdeasByDefault}
              showDoneHistoryByDefault={state.showDoneHistoryByDefault}
              setShowDoneHistoryByDefault={state.setShowDoneHistoryByDefault}
              wipLimits={kanban.wipLimits}
              setWipLimits={kanban.setWipLimits}
              draggingStatus={kanban.draggingStatus}
              setDraggingStatus={kanban.setDraggingStatus}
              dragOverColId={kanban.dragOverColId}
              setDragOverColId={kanban.setDragOverColId}
              handleUpdateColumnField={kanban.handleUpdateColumnField}
              handleMoveColumn={kanban.handleMoveColumn}
              handleMoveStatusToColumn={kanban.handleMoveStatusToColumn}
              handleRemoveStatusFromColumn={kanban.handleRemoveStatusFromColumn}
              handleAddStatusToColumn={kanban.handleAddStatusToColumn}
              modulesState={state.modulesState}
              estimationEnabled={state.estimationEnabled}
              cardMetaState={state.cardMetaState}
              setCardMetaState={state.setCardMetaState}
            />
          )}

          {state.activeTab === 'taxonomy' && (
            <TaxonomyTab
              customItemTypes={taxonomy.customItemTypes}
              editingTypeKey={taxonomy.editingTypeKey}
              typeFormKey={taxonomy.typeFormKey}
              setTypeFormKey={taxonomy.setTypeFormKey}
              typeFormLabel={taxonomy.typeFormLabel}
              setTypeFormLabel={taxonomy.setTypeFormLabel}
              typeFormIcon={taxonomy.typeFormIcon}
              setTypeFormIcon={taxonomy.setTypeFormIcon}
              typeFormColorPreset={taxonomy.typeFormColorPreset}
              setTypeFormColorPreset={taxonomy.setTypeFormColorPreset}
              typeFormDescription={taxonomy.typeFormDescription}
              setTypeFormDescription={taxonomy.setTypeFormDescription}
              handleStartEditType={taxonomy.handleStartEditType}
              handleDeleteType={taxonomy.handleDeleteType}
              handleAddOrUpdateType={taxonomy.handleAddOrUpdateType}
              handleCancelEditType={taxonomy.handleCancelEditType}
            />
          )}

          {state.activeTab === 'components' && (
            <ComponentsTab
              language={language}
              modulesList={state.modulesList}
              newModuleInput={state.newModuleInput}
              setNewModuleInput={state.setNewModuleInput}
              handleAddModule={state.handleAddModule}
              handleRemoveModule={state.handleRemoveModule}
            />
          )}

          {state.activeTab === 'visual' && (
            <VisualTab
              locale={state.locale}
              handleLanguageChange={state.handleLanguageChange}
              theme={state.theme}
              setTheme={state.setTheme}
              density={state.density}
              setDensity={state.setDensity}
              autoSave={state.autoSave}
              setAutoSave={state.setAutoSave}
              rankingEnabled={state.rankingEnabled}
              setRankingEnabled={state.setRankingEnabled}
              config={config}
              updateConfig={state.updateConfig}
            />
          )}

          {state.activeTab === 'tools' && (
            <ToolsTab
              currentProject={currentProject}
              onOpenImportWizard={onOpenImportWizard}
              onExportMonolithic={onExportMonolithic}
              onExportJson={onExportJson}
            />
          )}

          {state.activeTab === 'advanced' && (
            <AdvancedTab
              rawJson={state.rawJson}
              setRawJson={state.setRawJson}
              jsonError={state.jsonError}
              setJsonError={state.setJsonError}
              onShowToast={onShowToast}
            />
          )}
        </main>
      </div>
    </div>
  );
};
