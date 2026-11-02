import React from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { BacklogItem } from '../../types';
import type { TimelineRow } from './types';
import { useTranslation } from '../../utils/i18n';

interface TimelineSidebarProps {
  sidebarWidth: number;
  hierarchyRows: TimelineRow[];
  expandedEpics: Record<string, boolean>;
  onToggleEpic: (epicId: string) => void;
  onClickItem: (item: BacklogItem) => void;
  onMouseDownResize: (e: React.MouseEvent) => void;
}

export const TimelineSidebar: React.FC<TimelineSidebarProps> = ({
  sidebarWidth,
  hierarchyRows,
  expandedEpics,
  onToggleEpic,
  onClickItem,
  onMouseDownResize
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090d15] flex flex-col shrink-0 z-10 shadow-sm relative"
      >
        {/* Header */}
        <div className="h-11 px-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between min-w-0 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
          <span>{t('roadmap.hierarchyTitle') || 'Jerarquía & Tareas'}</span>
          <span className="text-xs font-mono text-slate-400">{t('roadmap.progress') || 'Progreso'}</span>
        </div>

        {/* Tree Rows List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
          {hierarchyRows.map((row) => {
            const isExpanded = Boolean(expandedEpics[row.item.id]);
            const hasChildren = Boolean(row.children && row.children.length > 0);

            return (
              <React.Fragment key={row.item.id}>
                {/* Epic / Parent Row */}
                <div
                  className={`h-11 px-3 flex items-center justify-between min-w-0 gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${
                    row.isEpic ? 'bg-slate-50/70 dark:bg-white/[0.015]' : ''
                  } ${row.isContextParent ? 'opacity-80 italic' : ''}`}
                  onClick={() => {
                    if (row.isEpic && hasChildren) {
                      onToggleEpic(row.item.id);
                    } else {
                      onClickItem(row.item);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {row.isEpic && hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEpic(row.item.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-transform"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5" />
                    )}

                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-mono uppercase font-bold shrink-0 ${
                        row.isEpic
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25'
                          : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20'
                      }`}
                    >
                      {row.item.type.slice(0, 4)}
                    </span>

                    {row.isContextParent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-sans font-medium not-italic shrink-0">
                        {t('roadmap.contextParent') || 'Contexto'}
                      </span>
                    )}

                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                      {row.item.code}
                    </span>

                    <span
                      className={`text-xs truncate flex-1 ${
                        row.isEpic ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                      title={row.item.title}
                    >
                      {row.item.title}
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden hidden sm:block">
                      <div
                        style={{ width: `${row.progressPercent}%` }}
                        className={`h-full rounded-full ${
                          row.progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold w-8 text-right">
                      {row.progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Child Task Rows with Tree Connectors */}
                {row.isEpic && isExpanded && row.children?.map((ch, chIdx) => {
                  const isLastChild = chIdx === (row.children!.length - 1);

                  return (
                    <div
                      key={ch.item.id}
                      onClick={() => onClickItem(ch.item)}
                      className="h-10 pl-7 pr-3 flex items-center justify-between min-w-0 gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer relative bg-slate-50/20 dark:bg-transparent"
                    >
                      {/* Tree Guides */}
                      <div
                        className={`absolute left-5 top-0 w-px bg-slate-300 dark:bg-white/15 ${
                          isLastChild ? 'h-5' : 'h-full'
                        }`}
                      />
                      <div className="absolute left-5 top-5 w-2.5 h-px bg-slate-300 dark:bg-white/15" />

                      <div className="flex items-center gap-2 min-w-0 flex-1 pl-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 shrink-0" />
                        <span className="text-xs font-mono text-slate-400 shrink-0">
                          {ch.item.code}
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1" title={ch.item.title}>
                          {ch.item.title}
                        </span>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono uppercase font-medium shrink-0 ${
                          ch.item.status === 'ready' || ch.item.status === 'done'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04]'
                        }`}
                      >
                        {ch.item.status}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {hierarchyRows.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              {t('roadmap.noItemsFound') || 'No se encontraron tareas ni épicas'}
            </div>
          )}
        </div>
      </div>

      {/* Resizable Splitter Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onMouseDownResize}
        title={t('roadmap.resizeSidebarTooltip') || 'Arrastrar para redimensionar panel de jerarquía'}
        className="w-1.5 hover:w-2 hover:bg-indigo-500/60 active:bg-indigo-600 cursor-col-resize select-none relative z-20 group transition-all shrink-0 bg-slate-200 dark:bg-white/[0.08]"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-indigo-400" />
        </div>
      </div>
    </>
  );
};
