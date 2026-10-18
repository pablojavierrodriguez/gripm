import React, { useState, useEffect, useMemo, useRef, type FC } from 'react';
import {
  Search,
  X,
  LayoutGrid,
  Target,
  Rocket,
  Trash2,
  Settings,
  Keyboard,
  Plus,
  Folder,
  FolderPlus,
  Sun,
  Moon,
  Globe,
  RefreshCw,
  Calendar,
  BarChart2,
  SearchX,
} from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Modal } from './Modal';
import { getStatusMeta, type StatusMeta } from '../utils/statusMeta';
import type { BacklogItem, Project, GripmConfig, ActiveTab } from '../types';
import {
  isSprintModuleActive,
  isReleaseModuleActive,
  isTimelineModuleActive,
  isMetricsModuleActive,
} from '../types';

export type PaletteCategory = 'tasks' | 'navigation' | 'actions' | 'projects';

export interface PaletteItem {
  id: string;
  type: 'command' | 'task';
  category: PaletteCategory;
  title: string;
  subtitle?: string;
  keywords?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  statusMeta?: StatusMeta;
  task?: BacklogItem;
  onSelect: () => void;
}

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BacklogItem[];
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onSelectItem: (item: BacklogItem) => void;
  onNewItem: () => void;
  onNewProject?: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  config?: GripmConfig;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResyncDocs: () => void;
  onOpenShortcuts: () => void;
  language: string;
  onToggleLanguage: () => void;
}

export const CommandPaletteModal: FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  items,
  projects,
  activeProjectId,
  onSelectProject,
  onSelectItem,
  onNewItem,
  onNewProject,
  onSelectTab,
  config,
  isDarkMode,
  onToggleTheme,
  onResyncDocs,
  onOpenShortcuts,
  language,
  onToggleLanguage,
}) => {
  const { t } = useTranslation();
  // Order of hooks: useFocusTrap MUST be called before any early return (DEV-234)
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Reset state and focus input whenever palette is opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Tab feature flags
  const isSprintTabEnabled = isSprintModuleActive(config) && (
    config?.enabledTabs?.sprint !== undefined
      ? config.enabledTabs.sprint
      : config?.methodology === 'scrum' || config?.methodology === 'scrumban'
  );
  const isReleaseTabEnabled = isReleaseModuleActive(config) && (config?.enabledTabs?.release !== false);
  const isTimelineTabEnabled = isTimelineModuleActive(config) && (config?.enabledTabs?.timeline !== false);
  const isMetricsTabEnabled = isMetricsModuleActive(config) && (config?.enabledTabs?.metrics !== false);

  // Static commands catalog
  const staticCommands = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];

    // Category: Navigation
    list.push({
      id: 'nav-kanban',
      type: 'command',
      category: 'navigation',
      title: t('palette.navKanban'),
      subtitle: t('palette.navKanbanDesc'),
      icon: LayoutGrid,
      badge: '1',
      keywords: ['kanban', 'tablero', 'board', 'cards', 'tarjetas', 'vista', 'view', 'navegacion', 'navigation'],
      onSelect: () => onSelectTab('kanban'),
    });

    if (isSprintTabEnabled) {
      list.push({
        id: 'nav-sprints',
        type: 'command',
        category: 'navigation',
        title: t('palette.navSprints'),
        subtitle: t('palette.navSprintsDesc'),
        icon: Target,
        badge: '2',
        keywords: ['sprints', 'sprint', 'backlog', 'plan', 'iteracion', 'iteration'],
        onSelect: () => onSelectTab('sprint'),
      });
    }

    if (isReleaseTabEnabled) {
      list.push({
        id: 'nav-releases',
        type: 'command',
        category: 'navigation',
        title: t('palette.navReleases'),
        subtitle: t('palette.navReleasesDesc'),
        icon: Rocket,
        badge: '3',
        keywords: ['releases', 'versiones', 'release', 'deploy', 'entregas', 'version'],
        onSelect: () => onSelectTab('release'),
      });
    }

    if (isTimelineTabEnabled) {
      list.push({
        id: 'nav-timeline',
        type: 'command',
        category: 'navigation',
        title: t('palette.navTimeline'),
        subtitle: t('palette.navTimelineDesc'),
        icon: Calendar,
        keywords: ['timeline', 'roadmap', 'cronograma', 'gantt', 'fechas', 'hitos'],
        onSelect: () => onSelectTab('timeline'),
      });
    }

    if (isMetricsTabEnabled) {
      list.push({
        id: 'nav-metrics',
        type: 'command',
        category: 'navigation',
        title: t('palette.navMetrics'),
        subtitle: t('palette.navMetricsDesc'),
        icon: BarChart2,
        keywords: ['metrics', 'metricas', 'analytics', 'throughput', 'velocity', 'graficos'],
        onSelect: () => onSelectTab('metrics'),
      });
    }

    list.push({
      id: 'nav-trash',
      type: 'command',
      category: 'navigation',
      title: t('palette.navTrash'),
      subtitle: t('palette.navTrashDesc'),
      icon: Trash2,
      badge: '4',
      keywords: ['trash', 'papelera', 'borrados', 'eliminados', 'archived', 'basura'],
      onSelect: () => onSelectTab('trash'),
    });

    list.push({
      id: 'nav-settings',
      type: 'command',
      category: 'navigation',
      title: t('palette.navSettings'),
      subtitle: t('palette.navSettingsDesc'),
      icon: Settings,
      badge: '⌘,',
      keywords: ['settings', 'configuracion', 'ajustes', 'preferencias', 'options'],
      onSelect: () => onSelectTab('settings'),
    });

    list.push({
      id: 'nav-shortcuts',
      type: 'command',
      category: 'navigation',
      title: t('palette.navShortcuts'),
      subtitle: t('palette.navShortcutsDesc'),
      icon: Keyboard,
      badge: '?',
      keywords: ['shortcuts', 'atajos', 'teclado', 'keyboard', 'help', 'ayuda'],
      onSelect: () => onOpenShortcuts(),
    });

    // Category: Tasks - Create action
    list.push({
      id: 'action-new-task',
      type: 'command',
      category: 'tasks',
      title: t('palette.actionNewTask'),
      subtitle: t('palette.actionNewTaskDesc'),
      icon: Plus,
      badge: 'N',
      keywords: ['nueva', 'new', 'tarea', 'task', 'crear', 'create', 'item', 'draft'],
      onSelect: () => onNewItem(),
    });

    // Category: Actions
    list.push({
      id: 'action-toggle-theme',
      type: 'command',
      category: 'actions',
      title: t('palette.actionToggleTheme'),
      subtitle: isDarkMode ? t('header.themeLight') : t('header.themeDark'),
      icon: isDarkMode ? Sun : Moon,
      keywords: ['tema', 'theme', 'dark', 'light', 'claro', 'oscuro', 'modo', 'apariencia'],
      onSelect: () => onToggleTheme(),
    });

    list.push({
      id: 'action-toggle-language',
      type: 'command',
      category: 'actions',
      title: t('palette.actionToggleLanguage'),
      subtitle: language === 'es' ? 'Switch to English' : 'Cambiar a Español',
      icon: Globe,
      keywords: ['idioma', 'language', 'ingles', 'english', 'español', 'spanish', 'locale'],
      onSelect: () => onToggleLanguage(),
    });

    list.push({
      id: 'action-sync-docs',
      type: 'command',
      category: 'actions',
      title: t('palette.actionSyncDocs'),
      subtitle: t('palette.actionSyncDocsDesc'),
      icon: RefreshCw,
      keywords: ['sync', 'sincronizar', 'docs', 'markdown', 'backlog', 'resync', 'archivos'],
      onSelect: () => onResyncDocs(),
    });

    // Category: Projects
    projects.forEach((proj) => {
      list.push({
        id: `project-${proj.id}`,
        type: 'command',
        category: 'projects',
        title: t('palette.actionSwitchProject', { name: proj.name }),
        subtitle: proj.repoPath || (proj.codePrefix ? t('palette.actionSwitchProjectDesc', { prefix: proj.codePrefix }) : undefined),
        icon: Folder,
        badge: proj.id === activeProjectId ? '✓' : undefined,
        keywords: ['proyecto', 'project', proj.name.toLowerCase(), (proj.codePrefix || '').toLowerCase()],
        onSelect: () => onSelectProject(proj.id),
      });
    });

    if (onNewProject) {
      list.push({
        id: 'action-new-project',
        type: 'command',
        category: 'projects',
        title: t('palette.actionNewProject'),
        subtitle: t('palette.actionNewProjectDesc'),
        icon: FolderPlus,
        keywords: ['proyecto', 'project', 'nuevo', 'new', 'crear'],
        onSelect: () => onNewProject(),
      });
    }

    return list;
  }, [
    t,
    isSprintTabEnabled,
    isReleaseTabEnabled,
    isTimelineTabEnabled,
    isMetricsTabEnabled,
    isDarkMode,
    language,
    projects,
    activeProjectId,
    onSelectTab,
    onOpenShortcuts,
    onNewItem,
    onToggleTheme,
    onToggleLanguage,
    onResyncDocs,
    onSelectProject,
    onNewProject,
  ]);

  // Tasks items mapping
  const taskItems = useMemo<PaletteItem[]>(() => {
    return items.map((item) => {
      const meta = getStatusMeta(item.status, t);
      return {
        id: `task-${item.id}`,
        type: 'task',
        category: 'tasks',
        title: `${item.id} - ${item.title}`,
        subtitle: meta.label,
        statusMeta: meta,
        task: item,
        keywords: [
          item.id.toLowerCase(),
          item.title.toLowerCase(),
          ...(item.labels || []).map((l) => l.toLowerCase()),
          item.status.toLowerCase(),
          (item.priority || '').toLowerCase(),
        ],
        onSelect: () => onSelectItem(item),
      };
    });
  }, [items, t, onSelectItem]);

  // Filtered and categorized results
  const categorizedResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      // Empty query default view:
      // Show Navigation commands, Task actions + top active tasks, Actions, and Projects
      const activeTasks = taskItems
        .filter((tItem) => tItem.task && tItem.task.status !== 'done' && tItem.task.status !== 'cancelled' && tItem.task.status !== 'dismissed')
        .slice(0, 5);

      const navCommands = staticCommands.filter((c) => c.category === 'navigation');
      const taskCommands = staticCommands.filter((c) => c.category === 'tasks');
      const actionCommands = staticCommands.filter((c) => c.category === 'actions');
      const projectCommands = staticCommands.filter((c) => c.category === 'projects');

      return [
        {
          category: 'navigation' as PaletteCategory,
          title: t('palette.sectionNavigation'),
          items: navCommands,
        },
        {
          category: 'tasks' as PaletteCategory,
          title: t('palette.sectionTasks'),
          items: [...taskCommands, ...activeTasks],
        },
        {
          category: 'actions' as PaletteCategory,
          title: t('palette.sectionActions'),
          items: actionCommands,
        },
        {
          category: 'projects' as PaletteCategory,
          title: t('palette.sectionProjects'),
          items: projectCommands,
        },
      ].filter((section) => section.items.length > 0);
    }

    // Searching with query:
    const terms = trimmed.split(/\s+/).filter(Boolean);

    const matchesQuery = (targetText: string, keywords?: string[]) => {
      const haystack = (targetText + ' ' + (keywords || []).join(' ')).toLowerCase();
      return terms.every((term) => haystack.includes(term));
    };

    // Filter static commands
    const matchingCommands = staticCommands.filter((c) =>
      matchesQuery(c.title + ' ' + (c.subtitle || ''), c.keywords)
    );

    // Filter tasks
    const matchingTasks = taskItems.filter((tItem) =>
      matchesQuery(tItem.title + ' ' + (tItem.subtitle || ''), tItem.keywords)
    );

    // Boost exact / prefix task code match (e.g. typing "255" or "DEV-255")
    matchingTasks.sort((a, b) => {
      const aId = a.task?.id.toLowerCase() || '';
      const bId = b.task?.id.toLowerCase() || '';
      const exactA = aId.includes(trimmed);
      const exactB = bId.includes(trimmed);
      if (exactA && !exactB) return -1;
      if (!exactA && exactB) return 1;
      return 0;
    });

    const groups: { category: PaletteCategory; title: string; items: PaletteItem[] }[] = [];

    // Group matching tasks first for quick access
    if (matchingTasks.length > 0) {
      groups.push({
        category: 'tasks',
        title: t('palette.sectionTasks'),
        items: matchingTasks.slice(0, 20),
      });
    }

    const nav = matchingCommands.filter((c) => c.category === 'navigation');
    if (nav.length > 0) {
      groups.push({
        category: 'navigation',
        title: t('palette.sectionNavigation'),
        items: nav,
      });
    }

    const taskActions = matchingCommands.filter((c) => c.category === 'tasks');
    if (taskActions.length > 0) {
      if (groups.length > 0 && groups[0].category === 'tasks') {
        groups[0].items.unshift(...taskActions);
      } else {
        groups.push({
          category: 'tasks',
          title: t('palette.sectionTasks'),
          items: taskActions,
        });
      }
    }

    const actions = matchingCommands.filter((c) => c.category === 'actions');
    if (actions.length > 0) {
      groups.push({
        category: 'actions',
        title: t('palette.sectionActions'),
        items: actions,
      });
    }

    const projs = matchingCommands.filter((c) => c.category === 'projects');
    if (projs.length > 0) {
      groups.push({
        category: 'projects',
        title: t('palette.sectionProjects'),
        items: projs,
      });
    }

    return groups;
  }, [query, staticCommands, taskItems, t]);

  // Flattened array for index-based keyboard navigation
  const flatResults = useMemo(() => {
    return categorizedResults.flatMap((group) => group.items);
  }, [categorizedResults]);

  // Reset selectedIndex whenever query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= flatResults.length && flatResults.length > 0) {
      setSelectedIndex(0);
    }
  }, [flatResults.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const active = flatResults[selectedIndex];
    if (active) {
      const el = itemRefs.current.get(active.id);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatResults]);

  if (!isOpen) return null;

  // Keyboard navigation handler on input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatResults[selectedIndex];
      if (selected) {
        selected.onSelect();
        onClose();
      }
    }
  };

  const activeItemId = flatResults[selectedIndex]?.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelRef={panelRef}
      align="center"
      maxWidth="max-w-2xl"
      showMobileHandle={false}
      ariaLabel={t('palette.title')}
    >
      <div className="flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
        {/* Search Input Bar (Combobox contract) */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mr-3 border border-indigo-500/20">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={flatResults.length > 0}
            aria-controls="command-palette-results"
            aria-activedescendant={activeItemId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('palette.placeholder')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 px-0 min-w-0"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label={t('palette.clearSearch')}
              title={t('palette.clearSearch')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors mr-1.5 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t('palette.footerClose')}
            title={`${t('palette.footerClose')} (Esc)`}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Listbox */}
        <div
          id="command-palette-results"
          role="listbox"
          aria-label={t('palette.title')}
          className="p-3 overflow-y-auto space-y-4 max-h-[380px] sm:max-h-[460px] scroll-smooth [mask-image:linear-gradient(to_bottom,#000_calc(100%-20px),#0000)]"
        >
          {flatResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <SearchX className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('palette.empty', { query })}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {t('palette.emptyHint')}
              </p>
            </div>
          ) : (
            categorizedResults.map((group) => (
              <div key={group.category} className="space-y-1">
                {/* Category Header */}
                <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between min-w-0">
                  <span>{group.title}</span>
                  <span className="font-mono text-xs font-normal lowercase opacity-75 shrink-0 ml-2">
                    {group.items.length}
                  </span>
                </div>

                {/* Options List */}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const flatIndex = flatResults.indexOf(item);
                    const isSelected = flatIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        id={item.id}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        ref={(el) => {
                          if (el) itemRefs.current.set(item.id, el);
                          else itemRefs.current.delete(item.id);
                        }}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all min-h-[44px] active:scale-[0.98] ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-600/20 text-slate-900 dark:text-white border-l-2 border-indigo-600 dark:border-indigo-400 pl-3'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border-l-2 border-transparent pl-3'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Item Icon or Task Badge */}
                          {item.type === 'task' ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
                                {item.task?.id}
                              </span>
                              {item.statusMeta && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border ${item.statusMeta.color}`}
                                >
                                  {item.statusMeta.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            Icon && (
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                            )
                          )}

                          {/* Titles and Context */}
                          <div className="min-w-0 flex-1">
                            {/* audit-ux:allow-ENV-002 Título de ítem en paleta de comandos: elemento de lista de una línea con elipsis */}
                            <div className="text-xs font-semibold truncate leading-tight">
                              {item.type === 'task' ? item.task?.title : item.title}
                            </div>
                            {item.subtitle && item.type !== 'task' && (
                              /* audit-ux:allow-ENV-002 Subtítulo descriptivo en paleta de comandos: elipsis en una sola línea */
                              <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side badge / hint */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {item.badge && (
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                              {item.badge}
                            </kbd>
                          )}
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center text-xs text-indigo-500 font-mono font-bold">
                              ↵
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts Guide */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="hidden sm:inline-flex px-1 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                ↑
              </kbd>
              <kbd className="hidden sm:inline-flex px-1 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                ↓
              </kbd>
              <span className="ml-0.5">{t('palette.footerNavigate')}</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                ↵
              </kbd>
              <span className="ml-0.5">{t('palette.footerSelect')}</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="hidden sm:inline-flex px-1 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                Esc
              </kbd>
              <span className="ml-0.5">{t('palette.footerClose')}</span>
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
            {query.trim()
              ? t('palette.badgeResultsCount', { count: flatResults.length })
              : t('palette.badgeTasksCount', { count: items.length })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
