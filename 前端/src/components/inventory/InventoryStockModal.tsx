import React, { useEffect, useRef } from 'react';
import { InventorySearchResult } from '../types';
import { LABELS_ZH } from '../constants';
import { CloseIcon, SpinnerIcon, SearchIcon, EyeIcon } from './icons'; // Added EyeIcon

interface InventoryStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  results: InventorySearchResult[] | null;
  searchedPartNumber: string | null;
  searchedPartName?: string | null; // Optional part name for context
  onViewPreciseDetails: (partNumber: string) => void; // New prop
}

const InventoryStockModal: React.FC<InventoryStockModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  results,
  searchedPartNumber,
  searchedPartName,
  onViewPreciseDetails, // New prop
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100); // Focus after transition
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

  const title = `${LABELS_ZH.STOCK_CHECK_MODAL_TITLE_PREFIX}${searchedPartNumber || ''}${searchedPartName ? ` (${searchedPartName})` : ''}`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity z-40 flex items-center justify-center p-4"
      aria-labelledby="stock-check-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-300/50"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="px-6 py-4 bg-sky-600 text-white flex justify-between items-center">
          <h2 id="stock-check-modal-title" className="text-lg sm:text-xl font-semibold truncate pr-4">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-100 hover:bg-sky-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={LABELS_ZH.CLOSE_MODAL}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto fancy-scrollbar">
          {isLoading && (
            <div className="text-center py-10 text-slate-600" aria-live="polite">
              <div role="status" className="inline-flex items-center">
                <SpinnerIcon className="w-8 h-8 mr-3" />
                <span className="text-base font-medium">{LABELS_ZH.SEARCHING_BUTTON}</span>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div role="alert" className="text-sm text-red-700 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm" aria-live="assertive">
              <strong className="font-semibold">错误：</strong>{error}
            </div>
          )}

          {!isLoading && !error && (!results || results.length === 0) && (
            <div className="text-center py-10 text-slate-500" aria-live="polite">
                <SearchIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" aria-hidden="true" />
                <p className="text-md font-medium">{LABELS_ZH.NO_SIMILAR_PARTS_FOUND}</p>
            </div>
          )}

          {!isLoading && !error && results && results.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200/90" aria-label="库存查询结果表格">
                <thead className="bg-slate-100/70">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {LABELS_ZH.COLUMN_PART_NUMBER}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {LABELS_ZH.INVENTORY_STOCK_QUANTITY}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {LABELS_ZH.COLUMN_ACTIONS}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/90">
                  {results.map((item, index) => {
                    const isExactMatch = item.partNumber === searchedPartNumber;
                    return (
                      <tr 
                        key={`${item.partNumber}-${index}`} 
                        className={`hover:bg-sky-50/30 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${isExactMatch ? 'ring-2 ring-sky-500 ring-inset' : ''}`}
                        aria-current={isExactMatch ? "true" : undefined}
                      >
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-slate-700 ${isExactMatch ? 'font-bold text-sky-600' : ''}`}>
                          {item.partNumber}
                          {isExactMatch && <span className="ml-2 text-xs text-sky-500 font-normal">{LABELS_ZH.MATCHED_PART_LABEL}</span>}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-slate-700 ${isExactMatch ? 'font-bold' : ''}`}>
                          {item.stockQuantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => onViewPreciseDetails(item.partNumber)}
                            className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-100 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
                            title={LABELS_ZH.VIEW_PRECISE_DETAILS_BUTTON}
                            aria-label={`${LABELS_ZH.VIEW_PRECISE_DETAILS_BUTTON} for ${item.partNumber}`}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

export default InventoryStockModal;