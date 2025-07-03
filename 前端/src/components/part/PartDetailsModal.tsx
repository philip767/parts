import React, { useEffect, useRef } from 'react';
import { LABELS_ZH } from '../constants';
import { CloseIcon, SpinnerIcon } from './icons';

interface PartDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partDetails: Record<string, any> | null;
  isLoading: boolean;
  error: string | null;
  partNumberSearched: string;
}

const PartDetailsModal: React.FC<PartDetailsModalProps> = ({
  isOpen,
  onClose,
  partDetails,
  isLoading,
  error,
  partNumberSearched,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100); 
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = `${LABELS_ZH.PART_DETAILS_MODAL_TITLE_PREFIX}${partNumberSearched}`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity z-50 flex items-center justify-center p-4"
      aria-labelledby="part-details-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-300/50"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="px-6 py-4 bg-sky-700 text-white flex justify-between items-center">
          <h2 id="part-details-modal-title" className="text-lg sm:text-xl font-semibold truncate pr-4">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-100 hover:bg-sky-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={LABELS_ZH.CLOSE_MODAL}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto fancy-scrollbar space-y-4">
          {isLoading && (
            <div className="text-center py-10 text-slate-600" aria-live="polite">
              <div role="status" className="inline-flex items-center">
                <SpinnerIcon className="w-8 h-8 mr-3" />
                <span className="text-base font-medium">{LABELS_ZH.LOADING}...</span>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div role="alert" className="text-sm text-red-700 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm" aria-live="assertive">
              <strong className="font-semibold">{LABELS_ZH.ERROR_FETCHING_PART_DETAILS}</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && !partDetails && (
             <div className="text-center py-10 text-slate-500">
                <p>{LABELS_ZH.NO_PART_DETAILS_AVAILABLE}</p>
            </div>
          )}

          {!isLoading && !error && partDetails && (
            <div>
              <h3 className="text-md font-semibold text-slate-800 mb-3 sr-only">{LABELS_ZH.PART_INFORMATION_LABEL}</h3>
              <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg shadow-sm">
                {Object.entries(partDetails).map(([key, value]) => (
                  <li key={key} className="px-4 py-3 grid grid-cols-3 gap-4 hover:bg-slate-50/50 transition-colors duration-100">
                    <span className="text-sm font-medium text-slate-600 col-span-1 break-words">{key}:</span>
                    <span className="text-sm text-slate-800 col-span-2 break-words">
                      {value === null || value === undefined ? <span className="italic text-slate-400">N/A</span> : String(value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm"
          >
            {LABELS_ZH.CLOSE_MODAL}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PartDetailsModal;
