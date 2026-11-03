import { type FC } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, X, Plus } from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

interface NewReleaseModalProps {
  isOpen: boolean;
  version: string;
  title: string;
  targetDate: string;
  summary: string;
  onChangeVersion: (val: string) => void;
  onChangeTitle: (val: string) => void;
  onChangeTargetDate: (val: string) => void;
  onChangeSummary: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const NewReleaseModal: FC<NewReleaseModalProps> = ({
  isOpen,
  version,
  title,
  targetDate,
  summary,
  onChangeVersion,
  onChangeTitle,
  onChangeTargetDate,
  onChangeSummary,
  onSubmit,
  onClose
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/90 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Rocket className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('release.modalCreateTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('release.modalVersionNumber')}
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => onChangeVersion(e.target.value)}
                placeholder={t('release.versionPlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('release.modalTargetDate')}
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => onChangeTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('release.modalVersionTitle')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder={t('release.modalTitlePlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('release.modalExecutiveSummary')}
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => onChangeSummary(e.target.value)}
              placeholder={t('release.modalSummaryPlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-white/[0.08]"
          >
            {t('common.cancel')}
          </button>

          <button
            onClick={onSubmit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t('release.modalCreateBtn')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
