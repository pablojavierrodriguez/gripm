import { type FC } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Zap,
  Calendar,
  Play,
  CheckCircle2,
  ScrollText,
  Edit3,
  Trash2,
  Target,
  ArrowUpDown
} from 'lucide-react';
import type { BacklogItem, ItemStatus, Priority, Sprint } from '../../types';
import { useTranslation } from '../../utils/i18n';
import type { OptionalCol } from '../../utils/sprintVisibleCols';
import type { GroupBy } from './SprintHeaderControls';
import { SprintTableRow } from './SprintTableRow';

interface SprintGroupCardProps {
  group: { key: string; items: BacklogItem[] };
  groupBy: GroupBy;
  sprints: Sprint[];
  projectId?: string;
  isEstimationEnabled: boolean;
  isCollapsed: boolean;
  isDropTarget: boolean;
  selectedItemIds: Set<string>;
  draggedItemId: string | null;
  dropTargetRow: { itemId: string; position: 'before' | 'after' } | null;
  rankingEnabled: boolean;
  hierarchyItems: BacklogItem[];
  visibleCols: Set<OptionalCol>;
  allAvailableSprints: string[];
  sortBy: 'order' | 'priority' | 'code' | 'status';
  isEs: boolean;
  activeRowMenuItemId?: string;
  onToggleCollapse: (key: string) => void;
  onToggleSelectGroup: (items: BacklogItem[]) => void;
  onStartSprint?: (sprint: Sprint) => void;
  onCompleteSprint?: (sprint: Sprint) => void;
  onOpenRetroModal: (sprint: Sprint) => void;
  onEditSprint?: (sprint: Sprint) => void;
  onDeleteSprint?: (sprint: Sprint) => void;
  onGroupDragOver: (e: React.DragEvent, groupKey: string) => void;
  onGroupDragLeave: () => void;
  onGroupDrop: (e: React.DragEvent, group: { key: string; items: BacklogItem[] }) => void;
  onRowDragStart: (e: React.DragEvent, id: string) => void;
  onRowDragEnd: () => void;
  onRowDragOver: (e: React.DragEvent, item: BacklogItem) => void;
  onRowDragLeave: (e: React.DragEvent, item: BacklogItem) => void;
  onRowDrop: (e: React.DragEvent, item: BacklogItem, rowIdx: number, group: { key: string; items: BacklogItem[] }) => void;
  onClickItem: (item: BacklogItem) => void;
  onToggleSelectItem: (id: string) => void;
  onRowShiftClick: (id: string, groupItems: BacklogItem[]) => void;
  onUpdatePriority: (id: string, newPriority: Priority) => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onUpdateSprint?: (id: string, newSprint: string) => void;
  onToggleSort: (field: 'order' | 'priority' | 'code' | 'status', e?: React.MouseEvent) => void;
  onOpenRowMenu: (e: React.MouseEvent, item: BacklogItem, rowIdx: number) => void;
  canReorderOrMoveSprint: boolean;
}

export const SprintGroupCard: FC<SprintGroupCardProps> = ({
  group,
  groupBy,
  sprints,
  projectId,
  isEstimationEnabled,
  isCollapsed,
  isDropTarget,
  selectedItemIds,
  draggedItemId,
  dropTargetRow,
  rankingEnabled,
  hierarchyItems,
  visibleCols,
  allAvailableSprints,
  sortBy,
  isEs,
  activeRowMenuItemId,
  onToggleCollapse,
  onToggleSelectGroup,
  onStartSprint,
  onCompleteSprint,
  onOpenRetroModal,
  onEditSprint,
  onDeleteSprint,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onRowDragStart,
  onRowDragEnd,
  onRowDragOver,
  onRowDragLeave,
  onRowDrop,
  onClickItem,
  onToggleSelectItem,
  onRowShiftClick,
  onUpdatePriority,
  onUpdateStatus,
  onUpdateSprint,
  onToggleSort,
  onOpenRowMenu,
  canReorderOrMoveSprint
}) => {
  const { t } = useTranslation();

  const doneCount = group.items.filter((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish').length;
  const progressPercent = group.items.length > 0 ? Math.round((doneCount / group.items.length) * 100) : 0;
  const isBacklogGroup = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar';
  const allGroupSelected = group.items.length > 0 && group.items.every((i) => selectedItemIds.has(i.id));
  const someGroupSelected = group.items.some((i) => selectedItemIds.has(i.id)) && !allGroupSelected;
  const sprintObjRaw = groupBy === 'sprint' ? sprints.find((s) => s.name?.toLowerCase().trim() === group.key.toLowerCase().trim() || s.id === group.key) : undefined;
  const isGroupAllDone = group.items.length > 0 && group.items.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
  const hasDoingOrReview = group.items.some((i) => i.status === 'doing' || i.status === 'review');
  const fallbackStatus = isGroupAllDone ? 'completed' : (hasDoingOrReview ? 'active' : 'planned');

  const sprintObj: Sprint | undefined = (groupBy === 'sprint' && !isBacklogGroup) ? {
    id: sprintObjRaw?.id || `sprint-${group.key.toLowerCase().trim().replace(/^sprint[-\s_]*/i, '').replace(/[^a-z0-9_-]/g, '-')}`,
    projectId: sprintObjRaw?.projectId || projectId || '',
    name: sprintObjRaw?.name || group.key,
    status: (sprintObjRaw?.status || fallbackStatus) as any,
    goal: sprintObjRaw?.goal || '',
    createdAt: sprintObjRaw?.createdAt || '',
    startDate: sprintObjRaw?.startDate,
    endDate: sprintObjRaw?.endDate,
    durationWeeks: sprintObjRaw?.durationWeeks,
    completedAt: sprintObjRaw?.completedAt
  } : undefined;

  return (
    <div
      onDragOver={(e) => onGroupDragOver(e, group.key)}
      onDragLeave={onGroupDragLeave}
      onDrop={(e) => onGroupDrop(e, group)}
      className={`glass-panel rounded-2xl overflow-hidden border transition-all ${
        isDropTarget
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/[0.03]'
          : 'border-slate-200 dark:border-white/[0.07]'
      }`}
    >
      {/* Group Header (Clickable to Toggle Collapse) */}
      <div
        onClick={() => onToggleCollapse(group.key)}
        className="px-4 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors gap-3"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? (isEs ? `Expandir ${group.key}` : `Expand ${group.key}`) : (isEs ? `Colapsar ${group.key}` : `Collapse ${group.key}`)}
            title={isCollapsed ? (isEs ? `Expandir ${group.key}` : `Expand ${group.key}`) : (isEs ? `Colapsar ${group.key}` : `Collapse ${group.key}`)}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(group.key);
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Master Checkbox in Group Header */}
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              disabled={group.items.length === 0}
              ref={(el) => {
                if (el) el.indeterminate = someGroupSelected;
              }}
              checked={allGroupSelected}
              onChange={() => onToggleSelectGroup(group.items)}
              aria-label={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
              title={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-40"
            />
          </div>

          <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {group.key === 'Todos los ítems'
              ? t('sprintView.allItems')
              : group.key === 'Sin Asignar'
              ? t('sprintView.unassigned')
              : group.key === 'Sin Épica'
              ? t('sprintView.noEpic')
              : group.key}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-white/[0.05] text-slate-700 dark:text-slate-400 shrink-0">
            {group.items.length} {group.items.length === 1 ? t('sprintView.itemSingle') : t('sprintView.itemPlural')}
          </span>

          {/* Story Points Rollup */}
          {isEstimationEnabled && (() => {
            let totalNum = 0;
            let doneNum = 0;
            let hasNumbers = false;
            const tshirts: Record<string, number> = {};
            let hasTshirts = false;

            for (const it of group.items) {
              if (it.estimate !== undefined && it.estimate !== null && it.estimate !== '') {
                const num = Number(it.estimate);
                if (!isNaN(num) && typeof it.estimate !== 'boolean') {
                  hasNumbers = true;
                  totalNum += num;
                  if (it.status === 'done' || it.status === 'ready') {
                    doneNum += num;
                  }
                } else {
                  hasTshirts = true;
                  const val = String(it.estimate).toUpperCase();
                  tshirts[val] = (tshirts[val] || 0) + 1;
                }
              }
            }

            if (hasNumbers) {
              return (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20 shrink-0"
                  title={`${doneNum} de ${totalNum} Story Points completados`}
                >
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span>{doneNum}/{totalNum} SP</span>
                </span>
              );
            }
            if (hasTshirts) {
              return (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20 shrink-0"
                  title="Estimación T-shirt"
                >
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span>{Object.entries(tshirts).map(([k, v]) => `${v}${k}`).join(', ')}</span>
                </span>
              );
            }
            return null;
          })()}

          {/* Status Badge */}
          {sprintObj && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide border shrink-0 ${
                sprintObj.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : sprintObj.status === 'completed'
                  ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
              }`}
            >
              {sprintObj.status === 'active' && '🟢 Activo'}
              {sprintObj.status === 'completed' && '⚪ Completado'}
              {sprintObj.status === 'planned' && '🟡 Planificado'}
            </span>
          )}

          {/* Dates */}
          {sprintObj?.startDate && sprintObj?.endDate && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">
              <Calendar className="w-3 h-3 text-slate-400" />
              {sprintObj.startDate} → {sprintObj.endDate}
            </span>
          )}

          {/* Goal */}
          {sprintObj?.goal && (
            <span
              className="hidden md:inline-block text-xs text-slate-500 dark:text-slate-400 italic font-normal truncate max-w-xs xl:max-w-md"
              title={sprintObj.goal}
            >
              "{sprintObj.goal}"
            </span>
          )}

          {isCollapsed && (
            <span className="text-xs text-slate-400 font-mono italic">
              (colapsado)
            </span>
          )}
          {isDropTarget && (
            <span className="text-xs font-semibold text-indigo-500 animate-pulse">
              Suelta aquí para asignar a {group.key}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Sprint Actions */}
          {sprintObj && (
            <div className="flex items-center gap-1.5">
              {sprintObj.status === 'planned' && onStartSprint && (
                <button
                  type="button"
                  onClick={() => onStartSprint(sprintObj)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                  title={t('sprintView.startSprintTooltip')}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">{t('sprintView.startSprint')}</span>
                </button>
              )}

              {sprintObj.status === 'active' && onCompleteSprint && (
                <button
                  type="button"
                  onClick={() => onCompleteSprint(sprintObj)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
                  title={t('sprintView.completeSprintTooltip')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('sprintView.completeSprint')}</span>
                </button>
              )}

              {sprintObj.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onOpenRetroModal(sprintObj)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-xs"
                  title={t('sprintView.viewRetroTooltip')}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('sprintView.viewRetro')}</span>
                </button>
              )}

              {onEditSprint && (
                <button
                  type="button"
                  onClick={() => onEditSprint(sprintObj)}
                  title={t('sprintView.editSprintTooltip')}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {onDeleteSprint && (
                <button
                  type="button"
                  onClick={() => onDeleteSprint(sprintObj)}
                  title={t('sprintView.deleteSprintTooltip')}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {!isBacklogGroup && (
            <>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{doneCount}</span>
                <span>/</span>
                <span>{group.items.length}</span>
                <span className="text-slate-400">({progressPercent}%)</span>
              </div>
              <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table Body or Empty Drop Zone */}
      {!isCollapsed && (
        group.items.length === 0 ? (
          <div className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-white/10 m-4 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-white/[0.01]">
            <Target className="w-8 h-8 text-indigo-400/60 animate-pulse" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('sprint.emptySprint')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('sprint.dragDropHint', { name: group.key })}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" style={{ overflowAnchor: 'none' }}>
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 font-mono text-xs">
                  <th className="py-2.5 px-3 w-8" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        disabled={group.items.length === 0}
                        ref={(el) => {
                          if (el) el.indeterminate = someGroupSelected;
                        }}
                        checked={allGroupSelected}
                        onChange={() => onToggleSelectGroup(group.items)}
                        aria-label={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                        title={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-40"
                      />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors w-14" onClick={(e) => onToggleSort('order', e)} title="Ordenar por Ranking / Orden">
                    <div className="flex items-center gap-1">
                      <span className={sortBy === 'order' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>#</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortBy === 'order' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => onToggleSort('priority', e)}>
                    <div className="flex items-center gap-1">
                      <span className={sortBy === 'priority' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colPriority')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortBy === 'priority' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => onToggleSort('code', e)}>
                    <div className="flex items-center gap-1">
                      <span className={sortBy === 'code' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colCode')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortBy === 'code' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 min-w-[200px] max-w-md xl:max-w-xl">{t('sprint.colTitle')}</th>
                  {visibleCols.has('tipo') && <th className="py-2.5 px-4">{t('sprint.colType')}</th>}
                  {visibleCols.has('estado') && (
                    <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => onToggleSort('status', e)}>
                      <div className="flex items-center gap-1">
                        <span className={sortBy === 'status' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colStatus')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === 'status' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                      </div>
                    </th>
                  )}
                  {visibleCols.has('modulo') && <th className="py-2.5 px-4">{t('sprint.colModule')}</th>}
                  {visibleCols.has('release') && <th className="py-2.5 px-4">{t('sprint.colRelease')}</th>}
                  {visibleCols.has('sprint') && <th className="py-2.5 px-4">{t('sprint.colSprint')}</th>}
                  {visibleCols.has('acProgress') && <th className="py-2.5 px-4">{t('sprint.colCriteria')}</th>}
                  {visibleCols.has('assignees') && <th className="py-2.5 px-4">{t('sprint.colAssignee')}</th>}
                  {visibleCols.has('labels') && <th className="py-2.5 px-4">{t('sprint.colLabels')}</th>}
                  {visibleCols.has('parent') && <th className="py-2.5 px-4">{t('sprint.colParent')}</th>}
                  {visibleCols.has('estimate') && <th className="py-2.5 px-4 text-center">{t('itemModal.estimateLabel')}</th>}
                  <th className="py-2.5 px-4 text-right">{t('sprint.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {group.items.map((item, rowIdx) => (
                  <SprintTableRow
                    key={item.id}
                    item={item}
                    group={group}
                    rowIdx={rowIdx}
                    rankingEnabled={rankingEnabled}
                    hierarchyItems={hierarchyItems}
                    visibleCols={visibleCols}
                    isSelected={selectedItemIds.has(item.id)}
                    isBeingDragged={draggedItemId === item.id}
                    isDropTargetRow={dropTargetRow?.itemId === item.id}
                    dropPosition={dropTargetRow?.itemId === item.id ? dropTargetRow.position : undefined}
                    allAvailableSprints={allAvailableSprints}
                    isEs={isEs}
                    canReorderOrMoveSprint={canReorderOrMoveSprint}
                    onDragStart={onRowDragStart}
                    onDragEnd={onRowDragEnd}
                    onDragOver={onRowDragOver}
                    onDragLeave={onRowDragLeave}
                    onDrop={(e, it, rIdx) => onRowDrop(e, it, rIdx, group)}
                    onClickItem={onClickItem}
                    onToggleSelect={onToggleSelectItem}
                    onShiftSelect={onRowShiftClick}
                    onUpdatePriority={onUpdatePriority}
                    onUpdateStatus={onUpdateStatus}
                    onUpdateSprint={onUpdateSprint}
                    onOpenRowMenu={onOpenRowMenu}
                    isRowMenuActive={activeRowMenuItemId === item.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
