import React, { useState, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckSquare, 
  Square, 
  Sparkles, 
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { Project } from '../types';
import { parseLegacyMarkdown, type ParsedLegacyItem } from '../utils/legacyParser';
import { importLegacyBacklog } from '../api';
import { useTranslation } from '../utils/i18n';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onImportComplete: () => void;
}

const SAMPLE_MARKDOWN = `# Backlog del Proyecto

## Sprint 1: Fundaciones
- [x] Configuración inicial del repositorio #p0 #feat
  Setup de Vite, React y TypeScript con build validado.
- [ ] Optimizar bundle inicial y carga de fuentes [P1] [UX]
- [ ] Corregir salto visual en navegación móvil [BUG] [P1]
  Flicker apreciable al cambiar de pestaña.

## Sprint 2: Características Core
- [ ] Asistente de importación legacy #feature #p2
- [ ] Refactorización de queries a base de datos #tech_debt #p3
`;

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onImportComplete
}) => {
  const { t } = useTranslation();
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId || projects[0]?.id || '');
  const [rawText, setRawText] = useState(SAMPLE_MARKDOWN);
  const [defaultMilestone, setDefaultMilestone] = useState('');
  const [items, setItems] = useState<ParsedLegacyItem[]>(() => parseLegacyMarkdown(SAMPLE_MARKDOWN));
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync projects when modal opens or activeProjectId changes
  React.useEffect(() => {
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId, isOpen]);

  // Re-parse whenever rawText or defaultMilestone changes
  const handleTextChange = (text: string) => {
    setRawText(text);
    const parsed = parseLegacyMarkdown(text, defaultMilestone);
    setItems(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const toggleSelectItem = (tempId: string) => {
    setItems(prev => prev.map(it => it.tempId === tempId ? { ...it, selected: !it.selected } : it));
  };

  const toggleSelectAll = () => {
    const allSelected = items.every(i => i.selected);
    setItems(prev => prev.map(it => ({ ...it, selected: !allSelected })));
  };

  const updateItemField = (tempId: string, field: keyof ParsedLegacyItem, value: any) => {
    setItems(prev => prev.map(it => it.tempId === tempId ? { ...it, [field]: value } : it));
  };

  const selectedCount = useMemo(() => items.filter(i => i.selected).length, [items]);

  const handleConfirmImport = async () => {
    const itemsToImport = items.filter(i => i.selected);
    if (itemsToImport.length === 0) {
      setErrorMessage('Selecciona al menos un ítem para importar.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    try {
      await importLegacyBacklog({
        projectId: selectedProjectId,
        items: itemsToImport,
        defaultMilestone
      });
      onImportComplete();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al importar tareas');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const currentProj = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                Asistente de Importación de Backlog Legacy
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Convierte listas planas de TODO.md o BACKLOG.md al estándar {currentProj?.storageType === 'markdown' ? 'Markdown atómico distribuido' : 'JSON centralizado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Split in 2 panels (Input & Live Preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          
          {/* Left Panel: Markdown Source & Target Options (5 cols) */}
          <div className="lg:col-span-5 p-5 flex flex-col gap-4 overflow-y-auto bg-slate-50 dark:bg-white/[0.01]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Proyecto de Destino
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="appearance-none w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {p.name} ({p.storageType === 'markdown' ? 'MD' : 'JSON'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Milestone por Defecto
                </label>
                <input
                  type="text"
                  value={defaultMilestone}
                  onChange={(e) => {
                    setDefaultMilestone(e.target.value);
                    setItems(parseLegacyMarkdown(rawText, e.target.value));
                  }}
                  placeholder={t('import.sprintPlaceholder')}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* File Upload Dropzone / Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('import.plainMarkdownContent')}
                </label>
                <label className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('import.uploadFile')}</span>
                  <input
                    type="file"
                    accept=".md,.markdown,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={t('import.pastePlaceholder')}
                rows={14}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{t('import.heuristicPatternsTitle')}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-1">
                <li><code className="text-slate-700 dark:text-slate-300">{t('import.patternCheckbox')}</code></li>
                <li>{t('import.patternHeaders')}</li>
                <li>{t('import.patternPriority')}</li>
                <li>{t('import.patternTypes')}</li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Parsed Items Preview Table (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/40">
            {/* Table Action Bar */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {items.length > 0 && items.every(i => i.selected) ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600 dark:text-slate-500" />
                  )}
                  <span>{t('import.selectAll')}</span>
                </button>

                <span className="text-xs text-slate-600 dark:text-slate-500">|</span>

                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {t('import.detectedCount', { count: selectedCount, total: items.length })}
                </span>
              </div>

              {currentProj && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>{t('import.prefixLabel')} <strong className="text-indigo-700 dark:text-indigo-300 font-mono">{currentProj.codePrefix}</strong></span>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="m-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Table List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {items.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-600 dark:text-slate-500 text-xs gap-2">
                  <FileText className="w-8 h-8 text-slate-600" />
                  <span>{t('import.noTasksDetected')}</span>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.tempId}
                    className={`p-3 rounded-xl border transition-all ${
                      item.selected
                        ? 'bg-slate-50 dark:bg-white/[0.03] border-indigo-500/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/[0.01] border-white/[0.04] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.tempId)}
                        className="mt-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItemField(item.tempId, 'title', e.target.value)}
                          className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-b border-indigo-500"
                        />

                        {item.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {/* Status Badge */}
                          <select
                            value={item.status}
                            onChange={(e) => updateItemField(item.tempId, 'status', e.target.value)}
                            className="appearance-none px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="draft" className="bg-white dark:bg-slate-900">Borrador (Draft)</option>
                            <option value="ready" className="bg-white dark:bg-slate-900">Listo (Ready)</option>
                            <option value="doing" className="bg-white dark:bg-slate-900">En Progreso (Doing)</option>
                            <option value="done" className="bg-white dark:bg-slate-900">Completado (Done)</option>
                          </select>

                          {/* Priority Badge */}
                          <select
                            value={item.priority}
                            onChange={(e) => updateItemField(item.tempId, 'priority', e.target.value)}
                            className="appearance-none px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="p0" className="bg-white dark:bg-slate-900">{t('priority.urgent')}</option>
                            <option value="p1" className="bg-white dark:bg-slate-900">{t('priority.high')}</option>
                            <option value="p2" className="bg-white dark:bg-slate-900">{t('priority.medium')}</option>
                            <option value="p3" className="bg-white dark:bg-slate-900">{t('priority.low')}</option>
                          </select>

                          {/* Type Badge */}
                          <select
                            value={item.type}
                            onChange={(e) => updateItemField(item.tempId, 'type', e.target.value)}
                            className="appearance-none px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="feature" className="bg-white dark:bg-slate-900">{t('type.feature')}</option>
                            <option value="bug" className="bg-white dark:bg-slate-900">{t('type.bug')}</option>
                            <option value="tech_debt" className="bg-white dark:bg-slate-900">{t('type.tech_debt')}</option>
                            <option value="ux" className="bg-white dark:bg-slate-900">{t('type.ux')}</option>
                          </select>

                          {item.milestone && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              {item.milestone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {selectedCount > 0 ? (
              <span>{t('import.willCreateTasks', { count: selectedCount, project: currentProj?.name || '' })}</span>
            ) : (
              <span>{t('import.noTasksSelected')}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              {isImporting ? (
                <span>{t('import.importing')}</span>
              ) : (
                <>
                  <span>{t('import.confirmImportCount', { count: selectedCount })}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
