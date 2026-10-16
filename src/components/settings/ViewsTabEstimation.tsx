import React from 'react';
import { Sliders, Check } from 'lucide-react';
import type { EstimationMethod } from '../../types';
import { DEFAULT_FIBONACCI, DEFAULT_TSHIRT } from '../../types';
import { useTranslation } from '../../utils/i18n';
import { SettingsSwitch } from '../SettingsView';

export interface ViewsTabEstimationProps {
  estimationEnabled: boolean;
  setEstimationEnabled: (v: boolean) => void;
  estimationMethod: EstimationMethod;
  setEstimationMethod: (m: EstimationMethod) => void;
  customFibonacci?: number[];
  customTshirt?: string[];
}

export const ViewsTabEstimation: React.FC<ViewsTabEstimationProps> = ({
  estimationEnabled,
  setEstimationEnabled,
  estimationMethod,
  setEstimationMethod,
  customFibonacci,
  customTshirt,
}) => {
  const { t } = useTranslation();

  return (
    <div className="pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
      <div className="flex items-center justify-between min-w-0">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('settings.estimationTitle')}
          </h3>
          <p className="text-xs text-slate-500">
            {t('settings.estimationDesc')}
          </p>
        </div>
      </div>

      {/* Toggle principal */}
      <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Sliders className={`w-4 h-4 shrink-0 ${estimationEnabled ? 'text-indigo-500' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-900 dark:text-white block">
              {t('settings.estimationEnableLabel')}
            </span>
            <span className="text-xs text-slate-500 block">
              {t('settings.estimationEnableDesc')}
            </span>
          </div>
        </div>
        <SettingsSwitch
          checked={estimationEnabled}
          onChange={(checked) => setEstimationEnabled(checked)}
          ariaLabel={t('settings.estimationEnableLabel')}
        />
      </label>

      {/* Opciones cuando está habilitado */}
      {estimationEnabled && (
        <div className="space-y-4 pt-1 animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.estimationMethodLabel')}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              {t('settings.estimationMethodDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEstimationMethod('fibonacci')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  estimationMethod === 'fibonacci'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between min-w-0 mb-1.5">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {t('settings.estimationMethodFibonacci')}
                  </span>
                  {estimationMethod === 'fibonacci' && (
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-normal mb-3">
                  {t('settings.estimationMethodFibonacciDesc')}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(customFibonacci || DEFAULT_FIBONACCI).map((pt) => (
                    <span
                      key={pt}
                      className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30"
                    >
                      {pt}
                    </span>
                  ))}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEstimationMethod('tshirt')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  estimationMethod === 'tshirt'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between min-w-0 mb-1.5">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {t('settings.estimationMethodTshirt')}
                  </span>
                  {estimationMethod === 'tshirt' && (
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-normal mb-3">
                  {t('settings.estimationMethodTshirtDesc')}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(customTshirt || DEFAULT_TSHIRT).map((size) => (
                    <span
                      key={size}
                      className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/30"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            {t('settings.estimationNonDestructiveHint')}
          </p>
        </div>
      )}
    </div>
  );
};
