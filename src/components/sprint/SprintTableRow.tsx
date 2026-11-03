import { type FC } from 'react';
import {
  GripVertical,
  Layers,
  CheckSquare,
  User,
  Bookmark,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import type { BacklogItem, ItemStatus, Priority } from '../../types';
import { typeConfig, priorityConfig, cleanParentTitle } from '../ItemCard';
import { useStatusMeta } from '../../utils/useStatusMeta';
import { useTranslation } from '../../utils/i18n';
import type { OptionalCol } from '../../utils/sprintVisibleCols';

interface SprintTableRowProps {
  item: BacklogItem;
  group: { key: string; items: BacklogItem[] };
  rowIdx: number;
  rankingEnabled: boolean;
  hierarchyItems: BacklogItem[];
  visibleCols: Set<OptionalCol>;
  isSelected: boolean;
  isBeingDragged: boolean;
  isDropTargetRow: boolean;
  dropPosition?: 'before' | 'after';
  allAvailableSprints: string[];
  isEs: boolean;
  canReorderOrMoveSprint: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, item: BacklogItem) => void;
  onDragLeave: (e: React.DragEvent, item: BacklogItem) => void;
  onDrop: (e: React.DragEvent, item: BacklogItem, rowIdx: number) => void;
  onClickItem: (item: BacklogItem) => void;
  onToggleSelect: (id: string) => void;
  onShiftSelect: (id: string, groupItems: BacklogItem[]) => void;
  onUpdatePriority: (id: string, newPriority: Priority) => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onUpdateSprint?: (id: string, newSprint: string) => void;
  onOpenRowMenu: (e: React.MouseEvent, item: BacklogItem, rowIdx: number) => void;
  isRowMenuActive: boolean;
}

export const SprintTableRow: FC<SprintTableRowProps> = ({
  item,
  group,
  rowIdx,
  rankingEnabled,
  hierarchyItems,
  visibleCols,
  isSelected,
  isBeingDragged,
  isDropTargetRow,
  dropPosition,
  allAvailableSprints,
  isEs,
  canReorderOrMoveSprint,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onClickItem,
  onToggleSelect,
  onShiftSelect,
  onUpdatePriority,
  onUpdateStatus,
  onUpdateSprint,
  onOpenRowMenu,
  isRowMenuActive
}) => {
  const { t } = useTranslation();
  const getStatusMeta = useStatusMeta();

  const typeInfo = typeConfig[item.type] || typeConfig.feature;
  const TypeIcon = typeInfo.icon;
  const pInfo = priorityConfig[item.priority] || priorityConfig.p2;
  const sInfo = getStatusMeta(item.status);

  const parentItem = item.parentId
    ? hierarchyItems.find(candidate => candidate.id === item.parentId || candidate.code === item.parentId)
    : undefined;
  const rawRelease = item.release || item.targetRelease;
  const releaseVal = rawRelease && !rawRelease.toLowerCase().includes('sprint') ? rawRelease : undefined;

  return (
    <tr
      key={item.id}
      draggable={rankingEnabled && canReorderOrMoveSprint}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, item)}
      onDragLeave={(e) => onDragLeave(e, item)}
      onDrop={(e) => onDrop(e, item, rowIdx)}
      className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer relative ${
        isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/40' : ''
      } ${isBeingDragged ? 'opacity-30 bg-indigo-500/10' : ''} ${
        isDropTargetRow && dropPosition === 'before'
          ? 'border-t-2 border-indigo-500 bg-indigo-500/[0.05]'
          : ''
      } ${
        isDropTargetRow && dropPosition === 'after'
          ? 'border-b-2 border-indigo-500 bg-indigo-500/[0.05]'
          : ''
      }`}
      onClick={(e) => {
        if (e.shiftKey) {
          e.preventDefault();
          onShiftSelect(item.id, group.items);
          return;
        }
        onClickItem(item);
      }}
    >
      {/* Selection Checkbox */}
      <td className="py-2.5 px-3 whitespace-nowrap w-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) {
                e.preventDefault();
                onShiftSelect(item.id, group.items);
              } else {
                onToggleSelect(item.id);
              }
            }}
            onChange={() => {}}
            aria-label={isEs ? `Seleccionar tarea ${item.code}` : `Select task ${item.code}`}
            title={isEs ? `Seleccionar tarea ${item.code}` : `Select task ${item.code}`}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all"
          />
        </div>
      </td>

      {/* Grip & Ranking Column */}
      <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 text-slate-400">
          {rankingEnabled && (
            <span
              className="cursor-grab active:cursor-grabbing hover:text-indigo-500 p-0.5 rounded transition-colors"
              title="Arrastrar verticalmente para reordenar o mover de sprint"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-xs font-mono text-slate-400 font-medium">
            {item.order !== undefined ? item.order : (rowIdx + 1) * 10}
          </span>
        </div>
      </td>

      {/* Priority Column */}
      <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <select
          value={item.priority}
          onChange={(e) => {
            const newPriority = e.target.value as Priority;
            if (newPriority !== item.priority) {
              onUpdatePriority(item.id, newPriority);
            }
          }}
          className={`appearance-none bg-transparent border-0 text-xs font-mono cursor-pointer focus:outline-none ${pInfo.text}`}
        >
          <option value="p0" className="bg-white dark:bg-[#0e1626] text-rose-600 dark:text-rose-400">P0 🔴</option>
          <option value="p1" className="bg-white dark:bg-[#0e1626] text-amber-600 dark:text-amber-400">P1 🟠</option>
          <option value="p2" className="bg-white dark:bg-[#0e1626] text-yellow-600 dark:text-yellow-400">P2 🟡</option>
          <option value="p3" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">P3 ⚪</option>
        </select>
      </td>

      {/* Code */}
      <td className="py-2.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-slate-300">
        {item.code}
      </td>

      {/* Title */}
      <td className="py-2.5 px-4 min-w-[200px] max-w-md xl:max-w-xl">
        <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1 truncate" title={item.title}>
          {item.title}
        </div>
        {(parentItem || item.parentId || item.epic) && (
          <div
            className="mt-1 flex max-w-sm items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"
            title={parentItem ? `${parentItem.code || parentItem.id}: ${parentItem.title}` : item.parentId || item.epic}
          >
            <Layers className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
            {parentItem ? (
              <span className="truncate flex items-center gap-1 min-w-0">
                <span className="font-mono opacity-80 shrink-0">{parentItem.code || parentItem.id}</span>
                <span className="opacity-40 shrink-0">·</span>
                <span className="truncate">{cleanParentTitle(parentItem.title)}</span>
              </span>
            ) : (
              <span className="truncate">
                {cleanParentTitle(item.parentId || item.epic || '')}
              </span>
            )}
          </div>
        )}
        {item.impactedFile && (
          <div className="text-xs text-slate-500 font-mono truncate max-w-sm">
            {item.impactedFile}
          </div>
        )}
      </td>

      {/* Type */}
      {visibleCols.has('tipo') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${typeInfo.badge}`}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeInfo.label}</span>
          </span>
        </td>
      )}

      {/* Status */}
      {visibleCols.has('estado') && (
        <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <select
            value={item.status}
            onChange={(e) => {
              const newStatus = e.target.value as ItemStatus;
              if (newStatus !== item.status) {
                onUpdateStatus(item.id, newStatus);
              }
            }}
            className={`appearance-none px-2 py-0.5 rounded text-xs font-medium border cursor-pointer focus:outline-none ${sInfo.color}`}
          >
            <option value="ideas" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">💡 {t('status.ideas')}</option>
            <option value="draft" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.draft')}</option>
            <option value="doing" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.doing')}</option>
            <option value="review" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.review')}</option>
            <option value="ready" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.ready')}</option>
            <option value="done" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.done')}</option>
            <option value="dismissed" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.dismissed')}</option>
            <option value="cancelled" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.cancelled')}</option>
          </select>
        </td>
      )}

      {/* Module */}
      {visibleCols.has('modulo') && (
        <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
          {item.module || '-'}
        </td>
      )}

      {/* Release */}
      {visibleCols.has('release') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          {releaseVal ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 font-mono text-xs">
              {releaseVal.startsWith('v') ? releaseVal : `v${releaseVal}`}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600"> - </span>
          )}
        </td>
      )}

      {/* Sprint */}
      {visibleCols.has('sprint') && (
        <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {onUpdateSprint && allAvailableSprints.length > 0 ? (
            <select
              value={item.sprint || item.targetSprint || ''}
              onChange={(e) => {
                const newSprint = e.target.value;
                const curSprint = item.sprint || item.targetSprint || '';
                if (newSprint !== curSprint) {
                  onUpdateSprint(item.id, newSprint);
                }
              }}
              className="appearance-none px-2 py-0.5 rounded text-xs font-mono border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-[#0e1626] text-slate-500">{t('common.noSprint')}</option>
              {allAvailableSprints.map((sp) => (
                <option key={sp} value={sp} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                  {sp}
                </option>
              ))}
            </select>
          ) : (
            item.sprint || item.targetSprint ? (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-mono text-xs">
                {item.sprint || item.targetSprint}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-600 font-mono text-xs">{t('common.noSprint')}</span>
            )
          )}
        </td>
      )}

      {/* Acceptance Criteria */}
      {visibleCols.has('acProgress') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          {item.acceptanceCriteriaList && item.acceptanceCriteriaList.length > 0 ? (
            (() => {
              const checked = item.acceptanceCriteriaList.filter((a) => a.checked).length;
              const total = item.acceptanceCriteriaList.length;
              const allDone = checked === total;
              return (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border ${
                  allDone
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                }`}>
                  <CheckSquare className="w-2.5 h-2.5" />
                  {checked}/{total} AC
                </span>
              );
            })()
          ) : item.acProgress ? (
            <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-white/[0.05] text-slate-500 border border-slate-200 dark:border-white/[0.08]">
              {item.acProgress}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
          )}
        </td>
      )}

      {/* Assignees */}
      {visibleCols.has('assignees') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          {item.assignees && item.assignees.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {item.assignees.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  <User className="w-2.5 h-2.5 text-slate-400" />
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
          )}
        </td>
      )}

      {/* Labels */}
      {visibleCols.has('labels') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          {item.labels && item.labels.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap max-w-xs">
              {item.labels.slice(0, 3).map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                  #{l}
                </span>
              ))}
              {item.labels.length > 3 && (
                <span className="text-xs text-slate-400">+{item.labels.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
          )}
        </td>
      )}

      {/* Parent / Epic */}
      {visibleCols.has('parent') && (
        <td className="py-2.5 px-4 whitespace-nowrap">
          {parentItem || item.epic ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-medium">
              <Bookmark className="w-2.5 h-2.5" />
              {parentItem ? `${parentItem.code || parentItem.id} · ${cleanParentTitle(parentItem.title)}` : cleanParentTitle(item.epic || '')}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
          )}
        </td>
      )}

      {/* Estimate */}
      {visibleCols.has('estimate') && (
        <td className="py-2.5 px-4 text-center whitespace-nowrap">
          {item.estimate !== undefined && item.estimate !== null && item.estimate !== '' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
              <Zap className="w-3 h-3 text-indigo-500" />
              <span>{item.estimate}</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
          )}
        </td>
      )}

      {/* Actions */}
      <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={(e) => onOpenRowMenu(e, item, rowIdx)}
            aria-label={t('common.actions')}
            title={t('common.actions')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isRowMenuActive
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
