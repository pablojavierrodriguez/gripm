import { type FC } from 'react';
import { createPortal } from 'react-dom';
import {
  Rocket,
  CheckCircle2,
  Clock,
  RefreshCw,
  Save,
  X,
  Edit2,
  Layers,
  FileText,
  Plus,
  Sparkles,
  Copy
} from 'lucide-react';
import type { BacklogItem, Release } from '../../types';
import { typeConfig, priorityConfig } from '../ItemCard';
import { useTranslation } from '../../utils/i18n';

interface ReleaseDrawerProps {
  activeRelease: Release | null;
  items: BacklogItem[];
  availableDoneTasks: BacklogItem[];
  drawerTab: 'details' | 'tasks' | 'changelog';
  setDrawerTab: (tab: 'details' | 'tasks' | 'changelog') => void;
  editTitle: string;
  setEditTitle: (val: string) => void;
  editDate: string;
  setEditDate: (val: string) => void;
  editTargetDate: string;
  setEditTargetDate: (val: string) => void;
  editSummary: string;
  setEditSummary: (val: string) => void;
  editScopeNotes: string;
  setEditScopeNotes: (val: string) => void;
  editMarkdown: string;
  setEditMarkdown: (val: string) => void;
  editItemCodes: string[];
  isSavingDrawer: boolean;
  onSaveDrawer: () => void;
  onClose: () => void;
  onToggleTaskInRelease: (code: string) => void;
  onRegenerateMarkdown: () => void;
  onQuickCopyMarkdown: (content: string, ver: string) => void;
  onPromoteToProduction: (rel: Release) => void;
}

export const ReleaseDrawer: FC<ReleaseDrawerProps> = ({
  activeRelease,
  items,
  availableDoneTasks,
  drawerTab,
  setDrawerTab,
  editTitle,
  setEditTitle,
  editDate,
  setEditDate,
  editTargetDate,
  setEditTargetDate,
  editSummary,
  setEditSummary,
  editScopeNotes,
  setEditScopeNotes,
  editMarkdown,
  setEditMarkdown,
  editItemCodes,
  isSavingDrawer,
  onSaveDrawer,
  onClose,
  onToggleTaskInRelease,
  onRegenerateMarkdown,
  onQuickCopyMarkdown,
  onPromoteToProduction
}) => {
  const { t } = useTranslation();

  if (!activeRelease) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/75 backdrop-blur-md transition-all animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full glass-panel border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 shadow-sm ${
                activeRelease.status === 'released'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 shrink-0" />
              v{activeRelease.version}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                activeRelease.status === 'released'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeRelease.status === 'released' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              {activeRelease.status === 'released'
                ? t('release.statusReleased')
                : t('release.statusUnreleased')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeRelease.status !== 'released' && (
              <button
                onClick={onSaveDrawer}
                disabled={isSavingDrawer}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSavingDrawer ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{t('common.save')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
              title={t('release.closePanel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Release Title Banner */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-slate-950/40 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-tight leading-snug">
            {editTitle || activeRelease.title || `Versión v${activeRelease.version}`}
          </h3>
          {editSummary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
              {editSummary}
            </p>
          )}
        </div>

        {/* Drawer Sub-tabs */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/30 shrink-0">
          <button
            onClick={() => setDrawerTab('details')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              drawerTab === 'details'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t('release.tabDetails')}</span>
          </button>

          <button
            onClick={() => setDrawerTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              drawerTab === 'tasks'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('release.tabTasks')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                drawerTab === 'tasks'
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
              }`}
            >
              {editItemCodes.length}
            </span>
          </button>

          <button
            onClick={() => setDrawerTab('changelog')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              drawerTab === 'changelog'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('release.tabChangelog')}</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: METADATOS */}
          {drawerTab === 'details' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('release.versionTitleLabel')}
                </label>
                <input
                  type="text"
                  disabled={activeRelease.status === 'released'}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('release.namePlaceholder')}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {activeRelease.status === 'released' ? t('release.releaseDate') : t('release.targetDate')}
                  </label>
                  <input
                    type="date"
                    disabled={activeRelease.status === 'released'}
                    value={activeRelease.status === 'released' ? editDate : editTargetDate}
                    onChange={(e) => {
                      if (activeRelease.status === 'released') setEditDate(e.target.value);
                      else setEditTargetDate(e.target.value);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('release.packageStatus')}
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-medium flex items-center gap-2">
                    {activeRelease.status === 'released' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">{t('release.deployedToProd')}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-amber-700 dark:text-amber-300">{t('release.inPreparation')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('release.summaryLabel')}
                </label>
                <textarea
                  rows={3}
                  disabled={activeRelease.status === 'released'}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder={t('release.summaryPlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('release.scopeNotesLabel')}
                </label>
                <textarea
                  rows={3}
                  disabled={activeRelease.status === 'released'}
                  value={editScopeNotes}
                  onChange={(e) => setEditScopeNotes(e.target.value)}
                  placeholder={t('release.scopePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-60 transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 2: TAREAS ASOCIADAS */}
          {drawerTab === 'tasks' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/[0.06]">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t('release.tasksInPackage', { count: editItemCodes.length })}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {t('release.tasksInPackageDesc')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {editItemCodes.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl bg-slate-50 dark:bg-white/[0.01]">
                    <Layers className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t('release.noTasksInPackage')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">
                      {t('release.linkTasksHint')}
                    </p>
                  </div>
                ) : (
                  editItemCodes.map((code) => {
                    const item = items.find((it) => it.code === code);
                    const pConf = item?.priority ? priorityConfig[item.priority] : null;
                    const tConf = item?.type ? typeConfig[item.type] : null;

                    return (
                      <div
                        key={code}
                        className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] hover:border-indigo-500/30 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {code}
                          </span>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item?.title || t('release.registeredTask')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {tConf && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium border ${tConf.badge}`}>
                              {tConf.label}
                            </span>
                          )}
                          {pConf && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-white/[0.05] ${pConf.text}`}>
                              {pConf.label}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                            item?.status === 'done'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                          }`}>
                            {item?.status === 'done' ? 'Done' : 'Ready'}
                          </span>

                          {activeRelease.status !== 'released' && (
                            <button
                              type="button"
                              onClick={() => onToggleTaskInRelease(code)}
                              className="p-1 rounded-lg text-slate-600 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title={t('release.unlinkTask')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Unassigned Finished Tasks (only if unreleased) */}
              {activeRelease.status !== 'released' && (
                <div className="pt-5 border-t border-slate-200 dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{t('release.availableDoneTasks')}</span>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {availableDoneTasks.length} {t('release.availableCount')}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">
                        {t('release.availableDoneTasksDesc')}
                      </p>
                    </div>
                  </div>

                  {availableDoneTasks.length === 0 ? (
                    <div className="py-4 text-center rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-white/[0.05] text-xs text-slate-600 dark:text-slate-500">
                      {t('release.noDoneTasksAvailable')}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1.5">
                      {availableDoneTasks.map((it) => (
                        <div
                          key={it.code}
                          onClick={() => onToggleTaskInRelease(it.code)}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 hover:bg-indigo-500/10 border border-slate-200 dark:border-white/[0.04] hover:border-indigo-500/30 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                              {it.code}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                              {it.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 transition-all shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('release.linkTask')}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHANGELOG */}
          {drawerTab === 'changelog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t('release.officialMarkdownTitle')}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {t('release.officialMarkdownDesc')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeRelease.status !== 'released' && (
                    <button
                      onClick={onRegenerateMarkdown}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-all"
                      title={t('release.regenerateNotesTooltip')}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('release.regenerateNotes')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onQuickCopyMarkdown(editMarkdown, activeRelease.version)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-white/[0.08] transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('common.copy')}</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                disabled={activeRelease.status === 'released'}
                value={editMarkdown}
                onChange={(e) => setEditMarkdown(e.target.value)}
                className="w-full p-4 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 disabled:opacity-75 resize-y"
                placeholder={t('release.markdownPlaceholder')}
              />
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
          {activeRelease.status === 'released' ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('release.sealedNotice')}</span>
            </span>
          ) : (
            <button
              onClick={() => onPromoteToProduction(activeRelease)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
            >
              <Rocket className="w-4 h-4 text-emerald-100" />
              <span>{t('release.promoteAndRelease')}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-white/[0.08] transition-all"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
