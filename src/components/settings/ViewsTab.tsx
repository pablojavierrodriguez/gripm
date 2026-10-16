import React from 'react';
import {
  Layout,
  Target,
  Sliders,
  ChevronDown,
  Layers,
  Boxes,
  Rocket,
  Calendar,
  BarChart2
} from 'lucide-react';
import type {
  ProjectMethodology,
  ModulesConfig,
  EstimationMethod
} from '../../types';
import { useTranslation } from '../../utils/i18n';
import { SettingsSwitch } from '../SettingsView';

import { ViewsTabEstimation } from './ViewsTabEstimation';

export interface ViewsTabProps {
  methodology: ProjectMethodology;
  onSelectMethodology: (m: ProjectMethodology) => void;
  defaultView: 'kanban' | 'sprint' | 'release' | 'timeline' | 'metrics' | 'settings';
  setDefaultView: (v: 'kanban' | 'sprint' | 'release' | 'timeline' | 'metrics' | 'settings') => void;
  enabledTabs: {
    kanban?: boolean;
    sprint?: boolean;
    release?: boolean;
    timeline?: boolean;
    metrics?: boolean;
  };
  setEnabledTabs: React.Dispatch<React.SetStateAction<{
    kanban: boolean;
    sprint: boolean;
    release: boolean;
    timeline: boolean;
    metrics: boolean;
  }>>;
  modulesState: ModulesConfig;
  onNavigateToModules: () => void;
  estimationEnabled: boolean;
  setEstimationEnabled: (v: boolean) => void;
  estimationMethod: EstimationMethod;
  setEstimationMethod: (m: EstimationMethod) => void;
  customFibonacci?: number[];
  customTshirt?: string[];
}

export const ViewsTab: React.FC<ViewsTabProps> = ({
  methodology,
  onSelectMethodology,
  defaultView,
  setDefaultView,
  enabledTabs,
  setEnabledTabs,
  modulesState,
  onNavigateToModules,
  estimationEnabled,
  setEstimationEnabled,
  estimationMethod,
  setEstimationMethod,
  customFibonacci,
  customTshirt
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {t('settings.viewsTitle')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.viewsDesc')}
        </p>
      </div>

      {/* Methodology Selector (DEV-038, DEV-274) */}
      <div className="space-y-3">
        <div>
          <label htmlFor="methodology-select" className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('settings.methodologyLabel')}
          </label>
          <p className="text-xs text-slate-500">
            {t('settings.methodologyDesc')}
          </p>
        </div>

        <div className="relative max-w-xl">
          <select
            id="methodology-select"
            value={methodology}
            onChange={(e) => onSelectMethodology(e.target.value as ProjectMethodology)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none pr-10"
          >
            <option value="kanban">{t('settings.methodologyKanban')} — {t('settings.methodologyKanbanBadgeBoard')}</option>
            {modulesState.sprint && (
              <>
                <option value="scrum">{t('settings.methodologyScrum')} — {t('settings.methodologyScrumBadgeSprints')}</option>
                <option value="scrumban">{t('settings.methodologyScrumban')} — {t('settings.methodologyScrumbanBadgeBoard')}</option>
              </>
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Active Methodology Summary Card */}
        <div className="p-3.5 rounded-xl border bg-slate-50/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08] max-w-xl">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white min-w-0">
              {methodology === 'kanban' && <Layers className="w-4 h-4 text-indigo-500 shrink-0" />}
              {methodology === 'scrum' && <Target className="w-4 h-4 text-amber-500 shrink-0" />}
              {methodology === 'scrumban' && <Sliders className="w-4 h-4 text-emerald-500 shrink-0" />}
              <span className="truncate">
                {methodology === 'kanban' ? t('settings.methodologyKanban') : methodology === 'scrum' ? t('settings.methodologyScrum') : t('settings.methodologyScrumban')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {methodology === 'kanban' && (
                <>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold">
                    {t('settings.methodologyKanbanBadgeBoard')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-200 dark:bg-white/10 text-slate-500">
                    {t('settings.methodologyKanbanBadgeSprints')}
                  </span>
                </>
              )}
              {methodology === 'scrum' && (
                <>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold">
                    {t('settings.methodologyScrumBadgeSprints')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-200 dark:bg-white/10 text-slate-500">
                    {t('settings.methodologyScrumBadgeBoard')}
                  </span>
                </>
              )}
              {methodology === 'scrumban' && (
                <>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold">
                    {t('settings.methodologyScrumbanBadgeBoard')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold">
                    {t('settings.methodologyScrumbanBadgeSprints')}
                  </span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {methodology === 'kanban' ? t('settings.methodologyKanbanDesc') : methodology === 'scrum' ? t('settings.methodologyScrumDesc') : t('settings.methodologyScrumbanDesc')}
          </p>
        </div>

        {!modulesState.sprint && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3 max-w-xl">
            <div className="flex items-center gap-2 min-w-0">
              <Boxes className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {t('settings.methodologySprintModuleHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToModules}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors shrink-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t('settings.goToModules')}
            </button>
          </div>
        )}
      </div>

      {/* Default View Selector (DEV-274) */}
      <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
        <div>
          <label htmlFor="default-view-select" className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('settings.defaultViewLabel')}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.defaultViewDesc')}
          </p>
        </div>

        <div className="relative max-w-xl">
          <select
            id="default-view-select"
            value={defaultView}
            onChange={(e) => setDefaultView(e.target.value as any)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none pr-10"
          >
            <option value="kanban">{t('header.kanban')} ({t('settings.coreViewBadge')})</option>
            {modulesState.sprint && enabledTabs.sprint && (
              <option value="sprint">{t('header.sprints')}</option>
            )}
            {modulesState.release && enabledTabs.release && (
              <option value="release">{t('header.releases')}</option>
            )}
            {modulesState.timeline && enabledTabs.timeline && (
              <option value="timeline">{t('header.timeline')}</option>
            )}
            {enabledTabs.metrics && (
              <option value="metrics">{t('header.metrics')}</option>
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Active Default View Summary Card */}
        <div className="p-3.5 rounded-xl border bg-slate-50/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08] max-w-xl">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white min-w-0">
              {defaultView === 'kanban' && <Layout className="w-4 h-4 text-indigo-500 shrink-0" />}
              {defaultView === 'sprint' && <Target className="w-4 h-4 text-amber-500 shrink-0" />}
              {defaultView === 'release' && <Rocket className="w-4 h-4 text-emerald-500 shrink-0" />}
              {defaultView === 'timeline' && <Calendar className="w-4 h-4 text-blue-500 shrink-0" />}
              {defaultView === 'metrics' && <BarChart2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              <span className="truncate">
                {defaultView === 'kanban' && t('header.kanban')}
                {defaultView === 'sprint' && t('header.sprints')}
                {defaultView === 'release' && t('header.releases')}
                {defaultView === 'timeline' && t('header.timeline')}
                {defaultView === 'metrics' && t('header.metrics')}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-xs font-mono shrink-0 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold">
              {defaultView === 'kanban' ? t('settings.coreViewBadge') : defaultView.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {defaultView === 'kanban' && t('settings.defaultViewKanbanDesc')}
            {defaultView === 'sprint' && t('settings.defaultViewSprintDesc')}
            {defaultView === 'release' && t('settings.defaultViewReleaseDesc')}
            {defaultView === 'timeline' && t('settings.defaultViewTimelineDesc')}
            {defaultView === 'metrics' && t('settings.defaultViewMetricsDesc')}
          </p>
        </div>
      </div>

      {/* Header Visible Tabs */}
      <div className="pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-3">
        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
          {t('settings.enabledTabsLabel')}
        </label>
        <p className="text-xs text-slate-500">
          {t('settings.enabledTabsDesc')}
        </p>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0">
              <Layout className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('header.kanban')}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 shrink-0">
                    {t('settings.coreViewBadge')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {methodology === 'scrumban'
                    ? t('settings.kanbanTabScrumbanDesc')
                    : methodology === 'scrum'
                    ? t('settings.kanbanTabScrumDesc')
                    : t('settings.kanbanTabKanbanDesc')}
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
              {t('settings.alwaysActive')}
            </span>
          </div>

          <label className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            !modulesState.sprint
              ? 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/[0.04] opacity-75 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <Target className={`w-4 h-4 shrink-0 ${modulesState.sprint ? 'text-amber-500' : 'text-slate-400'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('header.sprints')}</span>
                  {!modulesState.sprint && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-white/10 text-slate-500">
                      {t('settings.moduleInactiveHint')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {methodology === 'kanban'
                    ? t('settings.sprintTabKanbanDesc')
                    : t('settings.sprintTabScrumDesc')}
                </div>
              </div>
            </div>
            <SettingsSwitch
              checked={modulesState.sprint ? Boolean(enabledTabs.sprint) : false}
              disabled={!modulesState.sprint}
              onChange={(checked) => {
                if (!checked && !enabledTabs.kanban && !enabledTabs.release) return;
                setEnabledTabs((prev) => ({ ...prev, sprint: checked }));
                if (!checked && defaultView === 'sprint') {
                  setDefaultView('kanban');
                }
              }}
              ariaLabel={t('header.sprints')}
            />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            !modulesState.release
              ? 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/[0.04] opacity-75 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <Rocket className={`w-4 h-4 shrink-0 ${modulesState.release ? 'text-emerald-500' : 'text-slate-400'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('header.releases')}</span>
                  {!modulesState.release && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-white/10 text-slate-500">
                      {t('settings.moduleInactiveHint')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{t('settings.releaseTabDesc')}</div>
              </div>
            </div>
            <SettingsSwitch
              checked={modulesState.release ? Boolean(enabledTabs.release) : false}
              disabled={!modulesState.release}
              onChange={(checked) => {
                if (!checked && !enabledTabs.kanban && !enabledTabs.sprint) return;
                setEnabledTabs((prev) => ({ ...prev, release: checked }));
                if (!checked && defaultView === 'release') {
                  setDefaultView('kanban');
                }
              }}
              ariaLabel={t('header.releases')}
            />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            !modulesState.timeline
              ? 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/[0.04] opacity-75 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className={`w-4 h-4 shrink-0 ${modulesState.timeline ? 'text-blue-500' : 'text-slate-400'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('header.timeline')}</span>
                  {!modulesState.timeline && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-white/10 text-slate-500">
                      {t('settings.moduleInactiveHint')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{t('settings.timelineTabDesc')}</div>
              </div>
            </div>
            <SettingsSwitch
              checked={modulesState.timeline ? Boolean(enabledTabs.timeline) : false}
              disabled={!modulesState.timeline}
              onChange={(checked) => {
                if (!checked && !enabledTabs.kanban && !enabledTabs.sprint && !enabledTabs.release) return;
                setEnabledTabs((prev) => ({ ...prev, timeline: checked }));
                if (!checked && defaultView === 'timeline') {
                  setDefaultView('kanban');
                }
              }}
              ariaLabel={t('header.timeline')}
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <BarChart2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t('header.metrics')}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">{t('settings.metricsTabDesc')}</div>
              </div>
            </div>
            <SettingsSwitch
              checked={Boolean(enabledTabs.metrics)}
              onChange={(checked) => {
                if (!checked && !enabledTabs.kanban && !enabledTabs.sprint && !enabledTabs.release && !enabledTabs.timeline) return;
                setEnabledTabs((prev) => ({ ...prev, metrics: checked }));
                if (!checked && defaultView === 'metrics') {
                  setDefaultView('kanban');
                }
              }}
              ariaLabel={t('header.metrics')}
            />
          </label>
        </div>
      </div>

      {/* Sección: Estimación de Ítems (DEV-136) */}
      <ViewsTabEstimation
        estimationEnabled={estimationEnabled}
        setEstimationEnabled={setEstimationEnabled}
        estimationMethod={estimationMethod}
        setEstimationMethod={setEstimationMethod}
        customFibonacci={customFibonacci}
        customTshirt={customTshirt}
      />
    </div>
  );
};
