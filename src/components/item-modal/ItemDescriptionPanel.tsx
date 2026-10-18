import React from 'react';
import { Sparkles, Code, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

export interface ItemDescriptionPanelProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  implementationPlan: string;
  setImplementationPlan: (v: string) => void;
  planExpanded: boolean;
  setPlanExpanded: (v: boolean) => void;
  planExample: string;
}

export const ItemDescriptionPanel: React.FC<ItemDescriptionPanelProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  implementationPlan,
  setImplementationPlan,
  planExpanded,
  setPlanExpanded,
  planExample,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Title */}
      <div>
        <label htmlFor="item-title-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {t('itemModal.titleLabel')} <span className="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <input
          id="item-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('itemModal.titlePlaceholder')}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex min-w-0 items-center justify-between mb-1">
          <label htmlFor="item-description-textarea" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('itemModal.reqDescription')}
          </label>
          <button
            type="button"
            onClick={() => {
              const bddTemplate = t('itemModal.bddStoryTemplate');
              setDescription((prev) => (prev.trim() ? `${prev}\n${bddTemplate}` : bddTemplate.trimStart()));
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-colors"
            title={t('itemModal.addBddStoryTitle')}
          >
            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>{t('itemModal.addBddStory')}</span>
          </button>
        </div>
        <textarea
          id="item-description-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t('itemModal.descriptionPlaceholder')}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 leading-relaxed font-sans resize-y"
        />
      </div>

      {/* SECTION: Plan de Implementación & Plan Guard Accordion */}
      <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-all">
        <div 
          onClick={() => setPlanExpanded(!planExpanded)}
          className="px-3 py-2 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] flex min-w-0 items-center justify-between cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('itemModal.planGuardTitle')}</span>
            
            {implementationPlan.trim() ? (
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                {t('itemModal.planDrafted')}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-50 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 font-mono">
                {t('itemModal.planNone')}
              </span>
            )}
          </div>

          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${planExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </div>

        {planExpanded && (
          <div className="p-3 border-t border-slate-200 dark:border-white/[0.06] space-y-2 bg-slate-50 dark:bg-black/10">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('itemModal.planNotice')}
            </p>
            <textarea
              value={implementationPlan}
              onChange={(e) => setImplementationPlan(e.target.value)}
              rows={3}
              placeholder={planExample}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
};
