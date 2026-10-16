import React from 'react';
import { Upload, FileCode, Download } from 'lucide-react';
import type { Project } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface ToolsTabProps {
  currentProject?: Project | null;
  onOpenImportWizard?: () => void;
  onExportMonolithic?: (projectId: string) => void;
  onExportJson?: (projectId: string) => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  currentProject,
  onOpenImportWizard,
  onExportMonolithic,
  onExportJson,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {t('settings.toolsTitle')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.toolsDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Import Wizard */}
        <div className="p-5 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t('settings.importWizardTitle')}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                {t('settings.importWizardDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenImportWizard}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
          >
            {t('settings.openWizard')}
          </button>
        </div>

        {/* Export Monolithic Markdown */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t('settings.exportMdTitle')}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                {t('settings.exportMdDesc')}
              </p>
            </div>
          </div>
          {currentProject && (
            <button
              type="button"
              onClick={() => onExportMonolithic?.(currentProject.id)}
              className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.downloadMd')}</span>
            </button>
          )}
        </div>

        {/* Export JSON Backup */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t('settings.exportJsonTitle')}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                {t('settings.exportJsonDesc')}
              </p>
            </div>
          </div>
          {currentProject && (
            <button
              type="button"
              onClick={() => onExportJson?.(currentProject.id)}
              className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shrink-0"
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>{t('settings.downloadJson')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
