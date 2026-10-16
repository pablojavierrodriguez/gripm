import React from 'react';
import { CheckSquare, Plus, Sparkles, ChevronDown, Trash } from 'lucide-react';
import type { AcceptanceCriterion } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface AcceptanceCriteriaPanelProps {
  acceptanceCriteriaList: AcceptanceCriterion[];
  setAcceptanceCriteriaList: React.Dispatch<React.SetStateAction<AcceptanceCriterion[]>>;
  acExpanded: boolean;
  setAcExpanded: (v: boolean) => void;
  acChecked: number;
  acTotal: number;
  criterionExample: string;
  handleAddCriterion: () => void;
  handleUpdateCriterionText: (index: number, text: string) => void;
  handleToggleCriterion: (index: number) => void;
  handleRemoveCriterion: (index: number) => void;
}

export const AcceptanceCriteriaPanel: React.FC<AcceptanceCriteriaPanelProps> = ({
  acceptanceCriteriaList,
  setAcceptanceCriteriaList,
  acExpanded,
  setAcExpanded,
  acChecked,
  acTotal,
  criterionExample,
  handleAddCriterion,
  handleUpdateCriterionText,
  handleToggleCriterion,
  handleRemoveCriterion,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-all">
      <div 
        onClick={() => setAcExpanded(!acExpanded)}
        className="px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] flex min-w-0 items-center justify-between cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('itemModal.acTitle')}</span>
          
          {acTotal === 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-50 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 font-mono">
              {t('itemModal.acCountZero')}
            </span>
          ) : acChecked === acTotal ? (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
              ✓ {t('itemModal.acCompleted', { checked: acChecked, total: acTotal })}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-medium">
              {t('itemModal.acCompleted', { checked: acChecked, total: acTotal })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddCriterion();
              if (!acExpanded) setAcExpanded(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>{t('itemModal.acAddCriterion')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextIndex = acceptanceCriteriaList.length > 0 
                ? Math.max(...acceptanceCriteriaList.map((a) => a.index)) + 1 
                : 1;
              setAcceptanceCriteriaList([
                ...acceptanceCriteriaList,
                {
                  index: nextIndex,
                  text: t('itemModal.bddAcTemplate'),
                  checked: false
                }
              ]);
              if (!acExpanded) setAcExpanded(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-medium transition-colors"
            title={t('itemModal.acAddBddTitle')}
          >
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>{t('itemModal.acAddBdd')}</span>
          </button>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${acExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </div>
      </div>

      {acExpanded && (
        <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.06] space-y-2 bg-slate-50 dark:bg-black/10">
          {acceptanceCriteriaList.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-500 italic py-1">
              {t('itemModal.acNoneDefined')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {acceptanceCriteriaList.map((ac) => (
                <div key={ac.index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ac.checked}
                    onChange={() => handleToggleCriterion(ac.index)}
                    className="rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 transition-colors"
                  />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-500 shrink-0">#{ac.index}</span>
                  <input
                    type="text"
                    value={ac.text}
                    onChange={(e) => handleUpdateCriterionText(ac.index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriterion();
                      }
                    }}
                    placeholder={criterionExample}
                    className={`flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:bg-slate-100 dark:focus:bg-white/[0.05] transition-all ${
                      ac.checked ? 'line-through text-slate-600 dark:text-slate-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(ac.index)}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={t('itemModal.acDeleteTitle')}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
