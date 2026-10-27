import type { BacklogItem, Sprint, Release } from '../../types';
import type { TimelineRow, TimelineSortMode } from './types';
import { resolveTaskDates } from './dateEngine';

/**
 * Builds the hierarchical timeline row tree:
 * - If groupByParent is true: groups child tasks under their respective Epic/Initiative parent
 *   and calculates epic start/due spans and aggregated completion percentage.
 *   If a child task matches active filters but its parent epic does not, the parent is included
 *   as a context container (marked with isContextParent: true) without re-injecting non-matching tasks.
 * - If groupByParent is false: renders items in a flat list.
 * - Supports sortMode: 'natural' (preserves backlog/board order) or 'chronological' (by startDate).
 */
export function buildHierarchyRows(
  items: BacklogItem[],
  groupByParent: boolean,
  sprintsMap: Map<string, Sprint>,
  releasesMap: Map<string, Release>,
  allItems: BacklogItem[] = [],
  sortMode: TimelineSortMode = 'natural'
): TimelineRow[] {
  // Stable index of items to preserve natural backlog/board order
  const itemsOrderIndex = new Map<string, number>();
  items.forEach((it, idx) => {
    itemsOrderIndex.set(it.id, idx);
  });

  const compareRows = (a: TimelineRow, b: TimelineRow): number => {
    if (sortMode === 'chronological') {
      const startCmp = a.range.startDate.localeCompare(b.range.startDate);
      if (startCmp !== 0) return startCmp;
      const dueCmp = a.range.dueDate.localeCompare(b.range.dueDate);
      if (dueCmp !== 0) return dueCmp;
    }
    const orderA = a.item.order ?? itemsOrderIndex.get(a.item.id) ?? 0;
    const orderB = b.item.order ?? itemsOrderIndex.get(b.item.id) ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.item.id.localeCompare(b.item.id);
  };

  const directEpics: BacklogItem[] = [];
  const nonEpics: BacklogItem[] = [];
  const childrenMap = new Map<string, BacklogItem[]>();

  items.forEach((it) => {
    const isEpicType = it.type === 'epic' || it.type === 'initiative';
    if (isEpicType) {
      directEpics.push(it);
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
    // Lookup map of all project items to resolve context parents
    const allItemsMap = new Map<string, BacklogItem>();
    allItems.forEach((it) => {
      allItemsMap.set(it.id, it);
      if (it.code) {
        allItemsMap.set(it.code.toLowerCase(), it);
      }
    });

    const contextParents: BacklogItem[] = [];
    const contextParentIds = new Set<string>();

    childrenMap.forEach((_, parentKey) => {
      const inDirect = directEpics.some(
        (ep) => ep.id === parentKey || (ep.code && ep.code.toLowerCase() === parentKey.toLowerCase())
      );
      if (!inDirect) {
        const found = allItemsMap.get(parentKey) || allItemsMap.get(parentKey.toLowerCase());
        if (found && !contextParentIds.has(found.id)) {
          contextParentIds.add(found.id);
          contextParents.push(found);
        }
      }
    });

    const allParentCandidates = [...directEpics, ...contextParents];

    allParentCandidates.forEach((parent) => {
      const byId = childrenMap.get(parent.id) || [];
      const byCode = parent.code ? (childrenMap.get(parent.code) || []) : [];
      const seenChildren = new Set<string>();
      const children: BacklogItem[] = [];
      [...byId, ...byCode].forEach((ch) => {
        if (!seenChildren.has(ch.id)) {
          seenChildren.add(ch.id);
          children.push(ch);
        }
      });

      const epicRange = resolveTaskDates(parent, sprintsMap, releasesMap);
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

      childRows.sort(compareRows);

      const isContextParent = contextParentIds.has(parent.id);
      const progressPercent = children.length > 0
        ? Math.round((totalCompletedChildren / children.length) * 100)
        : (parent.status === 'done' || parent.status === 'ready' ? 100 : 0);

      rows.push({
        item: parent,
        range: { startDate: minStart, dueDate: maxDue, isInherited: epicRange.isInherited },
        isEpic: true,
        isContextParent,
        children: childRows,
        progressPercent
      });
    });

    const standaloneTasks = nonEpics.filter((it) => {
      const parentRef = it.parentId || it.epic;
      if (!parentRef) return true;
      const parentKey = parentRef.trim().toLowerCase();
      const isParentKnown = allParentCandidates.some(
        (p) => p.id.toLowerCase() === parentKey || (p.code && p.code.toLowerCase() === parentKey)
      );
      return !isParentKnown;
    });

    standaloneTasks.forEach((st) => {
      const stRange = resolveTaskDates(st, sprintsMap, releasesMap);
      rows.push({
        item: st,
        range: stRange,
        isEpic: false,
        progressPercent: st.status === 'ready' || st.status === 'done' ? 100 : 0
      });
    });

    rows.sort(compareRows);
  } else {
    items.forEach((it) => {
      const range = resolveTaskDates(it, sprintsMap, releasesMap);
      rows.push({
        item: it,
        range,
        isEpic: it.type === 'epic' || it.type === 'initiative',
        progressPercent: it.status === 'ready' || it.status === 'done' ? 100 : 0
      });
    });
    rows.sort(compareRows);
  }

  return rows;
}
