import type { FC } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import type { RepoHealthReport, GripmConfig } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface AuditBadgeProps {
  report: RepoHealthReport | null;
  isLoading: boolean;
  onClick: () => void;
  config?: GripmConfig;
  className?: string;
}

export const AuditBadge: FC<AuditBadgeProps> = ({
  report,
  isLoading,
  onClick,
  config,
  className = '',
}) => {
  const { t } = useTranslation();

  // Zero-Clutter Invariant: respect config toggle
  if (config?.showAuditBadge === false) {
    return null;
  }

  const isCompact = config?.auditBadgeStyle === 'compact';

  // Zero-CLS placeholder during initial load
  if (isLoading && !report) {
    return (
      <div
        className={`h-9 sm:h-8 w-24 sm:w-28 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] animate-pulse shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (!report) {
    return null;
  }

  const score = Math.round(report.score);

  // Determine semantic color styles
  let colorStyles = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20';
  let dotColor = 'bg-emerald-500';
  let StatusIcon = ShieldCheck;

  if (score < 60) {
    colorStyles = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20';
    dotColor = 'bg-rose-500';
    StatusIcon = AlertCircle;
  } else if (score < 80) {
    colorStyles = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20';
    dotColor = 'bg-amber-500';
    StatusIcon = AlertTriangle;
  }

  const ariaText = t('audit.badgeAria', { score });

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${t('audit.healthScore')}: ${score}/100`}
      aria-label={ariaText}
      className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-fit flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none shrink-0 ${colorStyles} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      <StatusIcon className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
      <span className="whitespace-nowrap font-medium">
        {isCompact ? `${score}` : `${t('audit.health')}: ${score}`}
      </span>
    </button>
  );
};
