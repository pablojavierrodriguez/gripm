/**
 * server/services/backlog/backlogStats.ts
 *
 * Backlog statistics and metrics calculations.
 */

import { normalizeStatus, normalizePriority } from '../../../scripts/backlogMdParser.ts';

export interface BacklogStats {
  total: number;
  open: number;
  done: number;
  completionRate: string;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byPrefix: Record<string, { total: number; open: number; done: number }>;
}

export function computeBacklogStats(tasks: any[]): BacklogStats {
  const total = tasks.length;
  const closedStatuses = ['done', 'dismissed', 'cancelled', 'released'];
  let openCount = 0;
  let doneCount = 0;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byPrefix: Record<string, { total: number; open: number; done: number }> = {};

  for (const t of tasks) {
    const s = normalizeStatus(t.status);
    const p = normalizePriority(t.priority);
    const isClosed = closedStatuses.includes(s);
    if (isClosed) doneCount++; else openCount++;

    byStatus[s] = (byStatus[s] || 0) + 1;
    byPriority[p] = (byPriority[p] || 0) + 1;

    const code = String(t.code || t.id || '');
    const parts = code.split('-');
    const prefix = parts.length > 2 ? `${parts[0]}-${parts[1]}` : (parts[0] || 'OTHER');

    if (!byPrefix[prefix]) {
      byPrefix[prefix] = { total: 0, open: 0, done: 0 };
    }
    byPrefix[prefix].total++;
    if (isClosed) byPrefix[prefix].done++; else byPrefix[prefix].open++;
  }

  const completionRate = `${total > 0 ? Math.round((doneCount / total) * 100) : 0}%`;

  return {
    total,
    open: openCount,
    done: doneCount,
    completionRate,
    byStatus,
    byPriority,
    byPrefix
  };
}
