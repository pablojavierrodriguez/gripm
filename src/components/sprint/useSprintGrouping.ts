import { useMemo } from 'react';
import type { BacklogItem, Sprint } from '../../types';
import type { GroupBy } from './SprintHeaderControls';
import { normalizePriorityNum, normalizeStatusNum } from './sprintHelpers';

interface UseSprintGroupingParams {
  items: BacklogItem[];
  hierarchyItems: BacklogItem[];
  groupBy: GroupBy;
  sortBy: 'order' | 'priority' | 'code' | 'status';
  sortAsc: boolean;
  sprints: Sprint[];
  showCompletedSprints: boolean;
  availableSprints?: string[];
  availableReleases?: string[];
}

export function useSprintGrouping({
  items,
  hierarchyItems,
  groupBy,
  sortBy,
  sortAsc,
  sprints,
  showCompletedSprints,
  availableSprints = [],
  availableReleases = []
}: UseSprintGroupingParams) {
  const allAvailableSprints = useMemo(() => {
    const set = new Set<string>();
    if (availableSprints && availableSprints.length > 0) {
      availableSprints.forEach((s) => set.add(s));
    }
    sprints.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableSprints, sprints]);

  const activeSprints = useMemo(() => {
    const nonCompleted = sprints.filter((s) => s.status !== 'completed' && Boolean(s.name)).map((s) => s.name);
    if (nonCompleted.length > 0) {
      return Array.from(new Set(nonCompleted)).sort();
    }
    return allAvailableSprints;
  }, [sprints, allAvailableSprints]);

  const allAvailableReleases = useMemo(() => {
    const set = new Set<string>();
    if (availableReleases && availableReleases.length > 0) {
      availableReleases.forEach((r) => r && set.add(r));
    }
    hierarchyItems.forEach((it) => {
      const r = it.release || it.targetRelease;
      if (r && !r.toLowerCase().includes('sprint')) set.add(r);
      if (Array.isArray(it.releases)) {
        it.releases.forEach((rel) => {
          if (rel && !rel.toLowerCase().includes('sprint')) set.add(rel);
        });
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableReleases, hierarchyItems]);

  const suggestedSprintName = useMemo(() => {
    const allNames = Array.from(new Set([
      ...allAvailableSprints,
      ...items.map((i) => i.sprint || i.targetSprint || '')
    ]));
    let maxNum = 0;
    for (const name of allNames) {
      const match = name.match(/sprint\s*(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `Sprint ${maxNum + 1}`;
  }, [allAvailableSprints, items]);

  const completedSprintsCount = useMemo(() => {
    if (groupBy !== 'sprint') return 0;
    const completedSet = new Set<string>();
    sprints.filter((s) => s.status === 'completed').forEach((s) => completedSet.add(s.name.toLowerCase().trim()));

    const sprintGroups = new Map<string, BacklogItem[]>();
    for (const it of items) {
      const sp = it.sprint || it.targetSprint;
      if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '-') {
        const k = sp.trim().toLowerCase();
        if (!sprintGroups.has(k)) sprintGroups.set(k, []);
        sprintGroups.get(k)!.push(it);
      }
    }
    for (const [k, list] of sprintGroups.entries()) {
      if (list.length > 0 && list.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish')) {
        completedSet.add(k);
      }
    }
    return completedSet.size;
  }, [groupBy, sprints, items]);

  const groupedData = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'order') {
        diff = (a.order ?? 9999) - (b.order ?? 9999);
      } else if (sortBy === 'priority') {
        diff = normalizePriorityNum(a.priority) - normalizePriorityNum(b.priority);
      } else if (sortBy === 'status') {
        diff = normalizeStatusNum(a.status) - normalizeStatusNum(b.status);
      } else if (sortBy === 'code') {
        diff = a.code.localeCompare(b.code, undefined, { numeric: true });
      }

      if (diff === 0) {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }

      return sortAsc ? diff : -diff;
    });

    if (groupBy === 'none') {
      return [{ key: 'Todos los ítems', items: sorted }];
    }

    const groups = new Map<string, BacklogItem[]>();

    for (const it of sorted) {
      let key = 'Sin Asignar';
      if (groupBy === 'sprint') {
        key = it.sprint || it.targetSprint || 'Backlog';
      } else if (groupBy === 'priority') {
        key = it.priority.toUpperCase();
      } else if (groupBy === 'module') {
        key = it.module || 'General / Core';
      } else if (groupBy === 'epic') {
        const parent = it.parentId
          ? hierarchyItems.find(candidate => candidate.id === it.parentId || candidate.code === it.parentId)
          : undefined;
        key = parent
          ? `${parent.code || parent.id} · ${parent.title}`
          : it.epic || it.module || 'Sin Épica';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(it);
    }

    if (groupBy === 'sprint') {
      for (const sp of sprints) {
        if (sp.name && !groups.has(sp.name)) {
          groups.set(sp.name, []);
        }
      }
    }

    let result = Array.from(groups.entries()).map(([key, list]) => ({ key, items: list }));

    if (groupBy === 'sprint') {
      result = result.filter((g) => {
        const isNoSprint = g.key === 'Backlog' || g.key.includes('Sin Sprint') || g.key === 'Sin Asignar';
        if (isNoSprint) return true;

        const spObj = sprints.find((s) => s.name?.toLowerCase().trim() === g.key.toLowerCase().trim() || s.id === g.key);
        const isAllDone = g.items.length > 0 && g.items.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
        const isCompleted = spObj ? spObj.status === 'completed' : isAllDone;

        if (!showCompletedSprints && isCompleted) return false;
        return true;
      });

      result.sort((a, b) => {
        const isNoSprintA = a.key === 'Backlog' || a.key.includes('Sin Sprint') || a.key === 'Sin Asignar';
        const isNoSprintB = b.key === 'Backlog' || b.key.includes('Sin Sprint') || b.key === 'Sin Asignar';
        if (isNoSprintA) return 1;
        if (isNoSprintB) return -1;

        const spA = sprints.find((s) => s.name === a.key || s.id === a.key);
        const spB = sprints.find((s) => s.name === b.key || s.id === b.key);

        const dateA = spA?.startDate || spA?.createdAt;
        const dateB = spB?.startDate || spB?.createdAt;
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        return a.key.localeCompare(b.key, undefined, { numeric: true });
      });
    } else if (groupBy === 'priority') {
      const pOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      result.sort((a, b) => (pOrder[a.key] ?? 99) - (pOrder[b.key] ?? 99));
    } else if (groupBy === 'module') {
      result.sort((a, b) => a.key.localeCompare(b.key));
    }

    return result;
  }, [items, hierarchyItems, groupBy, sortBy, sortAsc, sprints, showCompletedSprints]);

  return {
    allAvailableSprints,
    activeSprints,
    allAvailableReleases,
    suggestedSprintName,
    completedSprintsCount,
    groupedData
  };
}
