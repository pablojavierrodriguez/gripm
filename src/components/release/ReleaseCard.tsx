import { type FC } from 'react';
import {
  Rocket,
  Copy,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Trash2,
  Clock
} from 'lucide-react';
import type { BacklogItem, Release } from '../../types';
import { useTranslation } from '../../utils/i18n';

interface ReleaseCardProps {
  release: Release;
  items: BacklogItem[];
  onSelect: (releaseId: string) => void;
  onQuickCopy: (content: string, version: string) => void;
  onPromote: (release: Release) => void;
  onDelete?: (release: Release) => void;
}

export const ReleaseCard: FC<ReleaseCardProps> = ({
  release: rel,
  items,
  onSelect,
  onQuickCopy,
  onPromote,
  onDelete
}) => {
  const { t } = useTranslation();
  const isUnrel = rel.status === 'unreleased' || (!rel.status && rel.version !== '0.2.0');
  const relV = rel.version.replace(/^v/i, '');
  const matchingItems = items.filter(
    (it) =>
      (rel.itemCodes || []).includes(it.code) ||
      (it.release && it.release.replace(/^v/i, '') === relV) ||
      (it.targetRelease && it.targetRelease.replace(/^v/i, '') === relV)
  );
  const total = matchingItems.length;
  const done = matchingItems.filter(
    (it) => it.status === 'done' || it.status === 'finish' || it.status === 'ready'
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      onClick={() => onSelect(rel.id)}
      className={`group rounded-xl border p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isUnrel
          ? 'border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.04]'
          : 'border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/40 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]'
      }`}
    >
      {/* Left info: Version, Status, Title, Summary */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg border ${
              isUnrel
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}
          >
            v{rel.version}
          </span>

          <span
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              isUnrel
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isUnrel ? (
              <>
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{t('release.statusUnreleased')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t('release.statusReleased')}</span>
              </>
            )}
          </span>

          <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{rel.targetDate || rel.date}</span>
          </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          {rel.title.replace(/^En Preparación:\s*/i, '')}
        </h3>

        {rel.summary && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed">
            {rel.summary}
          </p>
        )}
      </div>

      {/* Right Progress & Quick Actions */}
      <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Progress Indicator */}
        <div className="w-36 space-y-1 text-right">
          <div className="flex min-w-0 items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">{t('release.scope')}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {done}/{total} ({pct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                pct === 100
                  ? 'bg-emerald-500'
                  : isUnrel
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onQuickCopy(rel.markdownContent, rel.version)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] transition-all"
            title={t('release.copyChangelog')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {isUnrel && (
            <button
              onClick={() => onPromote(rel)}
              disabled={total === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-all"
              title={t('release.promoteTooltip')}
            >
              <Rocket className="w-3.5 h-3.5 text-emerald-100" />
              <span className="hidden sm:inline">{t('release.promoteBtn')}</span>
            </button>
          )}

          <button
            onClick={() => onSelect(rel.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-all"
          >
            <span>{t('release.detailBtn')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {isUnrel && onDelete && (
            <button
              onClick={() => onDelete(rel)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-slate-600 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all"
              title={t('release.deleteDraftTooltip')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
