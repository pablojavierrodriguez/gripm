import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Layers,
  Search
} from 'lucide-react';
import type { BacklogItem, GripmConfig, ItemStatus } from '../types';

interface TimelineViewProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  sprints?: any[];
  releases?: any[];
  onClickItem: (item: BacklogItem) => void;
  config?: GripmConfig | null;
}

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

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

/**
 * Normaliza y resuelve las fechas de una tarea (explícitas o por herencia)
 */
function resolveTaskDates(
  item: BacklogItem,
  sprintsMap: Map<string, any>,
  releasesMap: Map<string, any>
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
  const sprintName = item.sprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : undefined);
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
  const releaseVer = item.release || (item.releases && item.releases.length > 0 ? item.releases[item.releases.length - 1] : undefined);
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
  config: _config
}) => {
  const [scale, setScale] = useState<TimeScale>('months');
  const [search, setSearch] = useState('');
  const [groupByParent, setGroupByParent] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  const dataset = allItems && allItems.length > 0 ? allItems : items;

  // Mapas para resolución O(1) de Sprints y Releases
  const sprintsMap = useMemo(() => {
    const m = new Map<string, any>();
    sprints.forEach((sp) => {
      if (sp.name) m.set(sp.name.trim().toLowerCase(), sp);
      if (sp.id) m.set(sp.id.trim().toLowerCase(), sp);
    });
    return m;
  }, [sprints]);

  const releasesMap = useMemo(() => {
    const m = new Map<string, any>();
    releases.forEach((r) => {
      if (r.version) m.set(r.version.trim().toLowerCase(), r);
      if (r.id) m.set(r.id.trim().toLowerCase(), r);
    });
    return m;
  }, [releases]);

  // Filtrado por búsqueda
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

  // Construcción del árbol jerárquico
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

        // Si la épica tiene hijos, su rango temporal se expande a sus hijos
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

      // Tareas que no tienen épica
      const standaloneTasks = nonEpics.filter((it) => {
        const parentRef = it.parentId || it.epic;
        if (!parentRef) return true;
        // Si el padre no existe en el dataset filtrado
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
      // Vista plana sin agrupación
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

  // Inicializar todas las épicas expandidas por defecto
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    hierarchyRows.forEach((r) => {
      if (r.isEpic) initial[r.item.id] = true;
    });
    setExpandedEpics((prev) => ({ ...initial, ...prev }));
  }, [hierarchyRows]);

  // Cálculo de los límites temporales globales del canvas
  const { minGlobalDate, maxGlobalDate, timeColumns } = useMemo(() => {
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

    // Padding de 1 mes antes y 2 meses después para holgura
    const minObj = new Date(minD === '9999-12-31' ? nowIso : minD);
    minObj.setDate(1); // Primer día del mes
    minObj.setMonth(minObj.getMonth() - 1);

    const maxObj = new Date(maxD === '0000-01-01' ? nowIso : maxD);
    maxObj.setMonth(maxObj.getMonth() + 2);
    maxObj.setDate(0); // Último día del mes

    const minDateStr = minObj.toISOString().slice(0, 10);
    const maxDateStr = maxObj.toISOString().slice(0, 10);

    const diffDays = Math.max(1, Math.round((maxObj.getTime() - minObj.getTime()) / (1000 * 60 * 60 * 24)));

    // Generar columnas de tiempo según la escala
    const cols: { label: string; sublabel?: string; widthPercent: number; dateStr: string }[] = [];

    if (scale === 'quarters') {
      let cur = new Date(minObj);
      while (cur <= maxObj) {
        const qNum = Math.floor(cur.getMonth() / 3) + 1;
        const year = cur.getFullYear();
        const startQ = new Date(year, (qNum - 1) * 3, 1);
        const endQ = new Date(year, qNum * 3, 0);
        const effectiveStart = startQ < minObj ? minObj : startQ;
        const effectiveEnd = endQ > maxObj ? maxObj : endQ;
        const spanDays = Math.max(1, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
        const widthPct = (spanDays / diffDays) * 100;

        cols.push({
          label: `Q${qNum} ${year}`,
          sublabel: `${MONTH_NAMES[startQ.getMonth()]} - ${MONTH_NAMES[endQ.getMonth()]}`,
          widthPercent: widthPct,
          dateStr: startQ.toISOString().slice(0, 10)
        });

        cur = new Date(year, qNum * 3, 1);
      }
    } else if (scale === 'sprints' && sprints.length > 0) {
      // Escala alineada a Sprints
      const sortedSprints = [...sprints].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      sortedSprints.forEach((sp) => {
        cols.push({
          label: sp.name || 'Sprint',
          sublabel: sp.startDate && sp.endDate ? `${sp.startDate.slice(5)} al ${sp.endDate.slice(5)}` : undefined,
          widthPercent: 100 / sortedSprints.length,
          dateStr: sp.startDate || minDateStr
        });
      });
    } else {
      // Escala mensual por defecto
      let cur = new Date(minObj);
      while (cur <= maxObj) {
        const year = cur.getFullYear();
        const month = cur.getMonth();
        const startM = new Date(year, month, 1);
        const endM = new Date(year, month + 1, 0);
        const effectiveStart = startM < minObj ? minObj : startM;
        const effectiveEnd = endM > maxObj ? maxObj : endM;
        const spanDays = Math.max(1, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
        const widthPct = (spanDays / diffDays) * 100;

        cols.push({
          label: MONTH_NAMES[month] || '',
          sublabel: String(year),
          widthPercent: widthPct,
          dateStr: startM.toISOString().slice(0, 10)
        });

        cur = new Date(year, month + 1, 1);
      }
    }

    return {
      minGlobalDate: minDateStr,
      maxGlobalDate: maxDateStr,
      timeColumns: cols
    };
  }, [hierarchyRows, scale, sprints]);

  // Marcador del día de hoy
  const todayMarkerPercent = useMemo(() => {
    const nowIso = new Date().toISOString().slice(0, 10);
    const minMs = new Date(minGlobalDate).getTime();
    const maxMs = new Date(maxGlobalDate).getTime();
    const nowMs = new Date(nowIso).getTime();
    if (nowMs < minMs || nowMs > maxMs) return null;
    return Math.max(0, Math.min(100, ((nowMs - minMs) / (maxMs - minMs)) * 100));
  }, [minGlobalDate, maxGlobalDate]);

  // Helper para convertir fechas a porcentajes left/width
  const getCoordinates = (startDate: string, dueDate: string) => {
    const minMs = new Date(minGlobalDate).getTime();
    const maxMs = new Date(maxGlobalDate).getTime();
    const startMs = new Date(startDate).getTime();
    const dueMs = new Date(dueDate).getTime();
    const spanTotal = Math.max(1, maxMs - minMs);

    const left = Math.max(0, Math.min(100, ((startMs - minMs) / spanTotal) * 100));
    const rawWidth = Math.max(0.5, ((Math.max(startMs, dueMs) - startMs) / spanTotal) * 100);
    const width = Math.min(100 - left, Math.max(1.5, rawWidth));

    return { left: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%` };
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500 border-emerald-600 text-white';
      case 'ready':
        return 'bg-teal-500 border-teal-600 text-white';
      case 'review':
        return 'bg-purple-500 border-purple-600 text-white';
      case 'doing':
        return 'bg-amber-500 border-amber-600 text-white';
      case 'ideas':
        return 'bg-pink-500 border-pink-600 text-white';
      case 'draft':
      default:
        return 'bg-indigo-500 border-indigo-600 text-white';
    }
  };

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const scrollToToday = () => {
    if (canvasScrollRef.current && todayMarkerPercent !== null) {
      const scrollWidth = canvasScrollRef.current.scrollWidth;
      const targetPos = (scrollWidth * (todayMarkerPercent / 100)) - (canvasScrollRef.current.clientWidth / 2);
      canvasScrollRef.current.scrollTo({ left: Math.max(0, targetPos), behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#090d15]/80 backdrop-blur-md flex items-center justify-between gap-4 flex-wrap z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Roadmap & Timeline
            </h1>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tareas o épicas..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Right Controls: Scale Selector + Grouping Toggle + Today Button */}
        <div className="flex items-center gap-2">
          {/* Today Button */}
          {todayMarkerPercent !== null && (
            <button
              type="button"
              onClick={scrollToToday}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200/60 dark:border-indigo-500/30 transition-colors"
            >
              Ir a Hoy
            </button>
          )}

          {/* Group by Parent Toggle */}
          <button
            type="button"
            onClick={() => setGroupByParent(!groupByParent)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              groupByParent
                ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20'
                : 'bg-white dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
            }`}
            title="Agrupar tareas dependientes bajo sus Épicas"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agrupar por Épicas</span>
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
              Trimestres
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
              Meses
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
              Sprints
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {/* Left Sticky Column: Hierarchy Tree */}
        <div className="w-72 sm:w-80 md:w-96 border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090d15] flex flex-col shrink-0 z-10 shadow-sm">
          {/* Header */}
          <div className="h-12 px-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between min-w-0 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
            <span>Jerarquía & Tareas ({hierarchyRows.length})</span>
            <span className="text-xs font-mono text-slate-400">Progreso</span>
          </div>

          {/* Tree Rows List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
            {hierarchyRows.map((row) => {
              const isExpanded = Boolean(expandedEpics[row.item.id]);
              const hasChildren = Boolean(row.children && row.children.length > 0);

              return (
                <React.Fragment key={row.item.id}>
                  {/* Parent / Epic Row */}
                  <div
                    className={`h-11 px-3 flex items-center justify-between min-w-0 gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer select-none ${
                      row.isEpic ? 'font-semibold bg-slate-50/60 dark:bg-white/[0.01]' : ''
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
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5" />
                      )}

                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono uppercase font-bold shrink-0 ${
                          row.isEpic
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                            : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {row.item.type.slice(0, 4)}
                      </span>

                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {row.item.code}
                      </span>

                      <span className="text-xs text-slate-800 dark:text-slate-200 truncate flex-1" title={row.item.title}>
                        {row.item.title}
                      </span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                        {row.progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Child Task Rows */}
                  {row.isEpic && isExpanded && row.children?.map((ch) => (
                    <div
                      key={ch.item.id}
                      onClick={() => onClickItem(ch.item)}
                      className="h-10 pl-9 pr-3 flex items-center justify-between min-w-0 gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer select-none bg-slate-50/20 dark:bg-transparent"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 shrink-0" />
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
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {ch.item.status}
                      </span>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}

            {hierarchyRows.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">
                No se encontraron tareas ni épicas
              </div>
            )}
          </div>
        </div>

        {/* Right Scrollable Canvas: Gantt Bars & Time Grid */}
        <div
          ref={canvasScrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-[#070b12] relative select-none"
        >
          <div className="min-w-[900px] h-full flex flex-col relative">
            {/* Time Columns Header */}
            <div className="h-12 border-b border-slate-200 dark:border-white/[0.08] flex sticky top-0 bg-slate-100/90 dark:bg-[#0d131f]/90 backdrop-blur-sm z-10">
              {timeColumns.map((col, idx) => (
                <div
                  key={idx}
                  style={{ width: `${col.widthPercent}%` }}
                  className="border-r border-slate-200/80 dark:border-white/[0.06] px-2 flex flex-col justify-center min-w-0 shrink-0"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                    {col.label}
                  </span>
                  {col.sublabel && (
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                      {col.sublabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Canvas Body & Grid Lines */}
            <div className="flex-1 relative divide-y divide-slate-100 dark:divide-white/[0.04]">
              {/* Background Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timeColumns.map((col, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${col.widthPercent}%` }}
                    className="border-r border-slate-200/40 dark:border-white/[0.03] h-full shrink-0"
                  />
                ))}
              </div>

              {/* Vertical Today Marker */}
              {todayMarkerPercent !== null && (
                <div
                  style={{ left: `${todayMarkerPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none shadow-xs"
                >
                  <div className="sticky top-1 -translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-500 text-white text-xs font-bold font-mono uppercase tracking-wider shadow-sm">
                    Hoy
                  </div>
                </div>
              )}

              {/* Timeline Rows */}
              {hierarchyRows.map((row) => {
                const isExpanded = Boolean(expandedEpics[row.item.id]);
                const epicCoords = getCoordinates(row.range.startDate, row.range.dueDate);

                return (
                  <React.Fragment key={row.item.id}>
                    {/* Epic / Parent Bar */}
                    <div className="h-11 relative flex items-center px-1">
                      <div
                        style={{ left: epicCoords.left, width: epicCoords.width }}
                        onClick={() => onClickItem(row.item)}
                        title={`${row.item.code}: ${row.item.title} (${row.range.startDate} al ${row.range.dueDate})`}
                        className={`absolute h-7 rounded-lg shadow-xs border flex items-center justify-between min-w-0 p-1 px-2.5 cursor-pointer transition-all hover:scale-[1.01] hover:brightness-105 ${
                          row.isEpic
                            ? 'bg-purple-600/90 border-purple-500 text-white'
                            : `${getStatusColor(row.item.status)}`
                        }`}
                      >
                        {/* Progress Fill Indicator for Epics */}
                        {row.isEpic && (
                          <div
                            style={{ width: `${row.progressPercent}%` }}
                            className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-lg pointer-events-none"
                          />
                        )}

                        <span className="text-xs font-semibold truncate relative z-10">
                          {row.item.title}
                        </span>

                        <span className="text-xs font-mono font-bold opacity-80 shrink-0 ml-2 relative z-10">
                          {row.progressPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Child Task Bars */}
                    {row.isEpic && isExpanded && row.children?.map((ch) => {
                      const chCoords = getCoordinates(ch.range.startDate, ch.range.dueDate);
                      const isInherited = ch.range.isInherited;

                      return (
                        <div key={ch.item.id} className="h-10 relative flex items-center px-1">
                          <div
                            style={{ left: chCoords.left, width: chCoords.width }}
                            onClick={() => onClickItem(ch.item)}
                            title={`${ch.item.code}: ${ch.item.title} (${ch.range.startDate} al ${ch.range.dueDate})${
                              isInherited ? ` [${ch.range.inheritedFrom}]` : ''
                            }`}
                            className={`absolute h-6 rounded-md shadow-xs border flex items-center justify-between min-w-0 p-1 px-2 cursor-pointer transition-all hover:scale-[1.01] hover:brightness-105 ${getStatusColor(
                              ch.item.status
                            )} ${isInherited ? 'opacity-85 border-dashed' : ''}`}
                          >
                            <span className="text-xs font-medium truncate">
                              {ch.item.code}: {ch.item.title}
                            </span>
                            {isInherited && (
                              <span className="text-xs font-mono opacity-75 shrink-0 ml-1">
                                ~{ch.range.inheritedFrom}
                              </span>
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
