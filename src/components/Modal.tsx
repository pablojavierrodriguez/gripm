import React, { type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelRef?: React.Ref<HTMLDivElement> | React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  backdropClassName?: string;
  showMobileHandle?: boolean;
  align?: 'center' | 'bottom';
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

/**
 * Primitivo Modal Accesible (DEV-234, ARCH-06, BUG-16).
 *
 * Encapsula:
 * - Montaje incondicional en `document.body` mediante `createPortal` (inmune a transform / containing block).
 * - Semántica accesible: role="dialog", aria-modal="true", tabIndex={-1}.
 * - Backdrop con blur y cierre al click fuera del panel.
 * - Manija táctil en vista móvil para modales tipo bottom-sheet.
 */
export const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  panelRef,
  children,
  maxWidth = 'max-w-lg',
  className = '',
  backdropClassName = '',
  showMobileHandle = true,
  align = 'bottom',
  ariaLabel,
  ariaLabelledBy,
}) => {
  if (!isOpen) return null;

  const alignClass = align === 'bottom'
    ? 'items-end sm:items-center p-0 sm:p-4'
    : 'items-center p-4';

  const roundedClass = align === 'bottom'
    ? 'rounded-t-2xl sm:rounded-2xl border-t sm:border'
    : 'rounded-2xl border';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 ${alignClass} ${backdropClassName}`}
      onClick={onClose}
    >
      <div
        ref={panelRef as React.LegacyRef<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`w-full ${maxWidth} glass-panel bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col ${roundedClass} border-slate-200 dark:border-white/10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showMobileHandle && (
          <div className="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
