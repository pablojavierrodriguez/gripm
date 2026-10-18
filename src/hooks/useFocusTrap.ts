import { useCallback, useEffect, useRef } from 'react';

/**
 * Elements that can receive focus, in DOM order.
 *
 * `[tabindex]:not([tabindex="-1"])` keeps programmatically focusable containers in
 * the cycle; `[disabled]` and `[hidden]` are excluded because focusing them is a
 * no-op that would strand the keyboard user on a dead stop.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isVisible = (element: HTMLElement): boolean => {
  if (element.hasAttribute('inert')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  // offsetParent is null for display:none, but also for position:fixed elements,
  // which every modal panel is, so fall back to the box dimensions.
  return element.offsetParent !== null || element.getClientRects().length > 0;
};

const focusableWithin = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);

/**
 * Global stack of active focus trap instances (DEV-305).
 * Only the topmost trap handles Escape and Tab events to prevent
 * multiple nested modals from closing simultaneously.
 */
export interface FocusTrapEntry {
  id: symbol;
  container: HTMLElement | null;
}

export const activeTraps: FocusTrapEntry[] = [];

export const hasActiveFocusTrap = (): boolean => activeTraps.length > 0;

/**
 * Traps keyboard focus inside an open overlay and restores it on close (DEV-173).
 *
 * Without this, Tab walks out of the dialog into the page behind it, so a keyboard
 * user ends up interacting with an interface they cannot see and cannot escape.
 *
 * Responsibilities:
 *  - move focus into the dialog on open (first control, else the container itself)
 *  - cycle Tab and Shift+Tab inside it
 *  - call `onClose` on Escape
 *  - return focus to whatever was focused before the dialog opened
 *
 * The caller owns the `role="dialog"` / `aria-modal` contract; this hook owns focus.
 */
export const useFocusTrap = <T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void
) => {
  const containerRef = useRef<T | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const trapInstanceRef = useRef<FocusTrapEntry>({
    id: Symbol('focus-trap'),
    get container() {
      return containerRef.current;
    },
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only the topmost trap on the stack handles Escape and Tab (DEV-305)
      const isTopmost = activeTraps[activeTraps.length - 1] === trapInstanceRef.current;
      if (!isTopmost) return;

      if (event.key === 'Escape') {
        if (onClose) {
          event.preventDefault();
          event.stopImmediatePropagation();
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      event.stopImmediatePropagation();

      const container = containerRef.current;
      if (!container) return;

      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        // Nothing to move to: keep focus on the dialog itself.
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const currentTrap = trapInstanceRef.current;
    activeTraps.push(currentTrap);

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Defer so the dialog has painted before we measure focusable children.
    const frame = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const focusable = focusableWithin(containerRef.current);
      (focusable[0] ?? containerRef.current)?.focus();
    });

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown, true);

      const trapIdx = activeTraps.indexOf(currentTrap);
      if (trapIdx !== -1) {
        activeTraps.splice(trapIdx, 1);
      }

      const restoreTo = restoreFocusRef.current;
      restoreFocusRef.current = null;
      // The trigger can be unmounted while the dialog is open (list re-rendered),
      // so only restore when it is still in the document.
      if (restoreTo && restoreTo.isConnected) restoreTo.focus();
    };
  }, [isOpen, handleKeyDown]);

  return containerRef;
};