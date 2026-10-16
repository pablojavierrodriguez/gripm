import React from 'react';
import { RotateCcw, ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import type { ColumnConfig, ItemStatus, ModulesConfig, VisibleCardMetadata } from '../../types';
import { ALL_ITEM_STATUSES, SettingsSwitch } from '../SettingsView';
import { useTranslation } from '../../utils/i18n';
import { useStatusMeta } from '../../utils/useStatusMeta';

export interface KanbanTabProps {
  kanbanEditMode: 'ampliada' | 'simplificada';
  setKanbanEditMode: (mode: 'ampliada' | 'simplificada') => void;
  handleResetColumns: () => void;
  activeColumnsList: ColumnConfig[];
  showIdeasByDefault: boolean;
  setShowIdeasByDefault: (v: boolean) => void;
  showDoneHistoryByDefault: boolean;
  setShowDoneHistoryByDefault: (v: boolean) => void;
  wipLimits: Record<string, number>;
  setWipLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  draggingStatus: { status: ItemStatus; fromColId: string } | null;
  setDraggingStatus: React.Dispatch<React.SetStateAction<{ status: ItemStatus; fromColId: string } | null>>;
  dragOverColId: string | null;
  setDragOverColId: React.Dispatch<React.SetStateAction<string | null>>;
  handleUpdateColumnField: (index: number, field: keyof ColumnConfig, value: any) => void;
  handleMoveColumn: (index: number, direction: 'up' | 'down') => void;
  handleMoveStatusToColumn: (toColId: string) => void;
  handleRemoveStatusFromColumn: (colId: string, status: ItemStatus) => void;
  handleAddStatusToColumn: (colId: string, status: ItemStatus) => void;
  modulesState: ModulesConfig;
  estimationEnabled: boolean;
  cardMetaState: VisibleCardMetadata;
  setCardMetaState: React.Dispatch<React.SetStateAction<VisibleCardMetadata>>;
}

export const KanbanTab: React.FC<KanbanTabProps> = ({
  kanbanEditMode,
  setKanbanEditMode,
  handleResetColumns,
  activeColumnsList,
  showIdeasByDefault,
  setShowIdeasByDefault,
  showDoneHistoryByDefault,
  setShowDoneHistoryByDefault,
  wipLimits,
  setWipLimits,
  draggingStatus,
  setDraggingStatus,
  dragOverColId,
  setDragOverColId,
  handleUpdateColumnField,
  handleMoveColumn,
  handleMoveStatusToColumn,
  handleRemoveStatusFromColumn,
  handleAddStatusToColumn,
  modulesState,
  estimationEnabled,
  cardMetaState,
  setCardMetaState,
}) => {
  const { t } = useTranslation();
  const getStatusMeta = useStatusMeta();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {t('settings.kanbanColsTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.kanbanColsDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetColumns}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('settings.resetMode', { mode: kanbanEditMode === 'ampliada' ? 'Modo Ampliado' : 'Modo Simple' })}</span>
        </button>
      </div>

      {/* Mode Switcher to configure Ampliada vs Simplificada */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('settings.boardModeToConfig')}
          </span>
          <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setKanbanEditMode('ampliada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                kanbanEditMode === 'ampliada'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{t('settings.expandedModeBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => setKanbanEditMode('simplificada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                kanbanEditMode === 'simplificada'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{t('settings.simplifiedModeBtn')}</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          {t('settings.columnsConfigured', { count: activeColumnsList.length })}
        </div>
      </div>

      {/* Ideas Column Toggle */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
        <label className="flex items-center justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75 gap-4">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {t('settings.showIdeasLabel')}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('settings.showIdeasDesc')}
            </p>
          </div>
          <SettingsSwitch
            checked={showIdeasByDefault}
            onChange={setShowIdeasByDefault}
            ariaLabel={t('settings.showIdeasLabel')}
          />
        </label>
      </div>

      {/* Done History Toggle (DEV-058) */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
        <label className="flex items-center justify-between cursor-pointer transition-opacity hover:opacity-90 active:opacity-75 gap-4">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {t('settings.showDoneHistoryLabel')}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('settings.showDoneHistoryDesc')}
            </p>
          </div>
          <SettingsSwitch
            checked={showDoneHistoryByDefault}
            onChange={setShowDoneHistoryByDefault}
            ariaLabel={t('settings.showDoneHistoryLabel')}
          />
        </label>
      </div>

      {/* Column list editor with Interactive Statuses (DEV-273) */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
          {kanbanEditMode === 'ampliada' ? t('settings.expandedModeBtn') : t('settings.simplifiedModeBtn')} ({activeColumnsList.length})
        </div>

        {/* Vertical column card flow */}
        <div className="space-y-4">
          {activeColumnsList.map((col, index) => {
            const currentWip = wipLimits[col.id] || col.wipLimit || 0;

            return (
              <div
                key={col.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border shadow-xs space-y-4 transition-all duration-150 ${
                  dragOverColId === col.id && draggingStatus?.fromColId !== col.id
                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-300/50 dark:ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/[0.04]'
                    : 'border-slate-200 dark:border-white/[0.08]'
                }`}
                onDragOver={(e) => { if (draggingStatus) { e.preventDefault(); setDragOverColId(col.id); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColId(null); }}
                onDrop={(e) => { e.preventDefault(); handleMoveStatusToColumn(col.id); }}
              >
                {/* Header: Dot + Title Input + Subtitle + Reorder Buttons */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-3.5 h-3.5 rounded-full ${col.dotColor} shrink-0`} />
                    <div className="flex-1 max-w-sm min-w-0">
                      <input
                        type="text"
                        value={col.title}
                        onChange={(e) => handleUpdateColumnField(index, 'title', e.target.value)}
                        className="text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-indigo-500 focus:outline-none px-1 text-slate-900 dark:text-white w-full"
                        title={t('settings.editColTitle')}
                      />
                      {col.subtitle && (
                        <p className="text-xs text-slate-400 px-1 font-mono">
                          {col.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveColumn(index, 'up')}
                      disabled={index === 0}
                      title={t('settings.moveColLeft')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveColumn(index, 'down')}
                      disabled={index === activeColumnsList.length - 1}
                      title={t('settings.moveColRight')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* WIP Limit & Drop Target Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{t('settings.wipLimitLabel')}</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={currentWip || ''}
                      placeholder={t('settings.wipUnlimited')}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const next = { ...wipLimits };
                        if (isNaN(val) || val <= 0) {
                          delete next[col.id];
                        } else {
                          next[col.id] = val;
                        }
                        setWipLimits(next);
                      }}
                      className="w-28 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 text-right"
                    />{/* ux-audit-ignore UX-001: integer WIP counter bounded 0-50, not a monetary amount, so a regional decimal comma cannot occur */}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{t('settings.dropStatusLabel')}</span>
                    <select
                      value={col.dropTargetStatus || col.statuses[0] || 'draft'}
                      onChange={(e) => handleUpdateColumnField(index, 'dropTargetStatus', e.target.value as ItemStatus)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[180px] truncate"
                    >
                      {col.statuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Status Remapping */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('settings.assignedStatuses', { count: col.statuses.length })}
                    </span>
                    <span className="text-xs text-slate-400">
                      {t('settings.assignedStatusesDesc')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {draggingStatus && draggingStatus.fromColId !== col.id && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 italic animate-pulse">
                        {t('settings.dropHereToMove')}
                      </span>
                    )}
                    {col.statuses.map((st) => (
                      <span
                        key={st}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingStatus({ status: st as ItemStatus, fromColId: col.id });
                        }}
                        onDragEnd={() => { setDraggingStatus(null); setDragOverColId(null); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border shadow-2xs group/st cursor-grab active:cursor-grabbing select-none transition-opacity ${
                          draggingStatus?.status === st && draggingStatus?.fromColId === col.id
                            ? 'opacity-40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20'
                        }`}
                      >
                        <span className="text-indigo-300 dark:text-indigo-600 mr-0.5">⠿</span>
                        <span>{st}</span>
                        {col.statuses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStatusFromColumn(col.id, st)}
                            title={t('settings.removeStatusFromCol', { status: st })}
                            className="p-0.5 rounded text-indigo-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}

                    {/* Add status selector */}
                    <div className="relative inline-flex items-center">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddStatusToColumn(col.id, e.target.value as ItemStatus);
                          }
                        }}
                        className="appearance-none text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-dashed border-indigo-300 dark:border-indigo-500/30 rounded-lg pl-2.5 pr-6 py-1 focus:outline-none transition-colors"
                      >
                        <option value="" disabled>{t('settings.assignStatusPrompt')}</option>
                        <optgroup label={t('settings.canonicalStatusesGroup')}>
                          {ALL_ITEM_STATUSES.filter((s) => !s.isLegacy && !col.statuses.includes(s.id)).map((s) => (
                            <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                              {getStatusMeta(s.id).label} ({s.id}) — {s.desc}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={t('settings.legacyStatusesGroup')}>
                          {ALL_ITEM_STATUSES.filter((s) => s.isLegacy && !col.statuses.includes(s.id)).map((s) => (
                            <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                              {getStatusMeta(s.id).label} ({s.id}) — {s.desc}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <Plus className="w-3 h-3 text-indigo-500 pointer-events-none absolute right-2" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección: Metadatos Visibles en Tarjetas (DEV-203) */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
            {t('settings.cardMetadataTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.cardMetadataDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className={`flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] ${
            !modulesState.sprint ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05]'
          } transition-colors`}>
            <div className="flex items-center gap-1.5 min-w-0 mr-2">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {t('settings.cardMetaSprint')}
              </span>
              {!modulesState.sprint && (
                <span className="text-xs text-slate-400 font-normal shrink-0">
                  {t('settings.cardMetaModuleDisabled')}
                </span>
              )}
            </div>
            <SettingsSwitch
              checked={Boolean(modulesState.sprint && cardMetaState.sprint !== false)}
              disabled={!modulesState.sprint}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, sprint: checked }))}
              ariaLabel={t('settings.cardMetaSprint')}
            />
          </label>

          <label className={`flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] ${
            !modulesState.release ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05]'
          } transition-colors`}>
            <div className="flex items-center gap-1.5 min-w-0 mr-2">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {t('settings.cardMetaRelease')}
              </span>
              {!modulesState.release && (
                <span className="text-xs text-slate-400 font-normal shrink-0">
                  {t('settings.cardMetaModuleDisabled')}
                </span>
              )}
            </div>
            <SettingsSwitch
              checked={Boolean(modulesState.release && cardMetaState.release !== false)}
              disabled={!modulesState.release}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, release: checked }))}
              ariaLabel={t('settings.cardMetaRelease')}
            />
          </label>

          <label className={`flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] ${
            !estimationEnabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05]'
          } transition-colors`}>
            <div className="flex items-center gap-1.5 min-w-0 mr-2">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {t('settings.cardMetaEstimate')}
              </span>
              {!estimationEnabled && (
                <span className="text-xs text-slate-400 font-normal shrink-0">
                  {t('settings.cardMetaModuleDisabled')}
                </span>
              )}
            </div>
            <SettingsSwitch
              checked={Boolean(estimationEnabled && cardMetaState.estimate !== false)}
              disabled={!estimationEnabled}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, estimate: checked }))}
              ariaLabel={t('settings.cardMetaEstimate')}
            />
          </label>

          <label className="flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">
              {t('settings.cardMetaModule')}
            </span>
            <SettingsSwitch
              checked={cardMetaState.module !== false}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, module: checked }))}
              ariaLabel={t('settings.cardMetaModule')}
            />
          </label>

          <label className="flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">
              {t('settings.cardMetaAcProgress')}
            </span>
            <SettingsSwitch
              checked={cardMetaState.acProgress !== false}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, acProgress: checked }))}
              ariaLabel={t('settings.cardMetaAcProgress')}
            />
          </label>

          <label className="flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">
              {t('settings.cardMetaPriority')}
            </span>
            <SettingsSwitch
              checked={cardMetaState.priority !== false}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, priority: checked }))}
              ariaLabel={t('settings.cardMetaPriority')}
            />
          </label>

          <label className="flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">
              {t('settings.cardMetaParent')}
            </span>
            <SettingsSwitch
              checked={cardMetaState.parent !== false}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, parent: checked }))}
              ariaLabel={t('settings.cardMetaParent')}
            />
          </label>

          <label className="flex items-center justify-between min-w-0 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">
              {t('settings.cardMetaBlocked')}
            </span>
            <SettingsSwitch
              checked={cardMetaState.blocked !== false}
              onChange={(checked) => setCardMetaState(prev => ({ ...prev, blocked: checked }))}
              ariaLabel={t('settings.cardMetaBlocked')}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
