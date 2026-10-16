import React from 'react';
import { Globe, Sun, Moon, Monitor } from 'lucide-react';
import type { Language } from '../../utils/i18n';
import { useTranslation } from '../../utils/i18n';
import type { GripmConfig } from '../../types';
import { SettingsSwitch } from '../SettingsView';

export interface VisualTabProps {
  locale: Language;
  handleLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light' | 'system';
  setTheme: (t: 'dark' | 'light' | 'system') => void;
  density: 'comfortable' | 'compact';
  setDensity: (d: 'comfortable' | 'compact') => void;
  autoSave: boolean;
  setAutoSave: (v: boolean) => void;
  rankingEnabled: boolean;
  setRankingEnabled: (v: boolean) => void;
  config?: GripmConfig | null;
  updateConfig: (updates: Partial<GripmConfig>) => void;
}

export const VisualTab: React.FC<VisualTabProps> = ({
  locale,
  handleLanguageChange,
  theme,
  setTheme,
  density,
  setDensity,
  autoSave,
  setAutoSave,
  rankingEnabled,
  setRankingEnabled,
  config,
  updateConfig,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {t('settings.appearanceTitle')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.appearanceDesc')}
        </p>
      </div>

      {/* Language Selector Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('settings.languageLabel')}</span>
            </label>
            <p className="text-xs text-slate-500">
              {t('settings.languageDesc')}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {locale === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleLanguageChange('es')}
            className={`p-4 rounded-xl border text-left transition-all ${
              locale === 'es'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
              <span className="text-base">🇪🇸</span>
              <span>{t('settings.langEs')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('settings.langEsDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`p-4 rounded-xl border text-left transition-all ${
              locale === 'en'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
              <span className="text-base">🇬🇧</span>
              <span>{t('settings.langEn')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('settings.langEnDesc')}
            </p>
          </button>
        </div>
      </div>

      {/* Theme Selector Cards */}
      <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
          {t('settings.themeLabel')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'light'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{t('settings.themeLight')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('settings.themeLightDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'dark'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>{t('settings.themeDark')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('settings.themeDarkDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'system'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1.5">
              <Monitor className="w-4 h-4 text-slate-400" />
              <span>{t('settings.themeSystem')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('settings.themeSystemDesc')}
            </p>
          </button>
        </div>
      </div>

      {/* Density, AutoSave, Manual Ranking, and Filter Bar Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
        {/* 1. Board Density */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {t('settings.densityLabel')}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {t('settings.densityDesc')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                density === 'comfortable'
                  ? 'bg-white dark:bg-indigo-600/30 border-indigo-500/40 text-indigo-600 dark:text-indigo-200 shadow-xs font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {t('settings.densityComfortable')}
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                density === 'compact'
                  ? 'bg-white dark:bg-indigo-600/30 border-indigo-500/40 text-indigo-600 dark:text-indigo-200 shadow-xs font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {t('settings.densityCompact')}
            </button>
          </div>
        </div>

        {/* 2. Auto-save on Edit */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
          <label className="flex items-start justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75 gap-3 min-w-0">
            <div className="pr-2 min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {t('settings.autoSaveLabel')}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.autoSaveDesc')}
              </p>
            </div>
            <SettingsSwitch
              checked={autoSave}
              onChange={setAutoSave}
              ariaLabel={t('settings.autoSaveLabel')}
            />
          </label>
        </div>

        {/* 3. Manual Ranking and Drag & Drop */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
          <label className="flex items-start justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75 gap-3 min-w-0">
            <div className="pr-2 min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {t('settings.rankingLabel')}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.rankingDesc')}
              </p>
            </div>
            <SettingsSwitch
              checked={rankingEnabled}
              onChange={setRankingEnabled}
              ariaLabel={t('settings.rankingLabel')}
            />
          </label>
        </div>

        {/* 4. Filter Bar Stats Summary (DEV-278) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
          <label className="flex items-start justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75 gap-3 min-w-0">
            <div className="pr-2 min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {t('settings.showFilterBarStatsLabel')}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.showFilterBarStatsDesc')}
              </p>
            </div>
            <SettingsSwitch
              checked={config?.showFilterBarStats !== false}
              onChange={(checked) => updateConfig({ showFilterBarStats: checked })}
              ariaLabel={t('settings.showFilterBarStatsLabel')}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
