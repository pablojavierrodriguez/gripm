import React from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import type { ItemStatus, ItemType, Priority, GripmConfig } from '../../types';
import { DEFAULT_FIBONACCI, DEFAULT_TSHIRT } from '../../types';

export interface ItemSidebarStatusTypeProps {
  status: ItemStatus;
  setStatus: (s: ItemStatus) => void;
  blockedReason?: string;
  setBlockedReason?: (s: string) => void;
  dismissedReason?: string;
  setDismissedReason?: (s: string) => void;
  priority: Priority;
  setPriority: (p: Priority) => void;
  type: ItemType;
  setType: (t: ItemType) => void;
  config?: GripmConfig;
  estimate: string | number | undefined;
  setEstimate: (e: string | number | undefined) => void;
  customEstimateInput: string;
  setCustomEstimateInput: (s: string) => void;
  t: (key: any, params?: any) => string;
}

export const ItemSidebarStatusType: React.FC<ItemSidebarStatusTypeProps> = ({
  status,
  setStatus,
  blockedReason,
  setBlockedReason,
  dismissedReason,
  setDismissedReason,
  priority,
  setPriority,
  type,
  setType,
  config,
  estimate,
  setEstimate,
  customEstimateInput,
  setCustomEstimateInput,
  t,
}) => {
  return (
    <>
      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          {t('itemModal.statusLabel')}
        </label>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ItemStatus)}
            className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 font-medium"
          >
            <option value="ideas" className="bg-white dark:bg-[#0e1626]">💡 {t('status.ideas')}</option>
            <option value="draft" className="bg-white dark:bg-[#0e1626]">{t('status.draft')}</option>
            <option value="doing" className="bg-white dark:bg-[#0e1626]">{t('status.doing')}</option>
            <option value="blocked" className="bg-white dark:bg-[#0e1626]">⛔ {t('status.blocked')}</option>
            <option value="review" className="bg-white dark:bg-[#0e1626]">{t('status.review')}</option>
            <option value="ready" className="bg-white dark:bg-[#0e1626]">{t('status.ready')}</option>
            <option value="done" className="bg-white dark:bg-[#0e1626]">{t('status.done')}</option>
            <option value="dismissed" className="bg-white dark:bg-[#0e1626]">{t('status.dismissed')}</option>
            <option value="cancelled" className="bg-white dark:bg-[#0e1626]">{t('status.cancelled')}</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {status === 'blocked' && setBlockedReason && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
              {t('modal.blockedReason')}
            </label>
            <textarea
              rows={2}
              value={blockedReason || ''}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder={t('modal.blockedReasonPlaceholder')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-rose-500/50 resize-none"
            />
          </div>
        )}

        {status === 'dismissed' && setDismissedReason && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('modal.dismissedReason')}
            </label>
            <textarea
              rows={2}
              value={dismissedReason || ''}
              onChange={(e) => setDismissedReason(e.target.value)}
              placeholder={t('modal.dismissedReasonPlaceholder')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>
        )}
      </div>

      {/* Priority & Type */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('itemModal.priorityLabel')}
          </label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="p0" className="bg-white dark:bg-[#0e1626] text-rose-600 dark:text-rose-400">
                {t('priority.urgent')} 🔴
              </option>
              <option value="p1" className="bg-white dark:bg-[#0e1626] text-amber-600 dark:text-amber-400">
                {t('priority.high')} 🟠
              </option>
              <option value="p2" className="bg-white dark:bg-[#0e1626] text-yellow-600 dark:text-yellow-400">
                {t('priority.medium')} 🟡
              </option>
              <option value="p3" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">
                {t('priority.low')} ⚪
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('itemModal.typeLabel')}
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="bug" className="bg-white dark:bg-[#0e1626]">🐛 {t('type.bug')}</option>
              <option value="feature" className="bg-white dark:bg-[#0e1626]">🚀 {t('type.feature')}</option>
              <option value="tech_debt" className="bg-white dark:bg-[#0e1626]">🛠️ {t('type.tech_debt')}</option>
              <option value="ux" className="bg-white dark:bg-[#0e1626]">🎨 {t('type.ux')}</option>
              <option value="epic" className="bg-white dark:bg-[#0e1626]">📚 {t('type.epic')}</option>
              <option value="initiative" className="bg-white dark:bg-[#0e1626]">⚡ {t('type.initiative')}</option>
              {config?.customItemTypes && config.customItemTypes.length > 0 && (
                <optgroup label={t('itemModal.customTypesGroup')}>
                  {config.customItemTypes.map((ct) => (
                    <option key={ct.key} value={ct.key} className="bg-white dark:bg-[#0e1626]">
                      🏷️ {ct.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* DEV-138: Estimation Selector */}
      {config?.estimation?.enabled && (
        <div>
          <div className="flex items-center justify-between min-w-0 mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('itemModal.estimateLabel')}</span>
            </label>
            {estimate !== undefined && estimate !== '' && (
              <button
                type="button"
                onClick={() => {
                  setEstimate(undefined);
                  setCustomEstimateInput('');
                }}
                aria-label={t('itemModal.estimateNone')}
                title={t('itemModal.estimateNone')}
                className="text-xs text-slate-500 hover:text-rose-500 transition-colors"
              >
                {t('itemModal.estimateNone')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(() => {
              const baseOptions: (string | number)[] =
                config?.estimation?.method === 'tshirt'
                  ? config?.estimation?.customTshirt || DEFAULT_TSHIRT
                  : config?.estimation?.customFibonacci || DEFAULT_FIBONACCI;
              const isCustomActive = customEstimateInput !== '';

              return (
                <>
                  {baseOptions.map((val) => {
                    const isSelected = !isCustomActive && String(estimate) === String(val);
                    return (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEstimate(undefined);
                          } else {
                            setEstimate(val);
                            setCustomEstimateInput('');
                          }
                        }}
                        aria-label={`${t('itemModal.estimateLabel')}: ${val}`}
                        title={`${t('itemModal.estimateLabel')}: ${val}`}
                        className={`px-2 py-1 min-w-[26px] flex items-center justify-center rounded-md text-xs font-mono font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/[0.06]'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}

                  {/* Unified inline custom SP pill */}
                  {config?.estimation?.method !== 'tshirt' && (
                    <div className="relative inline-flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={customEstimateInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setCustomEstimateInput(raw);
                          if (raw === '') {
                            setEstimate(undefined);
                          } else {
                            const num = parseInt(raw, 10);
                            setEstimate(isNaN(num) ? undefined : num);
                          }
                        }}
                        placeholder={t('itemModal.enterPoints')}
                        aria-label={t('itemModal.customEstimate')}
                        title={t('itemModal.customEstimate')}
                        className={`w-14 h-7 px-1.5 text-center text-xs font-mono font-semibold rounded-md border transition-all outline-none ${
                          isCustomActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs placeholder:text-indigo-200'
                            : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'
                        }`}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};
