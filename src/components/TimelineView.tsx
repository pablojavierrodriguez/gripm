import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { TimelineViewProps, TimeScale } from './timeline/types';
import type { Sprint, Release } from '../types';
import { isSprintModuleActive } from '../types';
import { useTranslation } from '../utils/i18n';
import { buildHierarchyRows } from './timeline/buildHierarchy';
import { computeTimeLimitsAndColumns, computeTodayMarkerPx } from './timeline/dateEngine';
import { useTimelineDrag } from './timeline/useTimelineDrag';
import { TimelineToolbar } from './timeline/TimelineToolbar';
import { TimelineSidebar } from './timeline/TimelineSidebar';
import { TimelineCanvas } from './timeline/TimelineCanvas';

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  allItems,
  sprints = [],
  releases = [],
  onClickItem,
  onUpdateItem,
  config: _config
}) => {
  const { language } = useTranslation();
  const isSprintEnabled = isSprintModuleActive(_config) && sprints.length > 0;
  const [scale, setScale] = useState<TimeScale>('months');

  useEffect(() => {
    if (!isSprintEnabled && scale === 'sprints') {
      setScale('months');
    }
  }, [isSprintEnabled, scale]);

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

  // Sprints sorted chronologically
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
    return buildHierarchyRows(filteredItems, groupByParent, sprintsMap, releasesMap);
  }, [filteredItems, groupByParent, sprintsMap, releasesMap]);

  // Expand all epics by default
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    hierarchyRows.forEach((r) => {
      if (r.isEpic) initial[r.item.id] = true;
    });
    setExpandedEpics((prev) => ({ ...initial, ...prev }));
  }, [hierarchyRows]);

  // Global Time Limits and Columns Calculation
  const { minGlobalDate, maxGlobalDate, timeColumns, totalGridWidthPx, pxPerDay } = useMemo(() => {
    return computeTimeLimitsAndColumns(scale, sortedSprints, hierarchyRows, language);
  }, [scale, sortedSprints, hierarchyRows, language]);

  // Today marker calculation
  const todayMarkerPx = useMemo(() => {
    return computeTodayMarkerPx(scale, sortedSprints, minGlobalDate, maxGlobalDate, pxPerDay);
  }, [scale, sortedSprints, minGlobalDate, maxGlobalDate, pxPerDay]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const scrollToToday = () => {
    if (canvasScrollRef.current && todayMarkerPx !== null) {
      const targetPos = todayMarkerPx - (canvasScrollRef.current.clientWidth / 2);
      canvasScrollRef.current.scrollTo({ left: Math.max(0, targetPos), behavior: 'smooth' });
    }
  };

  // Drag & drop interaction hook
  const {
    dragState,
    actionFeedback,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useTimelineDrag({
    scale,
    sortedSprints,
    pxPerDay,
    onClickItem,
    onUpdateItem
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      <TimelineToolbar
        totalItemsCount={filteredItems.length}
        search={search}
        onSearchChange={setSearch}
        actionFeedback={actionFeedback}
        todayMarkerPx={todayMarkerPx}
        onScrollToToday={scrollToToday}
        groupByParent={groupByParent}
        onToggleGroupByParent={() => setGroupByParent(!groupByParent)}
        scale={scale}
        onScaleChange={setScale}
        isSprintEnabled={isSprintEnabled}
      />

      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <TimelineSidebar
          sidebarWidth={sidebarWidth}
          hierarchyRows={hierarchyRows}
          expandedEpics={expandedEpics}
          onToggleEpic={toggleEpic}
          onClickItem={onClickItem}
          onMouseDownResize={handleMouseDownResize}
        />

        <TimelineCanvas
          canvasScrollRef={canvasScrollRef}
          totalGridWidthPx={totalGridWidthPx}
          timeColumns={timeColumns}
          todayMarkerPx={todayMarkerPx}
          scale={scale}
          sortedSprints={sortedSprints}
          minGlobalDate={minGlobalDate}
          pxPerDay={pxPerDay}
          hierarchyRows={hierarchyRows}
          expandedEpics={expandedEpics}
          dragState={dragState}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
};
