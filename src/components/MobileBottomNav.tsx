import { type FC } from 'react';
import { LayoutGrid, Target, Rocket, Calendar, BarChart2, Trash2 } from 'lucide-react';
import type { ActiveTab } from '../types';
import { useTranslation } from '../utils/i18n';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isKanbanTabEnabled: boolean;
  isSprintTabEnabled: boolean;
  isReleaseTabEnabled: boolean;
  isTimelineTabEnabled: boolean;
  isMetricsTabEnabled: boolean;
  trashedCount: number;
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  isKanbanTabEnabled,
  isSprintTabEnabled,
  isReleaseTabEnabled,
  isTimelineTabEnabled,
  isMetricsTabEnabled,
  trashedCount
}) => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('app.mobileNav')}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#090d15]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/[0.08] px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg"
    >
      {isKanbanTabEnabled && (
        <button
          onClick={() => onSelectTab('kanban')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === 'kanban'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{t('header.kanban')}</span>
        </button>
      )}

      {isSprintTabEnabled && (
        <button
          onClick={() => onSelectTab('sprint')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === 'sprint'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Target className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{t('header.sprints')}</span>
        </button>
      )}

      {isReleaseTabEnabled && (
        <button
          onClick={() => onSelectTab('release')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === 'release'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Rocket className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{t('header.releases')}</span>
        </button>
      )}

      {isTimelineTabEnabled && (
        <button
          onClick={() => onSelectTab('timeline')}
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
          onClick={() => onSelectTab('metrics')}
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
        onClick={() => onSelectTab('trash')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all min-h-[48px] active:scale-95 ${
          activeTab === 'trash'
            ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Trash2 className="w-5 h-5 mb-0.5" />
          {trashedCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-xs font-bold rounded-full bg-rose-600 text-white">
              {trashedCount}
            </span>
          )}
        </div>
        <span className="text-xs tracking-tight">{t('header.trash')}</span>
      </button>
    </nav>
  );
};
