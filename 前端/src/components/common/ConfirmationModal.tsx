
import React, { useEffect, useRef, useState } from 'react';
import { LABELS_ZH } from '../constants';
import { CloseIcon } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void; 
  title: string;
  message: React.ReactNode; 
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && confirmButtonRef.current && !isConfirming) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen, isConfirming]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirming) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isConfirming]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (e) {
      console.error("Confirmation action failed:", e);
      // Parent component should handle displaying errors related to the confirm action.
    } finally {
      setIsConfirming(false);
      onClose(); // Always close modal after confirm action is done (success or fail).
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity z-50 flex items-center justify-center p-4"
      aria-labelledby="confirmation-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={isConfirming ? undefined : onClose} // Prevent close on backdrop click when confirming
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-lg w-full border border-slate-300/50"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 id="confirmation-modal-title" className="text-lg sm:text-xl font-semibold text-slate-800">
            {title}
          </h2>
          <button
            onClick={isConfirming ? undefined : onClose}
            disabled={isConfirming}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
            aria-label={LABELS_ZH.CLOSE_MODAL}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 text-sm text-slate-600 leading-relaxed">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200/90 flex justify-end space-x-3">
          <button
            type="button"
            onClick={isConfirming ? undefined : onClose}
            disabled={isConfirming}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm disabled:opacity-50"
          >
            {LABELS_ZH.CANCEL}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-5 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm disabled:opacity-50"
          >
            {isConfirming ? LABELS_ZH.LOADING : LABELS_ZH.CONFIRM}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmationModal;