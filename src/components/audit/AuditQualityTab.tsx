import type { FC } from 'react';
import { Sparkles } from 'lucide-react';
import type { CodeQualitySuppression } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface AuditQualityTabProps {
  isQualityDisabled: boolean;
  suppressions: CodeQualitySuppression[];
}

export const AuditQualityTab: FC<AuditQualityTabProps> = ({
  isQualityDisabled,
  suppressions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {isQualityDisabled && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          {t('audit.qualityDisabledNotice')}
        </div>
      )}
      <div className="text-xs text-slate-500 dark:text-slate-400 pb-1">
        <span>{t('audit.qualitySuppressionsFound')}</span>
      </div>

      {suppressions.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
          <Sparkles className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('audit.qualityNoSuppressions')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppressions.map((sup, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {sup.type}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {sup.file}:{sup.line}
                  </span>
                </div>
              </div>

              {sup.snippet && (
                <pre className="p-2 rounded bg-slate-100 dark:bg-[#070b12] text-slate-700 dark:text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {sup.snippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
