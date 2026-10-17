import React, { useRef, useEffect } from 'react';
import { X, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';
import {
  type FilterState,
  type ItemType,
  type Priority,
  type ItemStatus,
  type CustomItemTypeConfig,
  type EstimationConfig,
  DEFAULT_FIBONACCI,
  DEFAULT_TSHIRT,
} from '../types';
import { useTranslation } from '../utils/i18n';

interface AdvancedFiltersPopoverProps {
  filters: FilterState;
  onChangeFilters: (newFilters: FilterState) => void;
  availableModules: string[];
  availableSprints?: string[];
  availableReleases?: string[];
  isOpen: boolean;
  onClose: () => void;
  activeFiltersCount: number;
  onResetFilters: () => void;
  customItemTypes?: CustomItemTypeConfig[];
  showSprint?: boolean;
  estimationConfig?: EstimationConfig;
}

export const AdvancedFiltersPopover: React.FC<AdvancedFiltersPopoverProps> = ({
  filters,
  onChangeFilters,
  availableModules,
  availableSprints = [],
  availableReleases = [],
  isOpen,
  onClose,
  activeFiltersCount,
  onResetFilters,
  customItemTypes = [],
  showSprint = true,
  estimationConfig,
}) => {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  const baseTypeOptions: { id: ItemType; label: string; icon: string }[] = [
    { id: 'feature', label: t('type.feature'), icon: '🚀' },
    { id: 'bug', label: t('type.bug'), icon: '🐛' },
    { id: 'tech_debt', label: t('type.tech_debt'), icon: '🛠️' },
    { id: 'ux', label: t('type.ux'), icon: '🎨' },
    { id: 'epic', label: t('type.epic'), icon: '📚' },
    { id: 'initiative', label: t('type.initiative'), icon: '⚡' },
  ];

  const priorityOptions: { id: Priority; label: string; dot: string }[] = [
    { id: 'p0', label: `P0 - ${t('priority.urgent')}`, dot: 'bg-rose-500' },
    { id: 'p1', label: `P1 - ${t('priority.high')}`, dot: 'bg-amber-500' },
    { id: 'p2', label: `P2 - ${t('priority.medium')}`, dot: 'bg-yellow-400' },
    { id: 'p3', label: `P3 - ${t('priority.low')}`, dot: 'bg-slate-400' },
  ];

  const flowStatusOptions: { id: ItemStatus; label: string; dot: string; icon: string }[] = [
    { id: 'draft', label: t('status.draft'), dot: 'bg-indigo-500', icon: '📋' },
    { id: 'doing', label: t('status.doing'), dot: 'bg-amber-500', icon: '⚡' },
    { id: 'blocked', label: t('status.blocked'), dot: 'bg-red-500', icon: '⛔' },
    { id: 'review', label: t('status.review'), dot: 'bg-purple-500', icon: '🔍' },
    { id: 'ready', label: t('status.ready'), dot: 'bg-teal-500', icon: '🚀' },
    { id: 'done', label: t('status.done'), dot: 'bg-emerald-500', icon: '✅' },
  ];

  const typeOptions = [
    ...baseTypeOptions,
    ...customItemTypes.map((c) => ({
      id: c.key as ItemType,
      label: c.label,
      icon: '🏷️'
    }))
  ];

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Type toggle
  const toggleType = (t: ItemType) => {
    const currentTypes = filters.types && filters.types.length > 0
      ? [...filters.types]
      : filters.type !== 'all' ? [filters.type] : [];
    const index = currentTypes.indexOf(t);
    if (index >= 0) {
      currentTypes.splice(index, 1);
    } else {
      currentTypes.push(t);
    }
    onChangeFilters({
      ...filters,
      types: currentTypes,
      type: currentTypes.length === 1 ? currentTypes[0] : 'all',
    });
  };

  // Priority toggle
  const togglePriority = (p: Priority) => {
    const currentPriorities = filters.priorities && filters.priorities.length > 0
      ? [...filters.priorities]
      : filters.priority !== 'all' ? [filters.priority] : [];
    const index = currentPriorities.indexOf(p);
    if (index >= 0) {
      currentPriorities.splice(index, 1);
    } else {
      currentPriorities.push(p);
    }
    onChangeFilters({
      ...filters,
      priorities: currentPriorities,
      priority: currentPriorities.length === 1 ? currentPriorities[0] : 'all',
    });
  };

  // Flow status toggle
  const toggleFlowStatus = (st: ItemStatus) => {
    const currentStatuses = filters.statuses ? [...filters.statuses] : [];
    const index = currentStatuses.indexOf(st);
    if (index >= 0) {
      currentStatuses.splice(index, 1);
    } else {
      currentStatuses.push(st);
    }
    onChangeFilters({
      ...filters,
      statuses: currentStatuses,
    });
  };

  // Estimate toggle
  const toggleEstimate = (est: string | number) => {
    const currentEstimates = filters.estimates ? [...filters.estimates] : [];
    const index = currentEstimates.indexOf(est);
    if (index >= 0) {
      currentEstimates.splice(index, 1);
    } else {
      currentEstimates.push(est);
    }
    onChangeFilters({
      ...filters,
      estimates: currentEstimates,
    });
  };

  const selectedEstimates = new Set(filters.estimates || []);

  const selectedTypes = new Set(
    filters.types && filters.types.length > 0
      ? filters.types
      : filters.type !== 'all' ? [filters.type] : []
  );

  const selectedPriorities = new Set(
    filters.priorities && filters.priorities.length > 0
      ? filters.priorities
      : filters.priority !== 'all' ? [filters.priority] : []
  );

  const selectedFlowStatuses = (filters.statuses || []).filter(
    (st) => st !== 'ideas' && st !== 'dismissed' && (st as any) !== 'cancelled'
  );

  const ACTIVE_FLOW_STATUSES: ItemStatus[] = ['draft', 'doing', 'review', 'ready'];
  const isAllActiveFlow =
    selectedFlowStatuses.length === 0 ||
    (selectedFlowStatuses.length === 4 && ACTIVE_FLOW_STATUSES.every((st) => selectedFlowStatuses.includes(st)));

  const selectedSprints = new Set(
    filters.sprints && filters.sprints.length > 0
      ? filters.sprints
      : filters.sprint && filters.sprint !== 'all'
      ? [filters.sprint]
      : []
  );

  const toggleSprint = (s: string) => {
    const current = new Set(selectedSprints);
    if (current.has(s)) {
      current.delete(s);
    } else {
      current.add(s);
    }
    const arr = Array.from(current);
    onChangeFilters({
      ...filters,
      sprints: arr,
      sprint: arr.length === 1 ? arr[0] : (arr.length === 0 ? 'all' : filters.sprint || 'all'),
    });
  };

  const selectedReleases = new Set(
    filters.releases && filters.releases.length > 0
      ? filters.releases
      : filters.release && filters.release !== 'all'
      ? [filters.release]
      : []
  );

  const toggleRelease = (r: string) => {
    const current = new Set(selectedReleases);
    if (current.has(r)) {
      current.delete(r);
    } else {
      current.add(r);
    }
    const arr = Array.from(current);
    onChangeFilters({
      ...filters,
      releases: arr,
      release: arr.length === 1 ? arr[0] : (arr.length === 0 ? 'all' : filters.release || 'all'),
    });
  };

  const selectedModules = new Set(
    filters.modules && filters.modules.length > 0
      ? filters.modules
      : filters.module && filters.module !== 'all'
      ? [filters.module]
      : []
  );

  const toggleModule = (m: string) => {
    const current = new Set(selectedModules);
    if (current.has(m)) {
      current.delete(m);
    } else {
      current.add(m);
    }
    const arr = Array.from(current);
    onChangeFilters({
      ...filters,
      modules: arr,
      module: arr.length === 1 ? arr[0] : (arr.length === 0 ? 'all' : filters.module || 'all'),
    });
  };

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl filters-popover z-50 p-4 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {t('filter.advancedTitle')}
          </span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Restablecer todos los filtros"
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('filter.clear', { count: activeFiltersCount })}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section 1: Inclusiones Especiales (Ideas & Descartados) */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('filter.inclusionsTitle')}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeFilters({ ...filters, includeIdeas: !filters.includeIdeas })}
            className={`flex min-w-0 items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              filters.includeIdeas
                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">💡</span>
              <span className="truncate">{t('status.ideas')}</span>
            </div>
            {filters.includeIdeas && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeFilters({
                ...filters,
                includeDismissedCancelled: !filters.includeDismissedCancelled,
              })
            }
            className={`flex min-w-0 items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              filters.includeDismissedCancelled
                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">🚫</span>
              <span className="truncate">{t('status.dismissed')} / {t('status.cancelled')}</span>
            </div>
            {filters.includeDismissedCancelled && (
              <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Section 2: Filtrar por Estado del Flujo */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('filter.statusFilter')}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {isAllActiveFlow
              ? t('filter.allActiveFlow')
              : t('filter.selectedCount', { count: selectedFlowStatuses.length })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          {/* Quick All button */}
          <button
            type="button"
            onClick={() => onChangeFilters({ ...filters, statuses: [] })}
            className={`flex min-w-0 items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all col-span-2 ${
              isAllActiveFlow
                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">✨</span>
              <span className="truncate">{t('filter.allActiveFlow')}</span>
            </div>
            {isAllActiveFlow && (
              <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
          </button>

          {/* Individual flow statuses */}
          {flowStatusOptions.map((st) => {
            const isSelected = selectedFlowStatuses.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggleFlowStatus(st.id)}
                className={`flex min-w-0 items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                    : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs">{st.icon}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <span className="truncate">{st.label}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Tipo de Ítem (Multiselect) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('filter.itemType')}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {typeOptions.map((tItem) => {
            const isSelected = selectedTypes.has(tItem.id);
            return (
              <button
                key={tItem.id}
                type="button"
                onClick={() => toggleType(tItem.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{tItem.icon}</span>
                  <span>{tItem.label}</span>
                </span>
                {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Prioridad (Multiselect) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('filter.priority')}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {priorityOptions.map((p) => {
            const isSelected = selectedPriorities.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePriority(p.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  <span>{p.label}</span>
                </span>
                {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 4: Sprint & Release */}
      {(showSprint || availableReleases.length > 0) && (
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          {/* Sprint */}
          {showSprint && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('itemModal.sprintLabel')}
                </span>
                {selectedSprints.size > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {t('filter.selectedCount', { count: selectedSprints.size })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableSprints.map((s) => {
                  const isSelected = selectedSprints.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSprint(s)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{s}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => toggleSprint('backlog')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    selectedSprints.has('backlog') || selectedSprints.has('no_sprint')
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{t('filter.noSprint')}</span>
                  {(selectedSprints.has('backlog') || selectedSprints.has('no_sprint')) && (
                    <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Release */}
          {availableReleases.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('filter.targetRelease')}
                </span>
                {selectedReleases.size > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {t('filter.selectedCount', { count: selectedReleases.size })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableReleases.map((r) => {
                  const isSelected = selectedReleases.has(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRelease(r)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>v{r}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 5: Módulo / Área */}
      {availableModules.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t('filter.moduleArea')}
            </span>
            {selectedModules.size > 0 && (
              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {t('filter.selectedCount', { count: selectedModules.size })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {availableModules.map((m) => {
              const isSelected = selectedModules.has(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleModule(m)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{m}</span>
                  {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6: Estimación */}
      {estimationConfig?.enabled && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
              {t('filter.estimation')}
            </span>
            {selectedEstimates.size > 0 && (
              <span className="text-xs text-slate-400 font-mono shrink-0">
                {t('filter.selectedCount', { count: selectedEstimates.size })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(estimationConfig.method === 'tshirt'
              ? (estimationConfig.customTshirt || DEFAULT_TSHIRT)
              : (estimationConfig.customFibonacci || DEFAULT_FIBONACCI)
            ).map((val) => {
              const isSelected = selectedEstimates.has(val);
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => toggleEstimate(val)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {estimationConfig.method === 'fibonacci' ? `${val} pts` : val}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
