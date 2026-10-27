import React from 'react';
import { Calendar, Search, Sparkles, Clock, Layers, ArrowUpDown } from 'lucide-react';
import type { TimeScale, ActionFeedback, TimelineSortMode } from './types';
import { useTranslation } from '../../utils/i18n';

interface TimelineToolbarProps {
  totalItemsCount: number;
  search?: string;
  onSearchChange?: (value: string) => void;
  actionFeedback: ActionFeedback | null;
  todayMarkerPx: number | null;
  onScrollToToday: () => void;
  groupByParent: boolean;
  onToggleGroupByParent: () => void;
  scale: TimeScale;
  onScaleChange: (scale: TimeScale) => void;
  isSprintEnabled: boolean;
  sortMode: TimelineSortMode;
  onSortModeChange: (mode: TimelineSortMode) => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  totalItemsCount,
  search,
  onSearchChange,
  actionFeedback,
  todayMarkerPx,
  onScrollToToday,
  groupByParent,
  onToggleGroupByParent,
  scale,
  onScaleChange,
  isSprintEnabled,
  sortMode,
  onSortModeChange
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#090d15]/80 backdrop-blur-md flex items-center justify-between gap-4 flex-wrap z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {t('roadmap.title') || 'Roadmap'}
            </h1>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              {totalItemsCount} {totalItemsCount === 1 ? (t('roadmap.item') || 'ítem') : (t('roadmap.items') || 'ítems')}
            </span>
          </div>
        </div>

        {onSearchChange && (
          <>
            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('roadmap.searchPlaceholder') || 'Buscar tareas o épicas...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium animate-fadeIn flex items-center gap-1.5 border shadow-sm ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : actionFeedback.type === 'warn'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Sort Mode Selector */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => onSortModeChange('natural')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              sortMode === 'natural'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={t('roadmap.sortBoardTooltip') || 'Orden natural del tablero / backlog'}
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>{t('roadmap.sortBoard') || 'Tablero'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSortModeChange('chronological')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              sortMode === 'chronological'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={t('roadmap.sortChronologicalTooltip') || 'Orden cronológico por fecha de inicio'}
          >
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{t('roadmap.sortChronological') || 'Cronológico'}</span>
          </button>
        </div>

        {/* Today Button */}
        {todayMarkerPx !== null && (
          <button
            type="button"
            onClick={onScrollToToday}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3 text-rose-500" />
            <span>{t('roadmap.goToToday') || 'Ir a Hoy'}</span>
          </button>
        )}

        {/* Group by Parent Toggle */}
        <button
          type="button"
          onClick={onToggleGroupByParent}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            groupByParent
              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-semibold'
              : 'bg-white dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
          }`}
          title="Agrupar tareas jerárquicamente bajo sus Épicas o Iniciativas"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('roadmap.groupByEpics') || 'Agrupar por Épicas'}</span>
        </button>

        {/* Scale Selector */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => onScaleChange('quarters')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              scale === 'quarters'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('roadmap.scaleQuarters') || 'Trimestres'}
          </button>
          <button
            type="button"
            onClick={() => onScaleChange('months')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              scale === 'months'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('roadmap.scaleMonths') || 'Meses'}
          </button>
          {isSprintEnabled && (
            <button
              type="button"
              onClick={() => onScaleChange('sprints')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                scale === 'sprints'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('roadmap.scaleSprints') || 'Sprints'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
