import { useState, useRef, useEffect, type FC } from 'react';
import {
  Columns3,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '../../utils/i18n';
import { STORAGE_KEYS, setStoredItem } from '../../utils/storage';
import {
  ALL_OPTIONAL_COLS,
  DEFAULT_COLS,
  type OptionalCol
} from '../../utils/sprintVisibleCols';

export type GroupBy = 'sprint' | 'priority' | 'module' | 'none' | 'epic';

interface SprintHeaderControlsProps {
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  expandAll: () => void;
  collapseAll: () => void;
  completedSprintsCount: number;
  showCompletedSprints: boolean;
  setShowCompletedSprints: (show: boolean) => void;
  onCreateSprint?: () => void;
  visibleCols: Set<OptionalCol>;
  toggleCol: (col: OptionalCol) => void;
  setVisibleCols: (cols: Set<OptionalCol>) => void;
  totalItemsCount: number;
}

export const SprintHeaderControls: FC<SprintHeaderControlsProps> = ({
  groupBy,
  setGroupBy,
  expandAll,
  collapseAll,
  completedSprintsCount,
  showCompletedSprints,
  setShowCompletedSprints,
  onCreateSprint,
  visibleCols,
  toggleCol,
  setVisibleCols,
  totalItemsCount
}) => {
  const { t } = useTranslation();
  const [colsPopoverOpen, setColsPopoverOpen] = useState(false);
  const colsPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colsPopoverRef.current && !colsPopoverRef.current.contains(e.target as Node)) {
        setColsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-3">
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">{t('sprint.groupBy')}</span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-0.5 rounded-lg">
          {(
            [
              { id: 'sprint', label: t('sprint.groupBySprint') },
              { id: 'priority', label: t('sprint.groupByPriority') },
              { id: 'module', label: t('sprint.groupByModule') },
              { id: 'epic', label: t('sprint.groupByEpic') },
              { id: 'none', label: t('sprint.groupByNone') },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupBy(g.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                groupBy === g.id
                  ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {groupBy !== 'none' && (
          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-white/10 pl-2">
            <button
              onClick={expandAll}
              title="Expandir todos los bloques"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span>{t('sprint.expandAll')}</span>
            </button>
            <button
              onClick={collapseAll}
              title="Colapsar todos los bloques"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Minimize2 className="w-3 h-3" />
              <span>{t('sprint.collapseAll')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {groupBy === 'sprint' && completedSprintsCount > 0 && (
          <button
            type="button"
            onClick={() => setShowCompletedSprints(!showCompletedSprints)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showCompletedSprints
                ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/20'
                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/10'
            }`}
            title={showCompletedSprints ? t('sprint.hideCompleted') : t('sprint.showCompleted', { count: completedSprintsCount })}
          >
            {showCompletedSprints ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showCompletedSprints ? t('sprint.hideCompleted') : t('sprint.showCompleted', { count: completedSprintsCount })}</span>
          </button>
        )}

        {onCreateSprint && (
          <button
            type="button"
            onClick={onCreateSprint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow transition-all"
            title={t('sprint.newSprint')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('sprint.newSprint')}</span>
          </button>
        )}

        {/* Column Visibility Popover */}
        <div className="relative" ref={colsPopoverRef}>
          <button
            type="button"
            onClick={() => setColsPopoverOpen(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              colsPopoverOpen
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
            title={t('sprint.columns')}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>{t('sprint.columns')}</span>
            {visibleCols.size < ALL_OPTIONAL_COLS.length && (
              <span className="ml-0.5 px-1 py-px rounded bg-indigo-500 text-white text-xs font-bold leading-none">
                {ALL_OPTIONAL_COLS.length - visibleCols.size}
              </span>
            )}
          </button>

          {colsPopoverOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-[#131c2f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pb-1">{t('sprint.optionalCols')}</p>
              {([
                { id: 'tipo', label: t('sprint.colType') },
                { id: 'estado', label: t('sprint.colStatus') },
                { id: 'modulo', label: t('sprint.colModule') },
                { id: 'release', label: t('sprint.colRelease') },
                { id: 'sprint', label: t('sprint.colSprint') },
                { id: 'acProgress', label: t('sprint.colCriteria') },
                { id: 'assignees', label: t('sprint.colAssignee') },
                { id: 'labels', label: t('sprint.colLabels') },
                { id: 'parent', label: t('sprint.colParent') },
                { id: 'estimate', label: t('itemModal.estimateLabel') }
              ] as { id: OptionalCol; label: string }[]).map(col => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.id)}
                    onChange={() => toggleCol(col.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{col.label}</span>
                </label>
              ))}
              <div className="border-t border-slate-100 dark:border-white/[0.05] pt-1 mt-1 space-y-0.5">
                <button
                  onClick={() => {
                    const allCols = new Set<OptionalCol>(ALL_OPTIONAL_COLS);
                    setVisibleCols(allCols);
                    setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(allCols)));
                  }}
                  className="w-full text-left px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors"
                >
                  {t('sprint.showAll')}
                </button>
                <button
                  onClick={() => {
                    const defCols = new Set<OptionalCol>(DEFAULT_COLS);
                    setVisibleCols(defCols);
                    setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(defCols)));
                  }}
                  className="w-full text-left px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] rounded-md transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>{t('sprint.resetDefaults')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {t('sprint.itemsInView', { count: totalItemsCount })}
        </div>
      </div>
    </div>
  );
};
