import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  GripVertical,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import type { BacklogItem, GripmConfig, ItemStatus, Sprint, Release } from '../types';
import { useTranslation } from '../utils/i18n';

interface TimelineViewProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  sprints?: Sprint[];
  releases?: Release[];
  onClickItem: (item: BacklogItem) => void;
  onUpdateItem?: (itemData: Partial<BacklogItem>) => Promise<void> | void;
  config?: GripmConfig | null;
}

const MONTH_NAMES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MONTH_FULL_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type TimeScale = 'quarters' | 'months' | 'sprints';

interface ResolvedDateRange {
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  isInherited: boolean;
  inheritedFrom?: string;
}

interface TimelineRow {
  item: BacklogItem;
  range: ResolvedDateRange;
  isEpic: boolean;
  children?: TimelineRow[];
  progressPercent: number;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

/**
 * Resuelve las fechas de una tarea (explícitas o por herencia de Sprint/Release)
 */
function resolveTaskDates(
  item: BacklogItem,
  sprintsMap: Map<string, Sprint>,
  releasesMap: Map<string, Release>
): ResolvedDateRange {
  // 1. Fechas explícitas
  if (item.startDate && item.dueDate) {
    const start = item.startDate.slice(0, 10);
    const due = item.dueDate.slice(0, 10);
    if (start <= due) {
      return { startDate: start, dueDate: due, isInherited: false };
    }
  }

  if (item.dueDate && !item.startDate) {
    const due = item.dueDate.slice(0, 10);
    const dueDateObj = new Date(due);
    const startDateObj = new Date(dueDateObj.getTime() - 14 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDateObj.toISOString().slice(0, 10),
      dueDate: due,
      isInherited: false
    };
  }

  if (item.startDate && !item.dueDate) {
    const start = item.startDate.slice(0, 10);
    const startDateObj = new Date(start);
    const dueDateObj = new Date(startDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      startDate: start,
      dueDate: dueDateObj.toISOString().slice(0, 10),
      isInherited: false
    };
  }

  // 2. Herencia de Sprint
  const sprintName = item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : undefined);
  if (sprintName && sprintsMap.has(sprintName.toLowerCase())) {
    const sp = sprintsMap.get(sprintName.toLowerCase());
    if (sp?.startDate && sp?.endDate) {
      return {
        startDate: sp.startDate.slice(0, 10),
        dueDate: sp.endDate.slice(0, 10),
        isInherited: true,
        inheritedFrom: sp.name || sprintName
      };
    }
  }

  // 3. Herencia de Release
  const releaseVer = item.release || item.targetRelease || (item.releases && item.releases.length > 0 ? item.releases[item.releases.length - 1] : undefined);
  if (releaseVer && releasesMap.has(releaseVer.toLowerCase())) {
    const rel = releasesMap.get(releaseVer.toLowerCase());
    const targetDate = rel?.targetDate || rel?.date;
    if (targetDate) {
      const due = targetDate.slice(0, 10);
      const dueDateObj = new Date(due);
      const startDateObj = new Date(dueDateObj.getTime() - 14 * 24 * 60 * 60 * 1000);
      return {
        startDate: startDateObj.toISOString().slice(0, 10),
        dueDate: due,
        isInherited: true,
        inheritedFrom: `Release ${rel.version || releaseVer}`
      };
    }
  }

  // 4. Fallback: createdAt + 14 días
  const created = item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const createdDateObj = new Date(created);
  const fallbackDueObj = new Date(createdDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    startDate: created,
    dueDate: fallbackDueObj.toISOString().slice(0, 10),
    isInherited: true,
    inheritedFrom: 'Creado'
  };
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  allItems,
  sprints = [],
  releases = [],
  onClickItem,
  onUpdateItem,
  config: _config
}) => {
  const { t } = useTranslation();
  const [scale, setScale] = useState<TimeScale>('months');
  const [search, setSearch] = useState('');
  const [groupByParent, setGroupByParent] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  // Resizable sidebar width (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gripm_roadmap_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 240 && parsed <= 720) return parsed;
      }
    } catch {}
    return 360;
  });

  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const dataset = allItems && allItems.length > 0 ? allItems : items;

  // Drag & drop state for timeline bars
  const [dragState, setDragState] = useState<{
    itemId: string;
    item: BacklogItem;
    originalRange: ResolvedDateRange;
    startX: number;
    currentX: number;
    deltaX: number;
    mode: 'move' | 'resize-start' | 'resize-end';
    targetSprintIndex?: number;
    initialLeftPx: number;
    widthPx: number;
  } | null>(null);

  // Temporary feedback toast for drag actions
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'warn' | 'info' } | null>(null);

  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setActionFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Sprints & Releases fast lookup maps
  const sprintsMap = useMemo(() => {
    const m = new Map<string, Sprint>();
    sprints.forEach((sp) => {
      if (sp.name) m.set(sp.name.trim().toLowerCase(), sp);
      if (sp.id) m.set(sp.id.trim().toLowerCase(), sp);
    });
    return m;
  }, [sprints]);

  const releasesMap = useMemo(() => {
    const m = new Map<string, Release>();
    releases.forEach((r) => {
      if (r.version) m.set(r.version.trim().toLowerCase(), r);
      if (r.id) m.set(r.id.trim().toLowerCase(), r);
    });
    return m;
  }, [releases]);

  // Sprints ordenados cronológicamente
  const sortedSprints = useMemo(() => {
    return [...sprints].sort((a, b) => {
      const startA = a.startDate || '';
      const startB = b.startDate || '';
      if (startA && startB) return startA.localeCompare(startB);
      if (startA) return -1;
      if (startB) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [sprints]);

  // Sidebar drag resize handler
  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(240, Math.min(720, initialWidth + delta));
      setSidebarWidth(nextWidth);
      try {
        localStorage.setItem('gripm_roadmap_sidebar_width', String(nextWidth));
      } catch {}
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  // Search filtering
  const filteredItems = useMemo(() => {
    if (!search.trim()) return dataset;
    const q = search.trim().toLowerCase();
    return dataset.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        (it.module && it.module.toLowerCase().includes(q))
    );
  }, [dataset, search]);

  // Build hierarchy tree
  const hierarchyRows = useMemo(() => {
    const epics: BacklogItem[] = [];
    const nonEpics: BacklogItem[] = [];
    const childrenMap = new Map<string, BacklogItem[]>();

    filteredItems.forEach((it) => {
      const isEpicType = it.type === 'epic' || it.type === 'initiative';
      if (isEpicType) {
        epics.push(it);
      } else {
        nonEpics.push(it);
      }
    });

    nonEpics.forEach((it) => {
      const parentRef = it.parentId || it.epic;
      if (parentRef) {
        const key = parentRef.trim();
        const existing = childrenMap.get(key) || [];
        existing.push(it);
        childrenMap.set(key, existing);
      }
    });

    const rows: TimelineRow[] = [];

    if (groupByParent) {
      epics.forEach((epic) => {
        const children = childrenMap.get(epic.id) || childrenMap.get(epic.code) || [];
        const epicRange = resolveTaskDates(epic, sprintsMap, releasesMap);

        let minStart = epicRange.startDate;
        let maxDue = epicRange.dueDate;
        let totalCompletedChildren = 0;

        const childRows: TimelineRow[] = children.map((ch) => {
          const chRange = resolveTaskDates(ch, sprintsMap, releasesMap);
          if (chRange.startDate < minStart) minStart = chRange.startDate;
          if (chRange.dueDate > maxDue) maxDue = chRange.dueDate;
          const isChDone = ch.status === 'ready' || ch.status === 'done';
          if (isChDone) totalCompletedChildren++;
          return {
            item: ch,
            range: chRange,
            isEpic: false,
            progressPercent: isChDone ? 100 : 0
          };
        });

        const progressPercent = children.length > 0
          ? Math.round((totalCompletedChildren / children.length) * 100)
          : (epic.status === 'done' || epic.status === 'ready' ? 100 : 0);

        rows.push({
          item: epic,
          range: { startDate: minStart, dueDate: maxDue, isInherited: epicRange.isInherited },
          isEpic: true,
          children: childRows,
          progressPercent
        });
      });

      const standaloneTasks = nonEpics.filter((it) => {
        const parentRef = it.parentId || it.epic;
        if (!parentRef) return true;
        const parentKey = parentRef.trim();
        return !epics.some((ep) => ep.id === parentKey || ep.code === parentKey);
      });

      if (standaloneTasks.length > 0) {
        standaloneTasks.forEach((st) => {
          const stRange = resolveTaskDates(st, sprintsMap, releasesMap);
          rows.push({
            item: st,
            range: stRange,
            isEpic: false,
            progressPercent: st.status === 'ready' || st.status === 'done' ? 100 : 0
          });
        });
      }
    } else {
      filteredItems.forEach((it) => {
        const range = resolveTaskDates(it, sprintsMap, releasesMap);
        rows.push({
          item: it,
          range,
          isEpic: it.type === 'epic' || it.type === 'initiative',
          progressPercent: it.status === 'ready' || it.status === 'done' ? 100 : 0
        });
      });
    }

    return rows;
  }, [filteredItems, groupByParent, sprintsMap, releasesMap]);

  // Expand all epics by default
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    hierarchyRows.forEach((r) => {
      if (r.isEpic) initial[r.item.id] = true;
    });
    setExpandedEpics((prev) => ({ ...initial, ...prev }));
  }, [hierarchyRows]);

  // Global Time Limits Calculation
  const { minGlobalDate, maxGlobalDate, timeColumns, totalGridWidthPx, pxPerDay } = useMemo(() => {
    if (scale === 'sprints') {
      const colWidth = 280;
      const totalWidth = Math.max(900, sortedSprints.length * colWidth);
      return {
        minGlobalDate: sortedSprints[0]?.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        maxGlobalDate: sortedSprints[sortedSprints.length - 1]?.endDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        timeColumns: sortedSprints.map((sp) => ({
          label: sp.name || 'Sprint',
          sublabel: sp.startDate && sp.endDate ? `${formatDisplayDate(sp.startDate)} - ${formatDisplayDate(sp.endDate)}` : undefined,
          status: sp.status,
          sprintObj: sp,
          colWidthPx: colWidth
        })),
        totalGridWidthPx: totalWidth,
        pxPerDay: 20
      };
    }

    let minD = '9999-12-31';
    let maxD = '0000-01-01';

    const checkDate = (d: string) => {
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    };

    hierarchyRows.forEach((r) => {
      checkDate(r.range.startDate);
      checkDate(r.range.dueDate);
      if (r.children) {
        r.children.forEach((c) => {
          checkDate(c.range.startDate);
          checkDate(c.range.dueDate);
        });
      }
    });

    const nowIso = new Date().toISOString().slice(0, 10);
    checkDate(nowIso);

    // Month scale limits
    const minObj = new Date(minD === '9999-12-31' ? nowIso : minD);
    minObj.setDate(1);
    minObj.setMonth(minObj.getMonth() - 1);

    const maxObj = new Date(maxD === '0000-01-01' ? nowIso : maxD);
    maxObj.setMonth(maxObj.getMonth() + 2);
    maxObj.setDate(0);

    const minDateStr = minObj.toISOString().slice(0, 10);
    const maxDateStr = maxObj.toISOString().slice(0, 10);
    const diffDays = Math.max(1, Math.round((maxObj.getTime() - minObj.getTime()) / (1000 * 60 * 60 * 24)));

    if (scale === 'quarters') {
      const colWidth = 320;
      const cols: Array<{ label: string; sublabel?: string; colWidthPx: number; dateStr: string }> = [];
      let cur = new Date(minObj);
      while (cur <= maxObj) {
        const qNum = Math.floor(cur.getMonth() / 3) + 1;
        const year = cur.getFullYear();
        const startQ = new Date(year, (qNum - 1) * 3, 1);
        const endQ = new Date(year, qNum * 3, 0);

        cols.push({
          label: `Q${qNum} ${year}`,
          sublabel: `${MONTH_NAMES_ES[startQ.getMonth()]} - ${MONTH_NAMES_ES[endQ.getMonth()]}`,
          colWidthPx: colWidth,
          dateStr: startQ.toISOString().slice(0, 10)
        });

        cur = new Date(year, qNum * 3, 1);
      }
      const totalWidth = Math.max(900, cols.length * colWidth);
      const computedPxPerDay = totalWidth / diffDays;
      return {
        minGlobalDate: minDateStr,
        maxGlobalDate: maxDateStr,
        timeColumns: cols,
        totalGridWidthPx: totalWidth,
        pxPerDay: computedPxPerDay
      };
    }

    // Default: 'months'
    const colWidth = 260;
    const cols: Array<{ label: string; sublabel?: string; colWidthPx: number; dateStr: string }> = [];
    let cur = new Date(minObj);
    while (cur <= maxObj) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const startM = new Date(year, month, 1);

      cols.push({
        label: `${MONTH_FULL_ES[month]} ${year}`,
        sublabel: `${MONTH_NAMES_ES[month]} • Días 1-${new Date(year, month + 1, 0).getDate()}`,
        colWidthPx: colWidth,
        dateStr: startM.toISOString().slice(0, 10)
      });

      cur = new Date(year, month + 1, 1);
    }
    const totalWidth = Math.max(900, cols.length * colWidth);
    const computedPxPerDay = totalWidth / diffDays;
    return {
      minGlobalDate: minDateStr,
      maxGlobalDate: maxDateStr,
      timeColumns: cols,
      totalGridWidthPx: totalWidth,
      pxPerDay: computedPxPerDay
    };
  }, [hierarchyRows, scale, sortedSprints]);

  // Today marker calculation
  const todayMarkerPx = useMemo(() => {
    const nowIso = new Date().toISOString().slice(0, 10);
    if (scale === 'sprints') {
      // Find sprint that contains today
      const colWidth = 280;
      for (let i = 0; i < sortedSprints.length; i++) {
        const sp = sortedSprints[i];
        if (sp.startDate && sp.endDate && nowIso >= sp.startDate.slice(0, 10) && nowIso <= sp.endDate.slice(0, 10)) {
          const spStart = new Date(sp.startDate).getTime();
          const spEnd = new Date(sp.endDate).getTime();
          const nowMs = new Date(nowIso).getTime();
          const pct = Math.max(0, Math.min(1, (nowMs - spStart) / Math.max(1, spEnd - spStart)));
          return i * colWidth + pct * colWidth;
        }
      }
      return null;
    }

    const minMs = new Date(minGlobalDate).getTime();
    const maxMs = new Date(maxGlobalDate).getTime();
    const nowMs = new Date(nowIso).getTime();
    if (nowMs < minMs || nowMs > maxMs) return null;
    const diffDays = (nowMs - minMs) / (1000 * 60 * 60 * 24);
    return diffDays * pxPerDay;
  }, [scale, sortedSprints, minGlobalDate, maxGlobalDate, pxPerDay]);

  /**
   * Calculates slot coordinates in pixels according to selected scale
   */
  const getItemCoordinates = useCallback((
    item: BacklogItem,
    range: ResolvedDateRange,
    isEpic: boolean,
    childRows?: TimelineRow[]
  ): { leftPx: number; widthPx: number; isUnassignedSprint?: boolean } => {
    if (scale === 'sprints') {
      const colWidth = 280;
      if (isEpic && childRows && childRows.length > 0) {
        // Epic coordinates span from min child sprint to max child sprint
        const childSprintIndices: number[] = [];
        childRows.forEach((c) => {
          const spName = c.item.sprint || c.item.targetSprint || (c.item.sprints && c.item.sprints[0]);
          if (spName) {
            const idx = sortedSprints.findIndex((s) => s.name.toLowerCase() === spName.toLowerCase());
            if (idx !== -1) childSprintIndices.push(idx);
          }
        });

        if (childSprintIndices.length > 0) {
          const minIdx = Math.min(...childSprintIndices);
          const maxIdx = Math.max(...childSprintIndices);
          return {
            leftPx: minIdx * colWidth + 8,
            widthPx: Math.max(80, (maxIdx - minIdx + 1) * colWidth - 16)
          };
        }
      }

      // Individual task in sprints scale
      const itemSprint = item.sprint || item.targetSprint || (item.sprints && item.sprints[0]);
      if (itemSprint) {
        const idx = sortedSprints.findIndex((s) => s.name.toLowerCase() === itemSprint.toLowerCase());
        if (idx !== -1) {
          return {
            leftPx: idx * colWidth + 8,
            widthPx: colWidth - 16
          };
        }
      }

      // Not assigned to any registered sprint
      return {
        leftPx: 8,
        widthPx: Math.max(60, colWidth - 16),
        isUnassignedSprint: true
      };
    }

    // Months / Quarters scale
    const minMs = new Date(minGlobalDate).getTime();
    const startMs = new Date(range.startDate).getTime();
    const dueMs = new Date(range.dueDate).getTime();

    const startDays = Math.max(0, (startMs - minMs) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, (dueMs - startMs) / (1000 * 60 * 60 * 24));

    const left = startDays * pxPerDay;
    const width = Math.max(32, durationDays * pxPerDay);

    return { leftPx: left, widthPx: width };
  }, [scale, sortedSprints, minGlobalDate, pxPerDay]);

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/80 text-white';
      case 'ready':
        return 'bg-teal-600/90 hover:bg-teal-600 border-teal-500/80 text-white';
      case 'review':
        return 'bg-purple-600/90 hover:bg-purple-600 border-purple-500/80 text-white';
      case 'doing':
        return 'bg-amber-600/90 hover:bg-amber-600 border-amber-500/80 text-white';
      case 'ideas':
        return 'bg-pink-600/90 hover:bg-pink-600 border-pink-500/80 text-white';
      case 'draft':
      default:
        return 'bg-indigo-600/90 hover:bg-indigo-600 border-indigo-500/80 text-white';
    }
  };

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const scrollToToday = () => {
    if (canvasScrollRef.current && todayMarkerPx !== null) {
      const targetPos = todayMarkerPx - (canvasScrollRef.current.clientWidth / 2);
      canvasScrollRef.current.scrollTo({ left: Math.max(0, targetPos), behavior: 'smooth' });
    }
  };

  // Pointer drag start handler
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: BacklogItem,
    range: ResolvedDateRange,
    initialCoords: { leftPx: number; widthPx: number },
    mode: 'move' | 'resize-start' | 'resize-end' = 'move'
  ) => {
    // Only left click
    if (e.button !== 0) return;
    e.stopPropagation();

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      itemId: item.id,
      item,
      originalRange: range,
      startX: e.clientX,
      currentX: e.clientX,
      deltaX: 0,
      mode,
      initialLeftPx: initialCoords.leftPx,
      widthPx: initialCoords.widthPx
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const delta = e.clientX - dragState.startX;

    let targetIdx: number | undefined;
    if (scale === 'sprints') {
      const colWidth = 280;
      const centerPos = dragState.initialLeftPx + delta + (dragState.widthPx / 2);
      targetIdx = Math.max(0, Math.min(sortedSprints.length - 1, Math.floor(centerPos / colWidth)));
    }

    setDragState((prev) => prev ? {
      ...prev,
      currentX: e.clientX,
      deltaX: delta,
      targetSprintIndex: targetIdx
    } : null);
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const { item, originalRange, deltaX, mode, targetSprintIndex } = dragState;
    setDragState(null);

    // If drag delta is tiny, consider it a standard click to open item modal
    if (Math.abs(deltaX) < 6) {
      onClickItem(item);
      return;
    }

    if (!onUpdateItem) return;

    if (scale === 'sprints') {
      if (targetSprintIndex !== undefined && sortedSprints[targetSprintIndex]) {
        const targetSprint = sortedSprints[targetSprintIndex];
        if (targetSprint.status === 'completed') {
          setActionFeedback({
            message: t('roadmap.sprintInactiveWarning', { sprint: targetSprint.name }) || `El sprint '${targetSprint.name}' está completado.`,
            type: 'warn'
          });
          return;
        }

        await onUpdateItem({
          id: item.id,
          sprint: targetSprint.name,
          targetSprint: targetSprint.name,
          sprints: [targetSprint.name]
        });

        setActionFeedback({
          message: t('roadmap.assignSprintSuccess', { sprint: targetSprint.name }) || `Reasignado a ${targetSprint.name}`,
          type: 'success'
        });
      }
      return;
    }

    // Mode: 'months' or 'quarters'
    const deltaDays = Math.round(deltaX / Math.max(1, pxPerDay));
    if (deltaDays === 0) return;

    if (mode === 'move') {
      const newStart = addDays(originalRange.startDate, deltaDays);
      const newDue = addDays(originalRange.dueDate, deltaDays);
      await onUpdateItem({
        id: item.id,
        startDate: newStart,
        dueDate: newDue
      });
      setActionFeedback({
        message: t('roadmap.datesUpdated', { start: formatDisplayDate(newStart), due: formatDisplayDate(newDue) }) || `Fechas: ${newStart} al ${newDue}`,
        type: 'success'
      });
    } else if (mode === 'resize-end') {
      const newDue = addDays(originalRange.dueDate, deltaDays);
      if (newDue >= originalRange.startDate) {
        await onUpdateItem({
          id: item.id,
          dueDate: newDue
        });
        setActionFeedback({
          message: `Fecha límite actualizada: ${formatDisplayDate(newDue)}`,
          type: 'success'
        });
      }
    } else if (mode === 'resize-start') {
      const newStart = addDays(originalRange.startDate, deltaDays);
      if (newStart <= originalRange.dueDate) {
        await onUpdateItem({
          id: item.id,
          startDate: newStart
        });
        setActionFeedback({
          message: `Fecha de inicio actualizada: ${formatDisplayDate(newStart)}`,
          type: 'success'
        });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Top Controls Bar */}
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
                {filteredItems.length} {filteredItems.length === 1 ? 'ítem' : 'ítems'}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Search Input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('roadmap.searchPlaceholder') || 'Buscar tareas o épicas...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
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

          {/* Today Button */}
          {todayMarkerPx !== null && (
            <button
              type="button"
              onClick={scrollToToday}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3 h-3 text-rose-500" />
              <span>{t('roadmap.goToToday') || 'Ir a Hoy'}</span>
            </button>
          )}

          {/* Group by Parent Toggle */}
          <button
            type="button"
            onClick={() => setGroupByParent(!groupByParent)}
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
              onClick={() => setScale('quarters')}
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
              onClick={() => setScale('months')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                scale === 'months'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('roadmap.scaleMonths') || 'Meses'}
            </button>
            <button
              type="button"
              onClick={() => setScale('sprints')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                scale === 'sprints'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('roadmap.scaleSprints') || 'Sprints'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Roadmap Workspace */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {/* Left Sticky Hierarchy Panel */}
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
                    }`}
                    onClick={() => {
                      if (row.isEpic && hasChildren) {
                        toggleEpic(row.item.id);
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
                            toggleEpic(row.item.id);
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

                  {/* Child Task Rows with Explicit Tree Connectors */}
                  {row.isEpic && isExpanded && row.children?.map((ch, chIdx) => {
                    const isLastChild = chIdx === (row.children!.length - 1);

                    return (
                      <div
                        key={ch.item.id}
                        onClick={() => onClickItem(ch.item)}
                        className="h-10 pl-7 pr-3 flex items-center justify-between min-w-0 gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer relative bg-slate-50/20 dark:bg-transparent"
                      >
                        {/* Explicit Tree Guides */}
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
          onMouseDown={handleMouseDownResize}
          title={t('roadmap.resizeSidebarTooltip') || 'Arrastrar para redimensionar panel de jerarquía'}
          className="w-1.5 hover:w-2 hover:bg-indigo-500/60 active:bg-indigo-600 cursor-col-resize select-none relative z-20 group transition-all shrink-0 bg-slate-200 dark:bg-white/[0.08]"
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-indigo-400" />
          </div>
        </div>

        {/* Right Scrollable Canvas: Gantt Bars & Time Grid */}
        <div
          ref={canvasScrollRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
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
                          className={`px-1.5 py-0.2 rounded text-xs font-mono uppercase font-bold ${
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
                const epicCoords = getItemCoordinates(row.item, row.range, row.isEpic, row.children);
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
                        onPointerDown={(e) => handlePointerDown(e, row.item, row.range, epicCoords, 'move')}
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
                      const chCoords = getItemCoordinates(ch.item, ch.range, false);
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
                            onPointerDown={(e) => handlePointerDown(e, ch.item, ch.range, chCoords, 'move')}
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
                                onPointerDown={(e) => handlePointerDown(e, ch.item, ch.range, chCoords, 'resize-start')}
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
                                onPointerDown={(e) => handlePointerDown(e, ch.item, ch.range, chCoords, 'resize-end')}
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
      </div>
    </div>
  );
};
