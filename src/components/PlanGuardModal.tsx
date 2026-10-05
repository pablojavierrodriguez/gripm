import { useState, type FC } from 'react';
import { AlertCircle, Bot, CheckCircle, X, Copy } from 'lucide-react';
import type { BacklogItem } from '../types';
import { useTranslation } from '../utils/i18n';

interface PlanGuardModalProps {
  isOpen: boolean;
  item: BacklogItem | null;
  onClose: () => void;
  onConfirmStart: (itemId: string, updatedPlan?: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PlanGuardModal: FC<PlanGuardModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmStart,
  onShowToast
}) => {
  const { t } = useTranslation();
  const [planText, setPlanText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleCopyAgentPrompt = () => {
    let prompt = `# Iniciar Desarrollo: [${item.code}] ${item.title}\n\n`;
    prompt += `**Proyecto:** ${item.projectId}\n`;
    prompt += `**Tipo:** ${item.type} | **Prioridad:** ${item.priority.toUpperCase()}\n`;
    if (item.module) prompt += `**Módulo / Área:** ${item.module}\n`;
    if (item.impactedFile) prompt += `**Archivo Impactado:** ${item.impactedFile}\n`;
    if (item.targetSprint) prompt += `**Sprint:** ${item.targetSprint}\n`;
    prompt += `\n## Descripción del Requerimiento\n${item.description || item.title}\n\n`;
    
    if (item.acceptanceCriteriaList && item.acceptanceCriteriaList.length > 0) {
      prompt += `## Criterios de Aceptación (AC)\n`;
      item.acceptanceCriteriaList.forEach(ac => {
        prompt += `- [${ac.checked ? 'x' : ' '}] #${ac.index} ${ac.text}\n`;
      });
      prompt += `\n`;
    }

    if (item.risk) prompt += `## Riesgo Identificado\n${item.risk}\n\n`;
    
    if (planText.trim()) {
      prompt += `## Plan de Implementación\n${planText.trim()}\n\n`;
    } else if (item.implementationPlan) {
      prompt += `## Plan de Implementación\n${item.implementationPlan}\n\n`;
    } else if (item.fix) {
      prompt += `## Fix o Criterio Existente\n${item.fix}\n\n`;
    }
    
    // Sin saludo ni presentación: el prompt se pega en una sesión ya iniciada
    // (DEV-127), así que debe leerse como instrucción de trabajo en curso, no
    // como la apertura de un hilo nuevo.
    prompt += `## Objetivo\nInvestigá el código afectado, armá el plan de implementación detallado y ejecutá la solución técnica paso a paso, cumpliendo los criterios de aceptación y los gates de calidad del proyecto.`;

    navigator.clipboard.writeText(prompt);
    onShowToast(t('planGuard.promptCopiedToast', { code: item.code }), 'success');
  };

  const handleSaveAndStart = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmStart(item.id, planText.trim() || undefined);
      onShowToast(t('planGuard.itemStartedToast', { code: item.code }), 'success');
      onClose();
    } catch (err: any) {
      onShowToast(err.message || t('planGuard.startErrorToast'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWithoutPlan = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmStart(item.id);
      onShowToast(t('planGuard.itemStartedNoPlanToast', { code: item.code }), 'info');
      onClose();
    } catch (err: any) {
      onShowToast(err.message || t('planGuard.startErrorToast'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-xl glass-panel bg-white dark:bg-[#0d1322] rounded-2xl border border-amber-500/30 dark:border-amber-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('planGuard.headerTitle')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('planGuard.headerDesc')} <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{t('status.doing')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
              <span>{item.code}</span>
              <span className="text-slate-400">•</span>
              <span className="text-indigo-600 dark:text-indigo-400">{item.type.toUpperCase()}</span>
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-medium text-xs leading-snug">
              {item.title}
            </p>
            {item.impactedFile && (
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                {t('planGuard.fileLabel')}: {item.impactedFile}
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              {t('planGuard.planLabel')}
            </label>
            <textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              rows={3}
              placeholder={t('planGuard.planPlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Prompt Bridge for AI Agent */}
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-indigo-900 dark:text-indigo-200 text-xs">
                  {t('planGuard.resolveWithAgent')}
                </p>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300/80">
                  {t('planGuard.resolveWithAgentDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyAgentPrompt}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] shadow-sm shrink-0 transition-all"
            >
              <Copy className="w-3 h-3" />
              <span>{t('planGuard.copyPrompt')}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between gap-2">
          <button
            onClick={handleStartWithoutPlan}
            disabled={isSubmitting}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
          >
            {t('planGuard.startWithoutPlan')}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveAndStart}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition-all active:scale-[0.98]"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('planGuard.saving') : t('planGuard.confirmAndStart')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
