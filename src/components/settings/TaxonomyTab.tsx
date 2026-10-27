import React from 'react';
import { Tag, Edit2, Trash2, Plus, Check } from 'lucide-react';
import type { CustomItemTypeConfig } from '../../types';
import { ITEM_TYPE_COLOR_PRESETS, AVAILABLE_CUSTOM_ICONS } from '../SettingsView';
import { getIconByName } from '../ItemCard';
import { useTranslation } from '../../utils/i18n';

export interface TaxonomyTabProps {
  customItemTypes: CustomItemTypeConfig[];
  editingTypeKey: string | null;
  typeFormKey: string;
  setTypeFormKey: (v: string) => void;
  typeFormLabel: string;
  setTypeFormLabel: (v: string) => void;
  typeFormIcon: string;
  setTypeFormIcon: (v: string) => void;
  typeFormColorPreset: string;
  setTypeFormColorPreset: (v: string) => void;
  typeFormDescription: string;
  setTypeFormDescription: (v: string) => void;
  handleStartEditType: (itemType: CustomItemTypeConfig) => void;
  handleDeleteType: (key: string) => void;
  handleAddOrUpdateType: (e: React.FormEvent) => void;
  handleCancelEditType: () => void;
}

export const TaxonomyTab: React.FC<TaxonomyTabProps> = ({
  customItemTypes,
  editingTypeKey,
  typeFormKey,
  setTypeFormKey,
  typeFormLabel,
  setTypeFormLabel,
  typeFormIcon,
  setTypeFormIcon,
  typeFormColorPreset,
  setTypeFormColorPreset,
  typeFormDescription,
  setTypeFormDescription,
  handleStartEditType,
  handleDeleteType,
  handleAddOrUpdateType,
  handleCancelEditType,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-500" />
          <span>{t('settings.taxonomyTitle')}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.taxonomyDesc')}
        </p>
      </div>

      {/* Sección 1: Tipos del Sistema (Nativos) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('settings.systemTypesTitle')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('settings.systemTypesDesc')}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
            {t('settings.baseTypesCount')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'feature', label: 'Feature', desc: 'Nueva funcionalidad o entrega de valor', icon: '🚀', badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-300' },
            { key: 'bug', label: 'Bug', desc: 'Defecto, error o comportamiento anómalo', icon: '🐛', badge: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300' },
            { key: 'tech_debt', label: 'Tech Debt', desc: 'Refactor, optimización o mantenimiento', icon: '🛠️', badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300' },
            { key: 'ux', label: 'UX/UI', desc: 'Diseño visual, prototipado y accesibilidad', icon: '🎨', badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300' },
            { key: 'epic', label: 'Epic', desc: 'Gran iniciativa que agrupa historias y tareas', icon: '📚', badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' },
            { key: 'initiative', label: 'Initiative', desc: 'Objetivo estratégico o hito de alto nivel', icon: '⚡', badge: 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300' },
          ].map((sys) => (
            <div key={sys.key} className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
              <div className="text-xl shrink-0 mt-0.5">{sys.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sys.badge}`}>
                    {sys.label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">({sys.key})</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {sys.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 2: Tipos Personalizados */}
      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('settings.customTypesTitle', { count: customItemTypes.length })}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('settings.customTypesDesc')}
            </p>
          </div>
        </div>

        {customItemTypes.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-1">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {t('settings.noCustomTypes')}
            </p>
            <p className="text-[11px] text-slate-400">
              {t('settings.noCustomTypesHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customItemTypes.map((itemType) => {
              const IconComp = getIconByName(itemType.iconName);
              const isEditingThis = editingTypeKey === itemType.key;
              return (
                <div
                  key={itemType.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isEditingThis
                      ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] hover:border-slate-300 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                        <IconComp className={`w-4 h-4 ${itemType.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${itemType.badge}`}>
                            <IconComp className="w-3 h-3" />
                            <span>{itemType.label}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            clave: <span className="text-slate-600 dark:text-slate-300 font-semibold">{itemType.key}</span>
                          </span>
                        </div>
                        {itemType.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {itemType.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditType(itemType)}
                        title={t('common.edit')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(itemType.key)}
                        title={t('common.delete')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección 3: Formulario Crear / Editar Tipo */}
      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            {editingTypeKey ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
            <span>{editingTypeKey ? t('settings.editTypeTitle', { name: typeFormLabel || editingTypeKey }) : t('settings.createTypeTitle')}</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('settings.typeFormDesc')}
          </p>
        </div>

        <form onSubmit={handleAddOrUpdateType} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Clave Identificadora */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.typeKeyLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={typeFormKey}
                disabled={!!editingTypeKey}
                onChange={(e) => setTypeFormKey(e.target.value)}
                placeholder={t('settings.customTypeKeyPlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t('settings.typeKeyHelp')}
              </p>
            </div>

            {/* Nombre Legible */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.typeVisibleLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={typeFormLabel}
                onChange={(e) => setTypeFormLabel(e.target.value)}
                placeholder={t('settings.customTypePlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t('settings.typeVisibleHelp')}
              </p>
            </div>
          </div>

          {/* Icono & Paleta de Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Selector de Icono */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.typeIconLabel')}
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 max-h-32 overflow-y-auto">
                {AVAILABLE_CUSTOM_ICONS.map((iconName) => {
                  const IconComp = getIconByName(iconName);
                  const isSelected = typeFormIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setTypeFormIcon(iconName)}
                      title={iconName}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs scale-105'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paleta de Color Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.typeColorLabel')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ITEM_TYPE_COLOR_PRESETS.map((preset) => {
                  const isSelected = typeFormColorPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTypeFormColorPreset(preset.id)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 font-bold ring-1 ring-indigo-500 text-indigo-900 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${preset.dotColor}`} />
                      <span className="truncate">{preset.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Descripción Opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.typeDescLabel')}
            </label>
            <input
              type="text"
              value={typeFormDescription}
              onChange={(e) => setTypeFormDescription(e.target.value)}
              placeholder={t('settings.typeDescPlaceholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Vista Previa en Vivo */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('settings.badgePreview')}
            </span>
            {(() => {
              const selPreset = ITEM_TYPE_COLOR_PRESETS.find(p => p.id === typeFormColorPreset) || ITEM_TYPE_COLOR_PRESETS[0];
              const PreviewIcon = getIconByName(typeFormIcon);
              return (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${selPreset.badge}`}>
                    <PreviewIcon className="w-3.5 h-3.5" />
                    <span>{typeFormLabel.trim() || 'Tipo de Muestra'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    [{typeFormKey.trim() || 'slug'}]
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {editingTypeKey && (
              <button
                type="button"
                onClick={handleCancelEditType}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
              >
                {t('settings.cancelEdit')}
              </button>
            )}
            <button
              type="submit"
              aria-label={editingTypeKey ? t('settings.updateTypeBtn') : t('settings.addTypeBtn')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-[0.98]"
            >
              {editingTypeKey ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingTypeKey ? t('settings.updateTypeBtn') : t('settings.addTypeBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
