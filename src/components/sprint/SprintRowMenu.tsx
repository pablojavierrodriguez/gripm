import { useState, type FC, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Target,
  ChevronRight,
  Check,
  Edit3,
  Trash2
} from 'lucide-react';
import type { BacklogItem } from '../../types';
import { useTranslation } from '../../utils/i18n';

interface SprintRowMenuProps {
  item: BacklogItem;
  group: { key: string; items: BacklogItem[] };
  rowIdx: number;
  top: number;
  left: number;
  menuRef: RefObject<HTMLDivElement>;
  rankingEnabled: boolean;
  activeSprints: string[];
  onMoveToTop: (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => void;
  onMoveToBottom: (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => void;
  onTransferSprint: (itemId: string, sprint: string) => void;
  onEditItem: (item: BacklogItem) => void;
  onDeleteItem: (item: BacklogItem) => void;
  onClose: () => void;
}

export const SprintRowMenu: FC<SprintRowMenuProps> = ({
  item,
  group,
  rowIdx,
  top,
  left,
  menuRef,
  rankingEnabled,
  activeSprints,
  onMoveToTop,
  onMoveToBottom,
  onTransferSprint,
  onEditItem,
  onDeleteItem,
  onClose
}) => {
  const { t } = useTranslation();
  const [sprintSubmenuOpen, setSprintSubmenuOpen] = useState(false);
  const curSprint = item.sprint || item.targetSprint || '';
  const canMoveTop = rankingEnabled && rowIdx > 0;
  const canMoveBottom = rankingEnabled && rowIdx < group.items.length - 1;

  return createPortal(
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{ top, left }}
      className="fixed w-52 max-h-96 overflow-y-auto rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-[100] text-xs animate-in fade-in zoom-in-95"
    >
      {rankingEnabled && (
        <>
          <button
            type="button"
            onClick={() => {
              onMoveToTop(item, group);
              onClose();
            }}
            disabled={!canMoveTop}
            aria-label={t('card.moveToTop')}
            title={t('card.moveToTop')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left transition-colors"
          >
            <ArrowUpToLine className="w-3.5 h-3.5 shrink-0" />
            <span>{t('card.moveToTop')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveToBottom(item, group);
              onClose();
            }}
            disabled={!canMoveBottom}
            aria-label={t('card.moveToBottom')}
            title={t('card.moveToBottom')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
            <span>{t('card.moveToBottom')}</span>
          </button>

          <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />
        </>
      )}

      {/* Sprint Assignment Submenu */}
      <div>
        <button
          type="button"
          onClick={() => setSprintSubmenuOpen(!sprintSubmenuOpen)}
          aria-label={t('card.assignSprint')}
          title={t('card.assignSprint')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-left transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{t('card.assignSprint')}</span>
          </div>
          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
              sprintSubmenuOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {sprintSubmenuOpen && (
          <div className="mt-1 pl-2 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-500/30 ml-2 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => {
                onTransferSprint(item.id, '');
                onClose();
              }}
              aria-label={t('card.returnToBacklog')}
              title={t('card.returnToBacklog')}
              className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                !curSprint
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              <span className="truncate">{t('card.returnToBacklog')}</span>
              {!curSprint && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
            </button>

            {activeSprints.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  onTransferSprint(item.id, sp);
                  onClose();
                }}
                aria-label={sp}
                title={sp}
                className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                  curSprint === sp
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <span className="truncate">{sp}</span>
                {curSprint === sp && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />

      {/* Edit Item */}
      <button
        type="button"
        onClick={() => {
          onEditItem(item);
          onClose();
        }}
        aria-label={t('common.edit')}
        title={t('common.edit')}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-left transition-colors"
      >
        <Edit3 className="w-3.5 h-3.5 shrink-0" />
        <span>{t('common.edit')}</span>
      </button>

      {/* Delete Item */}
      <button
        type="button"
        onClick={() => {
          onDeleteItem(item);
          onClose();
        }}
        aria-label={t('common.delete')}
        title={t('common.delete')}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        <span>{t('common.delete')}</span>
      </button>
    </div>,
    document.body
  );
};
