import React from 'react';
import { Layers, Zap, X, ChevronDown, Search, Check } from 'lucide-react';
import type { BacklogItem, GripmConfig } from '../../types';
import { getItemTypeInfo } from '../ItemCard';

export interface ItemParentComboboxProps {
  parentId: string;
  setParentId: (id: string) => void;
  isParentDropdownOpen: boolean;
  setIsParentDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  parentDropdownContainerRef: React.RefObject<HTMLDivElement>;
  parentSearchInputRef: React.RefObject<HTMLInputElement>;
  parentSearchQuery: string;
  setParentSearchQuery: (s: string) => void;
  selectedParentItem: BacklogItem | undefined;
  isLegacyParent: boolean;
  formatRelation: (id: string) => string;
  filteredCandidateParents: BacklogItem[];
  config?: GripmConfig;
  t: (key: any, params?: any) => string;
}

export const ItemParentCombobox: React.FC<ItemParentComboboxProps> = ({
  parentId,
  setParentId,
  isParentDropdownOpen,
  setIsParentDropdownOpen,
  parentDropdownContainerRef,
  parentSearchInputRef,
  parentSearchQuery,
  setParentSearchQuery,
  selectedParentItem,
  isLegacyParent,
  formatRelation,
  filteredCandidateParents,
  config,
  t,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 min-w-0">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{t('itemModal.parentEpicLabel')}</span>
        </label>
      </div>

      <div ref={parentDropdownContainerRef} className="relative">
        {/* Trigger Box: Single unified control with semantic item styling */}
        <div
          className={`w-full flex min-w-0 items-center justify-between h-9 px-2.5 rounded-lg border text-xs transition-colors ${
            selectedParentItem
              ? selectedParentItem.type === 'epic'
                ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-200/90 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-indigo-500/15 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500'
                : 'bg-purple-50/70 dark:bg-purple-500/10 border-purple-200/90 dark:border-purple-500/30 text-purple-900 dark:text-purple-200 hover:bg-purple-100/60 dark:hover:bg-purple-500/15 focus-within:ring-1 focus-within:ring-purple-500 focus-within:border-purple-500'
              : 'bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500/50'
          }`}
        >
          <button
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isParentDropdownOpen}
            aria-label={
              selectedParentItem
                ? `${selectedParentItem.type.toUpperCase()}: ${selectedParentItem.code || selectedParentItem.id} · ${selectedParentItem.title}`
                : t('itemModal.parentEpicLabel')
            }
            onClick={() => setIsParentDropdownOpen((prev) => !prev)}
            className="flex-1 flex min-w-0 items-center gap-1.5 text-left cursor-pointer focus:outline-none overflow-hidden py-1 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:scale-[0.99]"
            title={
              selectedParentItem
                ? `${selectedParentItem.code || selectedParentItem.id}: ${selectedParentItem.title} (${selectedParentItem.type.toUpperCase()})`
                : parentId || t('itemModal.noParentAssigned')
            }
          >
            {parentId ? (
              selectedParentItem ? (
                <>
                  {selectedParentItem.type === 'epic' ? (
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  )}
                  <span
                    className={`font-mono font-semibold shrink-0 ${
                      selectedParentItem.type === 'epic'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    {selectedParentItem.code || selectedParentItem.id}
                  </span>
                  <span
                    className={`shrink-0 ${
                      selectedParentItem.type === 'epic'
                        ? 'text-indigo-300 dark:text-indigo-600'
                        : 'text-purple-300 dark:text-purple-600'
                    }`}
                  >
                    ·
                  </span>
                  <span
                    className={`truncate font-medium min-w-0 flex-1 ${
                      selectedParentItem.type === 'epic'
                        ? 'text-indigo-950 dark:text-indigo-100'
                        : 'text-purple-950 dark:text-purple-100'
                    }`}
                  >
                    {selectedParentItem.title}
                  </span>
                </>
              ) : (
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate min-w-0">
                  [LEGACY] {formatRelation(parentId)}
                </span>
              )
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic">
                {t('itemModal.noParentAssigned')}
              </span>
            )}
          </button>

          <div className="flex items-center gap-0.5 pr-1 shrink-0">
            {parentId && (
              <button
                type="button"
                aria-label={t('common.clear')}
                title={t('common.clear')}
                onClick={(e) => {
                  e.stopPropagation();
                  setParentId('');
                  setIsParentDropdownOpen(false);
                }}
                className={`p-1 rounded transition-colors focus:outline-none ${
                  selectedParentItem?.type === 'epic'
                    ? 'text-indigo-400 hover:text-rose-500 dark:text-indigo-400 dark:hover:text-rose-400'
                    : selectedParentItem?.type === 'initiative'
                    ? 'text-purple-400 hover:text-rose-500 dark:text-purple-400 dark:hover:text-rose-400'
                    : 'text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={isParentDropdownOpen ? 'Close list' : 'Open list'}
              onClick={() => setIsParentDropdownOpen((prev) => !prev)}
              className={`p-1 transition-colors focus:outline-none ${
                selectedParentItem?.type === 'epic'
                  ? 'text-indigo-400 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-200'
                  : selectedParentItem?.type === 'initiative'
                  ? 'text-purple-400 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-200'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isParentDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dropdown with live search */}
        {isParentDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/[0.1] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={parentSearchInputRef}
                  type="text"
                  value={parentSearchQuery}
                  onChange={(e) => setParentSearchQuery(e.target.value)}
                  placeholder={t('itemModal.searchParentPlaceholder')}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                />
                {parentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setParentSearchQuery('');
                      parentSearchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={t('common.clear')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 text-xs focus:outline-none" role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={!parentId}
                aria-label={t('itemModal.relationsNoParent')}
                title={t('itemModal.relationsNoParent')}
                onClick={() => {
                  setParentId('');
                  setIsParentDropdownOpen(false);
                  setParentSearchQuery('');
                }}
                className={`w-full flex min-w-0 items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                  !parentId
                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <span className="italic">{t('itemModal.relationsNoParent')}</span>
                {!parentId && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
                )}
              </button>

              {isLegacyParent && (
                <button
                  type="button"
                  role="option"
                  aria-selected={true}
                  aria-label={parentId}
                  title={parentId}
                  onClick={() => {
                    setIsParentDropdownOpen(false);
                    setParentSearchQuery('');
                  }}
                  className="w-full flex min-w-0 items-center gap-2 px-2.5 py-2 rounded-lg text-left bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 font-medium"
                >
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 uppercase tracking-wider bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                    [LEGACY]
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-medium text-slate-900 dark:text-white mr-1.5">
                      {parentId}
                    </span>
                    <span className="text-slate-500 text-xs">
                      ({formatRelation(parentId)})
                    </span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
                </button>
              )}

              {filteredCandidateParents.map((cand) => {
                const isSelected = (cand.code || cand.id) === parentId || cand.id === parentId;
                const isEpic = cand.type === 'epic';
                const candTypeInfo = getItemTypeInfo(cand.type, config?.customItemTypes);
                const CandIcon = isEpic ? Layers : cand.type === 'initiative' ? Zap : candTypeInfo.icon;
                const fullItemLabel = `${candTypeInfo.label}: ${cand.code || cand.id} - ${cand.title}`;

                return (
                  <button
                    key={cand.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={fullItemLabel}
                    title={fullItemLabel}
                    onClick={() => {
                      setParentId(cand.code || cand.id);
                      setIsParentDropdownOpen(false);
                      setParentSearchQuery('');
                    }}
                    className={`w-full flex min-w-0 items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? isEpic
                          ? 'bg-indigo-500/15 text-indigo-950 dark:text-indigo-100 font-medium'
                          : 'bg-purple-500/15 text-purple-950 dark:text-purple-100 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <CandIcon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isEpic
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-mono font-semibold text-xs shrink-0 ${
                            isEpic
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {cand.code || cand.id}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 uppercase font-medium tracking-wider">
                          · {candTypeInfo.label}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 break-words leading-relaxed text-xs mt-0.5">
                        {cand.title}
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ml-1 mt-0.5 ${
                          isEpic
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}

              {filteredCandidateParents.length === 0 && (
                <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t('itemModal.noParentsFound')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
