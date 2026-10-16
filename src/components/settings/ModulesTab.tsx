import React from 'react';
import { Layout, Target, Rocket, Globe, Calendar } from 'lucide-react';
import type { ModulesConfig } from '../../types';
import { useTranslation } from '../../utils/i18n';
import { SettingsSwitch } from '../SettingsView';

export interface ModulesTabProps {
  modulesState: ModulesConfig;
  modeState: 'single' | 'multi';
  handleToggleSprintModule: () => void;
  handleToggleReleaseModule: () => void;
  handleToggleMultiHub: () => void;
  handleToggleCalendarModule: () => void;
  handleToggleTimelineModule: () => void;
}

export const ModulesTab: React.FC<ModulesTabProps> = ({
  modulesState,
  modeState,
  handleToggleSprintModule,
  handleToggleReleaseModule,
  handleToggleMultiHub,
  handleToggleCalendarModule,
  handleToggleTimelineModule,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {t('settings.modulesTitle')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('settings.modulesDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2">
        {/* 1. Kanban Core & Backlog */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleKanbanTitle')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {t('settings.moduleCoreBadge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleKanbanDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {t('settings.moduleActive')}
            </span>
          </div>
        </div>

        {/* 2. Sprints & Timeboxing (Scrum) */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleSprintsTitle')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  modulesState.sprint
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10'
                }`}>
                  {modulesState.sprint ? t('settings.moduleActive') : t('settings.moduleInactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleSprintsDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            <SettingsSwitch
              checked={Boolean(modulesState.sprint)}
              onChange={handleToggleSprintModule}
              ariaLabel={t('settings.moduleSprintsTitle')}
            />
          </div>
        </div>

        {/* 3. Release Management & Versioning */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleReleasesTitle')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  modulesState.release
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10'
                }`}>
                  {modulesState.release ? t('settings.moduleActive') : t('settings.moduleInactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleReleasesDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            <SettingsSwitch
              checked={Boolean(modulesState.release)}
              onChange={handleToggleReleaseModule}
              ariaLabel={t('settings.moduleReleasesTitle')}
            />
          </div>
        </div>

        {/* 4. Multi-Project Hub */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleHubTitle')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  modeState === 'multi'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10'
                }`}>
                  {modeState === 'multi' ? t('settings.moduleActive') : t('settings.moduleInactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleHubDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            <SettingsSwitch
              checked={modeState === 'multi'}
              onChange={handleToggleMultiHub}
              ariaLabel={t('settings.moduleHubTitle')}
            />
          </div>
        </div>

        {/* 5. Calendar Export & Scheduling */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleCalendarTitle')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  modulesState.calendar !== false
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10'
                }`}>
                  {modulesState.calendar !== false ? t('settings.moduleActive') : t('settings.moduleInactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleCalendarDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            <SettingsSwitch
              checked={modulesState.calendar !== false}
              onChange={handleToggleCalendarModule}
              ariaLabel={t('settings.moduleCalendarTitle')}
            />
          </div>
        </div>

        {/* 6. Timeline & Roadmap */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.moduleTimelineTitle')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  modulesState.timeline !== false
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10'
                }`}>
                  {modulesState.timeline !== false ? t('settings.moduleActive') : t('settings.moduleInactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('settings.moduleTimelineDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:self-center shrink-0">
            <SettingsSwitch
              checked={modulesState.timeline !== false}
              onChange={handleToggleTimelineModule}
              ariaLabel={t('settings.moduleTimelineTitle')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
