import type { BacklogItem, Sprint, Release } from '../../types';
import type {
  TimeScale,
  ResolvedDateRange,
  TimelineRow,
  TimelineTimeColumn,
  ItemCoordinates
} from './types';

export const MONTH_NAMES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const MONTH_FULL_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
export const MONTH_NAMES_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTH_FULL_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Adds or subtracts days to a YYYY-MM-DD date string using pure UTC arithmetic.
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM-DD date into DD/MM/YYYY display string.
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Resolves dates for a backlog item (explicit or inherited from Sprint / Release).
 */
export function resolveTaskDates(
  item: BacklogItem,
  sprintsMap: Map<string, Sprint>,
  releasesMap: Map<string, Release>
): ResolvedDateRange {
  // 1. Explicit dates
  if (item.startDate && item.dueDate) {
    const start = item.startDate.slice(0, 10);
    const due = item.dueDate.slice(0, 10);
    if (start <= due) {
      return { startDate: start, dueDate: due, isInherited: false };
    }
  }

  if (item.dueDate && !item.startDate) {
    const due = item.dueDate.slice(0, 10);
    const start = addDays(due, -14);
    return {
      startDate: start,
      dueDate: due,
      isInherited: false
    };
  }

  if (item.startDate && !item.dueDate) {
    const start = item.startDate.slice(0, 10);
    const due = addDays(start, 14);
    return {
      startDate: start,
      dueDate: due,
      isInherited: false
    };
  }

  // 2. Sprint inheritance
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

  // 3. Release inheritance
  const releaseVer = item.release || item.targetRelease || (item.releases && item.releases.length > 0 ? item.releases[item.releases.length - 1] : undefined);
  if (releaseVer && releasesMap.has(releaseVer.toLowerCase())) {
    const rel = releasesMap.get(releaseVer.toLowerCase());
    const targetDate = rel?.targetDate || rel?.date;
    if (targetDate) {
      const due = targetDate.slice(0, 10);
      const start = addDays(due, -14);
      return {
        startDate: start,
        dueDate: due,
        isInherited: true,
        inheritedFrom: `Release ${rel.version || releaseVer}`
      };
    }
  }

  // 4. Fallback: createdAt + 14 days
  const created = item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fallbackDue = addDays(created, 14);
  return {
    startDate: created,
    dueDate: fallbackDue,
    isInherited: true,
    inheritedFrom: 'Creado'
  };
}

export interface TimeLimitsResult {
  minGlobalDate: string;
  maxGlobalDate: string;
  timeColumns: TimelineTimeColumn[];
  totalGridWidthPx: number;
  pxPerDay: number;
}

/**
 * Calculates global time limits, time column headers, and pixel-per-day density.
 */
export function computeTimeLimitsAndColumns(
  scale: TimeScale,
  sortedSprints: Sprint[],
  hierarchyRows: TimelineRow[],
  language: string
): TimeLimitsResult {
  const monthNames = language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ES;
  const monthFull = language === 'en' ? MONTH_FULL_EN : MONTH_FULL_ES;

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

  const minDateParsed = new Date(minD === '9999-12-31' ? nowIso : minD);
  const maxDateParsed = new Date(maxD === '0000-01-01' ? nowIso : maxD);
  const now = new Date();

  const earliestMonthTotal = Math.min(
    minDateParsed.getFullYear() * 12 + minDateParsed.getMonth(),
    now.getFullYear() * 12 + now.getMonth() - 1
  );

  const latestMonthTotal = Math.max(
    maxDateParsed.getFullYear() * 12 + maxDateParsed.getMonth(),
    now.getFullYear() * 12 + now.getMonth() + 3
  );

  const minObj = new Date(Math.floor(earliestMonthTotal / 12), earliestMonthTotal % 12, 1);
  const maxObj = new Date(Math.floor(latestMonthTotal / 12), (latestMonthTotal % 12) + 1, 0);

  const minDateStr = minObj.toISOString().slice(0, 10);
  const maxDateStr = maxObj.toISOString().slice(0, 10);
  const diffDays = Math.max(1, Math.round((maxObj.getTime() - minObj.getTime()) / (1000 * 60 * 60 * 24)));

  if (scale === 'quarters') {
    const colWidth = 320;
    const cols: TimelineTimeColumn[] = [];
    let cur = new Date(minObj);
    while (cur <= maxObj) {
      const qNum = Math.floor(cur.getMonth() / 3) + 1;
      const year = cur.getFullYear();
      const startQ = new Date(year, (qNum - 1) * 3, 1);
      const endQ = new Date(year, qNum * 3, 0);

      cols.push({
        label: `Q${qNum} ${year}`,
        sublabel: `${monthNames[startQ.getMonth()]} - ${monthNames[endQ.getMonth()]} ${year}`,
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
  const cols: TimelineTimeColumn[] = [];
  let cur = new Date(minObj);
  while (cur <= maxObj) {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const startM = new Date(year, month, 1);

    cols.push({
      label: `${monthFull[month]} ${year}`,
      sublabel: `${monthNames[month]} • ${language === 'en' ? 'Days' : 'Días'} 1-${new Date(year, month + 1, 0).getDate()} (${year})`,
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
}

/**
 * Computes today marker pixel offset.
 */
export function computeTodayMarkerPx(
  scale: TimeScale,
  sortedSprints: Sprint[],
  minGlobalDate: string,
  maxGlobalDate: string,
  pxPerDay: number
): number | null {
  const nowIso = new Date().toISOString().slice(0, 10);
  if (scale === 'sprints') {
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
}

/**
 * Calculates bar coordinates (left & width in pixels) according to time scale.
 */
export function calculateItemCoordinates(
  scale: TimeScale,
  sortedSprints: Sprint[],
  minGlobalDate: string,
  pxPerDay: number,
  item: BacklogItem,
  range: ResolvedDateRange,
  isEpic: boolean,
  childRows?: TimelineRow[]
): ItemCoordinates {
  if (scale === 'sprints') {
    const colWidth = 280;
    if (isEpic && childRows && childRows.length > 0) {
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

    return {
      leftPx: 8,
      widthPx: Math.max(60, colWidth - 16),
      isUnassignedSprint: true
    };
  }

  const minMs = new Date(minGlobalDate).getTime();
  const startMs = new Date(range.startDate).getTime();
  const dueMs = new Date(range.dueDate).getTime();

  const startDays = Math.max(0, (startMs - minMs) / (1000 * 60 * 60 * 24));
  const durationDays = Math.max(1, (dueMs - startMs) / (1000 * 60 * 60 * 24));

  const left = startDays * pxPerDay;
  const width = Math.max(32, durationDays * pxPerDay);

  return { leftPx: left, widthPx: width };
}
