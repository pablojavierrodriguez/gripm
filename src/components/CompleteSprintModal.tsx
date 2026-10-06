import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  FilePlus
} from 'lucide-react';
import type { Sprint, BacklogItem } from '../types';
import { useTranslation } from '../utils/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface RetroData {
  whatWentWell: string;
  whatWentWrong: string;
  whatToImprove: string;
  actions: string[];
}

interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint;
  sprintItems: BacklogItem[];
  availablePlannedSprints: Sprint[];
  onConfirm: (destinationSprintId: string | '', retroData?: RetroData) => Promise<void>;
  onCreateTaskFromAction?: (title: string) => Promise<void>;
}

export const CompleteSprintModal: React.FC<CompleteSprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  sprintItems,
  availablePlannedSprints,
  onConfirm,
  onCreateTaskFromAction,
}) => {
  const { t } = useTranslation();
  const [destination, setDestination] = useState<string>(''); // '' means Backlog
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Retrospective section state (DEV-070)
  const [enableRetro, setEnableRetro] = useState<boolean>(true);
  const [retroExpanded, setRetroExpanded] = useState<boolean>(true);
  const [whatWentWell, setWhatWentWell] = useState<string>('');
  const [whatWentWrong, setWhatWentWrong] = useState<string>('');
  const [whatToImprove, setWhatToImprove] = useState<string>('');
  const [actionInput, setActionInput] = useState<string>('');
  const [actions, setActions] = useState<string[]>([]);
  const [createdActions, setCreatedActions] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const completedItems = sprintItems.filter((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
  const incompleteItems = sprintItems.filter((i) => !(i.status === 'done' || i.status === 'ready' || i.status === 'finish'));

  const handleAddAction = () => {
    if (!actionInput.trim()) return;
    setActions([...actions, actionInput.trim()]);
    setActionInput('');
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleCreateTaskFromAction = async (actionText: string, index: number) => {
    if (onCreateTaskFromAction) {
      await onCreateTaskFromAction(actionText);
      setCreatedActions(prev => ({ ...prev, [index]: true }));
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const retroPayload: RetroData | undefined = enableRetro && (whatWentWell || whatWentWrong || whatToImprove || actions.length > 0)
        ? {
            whatWentWell,
            whatWentWrong,
            whatToImprove,
            actions
          }
        : undefined;

      await onConfirm(destination, retroPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {t('completeSprint.title', { name: sprint.name })}
              </h2>
              <p className="text-xs text-slate-400">
                {t('completeSprint.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('completeSprint.completed')}</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-200">
                {completedItems.length}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80">
                {t('completeSprint.completedSub')}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>{t('completeSprint.pending')}</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-200">
                {incompleteItems.length}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400/80">
                {t('completeSprint.pendingSub')}
              </div>
            </div>
          </div>

          {/* Incomplete Tasks Handling */}
          {incompleteItems.length > 0 ? (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('completeSprint.movePendingTo', { count: incompleteItems.length })}
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t('completeSprint.generalBacklog')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t('completeSprint.generalBacklogSub')}
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="destination"
                    checked={destination === ''}
                    onChange={() => setDestination('')}
                    className="text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                {availablePlannedSprints.map((pSprint) => (
                  <label 
                    key={pSprint.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {pSprint.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t('completeSprint.moveDirectToNext')}
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === pSprint.name}
                      onChange={() => setDestination(pSprint.name)}
                      className="text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] text-center text-slate-500 dark:text-slate-400 text-xs">
              {t('completeSprint.allCompleted')}
            </div>
          )}

          {/* Retrospectiva Integrada (DEV-070) */}
          <div className="border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 space-y-3">
            <button
              type="button"
              onClick={() => setRetroExpanded(!retroExpanded)}
              aria-expanded={retroExpanded}
              aria-controls="complete-sprint-retro-section"
              className="w-full flex flex-wrap items-center justify-between gap-2 cursor-pointer text-left rounded active:scale-[0.995] transition-transform"
            >
              <span className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>{t('completeSprint.retroTitle')}</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {t('completeSprint.recommended')}
                </span>
              </span>
              <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {retroExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {retroExpanded && (
              <div id="complete-sprint-retro-section" className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableRetro"
                    checked={enableRetro}
                    onChange={(e) => setEnableRetro(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="enableRetro" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    {t('completeSprint.saveRetroAt')} <code className="text-[10px] font-mono bg-indigo-100/70 dark:bg-indigo-900/40 px-1 py-0.5 rounded">backlog/retros/{sprint.id || 'sprint'}-retro.md</code>
                  </label>
                </div>

                {enableRetro && (
                  <div className="space-y-3 pt-1">
                    {/* Dimensiones */}
                    <div>
                      <label className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                        {t('completeSprint.whatWentWellLabel')}
                      </label>
                      <textarea
                        rows={2}
                        value={whatWentWell}
                        onChange={(e) => setWhatWentWell(e.target.value)}
                        placeholder={t('completeSprint.whatWentWellPlaceholder')}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-rose-700 dark:text-rose-400 mb-1">
                        {t('completeSprint.whatWentWrongLabel')}
                      </label>
                      <textarea
                        rows={2}
                        value={whatWentWrong}
                        onChange={(e) => setWhatWentWrong(e.target.value)}
                        placeholder={t('completeSprint.whatWentWrongPlaceholder')}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                        {t('completeSprint.whatToImproveLabel')}
                      </label>
                      <textarea
                        rows={2}
                        value={whatToImprove}
                        onChange={(e) => setWhatToImprove(e.target.value)}
                        placeholder={t('completeSprint.whatToImprovePlaceholder')}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Acciones Concretas */}
                    <div>
                      <label className="block text-[11px] font-medium text-indigo-700 dark:text-indigo-400 mb-1">
                        {t('completeSprint.concreteActionsLabel')}
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={actionInput}
                          onChange={(e) => setActionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAction();
                            }
                          }}
                          placeholder={t('completeSprint.actionPlaceholder')}
                          className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddAction}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('completeSprint.addAction')}</span>
                        </button>
                      </div>

                      {actions.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {actions.map((act, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                              <span className="text-slate-700 dark:text-slate-300">• {act}</span>
                              <div className="flex items-center gap-1.5">
                                {onCreateTaskFromAction && (
                                  <button
                                    type="button"
                                    disabled={createdActions[idx]}
                                    onClick={() => handleCreateTaskFromAction(act, idx)}
                                    className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${
                                      createdActions[idx] 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-200'
                                    }`}
                                  >
                                    <FilePlus className="w-3 h-3" />
                                    <span>{createdActions[idx] ? t('completeSprint.cardCreated') : t('completeSprint.createCard')}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAction(idx)}
                                  aria-label={`${t('completeSprint.removeAction')} ${act}`}
                                  className="p-1 text-slate-400 hover:text-rose-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? t('completeSprint.completing') : t('completeSprint.completeBtn')}
            </button>{/* ux-audit-ignore UX-010: visible text label; the rule only reads attributes (upstream defect) */}
          </div>
        </div>
      </div>
    </div>
  );
};
