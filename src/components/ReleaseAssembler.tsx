import { useState, useMemo, useEffect, type FC } from 'react';
import {
  Rocket,
  RefreshCw,
  CheckCircle2,
  Plus,
  Clock,
  Search
} from 'lucide-react';
import type { BacklogItem, Release } from '../types';
import { syncLegacyReleases } from '../api';
import { ConfirmModal } from './ConfirmModal';
import { useTranslation } from '../utils/i18n';
import { ReleaseCard } from './release/ReleaseCard';
import { ReleaseDrawer } from './release/ReleaseDrawer';
import { NewReleaseModal } from './release/NewReleaseModal';
import {
  resolveReleaseProjectId,
  generateChangelogForTasks
} from './release/releaseHelpers';

interface ReleaseAssemblerProps {
  items: BacklogItem[];
  releases: Release[];
  projectId: string;
  onArchiveRelease: (release: Partial<Release>, itemCodes: string[]) => Promise<void>;
  onDeleteRelease?: (id: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type TabFilter = 'all' | 'unreleased' | 'released';
type DrawerTab = 'details' | 'tasks' | 'changelog';

export const ReleaseAssembler: FC<ReleaseAssemblerProps> = ({
  items,
  releases,
  projectId,
  onArchiveRelease,
  onDeleteRelease,
  onShowToast
}) => {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-calculated next suggested version
  const defaultVersion = useMemo(() => {
    if (releases.length > 0) {
      const parts = releases[0].version.split('.').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        return `${parts[0]}.${parts[1] + 1}.0`;
      }
    }
    return '0.4.0';
  }, [releases]);

  // Filtering & Search
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingReleases, setIsSyncingReleases] = useState(false);

  // Progressive Disclosure Drawer state
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('details');

  // New Release Modal state
  const [newReleaseModalOpen, setNewReleaseModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState(defaultVersion);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState(todayStr);
  const [newSummary, setNewSummary] = useState('');

  // Confirmation Modals state (replaces native window.confirm)
  const [promoteReleaseTarget, setPromoteReleaseTarget] = useState<Release | null>(null);
  const [deleteReleaseTarget, setDeleteReleaseTarget] = useState<Release | null>(null);

  // Drawer Edit state (for active release)
  const activeRelease = useMemo(() => {
    return releases.find((r) => r.id === activeReleaseId) || null;
  }, [releases, activeReleaseId]);

  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editScopeNotes, setEditScopeNotes] = useState('');
  const [editMarkdown, setEditMarkdown] = useState('');
  const [editItemCodes, setEditItemCodes] = useState<string[]>([]);
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Sync Drawer state with active release
  useEffect(() => {
    if (activeRelease) {
      setEditTitle(activeRelease.title || '');
      setEditDate(activeRelease.date || todayStr);
      setEditTargetDate(activeRelease.targetDate || activeRelease.date || todayStr);
      setEditSummary(activeRelease.summary || '');
      setEditScopeNotes(activeRelease.scopeNotes || '');
      setEditMarkdown(activeRelease.markdownContent || '');

      const relV = (activeRelease.version || '').replace(/^v/i, '');
      const codesFromTasks = items
        .filter((it) => {
          const itV = (it.release || it.targetRelease || '').replace(/^v/i, '');
          const inReleases = (it.releases || []).some((r) => r.replace(/^v/i, '') === relV);
          return itV === relV || inReleases;
        })
        .map((it) => it.code);

      const allCodes = Array.from(new Set([...(activeRelease.itemCodes || []), ...codesFromTasks]));
      setEditItemCodes(allCodes);
    }
  }, [activeRelease, todayStr, items]);

  // Close drawer / modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeRelease) setActiveReleaseId(null);
        if (newReleaseModalOpen) setNewReleaseModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRelease, newReleaseModalOpen]);

  // Pure binary model: unreleased vs released
  const unreleasedReleases = useMemo(() => {
    return releases.filter((r) => r.status === 'unreleased' || (!r.status && r.version !== '0.2.0'));
  }, [releases]);

  const publishedReleases = useMemo(() => {
    return releases.filter((r) => r.status === 'released' || (!r.status && r.version === '0.2.0'));
  }, [releases]);

  // Filtered releases list
  const visibleReleases = useMemo(() => {
    let list = releases;
    if (tabFilter === 'unreleased') {
      list = unreleasedReleases;
    } else if (tabFilter === 'released') {
      list = publishedReleases;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.version.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.summary && r.summary.toLowerCase().includes(q)) ||
          (r.itemCodes && r.itemCodes.some((code) => code.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [releases, tabFilter, unreleasedReleases, publishedReleases, searchQuery]);

  // Available finished tasks not assigned to any release
  const availableDoneTasks = useMemo(() => {
    const assignedCodes = new Set<string>();
    for (const r of releases) {
      if (r.id === activeRelease?.id || r.version === activeRelease?.version) continue;
      for (const c of r.itemCodes || []) {
        assignedCodes.add(c.toUpperCase());
      }
    }
    const currentDrawerCodes = new Set(editItemCodes.map((c) => c.toUpperCase()));
    return items.filter(
      (it) =>
        (it.status === 'done' || it.status === 'ready' || it.status === 'finish') &&
        !assignedCodes.has((it.code || '').toUpperCase()) &&
        !currentDrawerCodes.has((it.code || '').toUpperCase())
    );
  }, [items, releases, editItemCodes, activeRelease]);

  // Actions
  const handleOpenNewRelease = () => {
    setNewVersion(defaultVersion);
    setNewTitle('');
    setNewTargetDate(todayStr);
    setNewSummary('');
    setNewReleaseModalOpen(true);
  };

  const handleCreateNewRelease = async () => {
    const v = newVersion.trim();
    if (!v) {
      onShowToast(t('release.validVersionRequired'), 'error');
      return;
    }

    const newRel: Partial<Release> = {
      projectId: resolveReleaseProjectId(undefined, projectId, items),
      version: v,
      title: newTitle.trim() || `En Preparación: v${v}`,
      targetDate: newTargetDate,
      date: newTargetDate,
      summary: newSummary.trim() || 'Versión en preparación',
      status: 'unreleased',
      itemCodes: [],
      markdownContent: `## [${v}] - Unreleased 🛠️ ${newTitle.trim() || 'Versión en desarrollo'}\n\n### 🎯 Resumen\n*${newSummary.trim() || 'En desarrollo.'}*`
    };

    try {
      await onArchiveRelease(newRel, []);
      onShowToast(t('release.createdUnreleased', { version: v }), 'success');
      setNewReleaseModalOpen(false);
      setTimeout(() => {
        const found = releases.find((r) => r.version === v);
        if (found) {
          setActiveReleaseId(found.id);
        }
      }, 300);
    } catch (err: any) {
      onShowToast(err.message || t('release.createError'), 'error');
    }
  };

  const handleSaveDrawer = async () => {
    if (!activeRelease) return;
    setIsSavingDrawer(true);
    try {
      await onArchiveRelease(
        {
          id: activeRelease.id,
          projectId: resolveReleaseProjectId(activeRelease.projectId, projectId, items),
          version: activeRelease.version,
          title: editTitle.trim(),
          date: editDate,
          targetDate: editTargetDate,
          summary: editSummary.trim(),
          scopeNotes: editScopeNotes.trim(),
          markdownContent: editMarkdown.trim(),
          status: activeRelease.status || 'unreleased'
        },
        editItemCodes
      );
      onShowToast(t('release.savedSuccess', { version: activeRelease.version }), 'success');
    } catch (err: any) {
      onShowToast(err.message || t('release.saveError'), 'error');
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handlePromoteToProduction = (rel: Release) => {
    setPromoteReleaseTarget(rel);
  };

  const executePromoteToProduction = async (rel: Release) => {
    try {
      await onArchiveRelease(
        {
          id: rel.id,
          projectId: resolveReleaseProjectId(rel.projectId, projectId, items),
          version: rel.version,
          title: rel.title.replace(/^En Preparación:\s*/i, ''),
          date: todayStr,
          targetDate: rel.targetDate || todayStr,
          summary: rel.summary,
          markdownContent: rel.markdownContent,
          status: 'released'
        },
        rel.itemCodes || []
      );
      onShowToast(t('release.releasedSuccess', { version: rel.version }), 'success');
      setActiveReleaseId(null);
    } catch (err: any) {
      onShowToast(err.message || t('release.releaseError'), 'error');
    }
  };

  const handleQuickCopyMarkdown = async (content: string, ver: string) => {
    try {
      await navigator.clipboard.writeText(content);
      onShowToast(t('release.copiedChangelog', { version: ver }), 'success');
    } catch {
      onShowToast(t('release.copyError'), 'error');
    }
  };

  const handleRegenerateMarkdown = () => {
    if (!activeRelease) return;
    const gen = generateChangelogForTasks(
      activeRelease.version,
      editTitle,
      editSummary,
      editItemCodes,
      items,
      todayStr,
      t
    );
    setEditMarkdown(gen);
    onShowToast(t('release.notesRegenerated'), 'info');
  };

  const handleToggleTaskInRelease = (code: string) => {
    setEditItemCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  return (
    <div className="w-full flex-1 p-3.5 sm:p-5 min-w-0 max-w-[1680px] mx-auto space-y-4 pb-8">
      {/* Header & Controls */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-slate-950/40 backdrop-blur-xl space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Rocket className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {t('release.title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('release.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenNewRelease}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('release.newReleaseBtn')}</span>
            </button>

            <button
              onClick={async () => {
                setIsSyncingReleases(true);
                try {
                  const res = await syncLegacyReleases(projectId);
                  onShowToast(t('release.syncSuccess', { count: res.count }), 'success');
                } catch (err: any) {
                  onShowToast(err.message || t('release.syncError'), 'error');
                } finally {
                  setIsSyncingReleases(false);
                }
              }}
              disabled={isSyncingReleases}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-white/[0.08] transition-all"
              title={t('release.syncBtn')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingReleases ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">{t('release.syncBtn')}</span>
            </button>
          </div>
        </div>

        {/* Tab Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] w-full sm:w-auto">
            <button
              onClick={() => setTabFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tabFilter === 'all'
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{t('release.tabAll')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono">
                {releases.length}
              </span>
            </button>

            <button
              onClick={() => setTabFilter('unreleased')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tabFilter === 'unreleased'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t('release.tabUnreleased')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                {unreleasedReleases.length}
              </span>
            </button>

            <button
              onClick={() => setTabFilter('released')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tabFilter === 'released'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('release.tabReleased')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                {publishedReleases.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t('release.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      </div>

      {/* Streamlined Compact Feed */}
      <div className="space-y-3 w-full">
        {visibleReleases.length === 0 ? (
          <div className="glass-panel py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] space-y-2 w-full">
            <Rocket className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('release.emptyFiltered')}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-500">
              {t('release.emptyCreateHint')}
            </p>
          </div>
        ) : (
          visibleReleases.map((rel) => (
            <ReleaseCard
              key={rel.id}
              release={rel}
              items={items}
              onSelect={setActiveReleaseId}
              onQuickCopy={handleQuickCopyMarkdown}
              onPromote={handlePromoteToProduction}
              onDelete={onDeleteRelease ? (r) => setDeleteReleaseTarget(r) : undefined}
            />
          ))
        )}
      </div>

      {/* Drawer */}
      <ReleaseDrawer
        activeRelease={activeRelease}
        items={items}
        availableDoneTasks={availableDoneTasks}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editDate={editDate}
        setEditDate={setEditDate}
        editTargetDate={editTargetDate}
        setEditTargetDate={setEditTargetDate}
        editSummary={editSummary}
        setEditSummary={setEditSummary}
        editScopeNotes={editScopeNotes}
        setEditScopeNotes={setEditScopeNotes}
        editMarkdown={editMarkdown}
        setEditMarkdown={setEditMarkdown}
        editItemCodes={editItemCodes}
        isSavingDrawer={isSavingDrawer}
        onSaveDrawer={handleSaveDrawer}
        onClose={() => setActiveReleaseId(null)}
        onToggleTaskInRelease={handleToggleTaskInRelease}
        onRegenerateMarkdown={handleRegenerateMarkdown}
        onQuickCopyMarkdown={handleQuickCopyMarkdown}
        onPromoteToProduction={handlePromoteToProduction}
      />

      {/* New Release Modal */}
      <NewReleaseModal
        isOpen={newReleaseModalOpen}
        version={newVersion}
        title={newTitle}
        targetDate={newTargetDate}
        summary={newSummary}
        onChangeVersion={setNewVersion}
        onChangeTitle={setNewTitle}
        onChangeTargetDate={setNewTargetDate}
        onChangeSummary={setNewSummary}
        onSubmit={handleCreateNewRelease}
        onClose={() => setNewReleaseModalOpen(false)}
      />

      {/* Confirm Modal for Release Promotion to Production */}
      <ConfirmModal
        isOpen={Boolean(promoteReleaseTarget)}
        title={t('release.confirmPromoteTitle', { version: promoteReleaseTarget?.version || '' })}
        message={t('release.confirmPromoteMessage')}
        detail={t('release.confirmPromoteDetail')}
        confirmText={t('release.promoteBtn')}
        cancelText={t('common.back')}
        variant="success"
        onConfirm={async () => {
          if (promoteReleaseTarget) {
            await executePromoteToProduction(promoteReleaseTarget);
          }
        }}
        onClose={() => setPromoteReleaseTarget(null)}
      />

      {/* Confirm Modal for Draft Release Deletion */}
      <ConfirmModal
        isOpen={Boolean(deleteReleaseTarget)}
        title={t('release.confirmDeleteTitle', { version: deleteReleaseTarget?.version || '' })}
        message={t('release.confirmDeleteMessage')}
        detail={t('release.confirmDeleteDetail')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={async () => {
          if (deleteReleaseTarget && onDeleteRelease) {
            await onDeleteRelease(deleteReleaseTarget.id);
          }
        }}
        onClose={() => setDeleteReleaseTarget(null)}
      />
    </div>
  );
};
