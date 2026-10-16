import React from 'react';
import {
  Link,
  ChevronUp,
  ChevronDown,
  X,
  ShieldAlert,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type { BacklogItem } from '../../types';

export interface ItemRelationsPanelProps {
  relationsExpanded: boolean;
  setRelationsExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  parentId: string;
  setParentId: (id: string) => void;
  blocks: string[];
  setBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  blockedBy: string[];
  setBlockedBy: React.Dispatch<React.SetStateAction<string[]>>;
  relatedTo: string[];
  setRelatedTo: React.Dispatch<React.SetStateAction<string[]>>;
  formatRelation: (id: string) => string;
  otherItems: BacklogItem[];
  showChildTasks: boolean;
  childTasksExpanded: boolean;
  setChildTasksExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  childTasks: BacklogItem[];
  onUnlinkChild?: (childId: string) => void;
  t: (key: any, params?: any) => string;
}

export const ItemRelationsPanel: React.FC<ItemRelationsPanelProps> = ({
  relationsExpanded,
  setRelationsExpanded,
  parentId,
  setParentId,
  blocks,
  setBlocks,
  blockedBy,
  setBlockedBy,
  relatedTo,
  setRelatedTo,
  formatRelation,
  otherItems,
  showChildTasks,
  childTasksExpanded,
  setChildTasksExpanded,
  childTasks,
  onUnlinkChild,
  t,
}) => {
  return (
    <>
      {/* DEV-048: Relaciones y Dependencias (Jerarquías y Bloqueos) */}
      <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setRelationsExpanded((prev) => !prev)}
            aria-expanded={relationsExpanded}
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Link className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">
                {t('itemModal.relationsTitle')}
              </span>
            </span>
            {relationsExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>
          {(parentId || blocks.length > 0 || blockedBy.length > 0 || relatedTo.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 pl-5">
              {parentId && (
                <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] pl-2 text-xs text-slate-700 dark:text-slate-300">
                  <span className="break-words py-1">
                    {t('itemModal.relationsParent')}: {formatRelation(parentId)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${t('itemModal.relationsRemoveBlocks')}: ${formatRelation(parentId)}`}
                    title={t('itemModal.relationsRemoveBlocks')}
                    onClick={() => setParentId('')}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-200 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {blockedBy.map((id) => (
                <div
                  key={`blocked-by-${id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] pl-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span className="break-words py-1">
                    {t('itemModal.relationsBlockedBy')}: {formatRelation(id)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${t('itemModal.relationsRemoveBlocker')}: ${formatRelation(id)}`}
                    title={t('itemModal.relationsRemoveBlocker')}
                    onClick={() => setBlockedBy((previous) => previous.filter((value) => value !== id))}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-200 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {blocks.map((id) => (
                <div
                  key={`blocks-${id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] pl-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span className="break-words py-1">
                    {t('itemModal.relationsBlocks')}: {formatRelation(id)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${t('itemModal.relationsRemoveBlocks')}: ${formatRelation(id)}`}
                    title={t('itemModal.relationsRemoveBlocks')}
                    onClick={() => setBlocks((previous) => previous.filter((value) => value !== id))}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-200 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {relatedTo.map((id) => (
                <div
                  key={`related-to-${id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] pl-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span className="break-words py-1">
                    {t('itemModal.relationsRelatedTo')}: {formatRelation(id)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${t('itemModal.relationsRemoveBlocks')}: ${formatRelation(id)}`}
                    title={t('itemModal.relationsRemoveBlocks')}
                    onClick={() => setRelatedTo((previous) => previous.filter((value) => value !== id))}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-200 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {relationsExpanded && (
          <div className="p-4 border-t border-slate-200 dark:border-white/[0.06] space-y-4 bg-slate-50 dark:bg-black/10 text-xs">
            {/* 1. Bloqueado Por (Blocked By) */}
            <div>
              <div className="flex min-w-0 items-center justify-between mb-1">
                <label className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{t('itemModal.relationsBlockedBy')}</span>
                </label>
                <span className="text-xs text-slate-600 dark:text-slate-400">{t('itemModal.relationsBlockedByDesc')}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <select
                    className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500/50"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !blockedBy.includes(val)) {
                        setBlockedBy((prev) => [...prev, val]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddBlocker')}</option>
                    {otherItems.filter((it) => !blockedBy.includes(it.code || it.id)).map((it) => (
                      <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                        {it.code || it.id} - {it.title.slice(0, 45)} ({it.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              {blockedBy.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {blockedBy.map((bCode) => (
                    <span key={bCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs">
                      <span>⛔ {formatRelation(bCode)}</span>
                      <button
                        type="button"
                        onClick={() => setBlockedBy((prev) => prev.filter((c) => c !== bCode))}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-white ml-0.5"
                        title={t('itemModal.relationsRemoveBlocker')}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Bloquea A (Blocks) */}
            <div>
              <div className="flex min-w-0 items-center justify-between mb-1">
                <label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t('itemModal.relationsBlocks')}</span>
                </label>
                <span className="text-xs text-slate-600 dark:text-slate-400">{t('itemModal.relationsBlocksDesc')}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <select
                    className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500/50"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !blocks.includes(val)) {
                        setBlocks((prev) => [...prev, val]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddBlocked')}</option>
                    {otherItems.filter((it) => !blocks.includes(it.code || it.id)).map((it) => (
                      <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                        {it.code || it.id} - {it.title.slice(0, 45)} ({it.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              {blocks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {blocks.map((bCode) => (
                    <span key={bCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs">
                      <span>⚠️ {formatRelation(bCode)}</span>
                      <button
                        type="button"
                        onClick={() => setBlocks((prev) => prev.filter((c) => c !== bCode))}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-white ml-0.5"
                        title={t('itemModal.relationsRemoveBlocks')}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Relacionado Con (Related To) */}
            <div>
              <div className="flex min-w-0 items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('itemModal.relationsRelatedTo')}</span>
                </label>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <select
                    className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !relatedTo.includes(val)) {
                        setRelatedTo((prev) => [...prev, val]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddRelated')}</option>
                    {otherItems.filter((it) => !relatedTo.includes(it.code || it.id)).map((it) => (
                      <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                        {it.code || it.id} - {it.title.slice(0, 45)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              {relatedTo.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {relatedTo.map((rCode) => (
                    <span key={rCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs">
                      <span>🔗 {formatRelation(rCode)}</span>
                      <button
                        type="button"
                        onClick={() => setRelatedTo((prev) => prev.filter((c) => c !== rCode))}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white ml-0.5"
                        title={t('itemModal.relationsRemoveBlocks')}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION: Child Tasks Accordion (DEV-248) */}
      {showChildTasks && (
        <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-all">
          <div
            onClick={() => setChildTasksExpanded((prev) => !prev)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] flex items-center justify-between min-w-0 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('itemModal.childTasksTitle')}
              </span>
              <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/20">
                {childTasks.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {childTasksExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          {childTasksExpanded && (
            <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.06] space-y-2">
              {childTasks.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {t('itemModal.childTasksEmpty')}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {childTasks.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between min-w-0 gap-2 p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                          {child.code || child.id}
                        </span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 break-words font-medium" title={child.title}>
                          {child.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                          {child.status}
                        </span>
                        {onUnlinkChild && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnlinkChild(child.id);
                            }}
                            aria-label={`${t('itemModal.unlinkChild')} ${child.code || child.id}`}
                            title={`${t('itemModal.unlinkChild')} (${child.code || child.id})`}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
