import { useState } from 'react';
import type { CustomItemTypeConfig, GripmConfig } from '../../types';
import { ITEM_TYPE_COLOR_PRESETS } from '../SettingsView';

export interface UseTaxonomyCustomizationProps {
  config: GripmConfig;
  onShowToast?: (msg: string, type?: any) => void;
  t: any;
}

export function useTaxonomyCustomization({ config, onShowToast, t }: UseTaxonomyCustomizationProps) {
  const [customItemTypes, setCustomItemTypes] = useState<CustomItemTypeConfig[]>(() => {
    if (config.customItemTypes && config.customItemTypes.length > 0) {
      return JSON.parse(JSON.stringify(config.customItemTypes));
    }
    return [];
  });

  const [editingTypeKey, setEditingTypeKey] = useState<string | null>(null);
  const [typeFormKey, setTypeFormKey] = useState('');
  const [typeFormLabel, setTypeFormLabel] = useState('');
  const [typeFormColorPreset, setTypeFormColorPreset] = useState('indigo');
  const [typeFormIcon, setTypeFormIcon] = useState('Sparkles');
  const [typeFormDescription, setTypeFormDescription] = useState('');

  const handleAddOrUpdateType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = typeFormKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanKey) {
      onShowToast?.(t('settings.toastKeyInvalid'), 'error');
      return;
    }
    if (!typeFormLabel.trim()) {
      onShowToast?.(t('settings.toastLabelInvalid'), 'error');
      return;
    }
    const systemKeys = ['bug', 'feature', 'tech_debt', 'ux', 'epic', 'initiative'];
    if (systemKeys.includes(cleanKey)) {
      onShowToast?.(t('settings.toastKeyReserved', { key: cleanKey }), 'error');
      return;
    }
    if (editingTypeKey !== cleanKey && customItemTypes.some((it) => it.key === cleanKey)) {
      onShowToast?.(t('settings.toastKeyExists', { key: cleanKey }), 'error');
      return;
    }

    const preset = ITEM_TYPE_COLOR_PRESETS.find((p) => p.id === typeFormColorPreset) || ITEM_TYPE_COLOR_PRESETS[0];

    const typeConfigItem: CustomItemTypeConfig = {
      key: cleanKey,
      label: typeFormLabel.trim(),
      color: preset.color,
      badge: preset.badge,
      dotColor: preset.dotColor,
      iconName: typeFormIcon,
      description: typeFormDescription.trim() || undefined,
    };

    if (editingTypeKey) {
      setCustomItemTypes((prev) => prev.map((it) => (it.key === editingTypeKey ? typeConfigItem : it)));
      onShowToast?.(t('settings.toastTypeUpdated', { label: typeConfigItem.label }), 'success');
      setEditingTypeKey(null);
    } else {
      setCustomItemTypes((prev) => [...prev, typeConfigItem]);
      onShowToast?.(t('settings.toastTypeCreated', { label: typeConfigItem.label }), 'success');
    }

    setTypeFormKey('');
    setTypeFormLabel('');
    setTypeFormColorPreset('indigo');
    setTypeFormIcon('Sparkles');
    setTypeFormDescription('');
  };

  const handleStartEditType = (typeItem: CustomItemTypeConfig) => {
    setEditingTypeKey(typeItem.key);
    setTypeFormKey(typeItem.key);
    setTypeFormLabel(typeItem.label);
    const matchedPreset = ITEM_TYPE_COLOR_PRESETS.find((p) => p.color === typeItem.color) || ITEM_TYPE_COLOR_PRESETS[0];
    setTypeFormColorPreset(matchedPreset.id);
    setTypeFormIcon(typeItem.iconName || 'Sparkles');
    setTypeFormDescription(typeItem.description || '');
  };

  const handleCancelEditType = () => {
    setEditingTypeKey(null);
    setTypeFormKey('');
    setTypeFormLabel('');
    setTypeFormColorPreset('indigo');
    setTypeFormIcon('Sparkles');
    setTypeFormDescription('');
  };

  const handleDeleteType = (key: string) => {
    setCustomItemTypes((prev) => prev.filter((it) => it.key !== key));
    if (editingTypeKey === key) {
      handleCancelEditType();
    }
    onShowToast?.(t('settings.toastTypeDeleted'), 'info');
  };

  const syncTaxonomyFromConfig = (cfg: GripmConfig) => {
    if (cfg.customItemTypes && cfg.customItemTypes.length > 0) {
      setCustomItemTypes(JSON.parse(JSON.stringify(cfg.customItemTypes)));
    } else {
      setCustomItemTypes([]);
    }
    handleCancelEditType();
  };

  return {
    customItemTypes,
    setCustomItemTypes,
    editingTypeKey,
    typeFormKey,
    setTypeFormKey,
    typeFormLabel,
    setTypeFormLabel,
    typeFormColorPreset,
    setTypeFormColorPreset,
    typeFormIcon,
    setTypeFormIcon,
    typeFormDescription,
    setTypeFormDescription,
    handleAddOrUpdateType,
    handleStartEditType,
    handleCancelEditType,
    handleDeleteType,
    syncTaxonomyFromConfig,
  };
}
