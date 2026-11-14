import { useEffect } from 'react';
import type { ActiveTab, GripmConfig } from '../types';
import { hasActiveFocusTrap } from './useFocusTrap';

interface UseKeyboardShortcutsParams {
  config?: GripmConfig;
  isKanbanTabEnabled: boolean;
  isSprintTabEnabled: boolean;
  isReleaseTabEnabled: boolean;
  hasOpenModal: boolean;
  onOpenCommandPalette: () => void;
  onToggleSettingsTab: () => void;
  onOpenShortcuts: () => void;
  onNewItem: () => void;
  onSelectTab: (tab: ActiveTab) => void;
}

export function useKeyboardShortcuts({
  config,
  isKanbanTabEnabled,
  isSprintTabEnabled,
  isReleaseTabEnabled,
  hasOpenModal,
  onOpenCommandPalette,
  onToggleSettingsTab,
  onOpenShortcuts,
  onNewItem,
  onSelectTab
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onOpenCommandPalette();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        onToggleSettingsTab();
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.isContentEditable ||
        Boolean(target.closest('button, input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      if (hasActiveFocusTrap() || hasOpenModal) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onOpenShortcuts();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewItem();
      } else if (e.key === '1') {
        if (isKanbanTabEnabled) onSelectTab('kanban');
      } else if (e.key === '2') {
        if (isSprintTabEnabled) onSelectTab('sprint');
      } else if (e.key === '3') {
        if (isReleaseTabEnabled) onSelectTab('release');
      } else if (e.key === '4') {
        onSelectTab('trash');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    config,
    isKanbanTabEnabled,
    isSprintTabEnabled,
    isReleaseTabEnabled,
    hasOpenModal,
    onOpenCommandPalette,
    onToggleSettingsTab,
    onOpenShortcuts,
    onNewItem,
    onSelectTab
  ]);
}
