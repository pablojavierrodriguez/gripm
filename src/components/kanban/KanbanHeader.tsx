import { type FC } from 'react';
import {
  Layers,
  Target,
  ChevronDown,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type {
  BacklogItem,
  GripmConfig,
  ActiveTab,
  Sprint,
  ViewMode
} from '../../types';
import { useTranslation } from '../../utils/i18n';

interface KanbanHeaderProps {
  isSprintActive: boolean;
  items: BacklogItem[];
  allItems?: BacklogItem[];
  scopedItems: BacklogItem[];
  config?: GripmConfig;
  activeSprint: string;
  setActiveSprint: (s: string) => void;
  availableSprintsList: string[];
  sprints?: Sprint[];
  onNavigateToTab?: (tab: ActiveTab) => void;
  viewMode: ViewMode;
  onChangeViewMode?: (mode: ViewMode) => void;
  showIdeas: boolean;
  onToggleIdeas: (val: boolean) => void;
  ideasCount: number;
  sprintStats: { total: number; done: number; inProgress: number; pct: number } | null;
  orphanItems: BacklogItem[];
  onQuickAddItem: (status: any, sprint?: string) => void;
}

export const KanbanHeader: FC<KanbanHeaderProps> = ({
  isSprintActive,
  items,
  allItems,
  scopedItems,
  config,
  activeSprint,
  setActiveSprint,
  availableSprintsList,
  sprints = [],
  onNavigateToTab,
  viewMode,
  onChangeViewMode,
  showIdeas,
  onToggleIdeas,
  ideasCount,
  sprintStats,
  orphanItems,
  onQuickAddItem
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Workflow Toolbar: Cleaned up for Kanban Continuo vs Sprint Board for Scrumban */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 w-full border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          {!isSprintActive ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('kanban.continuousFlow')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                {t('kanban.tasksCount', { count: items.length })}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('kanban.sprintBoard')}</span>
              </div>

              {/* Selector de Sprint Goal */}
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t('kanban.activeSprintGoal')}
                </span>
                <div className="relative flex items-center">
                  <select
                    value={activeSprint}
                    onChange={(e) => setActiveSprint(e.target.value)}
                    aria-label={t('kanban.activeSprintGoal')}
                    className="appearance-none bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/[0.1] rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer"
                  >
                    {availableSprintsList.length >= 2 && (
                      <option value="all" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                        {t('kanban.allSprints')}
                      </option>
                    )}
                    {availableSprintsList.map((s) => {
                      const spObj = sprints?.find(
                        (sp) => sp.name?.toLowerCase().trim() === s.toLowerCase().trim() || sp.id === s
                      );
                      const sprintItems = (allItems || items).filter(
                        (i) => (i.sprint || i.targetSprint || '').toLowerCase().trim() === s.toLowerCase().trim()
                      );
                      const allDone = sprintItems.length > 0 && sprintItems.every(
                        (i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish'
                      );
                      const hasDoing = sprintItems.some((i) => i.status === 'doing' || i.status === 'review');
                      const status = spObj?.status || (allDone ? 'completed' : hasDoing ? 'active' : 'planned');
                      return (
                        <option key={s} value={s} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                          {s} {status === 'active' ? `🟢 (${t('common.active')})` : status === 'completed' ? `⚪ (${t('common.completed')})` : '🟡 (Plan)'}
                        </option>
                      );
                    })}
                    <option value="backlog" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                      {t('sprint.noSprint')}
                    </option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
                {(() => {
                  const currentSprintObj = sprints?.find((sp) => sp.name === activeSprint);
                  if (currentSprintObj?.goal) {
                    return (
                      <span
                        className="hidden lg:inline-block text-xs text-slate-500 dark:text-slate-400 italic font-normal truncate max-w-xs xl:max-w-md"
                        title={currentSprintObj.goal}
                      >
                        🎯 "{currentSprintObj.goal}"
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('sprint')}
                  title={t('kanban.goToSprintPlanning')}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <span>{t('sprint.planSprint')}</span>
                  <span className="text-xs">→</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side controls: Column View Mode Switcher + Ideas toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {onChangeViewMode && (
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onChangeViewMode('simplificada')}
                title={t('kanban.simpleModeTooltip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'simplificada'
                    ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>⚡</span>
                <span>{t('kanban.simpleMode')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('ampliada')}
                title={t('kanban.extendedModeTooltip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'ampliada'
                    ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🔍</span>
                <span>{t('kanban.extendedMode')}</span>
              </button>
            </div>
          )}

          {/* Ideas toggle */}
          <button
            type="button"
            onClick={() => onToggleIdeas(!showIdeas)}
            title={showIdeas ? t('kanban.hideIdeasTooltip') : t('kanban.showIdeasTooltip')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 select-none ${
              showIdeas
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Lightbulb className={`w-3.5 h-3.5 shrink-0 ${showIdeas ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'}`} />
            <span>{t('kanban.ideas')}</span>
            <span className={`w-8 inline-flex items-center justify-center py-0.5 rounded-full text-xs font-mono font-semibold transition-colors ${
              showIdeas ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              {showIdeas ? 'ON' : 'OFF'}
            </span>
            {ideasCount > 0 && (
              <span className={`min-w-[18px] inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                showIdeas ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {ideasCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sprint Goal Progress Indicator in Scrumban */}
      {config?.methodology !== 'kanban' && activeSprint && activeSprint !== 'all' && sprintStats && sprintStats.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] text-xs w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('kanban.activeSprintGoal')}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  {activeSprint === 'backlog' ? t('sprint.noSprint') : activeSprint}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('kanban.sprintGoalNotice')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('kanban.progress')}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {sprintStats.done} / {sprintStats.total} ({sprintStats.pct}%)
              </span>
            </div>
            <div className="w-28 sm:w-36 bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  sprintStats.pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${sprintStats.pct}%` }}
              />
            </div>
            {sprintStats.inProgress > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3 h-3" /> {t('kanban.inProgressCount', { count: sprintStats.inProgress })}
              </span>
            )}
            {sprintStats.pct === 100 && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> {t('kanban.goalAchieved')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty State when Sprint Goal has no items */}
      {config?.methodology !== 'kanban' && scopedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 mb-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-center w-full animate-fade-in">
          <Target className="w-8 h-8 text-indigo-400 mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t('kanban.emptyGoalTitle', { sprint: activeSprint === 'backlog' ? t('sprint.noSprint') : activeSprint || 'actual' })}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            {t('kanban.emptyGoalDesc')}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActiveSprint(availableSprintsList.length >= 2 ? 'all' : (availableSprintsList[0] || 'backlog'))}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs transition-colors"
            >
              {t('kanban.viewAllBoard')}
            </button>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('sprint')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium transition-colors"
              >
                {t('kanban.goToSprints')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onQuickAddItem('draft', activeSprint !== 'all' && activeSprint !== 'backlog' ? activeSprint : undefined)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium transition-colors"
            >
              {t('kanban.createTask')}
            </button>
          </div>
        </div>
      )}

      {/* Orphan items warning banner (DEV-009) */}
      {orphanItems.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs w-full animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{t('kanban.orphanAttention')}</span>{' '}
            {t('kanban.orphanNotice', { count: orphanItems.length })}
          </div>
        </div>
      )}
    </>
  );
};
