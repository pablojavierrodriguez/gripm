import { useMemo, useState, type FC } from 'react';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  BarChart2,
  Rocket,
  CheckCircle2,
  PieChart,
  Target,
  Filter
} from 'lucide-react';
import type { BacklogItem, Sprint, Release, GripmConfig } from '../types';
import { useTranslation } from '../utils/i18n';

interface MetricsViewProps {
  items: BacklogItem[];
  sprints?: Sprint[];
  releases?: Release[];
  config?: GripmConfig;
}

export const MetricsView: FC<MetricsViewProps> = ({
  items,
  sprints = [],
  releases = []
}) => {
  const { t } = useTranslation();
  const [scopeFilter, setScopeFilter] = useState<'all' | 'sprint' | 'release'>('all');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('');
  const [selectedReleaseFilter, setSelectedReleaseFilter] = useState<string>('');

  // Filter out soft-deleted items
  const activeItems = useMemo(() => {
    let pool = items.filter((it) => !it.isDeleted);
    if (scopeFilter === 'sprint' && selectedSprintFilter) {
      pool = pool.filter(
        (it) =>
          it.sprint === selectedSprintFilter ||
          it.targetSprint === selectedSprintFilter ||
          it.sprints?.includes(selectedSprintFilter)
      );
    } else if (scopeFilter === 'release' && selectedReleaseFilter) {
      pool = pool.filter(
        (it) =>
          it.release === selectedReleaseFilter ||
          it.targetRelease === selectedReleaseFilter ||
          it.releases?.includes(selectedReleaseFilter)
      );
    }
    return pool;
  }, [items, scopeFilter, selectedSprintFilter, selectedReleaseFilter]);

  // 1. KPI: Throughput (Completed & Ready)
  const throughputMetrics = useMemo(() => {
    const completedTasks = activeItems.filter(
      (it) => it.status === 'done' || it.status === 'ready'
    );
    const count = completedTasks.length;
    const total = activeItems.length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const doneOnly = activeItems.filter((it) => it.status === 'done').length;
    const readyOnly = activeItems.filter((it) => it.status === 'ready').length;

    return { count, total, percentage, doneOnly, readyOnly };
  }, [activeItems]);

  // 2. KPI: Cycle Time Promedio
  const cycleTimeMetrics = useMemo(() => {
    const completedTasks = activeItems.filter(
      (it) => it.status === 'done' || it.status === 'ready'
    );
    const validDiffs: number[] = [];

    completedTasks.forEach((it) => {
      const createdStr = it.createdAt || (it as any).created_date;
      const resolvedStr = it.completedAt || (it as any).updated_date || it.updatedAt;
      if (createdStr && resolvedStr) {
        const createdMs = Date.parse(createdStr);
        const resolvedMs = Date.parse(resolvedStr);
        if (!Number.isNaN(createdMs) && !Number.isNaN(resolvedMs) && resolvedMs >= createdMs) {
          const diffDays = (resolvedMs - createdMs) / (1000 * 60 * 60 * 24);
          validDiffs.push(diffDays);
        }
      }
    });

    if (validDiffs.length === 0) {
      return { averageDays: '-', count: 0 };
    }

    const sum = validDiffs.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / validDiffs.length;
    return {
      averageDays: avg < 1 ? '< 1' : avg.toFixed(1),
      count: validDiffs.length
    };
  }, [activeItems]);

  // 3. KPI: AC Health (Criterios de Aceptación)
  const acHealthMetrics = useMemo(() => {
    let totalAc = 0;
    let checkedAc = 0;

    activeItems.forEach((it) => {
      if (it.acceptanceCriteriaList && Array.isArray(it.acceptanceCriteriaList)) {
        totalAc += it.acceptanceCriteriaList.length;
        checkedAc += it.acceptanceCriteriaList.filter((ac) => ac.checked).length;
      }
    });

    const percentage = totalAc > 0 ? Math.round((checkedAc / totalAc) * 100) : 0;
    return { totalAc, checkedAc, percentage };
  }, [activeItems]);

  // 4. KPI: Active WIP (doing + review)
  const wipMetrics = useMemo(() => {
    const doing = activeItems.filter((it) => it.status === 'doing').length;
    const review = activeItems.filter((it) => it.status === 'review').length;
    const totalWip = doing + review;
    return { doing, review, totalWip };
  }, [activeItems]);

  // 5. Distribution by Status
  const statusDistribution = useMemo(() => {
    const configStatuses: { id: string; labelKey: string; color: string; hex: string }[] = [
      { id: 'draft', labelKey: 'status.draft', color: 'bg-indigo-500', hex: '#6366f1' },
      { id: 'doing', labelKey: 'status.doing', color: 'bg-amber-500', hex: '#f59e0b' },
      { id: 'review', labelKey: 'status.review', color: 'bg-purple-500', hex: '#a855f7' },
      { id: 'ready', labelKey: 'status.ready', color: 'bg-teal-500', hex: '#14b8a6' },
      { id: 'done', labelKey: 'status.done', color: 'bg-emerald-500', hex: '#10b981' }
    ];

    const total = activeItems.length || 1;
    return configStatuses.map((st) => {
      const count = activeItems.filter((it) => it.status === st.id).length;
      const pct = Math.round((count / total) * 100);
      return { ...st, count, pct };
    });
  }, [activeItems]);

  // 6. Distribution by Type
  const typeDistribution = useMemo(() => {
    const types: { id: string; labelKey: string; color: string; hex: string }[] = [
      { id: 'feature', labelKey: 'type.feature', color: 'bg-blue-500', hex: '#3b82f6' },
      { id: 'bug', labelKey: 'type.bug', color: 'bg-rose-500', hex: '#f43f5e' },
      { id: 'ux', labelKey: 'type.ux', color: 'bg-violet-500', hex: '#8b5cf6' },
      { id: 'tech_debt', labelKey: 'type.tech_debt', color: 'bg-amber-500', hex: '#f59e0b' },
      { id: 'epic', labelKey: 'type.epic', color: 'bg-emerald-500', hex: '#10b981' },
      { id: 'initiative', labelKey: 'type.initiative', color: 'bg-cyan-500', hex: '#06b6d4' }
    ];

    const total = activeItems.length || 1;
    return types.map((tp) => {
      const count = activeItems.filter((it) => it.type === tp.id).length;
      const pct = Math.round((count / total) * 100);
      return { ...tp, count, pct };
    });
  }, [activeItems]);

  // 7. AC Health by Sprint
  const sprintAcStats = useMemo(() => {
    return sprints.map((s) => {
      const sprintItems = activeItems.filter(
        (it) =>
          it.sprint === s.name ||
          it.targetSprint === s.name ||
          it.sprints?.includes(s.name)
      );

      let totalAc = 0;
      let checkedAc = 0;
      sprintItems.forEach((it) => {
        if (it.acceptanceCriteriaList) {
          totalAc += it.acceptanceCriteriaList.length;
          checkedAc += it.acceptanceCriteriaList.filter((ac) => ac.checked).length;
        }
      });

      const pct = totalAc > 0 ? Math.round((checkedAc / totalAc) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        itemCount: sprintItems.length,
        totalAc,
        checkedAc,
        pct
      };
    });
  }, [sprints, activeItems]);

  // 8. AC Health by Release
  const releaseAcStats = useMemo(() => {
    return releases.map((r) => {
      const releaseItems = activeItems.filter(
        (it) =>
          it.release === r.version ||
          it.targetRelease === r.version ||
          it.releases?.includes(r.version) ||
          r.itemCodes?.includes(it.code)
      );

      let totalAc = 0;
      let checkedAc = 0;
      releaseItems.forEach((it) => {
        if (it.acceptanceCriteriaList) {
          totalAc += it.acceptanceCriteriaList.length;
          checkedAc += it.acceptanceCriteriaList.filter((ac) => ac.checked).length;
        }
      });

      const pct = totalAc > 0 ? Math.round((checkedAc / totalAc) * 100) : 0;
      return {
        id: r.id,
        version: r.version,
        title: r.title,
        status: r.status || 'unreleased',
        itemCount: releaseItems.length,
        totalAc,
        checkedAc,
        pct
      };
    });
  }, [releases, activeItems]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col min-h-0 space-y-6">
      {/* Top Header & Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('metrics.title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('metrics.subtitle')}
            </p>
          </div>
        </div>

        {/* Scope Controls */}
        <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              setScopeFilter('all');
              setSelectedSprintFilter('');
              setSelectedReleaseFilter('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[36px] ${
              scopeFilter === 'all'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('common.all')}
          </button>
          {sprints.length > 0 && (
            <button
              onClick={() => {
                setScopeFilter('sprint');
                if (!selectedSprintFilter) setSelectedSprintFilter(sprints[0]?.name || '');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[36px] ${
                scopeFilter === 'sprint'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('metrics.sprintsSection')}
            </button>
          )}
          {releases.length > 0 && (
            <button
              onClick={() => {
                setScopeFilter('release');
                if (!selectedReleaseFilter) setSelectedReleaseFilter(releases[0]?.version || '');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[36px] ${
                scopeFilter === 'release'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('metrics.releasesSection')}
            </button>
          )}
        </div>
      </div>

      {/* Scope Milestone Sub-bar (DEV-229 / UX Zero-Layout-Shift) */}
      {scopeFilter !== 'all' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-2xs animate-fade-in -mt-2">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                {scopeFilter === 'sprint' ? t('metrics.sprintsSection') : t('metrics.releasesSection')}:
              </span>
            </div>

            {scopeFilter === 'sprint' && sprints.length > 0 && (
              <select
                value={selectedSprintFilter}
                onChange={(e) => setSelectedSprintFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs min-h-[34px]"
              >
                {sprints.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            )}

            {scopeFilter === 'release' && releases.length > 0 && (
              <select
                value={selectedReleaseFilter}
                onChange={(e) => setSelectedReleaseFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs min-h-[34px]"
              >
                {releases.map((r) => (
                  <option key={r.id} value={r.version}>
                    v{r.version} {r.title ? ` - ${r.title}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {activeItems.length}
            </span>
            <span>
              {t('metrics.itemsCount', { count: '' }).trim()}
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Throughput */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between min-w-0 text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">{t('metrics.kpiThroughput')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {throughputMetrics.count}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              / {throughputMetrics.total} {t('metrics.itemsCount', { count: '' }).trim()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('metrics.kpiThroughputDesc')}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {throughputMetrics.percentage}%
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${throughputMetrics.percentage}%` }}
            />
          </div>
        </div>

        {/* Card 2: Cycle Time */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between min-w-0 text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">{t('metrics.kpiCycleTime')}</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {cycleTimeMetrics.averageDays}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t('metrics.days')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('metrics.kpiCycleTimeDesc')}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {cycleTimeMetrics.count} {t('common.completed').toLowerCase()}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full w-full opacity-60" />
          </div>
        </div>

        {/* Card 3: AC Health */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between min-w-0 text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">{t('metrics.kpiAcHealth')}</span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {acHealthMetrics.percentage}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {acHealthMetrics.checkedAc} / {acHealthMetrics.totalAc}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('metrics.kpiAcHealthDesc')}</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {t('metrics.verified')}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${acHealthMetrics.percentage}%` }}
            />
          </div>
        </div>

        {/* Card 4: Active WIP */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between min-w-0 text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">{t('metrics.kpiWip')}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {wipMetrics.totalWip}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t('metrics.itemsCount', { count: '' }).trim()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('metrics.kpiWipDesc')}</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {wipMetrics.doing} doing · {wipMetrics.review} review
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
            <div
              className="h-full bg-amber-500"
              style={{
                width: `${wipMetrics.totalWip > 0 ? (wipMetrics.doing / wipMetrics.totalWip) * 100 : 0}%`
              }}
            />
            <div
              className="h-full bg-purple-500"
              style={{
                width: `${wipMetrics.totalWip > 0 ? (wipMetrics.review / wipMetrics.totalWip) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts: Status Distribution & Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between min-w-0 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <PieChart className="w-4 h-4 text-indigo-500 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {t('metrics.stateDistribution')}
                </h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                {activeItems.length} {t('metrics.itemsCount', { count: '' }).trim()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('metrics.stateDistributionDesc')}
            </p>

            {/* Segmented Proportional Progress Bar */}
            <div className="mt-5 w-full h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex shadow-inner">
              {statusDistribution.map((st) =>
                st.count > 0 ? (
                  <div
                    key={st.id}
                    className={`h-full ${st.color} transition-all duration-300 hover:opacity-85`}
                    style={{ width: `${(st.count / (activeItems.length || 1)) * 100}%` }}
                    title={`${t(st.labelKey as any)}: ${st.count} (${st.pct}%)`}
                  />
                ) : null
              )}
            </div>

            {/* Legend & Count Details */}
            <div className="mt-5 space-y-2.5">
              {statusDistribution.map((st) => (
                <div key={st.id} className="flex items-center justify-between min-w-0 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.color} shrink-0`} />
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {t(st.labelKey as any)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {st.count}
                    </span>
                    <span className="w-10 text-right font-semibold text-slate-700 dark:text-slate-200">
                      {st.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between min-w-0 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-violet-500 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {t('metrics.typeDistribution')}
                </h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                {activeItems.length} {t('metrics.itemsCount', { count: '' }).trim()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('metrics.typeDistributionDesc')}
            </p>

            {/* Horizontal Bar Breakdown */}
            <div className="mt-5 space-y-3">
              {typeDistribution.map((tp) => (
                <div key={tp.id} className="space-y-1">
                  <div className="flex items-center justify-between min-w-0 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${tp.color} shrink-0`} />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {t(tp.labelKey as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {tp.count}
                      </span>
                      <span className="w-10 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {tp.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${tp.color} rounded-full transition-all duration-500`}
                      style={{ width: `${tp.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Acceptance Criteria Health by Milestone (Sprints & Releases) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0 gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('metrics.acHealthOverview')}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('metrics.acHealthOverviewDesc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sprints AC Health */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{t('metrics.sprintsSection')}</span>
            </div>

            {sprintAcStats.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] text-xs text-slate-400 text-center">
                {t('metrics.noSprints')}
              </div>
            ) : (
              <div className="space-y-2">
                {sprintAcStats.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-3 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between min-w-0 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {sp.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-mono capitalize shrink-0 ${
                            sp.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sp.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                        <span>
                          {sp.checkedAc}/{sp.totalAc} AC
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 w-10 text-right">
                          {sp.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${sp.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Releases AC Health */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Rocket className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{t('metrics.releasesSection')}</span>
            </div>

            {releaseAcStats.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] text-xs text-slate-400 text-center">
                {t('metrics.noReleases')}
              </div>
            ) : (
              <div className="space-y-2">
                {releaseAcStats.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between min-w-0 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          v{rel.version}
                        </span>
                        {rel.title && (
                          <span className="text-slate-400 truncate max-w-[140px]">
                            {rel.title}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-mono capitalize shrink-0 ${
                            rel.status === 'released'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {rel.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                        <span>
                          {rel.checkedAc}/{rel.totalAc} AC
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 w-10 text-right">
                          {rel.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${rel.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
