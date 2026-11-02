import { useId, type FC, type KeyboardEvent } from 'react';
import { DownloadCloud, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import type { CodeTodoItem } from '../../types';
import { useTranslation } from '../../utils/i18n';

export interface AuditTodosTabProps {
  isTodosDisabled: boolean;
  todos: CodeTodoItem[];
  selectedTodoIds: Set<string>;
  isImporting: boolean;
  onToggleTodo: (id: string) => void;
  onToggleAllTodos: () => void;
  onImportSelected: () => void;
}

export const AuditTodosTab: FC<AuditTodosTabProps> = ({
  isTodosDisabled,
  todos,
  selectedTodoIds,
  isImporting,
  onToggleTodo,
  onToggleAllTodos,
  onImportSelected,
}) => {
  const { t } = useTranslation();
  const selectAllCheckboxId = useId();

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleTodo(id);
    }
  };

  return (
    <div className="space-y-3">
      {isTodosDisabled && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          {t('audit.todosDisabledNotice')}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={selectAllCheckboxId}
            checked={todos.length > 0 && selectedTodoIds.size === todos.length}
            onChange={onToggleAllTodos}
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
          onClick={onImportSelected}
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
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onToggleTodo(todo.id)}
                onKeyDown={(e) => handleRowKeyDown(e, todo.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
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
  );
};
