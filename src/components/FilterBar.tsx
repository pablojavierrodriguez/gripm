import { useState, useRef, useEffect, useMemo, type FC } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { FilterState, ItemType, Priority, ItemStatus, CustomItemTypeConfig, EstimationConfig } from '../types';
import { AdvancedFiltersPopover } from './AdvancedFiltersPopover';
import { useTranslation } from '../utils/i18n';

export interface ActiveFilterChip {
  id: string;
  dimension: string;
  value: string;
  type: 'module' | 'sprint' | 'release' | 'status' | 'estimate' | 'customType';
  rawKey?: string | number;
}

export interface ActiveFilterChipOptions {
  showSprint?: boolean;
  customItemTypes?: CustomItemTypeConfig[];
  labels?: {
    module?: string;
    sprint?: string;
    release?: string;
    status?: string;
    include?: string;
    estimate?: string;
    type?: string;
    noSprint?: string;
    allActiveFlow?: string;
    statusLabels?: Record<string, string>;
  };
}

export function getActiveFilterChips(
  filters: FilterState,
  options?: ActiveFilterChipOptions
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const labels = options?.labels;
  const showSprint = options?.showSprint ?? true;
  const customTypes = options?.customItemTypes || [];

  // 1. Status Filter Chips
  // Inclusions:
  if (filters.includeIdeas) {
    chips.push({
      id: 'include-ideas',
      dimension: labels?.include || 'Incluir',
      value: labels?.statusLabels?.['ideas'] || 'Ideas',
      type: 'status',
      rawKey: 'ideas',
    });
  }
  if (filters.includeDismissedCancelled) {
    chips.push({
      id: 'include-dismissed',
      dimension: labels?.include || 'Incluir',
      value: labels?.statusLabels?.['dismissed'] || 'Descartados',
      type: 'status',
      rawKey: 'dismissed',
    });
  }

  // Explicit lifecycle status filter (if user selected specific statuses):
  const fAny = filters as any;
  if (fAny.status && fAny.status !== 'all') {
    const isSpecialActive = fAny.status === 'active' || fAny.status === 'all_active';
    chips.push({
      id: `status-${fAny.status}`,
      dimension: labels?.status || 'Estado',
      value: isSpecialActive
        ? (labels?.allActiveFlow || 'Estados activos')
        : (labels?.statusLabels?.[fAny.status] || String(fAny.status)),
      type: 'status',
      rawKey: fAny.status,
    });
  }

  const explicitStatuses = (filters.statuses || []).filter(
    (st) => st !== 'ideas' && st !== 'dismissed' && (st as any) !== 'cancelled'
  );

  const ACTIVE_FLOW_STATUSES: ItemStatus[] = ['draft', 'doing', 'review', 'ready'];
  const isExplicitActiveFlow =
    explicitStatuses.length === 4 &&
    ACTIVE_FLOW_STATUSES.every((st) => explicitStatuses.includes(st));

  if (isExplicitActiveFlow) {
    chips.push({
      id: 'statuses-multi',
      dimension: labels?.status || 'Estados',
      value: labels?.allActiveFlow || 'Estados activos',
      type: 'status',
      rawKey: '__all_custom__',
    });
  } else if (explicitStatuses.length === 1 || explicitStatuses.length === 2) {
    explicitStatuses.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        dimension: labels?.status || 'Estado',
        value: labels?.statusLabels?.[st] || st,
        type: 'status',
        rawKey: st,
      });
    });
  } else if (explicitStatuses.length >= 3) {
    chips.push({
      id: 'statuses-multi',
      dimension: labels?.status || 'Estados',
      value: `${explicitStatuses.length} activos`,
      type: 'status',
      rawKey: '__all_custom__',
    });
  }

  // 2. Module
  const seenModules = new Set<string>();
  if (filters.modules && filters.modules.length > 0) {
    filters.modules.forEach((mod) => {
      if (mod && mod !== 'all') {
        seenModules.add(mod);
        chips.push({
          id: `mod-${mod}`,
          dimension: labels?.module || 'Módulo',
          value: mod,
          type: 'module',
          rawKey: mod,
        });
      }
    });
  }
  if (filters.module && filters.module !== 'all' && !seenModules.has(filters.module)) {
    chips.push({
      id: `mod-${filters.module}`,
      dimension: labels?.module || 'Módulo',
      value: filters.module,
      type: 'module',
      rawKey: filters.module,
    });
  }

  // 3. Sprint
  if (showSprint) {
    const seenSprints = new Set<string>();
    const formatSprintVal = (sp: string) =>
      sp === 'backlog' || sp === 'no_sprint' ? (labels?.noSprint || 'Sin Sprint') : sp;

    if (filters.sprints && filters.sprints.length > 0) {
      filters.sprints.forEach((sp) => {
        if (sp && sp !== 'all') {
          seenSprints.add(sp);
          chips.push({
            id: `sp-${sp}`,
            dimension: labels?.sprint || 'Sprint',
            value: formatSprintVal(sp),
            type: 'sprint',
            rawKey: sp,
          });
        }
      });
    }
    if (filters.sprint && filters.sprint !== 'all' && !seenSprints.has(filters.sprint)) {
      chips.push({
        id: `sp-${filters.sprint}`,
        dimension: labels?.sprint || 'Sprint',
        value: formatSprintVal(filters.sprint),
        type: 'sprint',
        rawKey: filters.sprint,
      });
    }
  }

  // 4. Release
  const seenReleases = new Set<string>();
  const formatReleaseVal = (rel: string) => (rel.startsWith('v') ? rel : `v${rel}`);

  if (filters.releases && filters.releases.length > 0) {
    filters.releases.forEach((rel) => {
      if (rel && rel !== 'all') {
        seenReleases.add(rel);
        chips.push({
          id: `rel-${rel}`,
          dimension: labels?.release || 'Release',
          value: formatReleaseVal(rel),
          type: 'release',
          rawKey: rel,
        });
      }
    });
  }
  if (filters.release && filters.release !== 'all' && !seenReleases.has(filters.release)) {
    chips.push({
      id: `rel-${filters.release}`,
      dimension: labels?.release || 'Release',
      value: formatReleaseVal(filters.release),
      type: 'release',
      rawKey: filters.release,
    });
  }

  // 5. Estimates
  if (filters.estimates && filters.estimates.length > 0) {
    filters.estimates.forEach((est) => {
      chips.push({
        id: `est-${est}`,
        dimension: labels?.estimate || 'Estimación',
        value: `${est}`,
        type: 'estimate',
        rawKey: est,
      });
    });
  }

  // 6. Non-standard types (e.g. epic, initiative)
  const standardTypes = new Set(['bug', 'feature', 'tech_debt', 'ux', ...customTypes.map((c) => c.key)]);
  const currentTypes = filters.types && filters.types.length > 0
    ? filters.types
    : filters.type !== 'all' ? [filters.type] : [];

  currentTypes.forEach((tId) => {
    if (!standardTypes.has(tId)) {
      chips.push({
        id: `type-${tId}`,
        dimension: labels?.type || 'Tipo',
        value: tId,
        type: 'customType',
        rawKey: tId,
      });
    }
  });

  return chips;
}

export function removeFilterFromState(
  filters: FilterState,
  chip: ActiveFilterChip
): FilterState {
  const next: FilterState = { ...filters };

  switch (chip.type) {
    case 'module': {
      const mod = String(chip.rawKey ?? chip.value);
      if (next.modules && next.modules.length > 0) {
        const nextMods = next.modules.filter((m) => m !== mod);
        next.modules = nextMods;
        if (next.module === mod) {
          next.module = nextMods.length === 1 ? nextMods[0] : (nextMods.length === 0 ? 'all' : next.module);
        }
      } else {
        next.module = 'all';
      }
      break;
    }
    case 'sprint': {
      const sp = String(chip.rawKey ?? chip.value);
      if (next.sprints && next.sprints.length > 0) {
        const nextSprints = next.sprints.filter((s) => s !== sp);
        next.sprints = nextSprints;
        if (next.sprint === sp) {
          next.sprint = nextSprints.length === 1 ? nextSprints[0] : (nextSprints.length === 0 ? 'all' : next.sprint);
        }
      } else {
        next.sprint = 'all';
      }
      break;
    }
    case 'release': {
      const rel = String(chip.rawKey ?? chip.value);
      if (next.releases && next.releases.length > 0) {
        const nextReleases = next.releases.filter((r) => r !== rel);
        next.releases = nextReleases;
        if (next.release === rel) {
          next.release = nextReleases.length === 1 ? nextReleases[0] : (nextReleases.length === 0 ? 'all' : next.release);
        }
      } else {
        next.release = 'all';
      }
      break;
    }
    case 'status': {
      if (chip.rawKey === 'ideas') {
        next.includeIdeas = false;
        if (next.statuses) {
          next.statuses = next.statuses.filter((s) => s !== 'ideas');
        }
      } else if (chip.rawKey === 'dismissed') {
        next.includeDismissedCancelled = false;
        if (next.statuses) {
          next.statuses = next.statuses.filter((s) => s !== 'dismissed' && (s as any) !== 'cancelled');
        }
      } else if (chip.rawKey === '__all_custom__') {
        next.statuses = [];
      } else {
        const st = (chip.rawKey ?? chip.value) as ItemStatus;
        const fAny = next as any;
        if (fAny.status === st) {
          delete fAny.status;
        }
        if (next.statuses) {
          next.statuses = next.statuses.filter((s) => s !== st);
        }
      }
      break;
    }
    case 'estimate': {
      const est = chip.rawKey !== undefined ? chip.rawKey : chip.value;
      if (next.estimates) {
        next.estimates = next.estimates.filter((e) => String(e) !== String(est));
      }
      break;
    }
    case 'customType': {
      const tId = (chip.rawKey ?? chip.value) as ItemType;
      if (next.types && next.types.length > 0) {
        const nextTypes = next.types.filter((t) => t !== tId);
        next.types = nextTypes;
        if (next.type === tId) {
          next.type = nextTypes.length === 1 ? nextTypes[0] : 'all';
        }
      } else if (next.type === tId) {
        next.type = 'all';
      }
      break;
    }
  }

  return next;
}

/**
 * Soporte para compatibilidad con módulo múltiple (DEV-287):
 * Al evaluar filters.module, verificar (!filters.module || it.module === filters.module || it.modules?.includes(filters.module))
 */
export function itemMatchesModule(
  it: { module?: string; modules?: string[] },
  filterModule?: string
): boolean {
  return (
    !filterModule ||
    filterModule === 'all' ||
    it.module === filterModule ||
    Boolean(it.modules?.includes(filterModule))
  );
}

export const itemMatchesModuleFilter = itemMatchesModule;
export const matchesModule = itemMatchesModule;

interface FilterBarProps {
  filters: FilterState;
  onChangeFilters: (newFilters: FilterState) => void;
  availableModules: string[];
  availableSprints?: string[];
  availableReleases?: string[];
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  customItemTypes?: CustomItemTypeConfig[];
  showSprint?: boolean;
  estimationConfig?: EstimationConfig;
  showStats?: boolean;
}

export const FilterBar: FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  availableModules,
  availableSprints = [],
  availableReleases = [],
  stats,
  customItemTypes = [],
  showSprint = true,
  estimationConfig,
  showStats = true,
}) => {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync if parent clears or changes search externally
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounced search update to prevent keyboard typing lag
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChangeFilters({ ...filters, search: localSearch });
      }
    }, 150);
    return () => clearTimeout(handler);
  }, [localSearch, filters, onChangeFilters]);

  // Keyboard shortcut Cmd+K or Ctrl+K or / to focus search input (QW-2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute active filters count
  const fAny = filters as any;
  const hasSingularStatus = Boolean(fAny.status && fAny.status !== 'all');
  const hasIdeas = Boolean(filters.includeIdeas);
  const hasDismissed = Boolean(filters.includeDismissedCancelled);
  const explicitStatuses = (filters.statuses || []).filter(
    (st) => st !== 'ideas' && st !== 'dismissed' && (st as any) !== 'cancelled'
  );
  const statusFilterCount = explicitStatuses.length >= 3 ? 1 : explicitStatuses.length;

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.types && filters.types.length > 0 ? filters.types.length : filters.type !== 'all' ? 1 : 0) +
    (filters.priorities && filters.priorities.length > 0 ? filters.priorities.length : filters.priority !== 'all' ? 1 : 0) +
    (hasIdeas ? 1 : 0) +
    (hasDismissed ? 1 : 0) +
    (hasSingularStatus ? 1 : 0) +
    statusFilterCount +
    (showSprint && ((filters.sprint && filters.sprint !== 'all') || (filters.sprints && filters.sprints.length > 0)) ? (filters.sprints?.length || 1) : 0) +
    ((filters.release && filters.release !== 'all') || (filters.releases && filters.releases.length > 0) ? (filters.releases?.length || 1) : 0) +
    ((filters.module && filters.module !== 'all') || (filters.modules && filters.modules.length > 0) ? (filters.modules?.length || 1) : 0) +
    (filters.estimates && filters.estimates.length > 0 ? filters.estimates.length : 0);

  const resetFilters = () => {
    setLocalSearch('');
    onChangeFilters({
      search: '',
      type: 'all',
      types: [],
      priority: 'all',
      priorities: [],
      statuses: [],
      includeIdeas: false,
      includePreviousDone: false,
      includeDismissedCancelled: false,
      module: 'all',
      modules: [],
      sprint: 'all',
      sprints: [],
      release: 'all',
      releases: [],
      estimates: [],
    });
  };

  const activeChips = useMemo(() => {
    return getActiveFilterChips(filters, {
      showSprint,
      customItemTypes,
      labels: {
        module: t('itemModal.moduleLabel') || 'Módulo',
        sprint: t('itemModal.sprintLabel') || 'Sprint',
        release: 'Release',
        status: t('itemModal.statusLabel') || 'Estado',
        include: t('filter.include') || 'Incluir',
        estimate: t('filter.estimation') || 'Estimación',
        type: t('itemModal.typeLabel') || 'Tipo',
        noSprint: t('filter.noSprint') || 'Sin Sprint',
        allActiveFlow: t('filter.allActiveFlow') || 'Estados activos',
        statusLabels: {
          ideas: t('status.ideas'),
          draft: t('status.draft'),
          doing: t('status.doing'),
          review: t('status.review'),
          ready: t('status.ready'),
          done: t('status.done'),
          dismissed: t('status.dismissed'),
          cancelled: t('status.cancelled'),
          active: t('filter.allActiveFlow') || 'Estados activos',
        },
      },
    });
  }, [filters, showSprint, customItemTypes, t]);

  // Quick type click
  const handleQuickType = (t: ItemType | 'all') => {
    if (t === 'all') {
      onChangeFilters({ ...filters, type: 'all', types: [] });
    } else {
      const current = filters.types && filters.types.length > 0
        ? [...filters.types]
        : filters.type !== 'all' ? [filters.type] : [];
      const idx = current.indexOf(t);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(t);
      }
      onChangeFilters({
        ...filters,
        types: current,
        type: current.length === 1 ? current[0] : 'all',
      });
    }
  };

  // Quick priority click
  const handleQuickPriority = (p: Priority | 'all') => {
    if (p === 'all') {
      onChangeFilters({ ...filters, priority: 'all', priorities: [] });
    } else {
      const current = filters.priorities && filters.priorities.length > 0
        ? [...filters.priorities]
        : filters.priority !== 'all' ? [filters.priority] : [];
      const idx = current.indexOf(p);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(p);
      }
      onChangeFilters({
        ...filters,
        priorities: current,
        priority: current.length === 1 ? current[0] : 'all',
      });
    }
  };

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

  return (
    <div className="w-full border-b border-slate-200 dark:border-white/[0.06] bg-white/70 dark:bg-[#0c111c]/60 backdrop-blur-sm py-2 transition-colors relative z-10">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Left Fixed: Search + Advanced Filters Popover (no overflow clipping) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative w-36 sm:w-44 lg:w-52 xl:w-60 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t('filter.searchPlaceholder')}
                className="w-full pl-8 pr-12 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
              />
              {localSearch ? (
                <button
                  onClick={() => {
                    setLocalSearch('');
                    onChangeFilters({ ...filters, search: '' });
                  }}
                  aria-label={t('filters.clearSearch')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-mono border border-slate-300 dark:border-white/[0.06]">
                  ⌘K /
                </kbd>
              )}
            </div>

            {/* Advanced Filters Button (with Popover dropdown) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors select-none shrink-0 ${
                  isPopoverOpen || activeFiltersCount > 0
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>{t('filter.filters')}</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-[#0c111c] animate-in zoom-in-75 duration-100">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <AdvancedFiltersPopover
                filters={filters}
                onChangeFilters={onChangeFilters}
                availableModules={availableModules}
                availableSprints={availableSprints}
                availableReleases={availableReleases}
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                activeFiltersCount={activeFiltersCount}
                onResetFilters={resetFilters}
                customItemTypes={customItemTypes}
                showSprint={showSprint}
                estimationConfig={estimationConfig}
              />
            </div>
          </div>

          {/* Center / Scrollable: Active Chips + Quick Filter Pills */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-none scroll-smooth">
            {/* Active Dismissible Filter Chips (DEV-272) */}
            {activeChips.length > 0 && (
              <div
                className="flex items-center gap-1.5 shrink-0"
                role="region"
                aria-label={t('filter.filters')}
              >
                {activeChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 animate-in fade-in zoom-in-95 duration-100 shrink-0 select-none group"
                  >
                    <span className="text-indigo-500/75 dark:text-indigo-400/75 font-normal">
                      {chip.dimension}:
                    </span>
                    <span className="font-semibold">{chip.value}</span>
                    <button
                      type="button"
                      onClick={() => onChangeFilters(removeFilterFromState(filters, chip))}
                      aria-label={`${t('common.clear')} ${chip.dimension}: ${chip.value}`}
                      title={`${t('common.clear')} ${chip.dimension}: ${chip.value}`}
                      className="min-h-[22px] min-w-[22px] flex items-center justify-center p-0.5 ml-0.5 rounded-md text-indigo-400 hover:text-indigo-700 dark:hover:text-white hover:bg-indigo-500/20 active:bg-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer touch-manipulation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block shrink-0" />

            {/* Quick Type Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-0.5 rounded-lg text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleQuickType('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedTypes.size === 0
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('common.all')}
              </button>
              {[
                { id: 'bug' as ItemType, label: '🐛 Bug' },
                { id: 'feature' as ItemType, label: '🚀 Feature' },
                { id: 'tech_debt' as ItemType, label: '🛠️ Tech' },
                { id: 'ux' as ItemType, label: '🎨 UX' },
                ...customItemTypes.map((c) => ({
                  id: c.key as ItemType,
                  label: `🏷️ ${c.label}`
                }))
              ].map((tItem) => {
                const isSelected = selectedTypes.has(tItem.id);
                return (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => handleQuickType(tItem.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tItem.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Priority Filter Pills */}
            <div className="hidden 2xl:flex items-center gap-1 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-0.5 rounded-lg text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleQuickPriority('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedPriorities.size === 0
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('filter.prioAll')}
              </button>
              {(
                [
                  { id: 'p0', label: 'P0', dot: 'bg-rose-500' },
                  { id: 'p1', label: 'P1', dot: 'bg-amber-500' },
                  { id: 'p2', label: 'P2', dot: 'bg-yellow-400' },
                  { id: 'p3', label: 'P3', dot: 'bg-slate-400' },
                ] as const
              ).map((p) => {
                const isSelected = selectedPriorities.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPriority(p.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Reset Filters button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-500/10 transition-colors shrink-0 animate-in fade-in duration-100"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('filter.clear', { count: activeFiltersCount })}</span>
              </button>
            )}
          </div>

          {/* Right: Stats Summary */}
          {showStats && (
            <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0 pl-3 border-l border-slate-200 dark:border-white/10 tabular-nums">
              <span>{t('filter.pending', { count: stats.pending })}</span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span>{t('filter.inProgress', { count: stats.inProgress })}</span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">{t('filter.completed', { count: stats.completed })}</span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="text-slate-800 dark:text-slate-300 font-semibold">{t('filter.total', { count: stats.total })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
