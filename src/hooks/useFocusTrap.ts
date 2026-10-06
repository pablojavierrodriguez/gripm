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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;

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

      const restoreTo = restoreFocusRef.current;
      restoreFocusRef.current = null;
      // The trigger can be unmounted while the dialog is open (list re-rendered),
      // so only restore when it is still in the document.
      if (restoreTo && restoreTo.isConnected) restoreTo.focus();
    };
  }, [isOpen, handleKeyDown]);

  return containerRef;
};