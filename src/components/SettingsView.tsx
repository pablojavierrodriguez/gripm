import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, 
  Palette, 
  Sliders,
  Target,
  Rocket,
  Download,
  Upload,
  RotateCcw, 
  FileCode, 
  ArrowUp, 
  ArrowDown, 
  Moon, 
  Sun, 
  Monitor,
  ArrowLeft,
  Save,
  CheckCircle2,
  Database,
  ShieldCheck,
  Code,
  Plus,
  X,
  Layers,
  Tag,
  Trash2,
  Edit2,
  Check,
  Globe
} from 'lucide-react';
import type { GripmConfig, ColumnConfig, Project, ItemStatus, ProjectMethodology, CustomItemTypeConfig } from '../types';
import { EXPANDED_COLUMNS, SIMPLIFIED_BASE_COLUMNS } from './KanbanBoard';
import { getIconByName } from './ItemCard';
import { useTranslation, type Language } from '../utils/i18n';
import { useStatusMeta } from '../utils/useStatusMeta';

export const ALL_ITEM_STATUSES: { id: ItemStatus; label: string; desc: string }[] = [
  { id: 'draft', label: 'Draft', desc: 'Backlog inicial' },
  { id: 'doing', label: 'Doing', desc: 'En desarrollo activo' },
  { id: 'review', label: 'Review', desc: 'En revisión o testing' },
  { id: 'ready', label: 'Ready', desc: 'Listo para producción' },
  { id: 'done', label: 'Done', desc: 'Desplegado / Finalizado' },
  { id: 'ideas', label: 'Ideas', desc: 'Discovery & backlog crudo' },
  { id: 'backlog', label: 'Backlog (compat)', desc: 'Sin iniciar (legacy)' },
  { id: 'in_progress', label: 'In Progress (compat)', desc: 'En curso (legacy)' },
  { id: 'testing_qa', label: 'Testing QA (compat)', desc: 'En pruebas (legacy)' },
  { id: 'finish', label: 'Finish (compat)', desc: 'Terminado (legacy)' },
  { id: 'dismissed', label: 'Dismissed', desc: 'No se realizará' },
  { id: 'cancelled', label: 'Cancelled', desc: 'Cancelado' }
];

export const ITEM_TYPE_COLOR_PRESETS = [
  { 
    id: 'violet', 
    name: 'Violeta (Púrpura)', 
    color: 'text-violet-500 dark:text-violet-400', 
    badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-300', 
    dotColor: 'bg-violet-500' 
  },
  { 
    id: 'rose', 
    name: 'Rojo (Carmesí)', 
    color: 'text-rose-500 dark:text-rose-400', 
    badge: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300', 
    dotColor: 'bg-rose-500' 
  },
  { 
    id: 'amber', 
    name: 'Ámbar (Naranja Cálido)', 
    color: 'text-amber-500 dark:text-amber-400', 
    badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300', 
    dotColor: 'bg-amber-500' 
  },
  { 
    id: 'emerald', 
    name: 'Esmeralda (Verde)', 
    color: 'text-emerald-500 dark:text-emerald-400', 
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300', 
    dotColor: 'bg-emerald-500' 
  },
  { 
    id: 'indigo', 
    name: 'Índigo (Azul Marino)', 
    color: 'text-indigo-500 dark:text-indigo-400', 
    badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300', 
    dotColor: 'bg-indigo-500' 
  },
  { 
    id: 'cyan', 
    name: 'Cian (Celeste Eléctrico)', 
    color: 'text-cyan-500 dark:text-cyan-400', 
    badge: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-300', 
    dotColor: 'bg-cyan-500' 
  },
  { 
    id: 'pink', 
    name: 'Rosa (Fucsia)', 
    color: 'text-pink-500 dark:text-pink-400', 
    badge: 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-300', 
    dotColor: 'bg-pink-500' 
  },
  { 
    id: 'teal', 
    name: 'Teal (Turquesa)', 
    color: 'text-teal-500 dark:text-teal-400', 
    badge: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-300', 
    dotColor: 'bg-teal-500' 
  },
  { 
    id: 'orange', 
    name: 'Naranja (Fuego)', 
    color: 'text-orange-500 dark:text-orange-400', 
    badge: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-300', 
    dotColor: 'bg-orange-500' 
  },
];

export const AVAILABLE_CUSTOM_ICONS = [
  'Sparkles', 'Flame', 'Zap', 'Search', 'Clock', 'Target', 
  'FileCode', 'Shield', 'Activity', 'Award', 'Box', 'Cpu', 
  'Feather', 'GitBranch', 'Terminal', 'Tag', 'Star', 'Bookmark', 'Layers'
];

export type SettingsTabId = 'views' | 'kanban' | 'taxonomy' | 'visual' | 'tools' | 'advanced';

interface SettingsViewProps {
  config: GripmConfig;
  onSaveConfig: (newConfig: GripmConfig) => Promise<void>;
  currentProject?: Project;
  onBack: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenImportWizard?: () => void;
  onExportMonolithic?: (projectId: string) => void;
  onExportJson?: (projectId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  currentProject,
  onBack,
  onShowToast,
  onOpenImportWizard,
  onExportMonolithic,
  onExportJson
}) => {
  const { t, language, setLanguage } = useTranslation();
  const getStatusMeta = useStatusMeta();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('views');

  // Form local state
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(config.theme || 'system');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(config.density || 'comfortable');
  const [locale, setLocale] = useState<'es' | 'en'>(config.locale || language || 'es');
  const [methodology, setMethodology] = useState<ProjectMethodology>(config.methodology || 'scrumban');
  const [defaultView, setDefaultView] = useState<'kanban' | 'sprint' | 'release' | 'settings'>(config.defaultView || 'kanban');
  const [enabledTabs, setEnabledTabs] = useState({
    kanban: config.enabledTabs?.kanban !== false,
    sprint: config.enabledTabs?.sprint !== false,
    release: config.enabledTabs?.release !== false
  });
  const [autoSave, setAutoSave] = useState<boolean>(config.autoSave ?? true);
  const [rankingEnabled, setRankingEnabled] = useState<boolean>(config.rankingEnabled !== false);
  const [showIdeasByDefault, setShowIdeasByDefault] = useState<boolean>(config.kanban?.showIdeasByDefault ?? false);
  const [showDoneHistoryByDefault, setShowDoneHistoryByDefault] = useState<boolean>(config.kanban?.showDoneHistoryByDefault ?? false);
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

  // Custom Item Types state (DEV-059)
  const [customItemTypes, setCustomItemTypes] = useState<CustomItemTypeConfig[]>(() => {
    if (config.customItemTypes && config.customItemTypes.length > 0) {
      return JSON.parse(JSON.stringify(config.customItemTypes));
    }
    return [];
  });

  // State for adding/editing a custom card type
  const [editingTypeKey, setEditingTypeKey] = useState<string | null>(null);
  const [typeFormKey, setTypeFormKey] = useState('');
  const [typeFormLabel, setTypeFormLabel] = useState('');
  const [typeFormColorPreset, setTypeFormColorPreset] = useState('indigo');
  const [typeFormIcon, setTypeFormIcon] = useState('Sparkles');
  const [typeFormDescription, setTypeFormDescription] = useState('');

  // Raw JSON state
  const [rawJson, setRawJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  // Sync state when config prop changes
  useEffect(() => {
    const initialMethodology = config.methodology || 'scrumban';
    setTheme(config.theme || 'system');
    setDensity(config.density || 'comfortable');
    setLocale(config.locale || language || 'es');
    setMethodology(initialMethodology);
    setDefaultView(config.defaultView || (initialMethodology === 'scrum' ? 'sprint' : 'kanban'));
    setEnabledTabs({
      kanban: config.enabledTabs?.kanban !== undefined ? config.enabledTabs.kanban : initialMethodology !== 'scrum',
      sprint: config.enabledTabs?.sprint !== undefined ? config.enabledTabs.sprint : initialMethodology !== 'kanban',
      release: config.enabledTabs?.release !== false
    });
    setAutoSave(config.autoSave ?? true);
    setRankingEnabled(config.rankingEnabled !== false);
    setShowIdeasByDefault(config.kanban?.showIdeasByDefault ?? false);
    setShowDoneHistoryByDefault(config.kanban?.showDoneHistoryByDefault ?? false);
    if (config.kanban?.columns && config.kanban.columns.length > 0) {
      setCustomColumns(JSON.parse(JSON.stringify(config.kanban.columns)));
    } else {
      setCustomColumns(JSON.parse(JSON.stringify(EXPANDED_COLUMNS)));
    }
    if (config.kanban?.simplifiedColumns && config.kanban.simplifiedColumns.length > 0) {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(config.kanban.simplifiedColumns)));
    } else {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(SIMPLIFIED_BASE_COLUMNS)));
    }
    setWipLimits(config.kanban?.wipLimits || {});
    if (config.customItemTypes && config.customItemTypes.length > 0) {
      setCustomItemTypes(JSON.parse(JSON.stringify(config.customItemTypes)));
    } else {
      setCustomItemTypes([]);
    }
    setRawJson(JSON.stringify(config, null, 2));
    setJsonError(null);
  }, [config, language]);

  const handleLanguageChange = (newLang: Language) => {
    setLocale(newLang);
    setLanguage(newLang);
    const updated = { ...builtConfig, locale: newLang };
    onSaveConfig(updated).catch(() => {});
  };

  const handleSelectMethodology = (m: ProjectMethodology) => {
    setMethodology(m);
    if (m === 'kanban') {
      setEnabledTabs({ kanban: true, sprint: false, release: true });
      setDefaultView('kanban');
      onShowToast?.(t('settings.toastMethodologyKanban'), 'info');
    } else if (m === 'scrum') {
      setEnabledTabs({ kanban: false, sprint: true, release: true });
      setDefaultView('sprint');
      onShowToast?.(t('settings.toastMethodologyScrum'), 'info');
    } else {
      setEnabledTabs({ kanban: true, sprint: true, release: true });
      setDefaultView('kanban');
      onShowToast?.(t('settings.toastMethodologyScrumban'), 'info');
    }
  };

  // Compute built config from state
  const builtConfig: GripmConfig = useMemo(() => {
    return {
      ...config,
      theme,
      density,
      locale,
      methodology,
      defaultView,
      enabledTabs: {
        kanban: enabledTabs.kanban,
        sprint: enabledTabs.sprint,
        release: enabledTabs.release
      },
      autoSave,
      rankingEnabled,
      customItemTypes,
      kanban: {
        ...config.kanban,
        columns: customColumns,
        simplifiedColumns: customSimplifiedColumns,
        showIdeasByDefault,
        showDoneHistoryByDefault,
        wipLimits
      }
    };
  }, [config, theme, density, locale, methodology, defaultView, enabledTabs, autoSave, rankingEnabled, customItemTypes, customColumns, customSimplifiedColumns, showIdeasByDefault, showDoneHistoryByDefault, wipLimits]);

  // Helper to normalize config object for reliable dirty-checking (DEV-081)
  const normalizeForComparison = (c: Partial<GripmConfig>) => {
    const kanban = c.kanban || {};
    return {
      theme: c.theme || 'system',
      density: c.density || 'comfortable',
      locale: c.locale || 'es',
      methodology: c.methodology || 'scrumban',
      defaultView: c.defaultView || (c.methodology === 'scrum' ? 'sprint' : 'kanban'),
      enabledTabs: {
        kanban: c.enabledTabs?.kanban !== undefined ? c.enabledTabs.kanban : c.methodology !== 'scrum',
        sprint: c.enabledTabs?.sprint !== undefined ? c.enabledTabs.sprint : c.methodology !== 'kanban',
        release: c.enabledTabs?.release !== false
      },
      autoSave: c.autoSave ?? true,
      rankingEnabled: c.rankingEnabled !== false,
      customItemTypes: (c.customItemTypes && c.customItemTypes.length > 0) ? c.customItemTypes : undefined,
      kanban: {
        showIdeasByDefault: kanban.showIdeasByDefault ?? false,
        showDoneHistoryByDefault: kanban.showDoneHistoryByDefault ?? false,
        columns: kanban.columns || [],
        simplifiedColumns: kanban.simplifiedColumns || [],
        wipLimits: kanban.wipLimits || {}
      }
    };
  };

  // Check if modified (dirty state) (DEV-081)
  const isDirty = useMemo(() => {
    try {
      const normBuilt = normalizeForComparison(builtConfig);
      const normConfig = normalizeForComparison(config);
      return JSON.stringify(normBuilt) !== JSON.stringify(normConfig);
    } catch {
      return false;
    }
  }, [builtConfig, config]);

  // DEV-074: Reset local settings state to original config from disk
  const handleResetChanges = () => {
    const initialMethodology = config.methodology || 'scrumban';
    setTheme(config.theme || 'system');
    setDensity(config.density || 'comfortable');
    setMethodology(initialMethodology);
    setDefaultView(config.defaultView || (initialMethodology === 'scrum' ? 'sprint' : 'kanban'));
    setEnabledTabs({
      kanban: config.enabledTabs?.kanban !== undefined ? config.enabledTabs.kanban : initialMethodology !== 'scrum',
      sprint: config.enabledTabs?.sprint !== undefined ? config.enabledTabs.sprint : initialMethodology !== 'kanban',
      release: config.enabledTabs?.release !== false
    });
    setAutoSave(config.autoSave ?? true);
    setRankingEnabled(config.rankingEnabled !== false);
    setShowIdeasByDefault(config.kanban?.showIdeasByDefault ?? false);
    setShowDoneHistoryByDefault(config.kanban?.showDoneHistoryByDefault ?? false);
    if (config.kanban?.columns && config.kanban.columns.length > 0) {
      setCustomColumns(JSON.parse(JSON.stringify(config.kanban.columns)));
    } else {
      setCustomColumns(JSON.parse(JSON.stringify(EXPANDED_COLUMNS)));
    }
    if (config.kanban?.simplifiedColumns && config.kanban.simplifiedColumns.length > 0) {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(config.kanban.simplifiedColumns)));
    } else {
      setCustomSimplifiedColumns(JSON.parse(JSON.stringify(SIMPLIFIED_BASE_COLUMNS)));
    }
    setWipLimits(config.kanban?.wipLimits || {});
    if (config.customItemTypes && config.customItemTypes.length > 0) {
      setCustomItemTypes(JSON.parse(JSON.stringify(config.customItemTypes)));
    } else {
      setCustomItemTypes([]);
    }
    setRawJson(JSON.stringify(config, null, 2));
    setJsonError(null);
    setEditingTypeKey(null);
    setTypeFormKey('');
    setTypeFormLabel('');
    setTypeFormColorPreset('indigo');
    setTypeFormIcon('Sparkles');
    setTypeFormDescription('');
    onShowToast?.(t('settings.toastReset'), 'info');
  };

  // DEV-059: Taxonomy & Custom Card Types CRUD handlers
  const handleAddOrUpdateType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = typeFormKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanKey) {
      onShowToast?.(t('settings.toastKeyInvalid'), 'error');
      return;
    }
    if (!typeFormLabel.trim()) {
      onShowToast?.(t('settings.toastLabelInvalid'), 'error');
      return;
    }
    const systemKeys = ['bug', 'feature', 'tech_debt', 'ux', 'epic', 'initiative'];
    if (systemKeys.includes(cleanKey)) {
      onShowToast?.(t('settings.toastKeyReserved', { key: cleanKey }), 'error');
      return;
    }
    if (editingTypeKey !== cleanKey && customItemTypes.some(t => t.key === cleanKey)) {
      onShowToast?.(t('settings.toastKeyExists', { key: cleanKey }), 'error');
      return;
    }

    const preset = ITEM_TYPE_COLOR_PRESETS.find(p => p.id === typeFormColorPreset) || ITEM_TYPE_COLOR_PRESETS[0];

    const typeConfigItem: CustomItemTypeConfig = {
      key: cleanKey,
      label: typeFormLabel.trim(),
      color: preset.color,
      badge: preset.badge,
      dotColor: preset.dotColor,
      iconName: typeFormIcon,
      description: typeFormDescription.trim() || undefined
    };

    if (editingTypeKey) {
      setCustomItemTypes(prev => prev.map(t => t.key === editingTypeKey ? typeConfigItem : t));
      onShowToast?.(t('settings.toastTypeUpdated', { label: typeConfigItem.label }), 'success');
      setEditingTypeKey(null);
    } else {
      setCustomItemTypes(prev => [...prev, typeConfigItem]);
      onShowToast?.(t('settings.toastTypeCreated', { label: typeConfigItem.label }), 'success');
    }

    setTypeFormKey('');
    setTypeFormLabel('');
    setTypeFormColorPreset('indigo');
    setTypeFormIcon('Sparkles');
    setTypeFormDescription('');
  };

  const handleStartEditType = (typeItem: CustomItemTypeConfig) => {
    setEditingTypeKey(typeItem.key);
    setTypeFormKey(typeItem.key);
    setTypeFormLabel(typeItem.label);
    const matchedPreset = ITEM_TYPE_COLOR_PRESETS.find(p => p.color === typeItem.color) || ITEM_TYPE_COLOR_PRESETS[0];
    setTypeFormColorPreset(matchedPreset.id);
    setTypeFormIcon(typeItem.iconName || 'Sparkles');
    setTypeFormDescription(typeItem.description || '');
  };

  const handleCancelEditType = () => {
    setEditingTypeKey(null);
    setTypeFormKey('');
    setTypeFormLabel('');
    setTypeFormColorPreset('indigo');
    setTypeFormIcon('Sparkles');
    setTypeFormDescription('');
  };

  const handleDeleteType = (key: string) => {
    setCustomItemTypes(prev => prev.filter(t => t.key !== key));
    if (editingTypeKey === key) {
      handleCancelEditType();
    }
    onShowToast?.(t('settings.toastTypeDeleted'), 'info');
  };

  // When switching to Advanced tab, refresh JSON
  const handleTabChange = (tab: SettingsTabId) => {
    if (tab === 'advanced') {
      setRawJson(JSON.stringify(builtConfig, null, 2));
      setJsonError(null);
    }
    setActiveTab(tab);
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

  // Keyboard shortcut ⌘S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [builtConfig, activeTab, rawJson]);

  // Kanban column helpers (supporting both Ampliada & Simplificada)
  const activeColumnsList = kanbanEditMode === 'ampliada' ? customColumns : customSimplifiedColumns;
  const setActiveColumnsList = (cols: ColumnConfig[]) => {
    if (kanbanEditMode === 'ampliada') {
      setCustomColumns(cols);
    } else {
      setCustomSimplifiedColumns(cols);
    }
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
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

  // DEV-053: Drag & Drop between column chips
  const [draggingStatus, setDraggingStatus] = useState<{ status: ItemStatus; fromColId: string } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

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
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t('settings.pendingChanges')}
            </span>
          )}

          {/* DEV-074: Botón Deshacer Cambios */}
          {isDirty && (
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all active:scale-[0.98] shadow-xs"
              title={t('settings.discardChangesTitle')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('settings.discardChanges')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98] ${
              hasSavedRecently
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            } disabled:opacity-50`}
          >
            {hasSavedRecently ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('settings.saved')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('settings.saveChanges')}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-indigo-700 rounded border border-indigo-500/30">
                  ⌘S
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-64 shrink-0 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
            {t('settings.navSections')}
          </div>

          <button
            type="button"
            onClick={() => handleTabChange('views')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'views'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Layout className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'views' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navViews')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navViewsDesc')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('kanban')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'kanban'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Sliders className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'kanban' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navKanban')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navKanbanDesc')}</div>
            </div>
          </button>

          {/* DEV-059: Tab Tipos de Tarjeta y Taxonomía */}
          <button
            type="button"
            onClick={() => handleTabChange('taxonomy')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'taxonomy'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Tag className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'taxonomy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navTaxonomy')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navTaxonomyDesc')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('visual')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'visual'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Palette className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'visual' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navVisual')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navVisualDesc')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('tools')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'tools'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Database className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'tools' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navTools')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navToolsDesc')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('advanced')}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === 'advanced'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Code className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'advanced' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold">{t('settings.navAdvanced')}</div>
              <div className="text-[11px] text-slate-500">{t('settings.navAdvancedDesc')}</div>
            </div>
          </button>

          {/* Quick System Info Card */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/[0.08] px-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('settings.systemTitle')}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t('settings.cockpitStorage', { file: '.gripm/config.json' })}
            </p>
          </div>
        </nav>

        {/* Content Details Area */}
        <main className="flex-1 min-w-0 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* TAB 1: FLUJO & VISTAS */}
          {activeTab === 'views' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t('settings.viewsTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('settings.viewsDesc')}
                </p>
              </div>

              {/* Methodology Selector (DEV-038) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('settings.methodologyLabel')}
                    </label>
                    <p className="text-xs text-slate-500">
                      {t('settings.methodologyDesc')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('kanban')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      methodology === 'kanban'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>{t('settings.methodologyKanban')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.methodologyKanbanDesc')}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold">
                        {t('settings.methodologyKanbanBadgeBoard')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-white/10 text-slate-500">
                        {t('settings.methodologyKanbanBadgeSprints')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('scrum')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      methodology === 'scrum'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Target className="w-4 h-4 text-amber-500" />
                      <span>{t('settings.methodologyScrum')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.methodologyScrumDesc')}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold">
                        {t('settings.methodologyScrumBadgeSprints')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-white/10 text-slate-500">
                        {t('settings.methodologyScrumBadgeBoard')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('scrumban')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      methodology === 'scrumban'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <span>{t('settings.methodologyScrumban')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.methodologyScrumbanDesc')}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold">
                        {t('settings.methodologyScrumbanBadgeBoard')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                        {t('settings.methodologyScrumbanBadgeSprints')}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Default View Selector */}
              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t('settings.defaultViewLabel')}
                </label>
                <p className="text-xs text-slate-500">
                  {t('settings.defaultViewDesc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setDefaultView('kanban')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      defaultView === 'kanban'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Layout className="w-4 h-4 text-indigo-500" />
                      <span>{t('header.kanban')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.defaultViewKanbanDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultView('sprint')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      defaultView === 'sprint'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Target className="w-4 h-4 text-amber-500" />
                      <span>{t('header.sprints')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.defaultViewSprintDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultView('release')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      defaultView === 'release'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Rocket className="w-4 h-4 text-emerald-500" />
                      <span>{t('header.releases')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {t('settings.defaultViewReleaseDesc')}
                    </p>
                  </button>
                </div>
              </div>

              {/* Header Visible Tabs */}
              <div className="pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-3">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t('settings.enabledTabsLabel')}
                </label>
                <p className="text-xs text-slate-500">
                  {t('settings.enabledTabsDesc')}
                </p>

                <div className="space-y-3 pt-1">
                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <Layout className="w-4 h-4 text-indigo-500" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{t('header.kanban')}</div>
                        <div className="text-[11px] text-slate-500">
                          {methodology === 'scrumban'
                            ? t('settings.kanbanTabScrumbanDesc')
                            : methodology === 'scrum'
                            ? t('settings.kanbanTabScrumDesc')
                            : t('settings.kanbanTabKanbanDesc')}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabledTabs.kanban}
                      onChange={(e) => {
                        if (!e.target.checked && !enabledTabs.sprint && !enabledTabs.release) return;
                        setEnabledTabs({ ...enabledTabs, kanban: e.target.checked });
                      }}
                      className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{t('header.sprints')}</div>
                        <div className="text-[11px] text-slate-500">
                          {methodology === 'kanban'
                            ? t('settings.sprintTabKanbanDesc')
                            : t('settings.sprintTabScrumDesc')}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabledTabs.sprint}
                      onChange={(e) => {
                        if (!e.target.checked && !enabledTabs.kanban && !enabledTabs.release) return;
                        setEnabledTabs({ ...enabledTabs, sprint: e.target.checked });
                      }}
                      className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <Rocket className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{t('header.releases')}</div>
                        <div className="text-[11px] text-slate-500">{t('settings.releaseTabDesc')}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabledTabs.release}
                      onChange={(e) => {
                        if (!e.target.checked && !enabledTabs.kanban && !enabledTabs.sprint) return;
                        setEnabledTabs({ ...enabledTabs, release: e.target.checked });
                      }}
                      className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABLERO KANBAN */}
          {activeTab === 'kanban' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {t('settings.kanbanColsTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('settings.kanbanColsDesc')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('settings.resetMode', { mode: kanbanEditMode === 'ampliada' ? 'Modo Ampliado' : 'Modo Simple' })}</span>
                </button>
              </div>

              {/* Mode Switcher to configure Ampliada vs Simplificada */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('settings.boardModeToConfig')}
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setKanbanEditMode('ampliada')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        kanbanEditMode === 'ampliada'
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{t('settings.expandedModeBtn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKanbanEditMode('simplificada')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        kanbanEditMode === 'simplificada'
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{t('settings.simplifiedModeBtn')}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  {t('settings.columnsConfigured', { count: activeColumnsList.length })}
                </div>
              </div>

              {/* Ideas Column Toggle */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08]">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('settings.showIdeasLabel')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('settings.showIdeasDesc')}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showIdeasByDefault}
                    onChange={(e) => setShowIdeasByDefault(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Done History Toggle (DEV-058) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08]">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('settings.showDoneHistoryLabel')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('settings.showDoneHistoryDesc')}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDoneHistoryByDefault}
                    onChange={(e) => setShowDoneHistoryByDefault(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Column list editor with Interactive Statuses */}
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                  {kanbanEditMode === 'ampliada' ? t('settings.expandedModeBtn') : t('settings.simplifiedModeBtn')} ({activeColumnsList.length})
                </div>

                {activeColumnsList.map((col, index) => {
                  const currentWip = wipLimits[col.id] || col.wipLimit || 0;

                  return (
                    <div
                      key={col.id}
                      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border shadow-xs space-y-4 transition-all duration-150 ${
                        dragOverColId === col.id && draggingStatus?.fromColId !== col.id
                          ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-300/50 dark:ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/[0.04]'
                          : 'border-slate-200 dark:border-white/[0.08]'
                      }`}
                      onDragOver={(e) => { if (draggingStatus) { e.preventDefault(); setDragOverColId(col.id); } }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColId(null); }}
                      onDrop={(e) => { e.preventDefault(); handleMoveStatusToColumn(col.id); }}
                    >
                      {/* Header: Dot + Title Input + Subtitle + Reorder Buttons */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <span className={`w-3.5 h-3.5 rounded-full ${col.dotColor} shrink-0`} />
                          <div className="flex-1 max-w-sm">
                            <input
                              type="text"
                              value={col.title}
                              onChange={(e) => handleUpdateColumnField(index, 'title', e.target.value)}
                              className="text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-indigo-500 focus:outline-none px-1 text-slate-900 dark:text-white w-full"
                              title={t('settings.editColTitle')}
                            />
                            {col.subtitle && (
                              <p className="text-[10px] text-slate-400 px-1 font-mono">
                                {col.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(index, 'up')}
                            disabled={index === 0}
                            title={t('settings.moveColLeft')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(index, 'down')}
                            disabled={index === activeColumnsList.length - 1}
                            title={t('settings.moveColRight')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* WIP Limit & Drop Target Settings */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.wipLimitLabel')}</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={currentWip || ''}
                            placeholder={t('settings.wipUnlimited')}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const next = { ...wipLimits };
                              if (isNaN(val) || val <= 0) {
                                delete next[col.id];
                              } else {
                                next[col.id] = val;
                              }
                              setWipLimits(next);
                            }}
                            className="w-24 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          />{/* ux-audit-ignore UX-001: integer WIP counter bounded 0-50, not a monetary amount, so a regional decimal comma cannot occur */}
                        </div>

                        <div className="flex items-center gap-2 sm:justify-end">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.dropStatusLabel')}</span>
                          <select
                            value={col.dropTargetStatus || col.statuses[0] || 'draft'}
                            onChange={(e) => handleUpdateColumnField(index, 'dropTargetStatus', e.target.value as ItemStatus)}
                            className="appearance-none px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {col.statuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Interactive Status Remapping */}
                      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('settings.assignedStatuses', { count: col.statuses.length })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t('settings.assignedStatusesDesc')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {draggingStatus && draggingStatus.fromColId !== col.id && (
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 italic animate-pulse">
                              {t('settings.dropHereToMove')}
                            </span>
                          )}
                          {col.statuses.map((st) => (
                            <span
                              key={st}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggingStatus({ status: st as ItemStatus, fromColId: col.id });
                              }}
                              onDragEnd={() => { setDraggingStatus(null); setDragOverColId(null); }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border shadow-2xs group/st cursor-grab active:cursor-grabbing select-none transition-opacity ${
                                draggingStatus?.status === st && draggingStatus?.fromColId === col.id
                                  ? 'opacity-40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20'
                                  : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20'
                              }`}
                            >
                              <span className="text-indigo-300 dark:text-indigo-600 mr-0.5">⠿</span>
                              <span>{st}</span>
                              {col.statuses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStatusFromColumn(col.id, st)}
                                  title={t('settings.removeStatusFromCol', { status: st })}
                                  className="p-0.5 rounded text-indigo-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}

                          {/* Add status selector */}
                          <div className="relative inline-flex items-center">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddStatusToColumn(col.id, e.target.value as ItemStatus);
                                }
                              }}
                              className="appearance-none text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-dashed border-indigo-300 dark:border-indigo-500/30 rounded-lg pl-2.5 pr-6 py-1 cursor-pointer focus:outline-none transition-colors"
                            >
                              <option value="" disabled>{t('settings.assignStatusPrompt')}</option>
                              {ALL_ITEM_STATUSES.filter((s) => !col.statuses.includes(s.id)).map((s) => (
                                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                  {getStatusMeta(s.id).label} ({s.id}) — {s.desc}
                                </option>
                              ))}
                            </select>
                            <Plus className="w-3 h-3 text-indigo-500 pointer-events-none absolute right-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: TIPOS DE TARJETA & TAXONOMÍA (DEV-059) */}
          {activeTab === 'taxonomy' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-500" />
                  <span>{t('settings.taxonomyTitle')}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('settings.taxonomyDesc')}
                </p>
              </div>

              {/* Sección 1: Tipos del Sistema (Nativos) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('settings.systemTypesTitle')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('settings.systemTypesDesc')}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
                    {t('settings.baseTypesCount')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'feature', label: 'Feature', desc: 'Nueva funcionalidad o entrega de valor', icon: '🚀', badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-300' },
                    { key: 'bug', label: 'Bug', desc: 'Defecto, error o comportamiento anómalo', icon: '🐛', badge: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300' },
                    { key: 'tech_debt', label: 'Tech Debt', desc: 'Refactor, optimización o mantenimiento', icon: '🛠️', badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300' },
                    { key: 'ux', label: 'UX/UI', desc: 'Diseño visual, prototipado y accesibilidad', icon: '🎨', badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300' },
                    { key: 'epic', label: 'Epic', desc: 'Gran iniciativa que agrupa historias y tareas', icon: '📚', badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' },
                    { key: 'initiative', label: 'Initiative', desc: 'Objetivo estratégico o hito de alto nivel', icon: '⚡', badge: 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300' },
                  ].map((sys) => (
                    <div key={sys.key} className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                      <div className="text-xl shrink-0 mt-0.5">{sys.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sys.badge}`}>
                            {sys.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">({sys.key})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {sys.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección 2: Tipos Personalizados */}
              <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('settings.customTypesTitle', { count: customItemTypes.length })}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('settings.customTypesDesc')}
                    </p>
                  </div>
                </div>

                {customItemTypes.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-1">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t('settings.noCustomTypes')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t('settings.noCustomTypesHint')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customItemTypes.map((itemType) => {
                      const IconComp = getIconByName(itemType.iconName);
                      const isEditingThis = editingTypeKey === itemType.key;
                      return (
                        <div
                          key={itemType.key}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isEditingThis
                              ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] hover:border-slate-300 dark:hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                                <IconComp className={`w-4 h-4 ${itemType.color}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${itemType.badge}`}>
                                    <IconComp className="w-3 h-3" />
                                    <span>{itemType.label}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    clave: <span className="text-slate-600 dark:text-slate-300 font-semibold">{itemType.key}</span>
                                  </span>
                                </div>
                                {itemType.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {itemType.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditType(itemType)}
                                title={t('common.edit')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteType(itemType.key)}
                                title={t('common.delete')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sección 3: Formulario Crear / Editar Tipo */}
              <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    {editingTypeKey ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
                    <span>{editingTypeKey ? t('settings.editTypeTitle', { name: typeFormLabel || editingTypeKey }) : t('settings.createTypeTitle')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('settings.typeFormDesc')}
                  </p>
                </div>

                <form onSubmit={handleAddOrUpdateType} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Clave Identificadora */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('settings.typeKeyLabel')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={typeFormKey}
                        disabled={!!editingTypeKey}
                        onChange={(e) => setTypeFormKey(e.target.value)}
                        placeholder={t('settings.customTypeKeyPlaceholder')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 font-mono"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('settings.typeKeyHelp')}
                      </p>
                    </div>

                    {/* Nombre Legible */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('settings.typeVisibleLabel')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={typeFormLabel}
                        onChange={(e) => setTypeFormLabel(e.target.value)}
                        placeholder={t('settings.customTypePlaceholder')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('settings.typeVisibleHelp')}
                      </p>
                    </div>
                  </div>

                  {/* Icono & Paleta de Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selector de Icono */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('settings.typeIconLabel')}
                      </label>
                      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 max-h-32 overflow-y-auto">
                        {AVAILABLE_CUSTOM_ICONS.map((iconName) => {
                          const IconComp = getIconByName(iconName);
                          const isSelected = typeFormIcon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => setTypeFormIcon(iconName)}
                              title={iconName}
                              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Paleta de Color Preset */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('settings.typeColorLabel')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {ITEM_TYPE_COLOR_PRESETS.map((preset) => {
                          const isSelected = typeFormColorPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setTypeFormColorPreset(preset.id)}
                              className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-500/10 font-bold ring-1 ring-indigo-500 text-indigo-900 dark:text-white shadow-2xs'
                                  : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${preset.dotColor}`} />
                              <span className="truncate">{preset.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Descripción Opcional */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('settings.typeDescLabel')}
                    </label>
                    <input
                      type="text"
                      value={typeFormDescription}
                      onChange={(e) => setTypeFormDescription(e.target.value)}
                      placeholder={t('settings.typeDescPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Vista Previa en Vivo */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t('settings.badgePreview')}
                    </span>
                    {(() => {
                      const selPreset = ITEM_TYPE_COLOR_PRESETS.find(p => p.id === typeFormColorPreset) || ITEM_TYPE_COLOR_PRESETS[0];
                      const PreviewIcon = getIconByName(typeFormIcon);
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${selPreset.badge}`}>
                            <PreviewIcon className="w-3.5 h-3.5" />
                            <span>{typeFormLabel.trim() || 'Tipo de Muestra'}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            [{typeFormKey.trim() || 'slug'}]
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {editingTypeKey && (
                      <button
                        type="button"
                        onClick={handleCancelEditType}
                        className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
                      >
                        {t('settings.cancelEdit')}
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-[0.98]"
                    >
                      {editingTypeKey ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingTypeKey ? t('settings.updateTypeBtn') : t('settings.addTypeBtn')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: APARIENCIA */}
          {activeTab === 'visual' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t('settings.appearanceTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('settings.appearanceDesc')}
                </p>
              </div>

              {/* Language Selector Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('settings.languageLabel')}</span>
                    </label>
                    <p className="text-xs text-slate-500">
                      {t('settings.languageDesc')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {locale === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('es')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      locale === 'es'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <span className="text-base">🇪🇸</span>
                      <span>{t('settings.langEs')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t('settings.langEsDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      locale === 'en'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <span className="text-base">🇬🇧</span>
                      <span>{t('settings.langEn')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t('settings.langEnDesc')}
                    </p>
                  </button>
                </div>
              </div>

              {/* Theme Selector Cards */}
              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t('settings.themeLabel')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      theme === 'light'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>{t('settings.themeLight')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t('settings.themeLightDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      theme === 'dark'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>{t('settings.themeDark')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t('settings.themeDarkDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      theme === 'system'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span>{t('settings.themeSystem')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t('settings.themeSystemDesc')}
                    </p>
                  </button>
                </div>
              </div>

              {/* Density, AutoSave, and Manual Ranking */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
                {/* 1. Board Density */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {t('settings.densityLabel')}
                    </label>
                    <p className="text-[11px] text-slate-500 mb-3">
                      {t('settings.densityDesc')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDensity('comfortable')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        density === 'comfortable'
                          ? 'bg-white dark:bg-indigo-600/30 border-indigo-500/40 text-indigo-600 dark:text-indigo-200 shadow-xs font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {t('settings.densityComfortable')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensity('compact')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        density === 'compact'
                          ? 'bg-white dark:bg-indigo-600/30 border-indigo-500/40 text-indigo-600 dark:text-indigo-200 shadow-xs font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {t('settings.densityCompact')}
                    </button>
                  </div>
                </div>

                {/* 2. Auto-save on Edit */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between">
                  <label className="flex items-start justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75">
                    <div className="pr-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {t('settings.autoSaveLabel')}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {t('settings.autoSaveDesc')}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer shrink-0 mt-0.5"
                    />
                  </label>
                </div>

                {/* 3. Manual Ranking and Drag & Drop */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between">
                  <label className="flex items-start justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75">
                    <div className="pr-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {t('settings.rankingLabel')}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {t('settings.rankingDesc')}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rankingEnabled}
                      onChange={(e) => setRankingEnabled(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer shrink-0 mt-0.5"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATOS & HERRAMIENTAS */}
          {activeTab === 'tools' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t('settings.toolsTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('settings.toolsDesc')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Import Wizard */}
                <div className="p-5 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('settings.importWizardTitle')}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                        {t('settings.importWizardDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenImportWizard}
                    className="self-start sm:self-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
                  >
                    {t('settings.openWizard')}
                  </button>
                </div>

                {/* Export Monolithic Markdown */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('settings.exportMdTitle')}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                        {t('settings.exportMdDesc')}
                      </p>
                    </div>
                  </div>
                  {currentProject && (
                    <button
                      type="button"
                      onClick={() => onExportMonolithic?.(currentProject.id)}
                      className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shrink-0"
                    >
                      <Download className="w-4 h-4 text-emerald-500" />
                      <span>{t('settings.downloadMd')}</span>
                    </button>
                  )}
                </div>

                {/* Export JSON Backup */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('settings.exportJsonTitle')}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                        {t('settings.exportJsonDesc')}
                      </p>
                    </div>
                  </div>
                  {currentProject && (
                    <button
                      type="button"
                      onClick={() => onExportJson?.(currentProject.id)}
                      className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shrink-0"
                    >
                      <Download className="w-4 h-4 text-amber-500" />
                      <span>{t('settings.downloadJson')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AVANZADO (JSON) */}
          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {t('settings.advancedTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('settings.advancedDesc')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(rawJson);
                      setRawJson(JSON.stringify(parsed, null, 2));
                      setJsonError(null);
                      onShowToast?.(t('settings.toastJsonFormatted'), 'info');
                    } catch (e: any) {
                      setJsonError(`Error de sintaxis: ${e.message}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {t('settings.formatJson')}
                </button>
              </div>

              {jsonError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono">
                  {jsonError}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={rawJson}
                  onChange={(e) => {
                    setRawJson(e.target.value);
                    if (jsonError) setJsonError(null);
                  }}
                  rows={20}
                  className="w-full p-4 rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed shadow-inner"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
