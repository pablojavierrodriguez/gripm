import type { FC } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import type { LocViolation } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface AuditBudgetsTabProps {
  isLocDisabled: boolean;
  violations: LocViolation[];
}

export const AuditBudgetsTab: FC<AuditBudgetsTabProps> = ({
  isLocDisabled,
  violations,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {isLocDisabled && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          {t('audit.locDisabledNotice')}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pb-1">
        <span>{t('audit.locViolations')}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {t('audit.locWarnThreshold')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t('audit.locCritThreshold')}
          </span>
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('audit.locNoViolations')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {violations.map((v, idx) => {
            const isCrit = v.status === 'error' || v.lines >= 1000;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCrit ? (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                    {v.file}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {v.lines} {t('audit.lines')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      isCrit
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isCrit ? '>= 1000' : '>= 500'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
