import { useState, useEffect, useMemo } from 'react';
import type {
  GripmConfig,
  ModulesConfig,
  ProjectMethodology,
  EstimationMethod,
  VisibleCardMetadata,
  ColumnConfig,
  CustomItemTypeConfig,
} from '../../types';
import {
  isSprintModuleActive,
  isReleaseModuleActive,
  isCalendarModuleActive,
  isTimelineModuleActive,
  isMetricsModuleActive,
} from '../../types';
import type { Language } from '../../utils/i18n';
import type { SettingsTabId } from '../SettingsView';

export const getResolvedTheme = (cfgTheme?: string, isDark?: boolean): 'dark' | 'light' | 'system' => {
  if (cfgTheme === 'system') return 'system';
  if (isDark !== undefined) return isDark ? 'dark' : 'light';
  if (cfgTheme === 'dark' || cfgTheme === 'light') return cfgTheme;
  return 'system';
};

export interface UseSettingsStateProps {
  config: GripmConfig;
  isDarkMode?: boolean;
  onSaveConfig: (newConfig: GripmConfig) => Promise<void>;
  onShowToast?: (msg: string, type?: any) => void;
  t: any;
  language: Language;
  setLanguage: (lang: Language) => void;
  kanban: {
    customColumns: ColumnConfig[];
    customSimplifiedColumns: ColumnConfig[];
    wipLimits: Record<string, number>;
    syncColumnsFromConfig: (cfg: GripmConfig) => void;
  };
  taxonomy: {
    customItemTypes: CustomItemTypeConfig[];
    syncTaxonomyFromConfig: (cfg: GripmConfig) => void;
  };
}

export function useSettingsState({
  config,
  isDarkMode,
  onSaveConfig,
  onShowToast,
  t,
  language,
  setLanguage,
  kanban,
  taxonomy,
}: UseSettingsStateProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('views');

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => getResolvedTheme(config.theme, isDarkMode));
  const [density, setDensity] = useState<'comfortable' | 'compact'>(config.density || 'comfortable');
  const [locale, setLocale] = useState<'es' | 'en'>(config.locale || language || 'es');
  const [methodology, setMethodology] = useState<ProjectMethodology>(config.methodology || 'scrumban');
  const [defaultView, setDefaultView] = useState<'kanban' | 'sprint' | 'release' | 'timeline' | 'metrics' | 'settings'>(config.defaultView || 'kanban');
  const [modeState, setModeState] = useState<'single' | 'multi'>(config.mode || 'single');
  const [modulesState, setModulesState] = useState<ModulesConfig>(() => ({
    sprint: isSprintModuleActive(config),
    release: isReleaseModuleActive(config),
    calendar: isCalendarModuleActive(config),
    timeline: isTimelineModuleActive(config),
  }));
  const [enabledTabs, setEnabledTabs] = useState({
    kanban: config.enabledTabs?.kanban !== false,
    sprint: config.enabledTabs?.sprint !== undefined ? config.enabledTabs.sprint : true,
    release: config.enabledTabs?.release !== false,
    timeline: config.enabledTabs?.timeline !== false,
    metrics: config.enabledTabs?.metrics !== false,
  });
  const [autoSave, setAutoSave] = useState<boolean>(config.autoSave ?? true);
  const [rankingEnabled, setRankingEnabled] = useState<boolean>(config.rankingEnabled !== false);
  const [showIdeasByDefault, setShowIdeasByDefault] = useState<boolean>(config.kanban?.showIdeasByDefault ?? false);
  const [showDoneHistoryByDefault, setShowDoneHistoryByDefault] = useState<boolean>(config.kanban?.showDoneHistoryByDefault ?? false);
  const [estimationEnabled, setEstimationEnabled] = useState<boolean>(config.estimation?.enabled ?? false);
  const [estimationMethod, setEstimationMethod] = useState<EstimationMethod>(config.estimation?.method || 'fibonacci');
  const [cardMetaState, setCardMetaState] = useState<VisibleCardMetadata>(() => ({
    module: config.visibleCardMetadata?.module ?? true,
    sprint: config.visibleCardMetadata?.sprint ?? true,
    release: config.visibleCardMetadata?.release ?? true,
    acProgress: config.visibleCardMetadata?.acProgress ?? true,
    priority: config.visibleCardMetadata?.priority ?? true,
    parent: config.visibleCardMetadata?.parent ?? true,
    blocked: config.visibleCardMetadata?.blocked ?? true,
    estimate: config.visibleCardMetadata?.estimate ?? true,
    ...config.visibleCardMetadata,
  }));

  const [modulesList, setModulesList] = useState<string[]>(() => config.modulesList || []);
  const [newModuleInput, setNewModuleInput] = useState('');
  const [rawJson, setRawJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  useEffect(() => {
    const isSprintModOn = isSprintModuleActive(config);
    const isReleaseModOn = isReleaseModuleActive(config);
    const isTimelineModOn = isTimelineModuleActive(config);
    let initialMethodology = config.methodology || 'scrumban';
    if (!isSprintModOn && (initialMethodology === 'scrum' || initialMethodology === 'scrumban')) {
      initialMethodology = 'kanban';
    }
    let initialDefaultView = config.defaultView || (initialMethodology === 'scrum' ? 'sprint' : 'kanban');
    if (!isSprintModOn && initialDefaultView === 'sprint') {
      initialDefaultView = 'kanban';
    }
    if (!isReleaseModOn && initialDefaultView === 'release') {
      initialDefaultView = 'kanban';
    }
    if (!isTimelineModOn && initialDefaultView === 'timeline') {
      initialDefaultView = 'kanban';
    }
    const isMetricsModOn = isMetricsModuleActive(config) && config.enabledTabs?.metrics !== false;
    if (!isMetricsModOn && initialDefaultView === 'metrics') {
      initialDefaultView = 'kanban';
    }

    setTheme(getResolvedTheme(config.theme, isDarkMode));
    setDensity(config.density || 'comfortable');
    setLocale(config.locale || language || 'es');
    setMethodology(initialMethodology);
    setDefaultView(initialDefaultView);
    setModeState(config.mode || 'single');
    setModulesState({
      sprint: isSprintModOn,
      release: isReleaseModOn,
      calendar: isCalendarModuleActive(config),
      timeline: isTimelineModOn,
    });
    setEnabledTabs({
      kanban: config.enabledTabs?.kanban !== undefined ? config.enabledTabs.kanban : initialMethodology !== 'scrum',
      sprint: config.enabledTabs?.sprint !== undefined ? config.enabledTabs.sprint : initialMethodology !== 'kanban',
      release: config.enabledTabs?.release !== false,
      timeline: config.enabledTabs?.timeline !== false,
      metrics: config.enabledTabs?.metrics !== false,
    });
    setAutoSave(config.autoSave ?? true);
    setRankingEnabled(config.rankingEnabled !== false);
    setShowIdeasByDefault(config.kanban?.showIdeasByDefault ?? false);
    setShowDoneHistoryByDefault(config.kanban?.showDoneHistoryByDefault ?? false);
    setEstimationEnabled(config.estimation?.enabled ?? false);
    setEstimationMethod(config.estimation?.method || 'fibonacci');
    setCardMetaState({
      module: config.visibleCardMetadata?.module ?? true,
      sprint: config.visibleCardMetadata?.sprint ?? true,
      release: config.visibleCardMetadata?.release ?? true,
      acProgress: config.visibleCardMetadata?.acProgress ?? true,
      priority: config.visibleCardMetadata?.priority ?? true,
      parent: config.visibleCardMetadata?.parent ?? true,
      blocked: config.visibleCardMetadata?.blocked ?? true,
      estimate: config.visibleCardMetadata?.estimate ?? true,
      ...config.visibleCardMetadata,
    });
    kanban.syncColumnsFromConfig(config);
    taxonomy.syncTaxonomyFromConfig(config);
    setModulesList(config.modulesList || []);
    setRawJson(JSON.stringify(config, null, 2));
  }, [config]);

  const builtConfig: GripmConfig = useMemo(() => {
    const raw: any = {
      ...config,
      theme,
      density,
      locale,
      methodology,
      defaultView,
      mode: modeState,
      modules: { ...modulesState },
      enabledTabs: { ...enabledTabs },
      autoSave,
      rankingEnabled,
      kanban: {
        ...config.kanban,
        showIdeasByDefault,
        showDoneHistoryByDefault,
        columns: kanban.customColumns,
        simplifiedColumns: kanban.customSimplifiedColumns,
        wipLimits: kanban.wipLimits,
      },
      estimation: {
        ...config.estimation,
        enabled: estimationEnabled,
        method: estimationMethod,
      },
      visibleCardMetadata: { ...cardMetaState },
      customItemTypes: taxonomy.customItemTypes,
      modulesList,
    };
    return raw as GripmConfig;
  }, [
    config, theme, density, locale, methodology, defaultView, modeState, modulesState,
    enabledTabs, autoSave, rankingEnabled, showIdeasByDefault, showDoneHistoryByDefault,
    kanban.customColumns, kanban.customSimplifiedColumns, kanban.wipLimits, estimationEnabled,
    estimationMethod, cardMetaState, taxonomy.customItemTypes, modulesList,
  ]);

  const isDirty = useMemo(() => {
    try {
      const normalizeForComparison = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(normalizeForComparison);
        const sorted: Record<string, any> = {};
        for (const k of Object.keys(obj).sort()) {
          sorted[k] = normalizeForComparison(obj[k]);
        }
        return sorted;
      };
      const normBuilt = normalizeForComparison(builtConfig);
      const normConfig = normalizeForComparison(config);
      return JSON.stringify(normBuilt) !== JSON.stringify(normConfig);
    } catch {
      return false;
    }
  }, [builtConfig, config]);

  const handleResetChanges = () => {
    const isSprintModOn = isSprintModuleActive(config);
    const isReleaseModOn = isReleaseModuleActive(config);
    const isTimelineModOn = isTimelineModuleActive(config);
    let initialMethodology = config.methodology || 'scrumban';
    if (!isSprintModOn && (initialMethodology === 'scrum' || initialMethodology === 'scrumban')) {
      initialMethodology = 'kanban';
    }
    let initialDefaultView = config.defaultView || (initialMethodology === 'scrum' ? 'sprint' : 'kanban');
    if (!isSprintModOn && initialDefaultView === 'sprint') {
      initialDefaultView = 'kanban';
    }
    setTheme(getResolvedTheme(config.theme, isDarkMode));
    setDensity(config.density || 'comfortable');
    setLocale(config.locale || language || 'es');
    setMethodology(initialMethodology);
    setDefaultView(initialDefaultView);
    setModeState(config.mode || 'single');
    setModulesState({
      sprint: isSprintModOn,
      release: isReleaseModOn,
      calendar: isCalendarModuleActive(config),
      timeline: isTimelineModOn,
    });
    setEnabledTabs({
      kanban: config.enabledTabs?.kanban !== undefined ? config.enabledTabs.kanban : initialMethodology !== 'scrum',
      sprint: config.enabledTabs?.sprint !== undefined ? config.enabledTabs.sprint : initialMethodology !== 'kanban',
      release: config.enabledTabs?.release !== false,
      timeline: config.enabledTabs?.timeline !== false,
      metrics: config.enabledTabs?.metrics !== false,
    });
    setAutoSave(config.autoSave ?? true);
    setRankingEnabled(config.rankingEnabled !== false);
    setShowIdeasByDefault(config.kanban?.showIdeasByDefault ?? false);
    setShowDoneHistoryByDefault(config.kanban?.showDoneHistoryByDefault ?? false);
    setEstimationEnabled(config.estimation?.enabled ?? false);
    setEstimationMethod(config.estimation?.method || 'fibonacci');
    kanban.syncColumnsFromConfig(config);
    taxonomy.syncTaxonomyFromConfig(config);
    setModulesList(config.modulesList || []);
    setRawJson(JSON.stringify(config, null, 2));
    onShowToast?.(t('settings.toastReset'), 'info');
  };

  const handleToggleSprintModule = async (checked: boolean) => {
    const nextModules = { ...modulesState, sprint: checked };
    setModulesState(nextModules);
    let nextMethodology = methodology;
    let nextDefaultView = defaultView;
    if (!checked) {
      nextMethodology = 'kanban';
      setMethodology('kanban');
      if (defaultView === 'sprint') {
        nextDefaultView = 'kanban';
        setDefaultView('kanban');
      }
    } else {
      if (methodology === 'kanban') {
        nextMethodology = 'scrum';
        setMethodology('scrum');
      }
    }
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = {
      ...builtConfig,
      theme: activeTheme,
      modules: nextModules,
      methodology: nextMethodology,
      defaultView: nextDefaultView,
    };
    await onSaveConfig(nextConfig);
    onShowToast?.(
      checked ? t('settings.toastModuleSprintEnabled') : t('settings.toastModuleSprintDisabled'),
      'success'
    );
  };

  const handleToggleReleaseModule = async (checked: boolean) => {
    const nextModules = { ...modulesState, release: checked };
    setModulesState(nextModules);
    let nextDefaultView = defaultView;
    if (!checked && defaultView === 'release') {
      nextDefaultView = 'kanban';
      setDefaultView('kanban');
    }
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = {
      ...builtConfig,
      theme: activeTheme,
      modules: nextModules,
      defaultView: nextDefaultView,
    };
    await onSaveConfig(nextConfig);
    onShowToast?.(
      checked ? t('settings.toastModuleReleaseEnabled') : t('settings.toastModuleReleaseDisabled'),
      'success'
    );
  };

  const handleToggleCalendarModule = async (checked: boolean) => {
    const nextModules = { ...modulesState, calendar: checked };
    setModulesState(nextModules);
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = { ...builtConfig, theme: activeTheme, modules: nextModules };
    await onSaveConfig(nextConfig);
  };

  const handleToggleTimelineModule = async (checked: boolean) => {
    const nextModules = { ...modulesState, timeline: checked };
    setModulesState(nextModules);
    let nextDefaultView = defaultView;
    if (!checked && defaultView === 'timeline') {
      nextDefaultView = 'kanban';
      setDefaultView('kanban');
    }
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = { ...builtConfig, theme: activeTheme, modules: nextModules, defaultView: nextDefaultView };
    await onSaveConfig(nextConfig);
  };

  const handleToggleMultiHub = async (checked: boolean) => {
    const nextMode: 'single' | 'multi' = checked ? 'multi' : 'single';
    setModeState(nextMode);
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = { ...builtConfig, theme: activeTheme, mode: nextMode };
    await onSaveConfig(nextConfig);
  };

  const updateConfig = async (patch: Partial<GripmConfig>) => {
    const activeTheme = getResolvedTheme(theme, isDarkMode);
    const nextConfig: GripmConfig = { ...builtConfig, ...patch, theme: activeTheme };
    await onSaveConfig(nextConfig);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setJsonError(null);
    try {
      let nextConfig: GripmConfig;
      if (activeTab === 'advanced') {
        try {
          nextConfig = JSON.parse(rawJson);
        } catch (e: any) {
          setJsonError(`Error de sintaxis JSON: ${e.message}`);
          setIsSaving(false);
          onShowToast?.(t('settings.toastJsonError'), 'error');
          return;
        }
      } else {
        nextConfig = builtConfig;
      }
      await onSaveConfig(nextConfig);
      setHasSavedRecently(true);
      setTimeout(() => setHasSavedRecently(false), 2500);
      onShowToast?.(t('settings.toastSaveSuccess'), 'success');
    } catch (err: any) {
      onShowToast?.(t('settings.toastSaveError', { error: err.message || err }), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddModule = async (explicitName?: string) => {
    const trimmed = (explicitName !== undefined ? explicitName : newModuleInput).trim();
    if (!trimmed) return;
    if (modulesList.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      onShowToast?.(language === 'es' ? 'El módulo ya existe' : 'Module already exists', 'info');
      return;
    }
    const updated = [...modulesList, trimmed];
    setModulesList(updated);
    if (explicitName === undefined) setNewModuleInput('');
    const next = { ...builtConfig, modulesList: updated };
    await onSaveConfig(next);
  };

  const handleRemoveModule = async (modToRemove: string) => {
    const updated = modulesList.filter((m) => m !== modToRemove);
    setModulesList(updated);
    const next = { ...builtConfig, modulesList: updated };
    await onSaveConfig(next);
  };

  const handleTabChange = (tab: SettingsTabId) => {
    if (tab === 'advanced') {
      setRawJson(JSON.stringify(builtConfig, null, 2));
      setJsonError(null);
    }
    setActiveTab(tab);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLocale(newLang);
    setLanguage(newLang);
  };

  return {
    activeTab,
    setActiveTab,
    theme,
    setTheme,
    density,
    setDensity,
    locale,
    setLocale,
    handleLanguageChange,
    methodology,
    setMethodology,
    defaultView,
    setDefaultView,
    modeState,
    setModeState,
    modulesState,
    setModulesState,
    enabledTabs,
    setEnabledTabs,
    autoSave,
    setAutoSave,
    rankingEnabled,
    setRankingEnabled,
    showIdeasByDefault,
    setShowIdeasByDefault,
    showDoneHistoryByDefault,
    setShowDoneHistoryByDefault,
    estimationEnabled,
    setEstimationEnabled,
    estimationMethod,
    setEstimationMethod,
    cardMetaState,
    setCardMetaState,
    modulesList,
    setModulesList,
    newModuleInput,
    setNewModuleInput,
    rawJson,
    setRawJson,
    jsonError,
    setJsonError,
    isSaving,
    hasSavedRecently,
    builtConfig,
    isDirty,
    handleResetChanges,
    handleToggleSprintModule,
    handleToggleReleaseModule,
    handleToggleCalendarModule,
    handleToggleTimelineModule,
    handleToggleMultiHub,
    updateConfig,
    handleSave,
    handleAddModule,
    handleRemoveModule,
    handleTabChange,
  };
}
