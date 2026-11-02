import { useState, useId, type FC } from 'react';
import {
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileCode,
  CheckSquare,
  Square,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import type { RepoHealthReport, TodoImportItem, GripmConfig } from '../../types';
import { Modal } from '../Modal';
import { useTranslation } from '../../utils/i18n';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RepoHealthReport | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isImporting: boolean;
  onRefresh: () => Promise<any>;
  onImportTodos: (items: TodoImportItem[]) => Promise<any>;
  config?: GripmConfig;
}

type TabType = 'budgets' | 'todos' | 'quality';

export const AuditModal: FC<AuditModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  isRefreshing,
  isImporting,
  onRefresh,
  onImportTodos,
}) => {
  const { t } = useTranslation();
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<TabType>('budgets');
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxId = useId();

  if (!isOpen) return null;

  const score = report ? Math.round(report.score) : 100;
  const violations = report?.loc?.violations || [];
  const todos = report?.todos || [];
  const suppressions = report?.quality?.suppressions || [];
  const testInfo = report?.tests;

  // Score color styles
  let scoreColorText = 'text-emerald-600 dark:text-emerald-400';
  let scoreBarColor = 'bg-emerald-500';
  if (score < 60) {
    scoreColorText = 'text-rose-600 dark:text-rose-400';
    scoreBarColor = 'bg-rose-500';
  } else if (score < 80) {
    scoreColorText = 'text-amber-600 dark:text-amber-400';
    scoreBarColor = 'bg-amber-500';
  }

  // Toggle single TODO selection
  const handleToggleTodo = (id: string) => {
    setSelectedTodoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all TODOs
  const handleToggleAllTodos = () => {
    if (selectedTodoIds.size === todos.length) {
      setSelectedTodoIds(new Set());
    } else {
      setSelectedTodoIds(new Set(todos.map((t) => t.id)));
    }
  };

  // Import selected TODOs
  const handleImportSelected = async () => {
    const itemsToImport: TodoImportItem[] = todos
      .filter((td) => selectedTodoIds.has(td.id))
      .map((td) => ({
        file: td.file,
        line: td.line,
        type: td.type,
        text: td.text,
        snippet: td.snippet,
      }));

    if (itemsToImport.length === 0) return;

    await onImportTodos(itemsToImport);
    setSelectedTodoIds(new Set());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelRef={panelRef}
      maxWidth="max-w-4xl"
      className="max-h-[90vh] flex flex-col"
      ariaLabel={t('audit.modalTitle')}
    >
      {/* Modal Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {t('audit.modalTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('audit.modalSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isRefreshing || isLoading}
              title={t('audit.refresh')}
              aria-label={t('audit.refresh')}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-fit flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? t('audit.refreshing') : t('audit.refresh')}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title={t('common.close')}
              aria-label={t('common.close')}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Health Score & Infrastructure Summary Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('audit.healthScore')}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-2xl font-extrabold ${scoreColorText}`}>
                  {score}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-white/[0.06]">
            {/* Test Framework Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="font-medium">
                {testInfo?.hasTests
                  ? (testInfo.framework ? `${testInfo.framework} (${t('audit.testConfigured')})` : t('audit.testConfigured'))
                  : t('audit.testNone')}
              </span>
            </div>

            {/* Total Scanned Files */}
            <div className="text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {report?.summary?.totalFilesScanned ?? 0}
              </span>{' '}
              {t('audit.filesScanned')}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label={t('audit.modalTitle')}
          className="flex items-center gap-1 mt-4 border-b border-slate-200 dark:border-white/[0.08] overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'budgets'}
            onClick={() => setActiveTab('budgets')}
            className={`min-h-[44px] sm:min-h-[40px] flex items-center gap-2 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
              activeTab === 'budgets'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('audit.tabBudgets')}</span>
            {violations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {violations.length}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'todos'}
            onClick={() => setActiveTab('todos')}
            className={`min-h-[44px] sm:min-h-[40px] flex items-center gap-2 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
              activeTab === 'todos'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{t('audit.tabTodos')}</span>
            {todos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {todos.length}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'quality'}
            onClick={() => setActiveTab('quality')}
            className={`min-h-[44px] sm:min-h-[40px] flex items-center gap-2 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
              activeTab === 'quality'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('audit.tabQuality')}</span>
            {suppressions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {suppressions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Tab Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Tab 1: Presupuestos y Modularidad */}
        {activeTab === 'budgets' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pb-1">
              <span>{t('audit.locViolations')}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {t('audit.locWarnThreshold')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {t('audit.locCritThreshold')}
                </span>
              </div>
            </div>

            {violations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('audit.locNoViolations')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {violations.map((v, idx) => {
                  const isCrit = v.status === 'error' || v.lines >= 1000;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isCrit ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {v.file}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {v.lines} {t('audit.lines')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            isCrit
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isCrit ? '>= 1000' : '>= 500'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: TODOs en Código */}
        {activeTab === 'todos' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={selectAllCheckboxId}
                  checked={todos.length > 0 && selectedTodoIds.size === todos.length}
                  onChange={handleToggleAllTodos}
                  disabled={todos.length === 0}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-white/20 dark:bg-white/10"
                />
                <label
                  htmlFor={selectAllCheckboxId}
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
                >
                  {selectedTodoIds.size === todos.length && todos.length > 0
                    ? t('audit.deselectAll')
                    : t('audit.selectAll')}
                </label>
                {selectedTodoIds.size > 0 && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold ml-1">
                    ({t('audit.selectedCount', { count: selectedTodoIds.size })})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedTodoIds.size === 0 || isImporting}
                title={t('audit.importSelected')}
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
              >
                <DownloadCloud className={`w-3.5 h-3.5 ${isImporting ? 'animate-bounce' : ''}`} />
                <span>
                  {isImporting ? t('audit.importing') : t('audit.importSelected')}
                </span>
              </button>
            </div>

            {todos.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('audit.todosNoItems')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => {
                  const isSelected = selectedTodoIds.has(todo.id);
                  let typeBadgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
                  if (todo.type === 'FIXME') {
                    typeBadgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                  } else if (todo.type === 'HACK') {
                    typeBadgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                  } else if (todo.type === 'BUG') {
                    typeBadgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                  }

                  return (
                    <div
                      key={todo.id}
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/30'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${typeBadgeColor}`}>
                              {todo.type}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {todo.file}:{todo.line}
                            </span>
                          </div>

                          <div className="font-medium text-slate-800 dark:text-slate-200 break-words">
                            {todo.text}
                          </div>

                          {todo.snippet && (
                            <pre className="mt-1.5 p-2 rounded bg-slate-100 dark:bg-[#070b12] text-slate-700 dark:text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                              {todo.snippet}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Calidad Anti-Slop */}
        {activeTab === 'quality' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 pb-1">
              <span>{t('audit.qualitySuppressionsFound')}</span>
            </div>

            {suppressions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <Sparkles className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('audit.qualityNoSuppressions')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {suppressions.map((sup, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {sup.type}
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {sup.file}:{sup.line}
                        </span>
                      </div>
                    </div>

                    {sup.snippet && (
                      <pre className="p-2 rounded bg-slate-100 dark:bg-[#070b12] text-slate-700 dark:text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {sup.snippet}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
