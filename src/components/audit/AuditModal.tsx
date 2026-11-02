import { useState, type FC } from 'react';
import {
  X,
  RefreshCw,
  ShieldCheck,
  FileCode,
  CheckSquare,
  Sparkles,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import type { RepoHealthReport, TodoImportItem, GripmConfig } from '../../types';
import { Modal } from '../Modal';
import { useTranslation } from '../../utils/i18n';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { AuditBudgetsTab } from './AuditBudgetsTab';
import { AuditTodosTab } from './AuditTodosTab';
import { AuditQualityTab } from './AuditQualityTab';

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
  config,
}) => {
  const { t } = useTranslation();
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<TabType>('budgets');
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const hasReport = report !== null;
  const score = hasReport ? Math.round(report.score) : null;
  const violations = report?.loc?.violations || [];
  const todos = report?.todos || [];
  const suppressions = report?.quality?.suppressions || [];
  const testInfo = report?.tests;

  const rules = report?.rules || config?.audit?.rules;
  const isLocDisabled = rules?.loc === false;
  const isTodosDisabled = rules?.debtMarkers === false;
  const isQualityDisabled = rules?.suppressions === false;
  const isCustomRules = Boolean(
    isLocDisabled ||
    isTodosDisabled ||
    isQualityDisabled ||
    rules?.testRunner === false ||
    rules?.consoleLog
  );

  // Score color styles
  let scoreColorText = 'text-emerald-600 dark:text-emerald-400';
  let scoreBarColor = 'bg-emerald-500';
  if (score !== null) {
    if (score < 60) {
      scoreColorText = 'text-rose-600 dark:text-rose-400';
      scoreBarColor = 'bg-rose-500';
    } else if (score < 80) {
      scoreColorText = 'text-amber-600 dark:text-amber-400';
      scoreBarColor = 'bg-amber-500';
    }
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
                <span className={`text-2xl font-extrabold ${score !== null ? scoreColorText : 'text-slate-400'}`}>
                  {score !== null ? score : '-'}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${score !== null ? scoreBarColor : 'bg-slate-300 dark:bg-white/20'}`}
                style={{ width: `${score !== null ? Math.min(100, Math.max(0, score)) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-white/[0.06]">
            {/* Governance / Rules indicator */}
            {rules && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium">
                  {isCustomRules ? t('audit.rulesCustom') : t('audit.rulesStandard')}
                </span>
              </div>
            )}

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
            {isLocDisabled ? (
              <span className="px-1.5 py-0.5 rounded text-xs font-mono text-slate-400 bg-slate-200/50 dark:bg-white/[0.05]">
                off
              </span>
            ) : violations.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {violations.length}
              </span>
            ) : null}
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
            {isTodosDisabled ? (
              <span className="px-1.5 py-0.5 rounded text-xs font-mono text-slate-400 bg-slate-200/50 dark:bg-white/[0.05]">
                off
              </span>
            ) : todos.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {todos.length}
              </span>
            ) : null}
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
            {isQualityDisabled ? (
              <span className="px-1.5 py-0.5 rounded text-xs font-mono text-slate-400 bg-slate-200/50 dark:bg-white/[0.05]">
                off
              </span>
            ) : suppressions.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {suppressions.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Modal Tab Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {!hasReport && !isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
            <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {t('audit.errorUnavailable')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('audit.modalSubtitle')}
            </p>
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('audit.refresh')}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'budgets' && (
              <AuditBudgetsTab
                isLocDisabled={isLocDisabled}
                violations={violations}
              />
            )}

            {activeTab === 'todos' && (
              <AuditTodosTab
                isTodosDisabled={isTodosDisabled}
                todos={todos}
                selectedTodoIds={selectedTodoIds}
                isImporting={isImporting}
                onToggleTodo={handleToggleTodo}
                onToggleAllTodos={handleToggleAllTodos}
                onImportSelected={handleImportSelected}
              />
            )}

            {activeTab === 'quality' && (
              <AuditQualityTab
                isQualityDisabled={isQualityDisabled}
                suppressions={suppressions}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
