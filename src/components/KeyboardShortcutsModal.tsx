import type { FC } from 'react';
import { Keyboard, X, Compass, CheckSquare, Search } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { TranslationKey } from '../utils/i18n';
import type { UpdateInfo } from '../types';
import { Modal } from './Modal';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateAvailable?: UpdateInfo | null;
}

interface ShortcutItem {
  combos: string[][];
  description: string;
}

interface ShortcutGroup {
  title: string;
  icon: typeof Compass;
  items: ShortcutItem[];
}

interface FooterLink {
  labelKey: TranslationKey;
  titleKey: TranslationKey;
  href: string;
}

const REPO_URL = 'https://github.com/pablojavierrodriguez/gripm';

/** Brand + support links rendered in the cheatsheet footer (DEV-257). */
const FOOTER_LINKS: FooterLink[] = [
  {
    labelKey: 'shortcuts.linkRepo',
    titleKey: 'shortcuts.linkRepoTitle',
    href: REPO_URL,
  },
  {
    labelKey: 'shortcuts.linkDocs',
    titleKey: 'shortcuts.linkDocsTitle',
    href: `${REPO_URL}#readme`,
  },
  {
    labelKey: 'shortcuts.linkReport',
    titleKey: 'shortcuts.linkReportTitle',
    href: `${REPO_URL}/issues/new`,
  },
];

export const KeyboardShortcutsModal: FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  updateAvailable,
}) => {
  const { t } = useTranslation();
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const groups: ShortcutGroup[] = [
    {
      title: t('shortcuts.categoryNavigation'),
      icon: Compass,
      items: [
        {
          combos: [['1']],
          description: t('shortcuts.tabBoard'),
        },
        {
          combos: [['2']],
          description: t('shortcuts.tabSprints'),
        },
        {
          combos: [['3']],
          description: t('shortcuts.tabReleases'),
        },
        {
          combos: [['4']],
          description: t('shortcuts.tabTrash'),
        },
        {
          combos: [['⌘ / Ctrl', ',']],
          description: t('shortcuts.openSettings'),
        },
        {
          combos: [['?']],
          description: t('shortcuts.openShortcuts'),
        },
      ],
    },
    {
      title: t('shortcuts.categoryTasks'),
      icon: CheckSquare,
      items: [
        {
          combos: [['N']],
          description: t('shortcuts.newTask'),
        },
        {
          combos: [['⌘ / Ctrl', '↵']],
          description: t('shortcuts.saveItem'),
        },
        {
          combos: [['⌘ / Ctrl', 'S']],
          description: t('shortcuts.saveSettings'),
        },
      ],
    },
    {
      title: t('shortcuts.categoryGeneral'),
      icon: Search,
      items: [
        {
          combos: [['⌘ / Ctrl', 'K'], ['/']],
          description: t('shortcuts.focusSearch'),
        },
        {
          combos: [['Esc']],
          description: t('shortcuts.closeDialog'),
        },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelRef={panelRef}
      maxWidth="max-w-xl"
      ariaLabel={t('shortcuts.title')}
    >
      <div className="flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {t('shortcuts.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('shortcuts.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shortcuts.close')}
            title={t('shortcuts.close')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Categorized List.
            The bottom mask dissolves content into the footer instead of hard-cutting
            it on the border, so a section header landing on the scroll edge reads as
            "more below" rather than as clipped text. Extra pb keeps the fade over
            padding once the list is scrolled to the end. */}
        <div className="p-5 pb-7 overflow-y-auto space-y-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),#0000)]">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{group.title}</span>
                </div>
                <div className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl divide-y divide-slate-200/60 dark:divide-white/[0.04] overflow-hidden">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2.5 gap-4 hover:bg-white/60 dark:hover:bg-white/[0.03] transition-colors min-w-0"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 min-w-0">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.combos.map((combo, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-1">
                            {cIdx > 0 && (
                              <span className="text-xs text-slate-400 font-mono px-0.5">
                                /
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {combo.map((k, kIdx) => (
                                <kbd
                                  key={kIdx}
                                  className="inline-flex sm:inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-2xs"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-x-4 gap-y-1 flex-wrap text-xs text-slate-500 dark:text-slate-400 shrink-0">
          {/* Brand + support links (DEV-257): 0 px cost on the board, only inside this modal */}
          <nav
            aria-label={t('shortcuts.footerLinks')}
            className="flex flex-wrap items-center gap-x-3 min-w-0"
          >
            <span className="font-mono text-xs font-semibold tracking-tight text-slate-500 dark:text-slate-400">
              gripm{updateAvailable?.currentVersion ? ` v${updateAvailable.currentVersion}` : ''}
            </span>
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                title={t(link.titleKey)}
                className="inline-flex items-center min-h-[44px] text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded transition-colors"
              >
                {t(link.labelKey)}
                <span className="sr-only"> {t('shortcuts.newTab')}</span>
              </a>
            ))}
          </nav>

          {/* Reopen hint, inline on the same row. No close button: the header X,
              the Esc trap and the backdrop click already cover dismissal. */}
          <div className="hidden sm:inline-flex items-center gap-1.5 shrink-0">
            <span>{t('shortcuts.hint', { key: '' }).replace('{{key}}', '')}</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs font-mono font-semibold rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              ?
            </kbd>
          </div>
        </div>
      </div>
    </Modal>
  );
};
