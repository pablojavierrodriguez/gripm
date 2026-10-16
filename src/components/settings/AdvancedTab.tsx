import React from 'react';
import { useTranslation } from '../../utils/i18n';

export interface AdvancedTabProps {
  rawJson: string;
  setRawJson: (v: string) => void;
  jsonError: string | null;
  setJsonError: (v: string | null) => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({
  rawJson,
  setRawJson,
  jsonError,
  setJsonError,
  onShowToast,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between min-w-0">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 truncate">
            {t('settings.advancedTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.advancedDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            try {
              const parsed = JSON.parse(rawJson);
              setRawJson(JSON.stringify(parsed, null, 2));
              setJsonError(null);
              onShowToast?.(t('settings.toastJsonFormatted'), 'info');
            } catch (e: any) {
              setJsonError(`Error de sintaxis: ${e.message}`);
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {t('settings.formatJson')}
        </button>
      </div>

      {jsonError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono">
          {jsonError}
        </div>
      )}

      <div className="relative">
        <textarea
          value={rawJson}
          onChange={(e) => {
            setRawJson(e.target.value);
            if (jsonError) setJsonError(null);
          }}
          rows={20}
          className="w-full p-4 rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed shadow-inner"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
