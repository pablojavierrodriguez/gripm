import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { BacklogItem, Sprint } from '../../types';
import type {
  TimeScale,
  TimelineRow,
  TimelineTimeColumn,
  DragState,
  ResolvedDateRange,
  ItemCoordinates
} from './types';
import { getStatusColor } from './types';
import { addDays, formatDisplayDate, calculateItemCoordinates } from './dateEngine';
import { useTranslation } from '../../utils/i18n';

interface TimelineCanvasProps {
  canvasScrollRef: React.RefObject<HTMLDivElement>;
  totalGridWidthPx: number;
  timeColumns: TimelineTimeColumn[];
  todayMarkerPx: number | null;
  scale: TimeScale;
  sortedSprints: Sprint[];
  minGlobalDate: string;
  pxPerDay: number;
  hierarchyRows: TimelineRow[];
  expandedEpics: Record<string, boolean>;
  dragState: DragState | null;
  onPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    item: BacklogItem,
    range: ResolvedDateRange,
    initialCoords: ItemCoordinates,
    mode?: 'move' | 'resize-start' | 'resize-end'
  ) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  canvasScrollRef,
  totalGridWidthPx,
  timeColumns,
  todayMarkerPx,
  scale,
  sortedSprints,
  minGlobalDate,
  pxPerDay,
  hierarchyRows,
  expandedEpics,
  dragState,
  onPointerDown,
  onPointerMove,
  onPointerUp
}) => {
  const { t } = useTranslation();

  return (
    <div
      ref={canvasScrollRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-[#070b12] relative select-none"
    >
      <div style={{ width: `${totalGridWidthPx}px` }} className="h-full flex flex-col relative">
        {/* Time Columns Header */}
        <div className="h-11 border-b border-slate-200 dark:border-white/[0.08] flex sticky top-0 bg-slate-100/90 dark:bg-[#0d131f]/90 backdrop-blur-sm z-10">
          {timeColumns.map((col, idx) => {
            const isDragTarget = scale === 'sprints' && dragState?.targetSprintIndex === idx;

            return (
              <div
                key={idx}
                style={{ width: `${col.colWidthPx}px` }}
                className={`border-r border-slate-200/80 dark:border-white/[0.06] px-3 flex flex-col justify-center min-w-0 shrink-0 transition-colors ${
                  isDragTarget ? 'bg-indigo-500/15 border-indigo-500/40' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                    {col.label}
                  </span>
                  {'status' in col && col.status && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-mono uppercase font-bold ${
                        col.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : col.status === 'completed'
                          ? 'bg-slate-200 dark:bg-white/10 text-slate-500'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {col.status}
                    </span>
                  )}
                </div>
                {col.sublabel && (
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                    {col.sublabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Canvas Body & Grid Lines */}
        <div className="flex-1 relative divide-y divide-slate-100 dark:divide-white/[0.04]">
          {/* Background Vertical Grid Lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {timeColumns.map((col, idx) => {
              const isDragTarget = scale === 'sprints' && dragState?.targetSprintIndex === idx;

              return (
                <div
                  key={idx}
                  style={{ width: `${col.colWidthPx}px` }}
                  className={`border-r h-full shrink-0 transition-colors ${
                    isDragTarget
                      ? 'border-indigo-500/30 bg-indigo-500/[0.03]'
                      : 'border-slate-200/40 dark:border-white/[0.03]'
                  }`}
                />
              );
            })}
          </div>

          {/* Vertical Today Marker */}
          {todayMarkerPx !== null && (
            <div
              style={{ left: `${todayMarkerPx}px` }}
              className="absolute top-0 bottom-0 w-px bg-rose-500 z-10 pointer-events-none shadow-xs"
            >
              <div className="sticky top-1 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold font-mono uppercase tracking-wider shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{t('roadmap.today') || 'Hoy'}</span>
              </div>
            </div>
          )}

          {/* Timeline Rows */}
          {hierarchyRows.map((row) => {
            const isExpanded = Boolean(expandedEpics[row.item.id]);
            const epicCoords = calculateItemCoordinates(
              scale,
              sortedSprints,
              minGlobalDate,
              pxPerDay,
              row.item,
              row.range,
              row.isEpic,
              row.children
            );
            const isDraggingEpic = dragState?.itemId === row.item.id;

            const currentEpicLeft = isDraggingEpic
              ? epicCoords.leftPx + (dragState?.mode === 'move' ? dragState.deltaX : 0)
              : epicCoords.leftPx;
            const currentEpicWidth = isDraggingEpic && dragState?.mode === 'resize-end'
              ? Math.max(32, epicCoords.widthPx + dragState.deltaX)
              : epicCoords.widthPx;

            return (
              <React.Fragment key={row.item.id}>
                {/* Epic / Parent Bar */}
                <div className="h-11 relative flex items-center px-1">
                  <div
                    style={{
                      left: `${currentEpicLeft}px`,
                      width: `${currentEpicWidth}px`
                    }}
                    onPointerDown={(e) => onPointerDown(e, row.item, row.range, epicCoords, 'move')}
                    title={`${row.item.code}: ${row.item.title} (${row.range.startDate} al ${row.range.dueDate})`}
                    className={`absolute h-7 rounded-lg shadow-sm border flex items-center justify-between min-w-0 p-1 px-2.5 cursor-grab active:cursor-grabbing transition-shadow group ${
                      isDraggingEpic ? 'shadow-xl ring-2 ring-indigo-500/80 z-30 scale-[1.01]' : ''
                    } ${
                      row.isEpic
                        ? 'bg-purple-600/95 border-purple-500 text-white'
                        : getStatusColor(row.item.status)
                    }`}
                  >
                    {/* Progress Fill Indicator for Epics */}
                    {row.isEpic && (
                      <div
                        style={{ width: `${row.progressPercent}%` }}
                        className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-lg pointer-events-none"
                      />
                    )}

                    <div className="flex items-center gap-1.5 truncate relative z-10 mr-2">
                      <span className="text-xs font-mono font-bold opacity-80 uppercase shrink-0">
                        {row.item.code}
                      </span>
                      <span className="text-xs font-medium truncate">
                        {row.item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                      {row.progressPercent === 100 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-90" />
                      ) : (
                        <span className="text-xs font-mono font-bold opacity-90">
                          {row.progressPercent}%
                        </span>
                      )}
                    </div>

                    {/* Drag tooltip indicator */}
                    {isDraggingEpic && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-mono shadow-md z-40 whitespace-nowrap pointer-events-none">
                        {scale === 'sprints' && dragState.targetSprintIndex !== undefined
                          ? `Mover a: ${sortedSprints[dragState.targetSprintIndex]?.name || 'Sprint'}`
                          : `${formatDisplayDate(addDays(row.range.startDate, Math.round(dragState.deltaX / pxPerDay)))} al ${formatDisplayDate(addDays(row.range.dueDate, Math.round(dragState.deltaX / pxPerDay)))}`
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Child Task Bars */}
                {row.isEpic && isExpanded && row.children?.map((ch) => {
                  const chCoords = calculateItemCoordinates(
                    scale,
                    sortedSprints,
                    minGlobalDate,
                    pxPerDay,
                    ch.item,
                    ch.range,
                    false
                  );
                  const isInherited = ch.range.isInherited;
                  const isDraggingChild = dragState?.itemId === ch.item.id;

                  const currentChildLeft = isDraggingChild
                    ? chCoords.leftPx + (dragState?.mode === 'move' ? dragState.deltaX : 0)
                    : chCoords.leftPx;
                  const currentChildWidth = isDraggingChild && dragState?.mode === 'resize-end'
                    ? Math.max(32, chCoords.widthPx + dragState.deltaX)
                    : chCoords.widthPx;

                  return (
                    <div key={ch.item.id} className="h-10 relative flex items-center px-1">
                      <div
                        style={{
                          left: `${currentChildLeft}px`,
                          width: `${currentChildWidth}px`
                        }}
                        onPointerDown={(e) => onPointerDown(e, ch.item, ch.range, chCoords, 'move')}
                        title={`${ch.item.code}: ${ch.item.title} (${ch.range.startDate} al ${ch.range.dueDate})${
                          isInherited ? ` [${ch.range.inheritedFrom}]` : ''
                        }`}
                        className={`absolute h-6 rounded-md shadow-xs border flex items-center justify-between min-w-0 p-1 px-2 cursor-grab active:cursor-grabbing transition-shadow group ${
                          isDraggingChild ? 'shadow-xl ring-2 ring-indigo-500/80 z-30 scale-[1.01]' : ''
                        } ${getStatusColor(ch.item.status)} ${
                          isInherited ? 'opacity-90 border-dashed' : ''
                        } ${chCoords.isUnassignedSprint ? 'ring-1 ring-amber-400/50' : ''}`}
                      >
                        {/* Resize handle left */}
                        {scale !== 'sprints' && (
                          <div
                            onPointerDown={(e) => onPointerDown(e, ch.item, ch.range, chCoords, 'resize-start')}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/30 rounded-l-md transition-colors"
                          />
                        )}

                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-mono opacity-80 shrink-0">
                            {ch.item.code}
                          </span>
                          <span className="text-xs font-medium truncate">
                            {ch.item.title}
                          </span>
                        </div>

                        {/* Inherited badge or drag icon */}
                        {isInherited && (
                          <span className="text-xs font-mono opacity-75 shrink-0 ml-1">
                            ~{ch.range.inheritedFrom}
                          </span>
                        )}

                        {chCoords.isUnassignedSprint && (
                          <span className="text-xs font-mono bg-amber-500/20 px-1 rounded text-amber-200 shrink-0 ml-1">
                            Sin Sprint
                          </span>
                        )}

                        {/* Resize handle right */}
                        {scale !== 'sprints' && (
                          <div
                            onPointerDown={(e) => onPointerDown(e, ch.item, ch.range, chCoords, 'resize-end')}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/30 rounded-r-md transition-colors"
                          />
                        )}

                        {/* Drag Tooltip */}
                        {isDraggingChild && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-mono shadow-md z-40 whitespace-nowrap pointer-events-none">
                            {scale === 'sprints' && dragState.targetSprintIndex !== undefined ? (
                              sortedSprints[dragState.targetSprintIndex]?.status === 'completed' ? (
                                <span className="text-rose-300">⚠️ {sortedSprints[dragState.targetSprintIndex]?.name} (Cerrado)</span>
                              ) : (
                                <span>🎯 Mover a: {sortedSprints[dragState.targetSprintIndex]?.name}</span>
                              )
                            ) : (
                              <span>
                                {formatDisplayDate(addDays(ch.range.startDate, Math.round(dragState.deltaX / pxPerDay)))} al{' '}
                                {formatDisplayDate(addDays(ch.range.dueDate, Math.round(dragState.deltaX / pxPerDay)))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
