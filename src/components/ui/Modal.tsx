import React, { useEffect, useRef } from 'react';
import { AccentColor } from './FormSection';

const buttonColorMap: Record<AccentColor, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  rose: 'bg-rose-600 hover:bg-rose-700 text-white',
  amber: 'bg-amber-600 hover:bg-amber-700 text-white',
  teal: 'bg-teal-600 hover:bg-teal-700 text-white',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  zinc: 'bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900',
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  headerControls?: React.ReactNode;
  footerControls?: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  isReadonly?: boolean;
  isSubmitDisabled?: boolean;
  maxWidth?: string;
  accentColor?: AccentColor;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerControls,
  footerControls,
  children,
  onSubmit,
  submitText = 'Save Changes',
  cancelText = 'Cancel',
  isReadonly = false,
  isSubmitDisabled = false,
  maxWidth = 'max-w-2xl',
  accentColor = 'blue',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep onCloseRef updated but don't trigger effects when it changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Only perform initial focus once when the modal opens
      if (!hasFocusedRef.current) {
        setTimeout(() => {
          // Focus the first input/button that is NOT the close button in the header
          const firstInput = modalRef.current?.querySelector(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([aria-label="Close modal"]):not([disabled])'
          ) as HTMLElement;
          
          if (firstInput) {
            firstInput.focus();
          }
          hasFocusedRef.current = true;
        }, 0);
      }
    } else {
      // Reset the focus flag when the modal is closed
      hasFocusedRef.current = false;
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[75vh] md:max-h-[90vh] mb-20 md:mb-0`}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div id="modal-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex-1">
            {title}
          </div>
          <div className="flex items-center gap-4">
            {headerControls}
            <button 
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {onSubmit ? (
            <form id="generic-modal-form" onSubmit={onSubmit} className="space-y-8">
              {children}
            </form>
          ) : (
            <div className="space-y-8">
              {children}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            {footerControls}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors"
            >
              {isReadonly ? 'Close' : cancelText}
            </button>
            {!isReadonly && onSubmit && (
              <button
                type="submit"
                form="generic-modal-form"
                disabled={isSubmitDisabled}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${buttonColorMap[accentColor] || buttonColorMap.blue}`}
              >
                {submitText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
