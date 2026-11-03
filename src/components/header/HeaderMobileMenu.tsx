import { type FC } from 'react';
import {
  X,
  Plus,
  ShieldCheck,
  FolderPlus,
  RefreshCw,
  Upload,
  BarChart2,
  Settings,
  Trash2,
  Command,
  Keyboard,
  Globe,
  Sun,
  Moon,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { Project, RepoHealthReport, UpdateInfo } from '../../types';
import type { HeaderActiveTab } from '../Header';
import { useTranslation, type Language } from '../../utils/i18n';

interface HeaderMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewItem: () => void;
  onOpenAudit?: () => void;
  auditReport?: RepoHealthReport | null;
  singleProject: boolean;
  onNewProject: () => void;
  currentProject?: Project;
  onResyncDocs: () => void;
  isResyncing: boolean;
  onOpenImportWizard?: () => void;
  isMetricsEnabled: boolean;
  activeTab: HeaderActiveTab;
  onSelectTab: (tab: HeaderActiveTab) => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  language: string;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isSandbox: boolean;
  liveConnected: boolean;
  onRestoreDemo?: () => void;
  updateAvailable?: UpdateInfo | null;
}

export const HeaderMobileMenu: FC<HeaderMobileMenuProps> = ({
  isOpen,
  onClose,
  onNewItem,
  onOpenAudit,
  auditReport,
  singleProject,
  onNewProject,
  currentProject,
  onResyncDocs,
  isResyncing,
  onOpenImportWizard,
  isMetricsEnabled,
  activeTab,
  onSelectTab,
  onOpenCommandPalette,
  onOpenShortcuts,
  language,
  setLanguage,
  isDarkMode,
  onToggleTheme,
  isSandbox,
  liveConnected,
  onRestoreDemo,
  updateAvailable
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-[#0f172a] shadow-2xl p-4 flex flex-col justify-between border-l border-slate-200 dark:border-white/10 animate-in slide-in-from-right duration-200">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center shadow-md bg-[#080c14] border border-indigo-400/30">
                <img src="/logo.png" alt="gripm" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-white">gripm</span>
            </div>
            <button
              onClick={onClose}
              title="Cerrar"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions List */}
          <div className="mt-4 space-y-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
              Acciones Rápidas
            </div>

            <button
              onClick={() => {
                onClose();
                onNewItem();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>{t('header.newItem')}</span>
            </button>

            {onOpenAudit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAudit();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-left">{t('audit.modalTitle')}</span>
                {auditReport && (
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {Math.round(auditReport.score)}/100
                  </span>
                )}
              </button>
            )}

            {!singleProject && (
              <button
                onClick={() => {
                  onClose();
                  onNewProject();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-emerald-500" />
                <span>{t('header.newProject')}</span>
              </button>
            )}

            {currentProject?.hasDocs && (
              <button
                onClick={() => {
                  onClose();
                  onResyncDocs();
                }}
                disabled={isResyncing}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-500 ${isResyncing ? 'animate-spin' : ''}`} />
                <span>{isResyncing ? t('header.syncingDocs') : t('header.resyncDocs', { name: currentProject.name })}</span>
              </button>
            )}

            {!singleProject && onOpenImportWizard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenImportWizard();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <Upload className="w-4 h-4 text-violet-500" />
                <span>{t('header.importMarkdown')}</span>
              </button>
            )}

            {isMetricsEnabled && (
              <button
                onClick={() => {
                  onClose();
                  onSelectTab('metrics');
                }}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'metrics'
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>{t('header.metrics')}</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onSelectTab('settings');
              }}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <Settings className="w-4 h-4 text-indigo-500" />
              <span>{t('settings.title')}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSelectTab('trash');
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{t('header.trash')}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenCommandPalette?.();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Command className="w-4 h-4 text-indigo-500" />
              <span>{t('palette.title')}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenShortcuts?.();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Keyboard className="w-4 h-4 text-indigo-500" />
              <span>{t('shortcuts.title')}</span>
            </button>

            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>{t('header.switchLang')}</span>
              </div>
              <span className="text-xs text-slate-400 uppercase font-mono font-semibold">{language.toUpperCase()}</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                <span>{isDarkMode ? t('header.themeLight') : t('header.themeDark')}</span>
              </div>
              <span className="text-xs text-slate-400 uppercase font-mono">{isDarkMode ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        {/* Live Sync & Version Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              isSandbox ? 'bg-indigo-500' : (liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
            }`} />
            <span>
              {isSandbox ? t('header.sandboxMode') : (liveConnected ? t('header.liveConnected') : t('header.liveReconnecting'))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSandbox && onRestoreDemo && (
              <button
                onClick={() => {
                  onClose();
                  onRestoreDemo();
                }}
                title={t('header.resetDemoDesc')}
                className="flex items-center gap-1 min-h-[44px] px-2 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('header.resetDemo')}</span>
              </button>
            )}
            {updateAvailable?.hasUpdate && (
              <a
                href={updateAvailable.url || 'https://github.com/pablojavierrodriguez/gripm/releases'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>v{updateAvailable.latestVersion}</span>
              </a>
            )}
            <span className="text-xs font-mono opacity-60">v{updateAvailable?.currentVersion || '0.5.0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
