import React, { useState, useEffect } from 'react';
import { X, Calendar, Target, Clock, Sparkles } from 'lucide-react';
import type { Sprint } from '../types';
import { useTranslation, type TranslationKey } from '../utils/i18n';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint?: Sprint | null;
  suggestedName?: string;
  onSave: (data: {
    name: string;
    goal: string;
    startDate?: string;
    endDate?: string;
    durationWeeks?: number;
  }) => Promise<void>;
}

const DURATION_PRESETS: { weeks: number; key: TranslationKey }[] = [
  { weeks: 1, key: 'sprintModal.preset1Week' },
  { weeks: 2, key: 'sprintModal.preset2Weeks' },
  { weeks: 3, key: 'sprintModal.preset3Weeks' },
  { weeks: 4, key: 'sprintModal.preset4Weeks' },
  { weeks: 0, key: 'sprintModal.presetCustom' },
];

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  suggestedName,
  onSave,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(sprint);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number>(2);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state when opening
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    if (sprint) {
      setName(sprint.name || '');
      setGoal(sprint.goal || '');
      setDurationWeeks(sprint.durationWeeks || (sprint.startDate && sprint.endDate ? 0 : 2));
      setStartDate(sprint.startDate || '');
      setEndDate(sprint.endDate || '');
    } else {
      setName(suggestedName || 'Sprint 1');
      setGoal('');
      setDurationWeeks(2);

      // Default start date = today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);

      // End date = today + 14 days
      const end = new Date(today);
      end.setDate(end.getDate() + 14);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [isOpen, sprint, suggestedName]);

  // Recalculate end date whenever start date or duration preset changes
  const handleDurationSelect = (weeks: number) => {
    setDurationWeeks(weeks);
    if (weeks > 0 && startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + weeks * 7);
        setEndDate(end.toISOString().split('T')[0]);
      }
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (durationWeeks > 0 && newStart) {
      const start = new Date(newStart);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationWeeks * 7);
        setEndDate(end.toISOString().split('T')[0]);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('sprintModal.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        goal: goal.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        durationWeeks: durationWeeks > 0 ? durationWeeks : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || t('sprintModal.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {isEditing ? t('sprintModal.editTitle', { name: sprint?.name || '' }) : t('sprintModal.createTitle')}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                {isEditing ? t('sprintModal.editSubtitle') : t('sprintModal.createSubtitle')}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Sprint Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('sprintModal.nameLabel')}
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('sprintModal.namePlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/60 font-medium"
            />
          </div>

          {/* Sprint Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('sprintModal.goalLabel')}</span>
            </div>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('sprintModal.goalPlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/60 resize-none"
            />
          </div>

          {/* Duration Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('sprintModal.durationLabel')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = durationWeeks === preset.weeks;
                return (
                  <button
                    key={preset.weeks}
                    type="button"
                    onClick={() => handleDurationSelect(preset.weeks)}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] font-medium transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                        : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.12]'
                    }`}
                  >
                    {t(preset.key)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates Range */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('sprintModal.startDate')}</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('sprintModal.endDate')}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDurationWeeks(0); // Set to custom
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? t('sprintModal.saving') : (isEditing ? t('sprintModal.saveChanges') : t('sprintModal.createSprint'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
