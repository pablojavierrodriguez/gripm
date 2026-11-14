import { type FC, type RefObject } from 'react';
import { ScrollText, X } from 'lucide-react';
import { Modal } from '../Modal';
import { useTranslation } from '../../utils/i18n';

interface RetrospectiveModalProps {
  retro: { title: string; date?: string; content: string } | null;
  panelRef: RefObject<HTMLDivElement>;
  onClose: () => void;
}

export const RetrospectiveModal: FC<RetrospectiveModalProps> = ({
  retro,
  panelRef,
  onClose
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={Boolean(retro)}
      onClose={onClose}
      panelRef={panelRef}
      maxWidth="max-w-2xl"
      align="center"
      showMobileHandle={false}
    >
      {retro && (
        <div className="flex flex-col max-h-[85vh]">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {retro.title}
                </h3>
                {retro.date && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {t('sprintView.recordDate')}: {retro.date}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-slate-200 dark:border-white/5 max-h-[60vh] overflow-y-auto">
              {retro.content}
            </pre>
          </div>

          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/[0.12] transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
