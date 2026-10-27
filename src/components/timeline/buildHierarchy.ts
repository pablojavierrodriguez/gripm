import type { BacklogItem, Sprint, Release } from '../../types';
import type { TimelineRow } from './types';
import { resolveTaskDates } from './dateEngine';

/**
 * Builds the hierarchical timeline row tree:
 * - If groupByParent is true: groups child tasks under their respective Epic/Initiative parent
 *   and calculates epic start/due spans and aggregated completion percentage.
 * - If groupByParent is false: renders items in a flat list.
 */
export function buildHierarchyRows(
  items: BacklogItem[],
  groupByParent: boolean,
  sprintsMap: Map<string, Sprint>,
  releasesMap: Map<string, Release>
): TimelineRow[] {
  const epics: BacklogItem[] = [];
  const nonEpics: BacklogItem[] = [];
  const childrenMap = new Map<string, BacklogItem[]>();

  items.forEach((it) => {
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
    items.forEach((it) => {
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
}
