import { useTranslation, type TranslationKey } from './i18n';

export type CanonicalStatus =
  | 'ideas'
  | 'draft'
  | 'doing'
  | 'review'
  | 'ready'
  | 'done'
  | 'dismissed'
  | 'cancelled';

export interface StatusMeta {
  key: CanonicalStatus;
  label: string;
  dot: string;
  bg: string;
  border: string;
  color: string;
  text: string;
}

export const CANONICAL_STATUSES: CanonicalStatus[] = [
  'ideas',
  'draft',
  'doing',
  'review',
  'ready',
  'done',
  'dismissed',
  'cancelled'
];

export const LEGACY_STATUS_MAP: Record<string, CanonicalStatus> = {
  backlog: 'draft',
  in_progress: 'doing',
  testing_qa: 'review',
  finish: 'ready'
};

export const normalizeStatus = (status: string): CanonicalStatus => {
  return LEGACY_STATUS_MAP[status] || (status as CanonicalStatus);
};

export const STATUS_STYLE_MAP: Record<CanonicalStatus, { dot: string; bg: string; border: string; color: string; text: string }> = {
  draft: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400'
  },
  doing: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400'
  },
  review: {
    dot: 'bg-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400'
  },
  ready: {
    dot: 'bg-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400'
  },
  done: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400'
  },
  dismissed: {
    dot: 'bg-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    color: 'bg-slate-200 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    text: 'text-slate-500 dark:text-slate-400'
  },
  cancelled: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    color: 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30',
    text: 'text-rose-600 dark:text-rose-400'
  },
  ideas: {
    dot: 'bg-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    text: 'text-pink-600 dark:text-pink-400'
  }
};

const DEFAULT_STYLE = {
  dot: 'bg-slate-400',
  bg: 'bg-slate-500/10',
  border: 'border-slate-500/20',
  color: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
  text: 'text-slate-500 dark:text-slate-400'
};

export const getStatusMeta = (
  status: string,
  t: (key: TranslationKey) => string
): StatusMeta => {
  const canonical = normalizeStatus(status);
  const styles = STATUS_STYLE_MAP[canonical] || DEFAULT_STYLE;
  const translationKey = `status.${canonical}` as TranslationKey;
  const label = t(translationKey);

  return {
    key: canonical,
    label: label.startsWith('status.') ? canonical : label,
    ...styles
  };
};

export const useStatusMeta = () => {
  const { t } = useTranslation();
  return (status: string): StatusMeta => getStatusMeta(status, t);
};
