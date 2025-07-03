
import React, { useEffect, useRef } from 'react';
import { LABELS_ZH } from '../constants';
import { CloseIcon, SpinnerIcon, SearchIcon, EyeIcon } from './icons';

interface BatchStockViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  results: { partNumber: string; partName?: string; stockQuantity: number | 'N/A' | 'Error' }[] | null;
  orderName: string;
  onViewPreciseDetails: (partNumber: string) => void;
}

const BatchStockViewModal: React.FC<BatchStockViewModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  results,
  orderName,
  onViewPreciseDetails,
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

  const title = `${LABELS_ZH.BATCH_STOCK_VIEW_MODAL_TITLE}${orderName})`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity z-40 flex items-center justify-center p-4"
      aria-labelledby="batch-stock-view-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-300/50"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
          <h2 id="batch-stock-view-modal-title" className="text-lg sm:text-xl font-semibold truncate pr-4">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-full text-indigo-100 hover:bg-indigo-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={LABELS_ZH.CLOSE_MODAL}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto fancy-scrollbar">
          {isLoading && (
            <div className="text-center py-10 text-slate-600" aria-live="polite">
              <div role="status" className="inline-flex items-center">
                <SpinnerIcon className="w-8 h-8 mr-3 fill-indigo-600" />
                <span className="text-base font-medium">{LABELS_ZH.BATCH_CHECKING_STOCK}</span>
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
              <p className="text-md font-medium">{LABELS_ZH.NO_PARTS_FOR_BATCH_STOCK}</p>
            </div>
          )}

          {!isLoading && !error && results && results.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200/90 table-auto" aria-label="批量库存查询结果表格">
                <thead className="bg-slate-100/70">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {LABELS_ZH.COLUMN_PART_NUMBER}
                    </th>
                     <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {LABELS_ZH.COLUMN_PART_NAME}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {LABELS_ZH.INVENTORY_STOCK_QUANTITY}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {LABELS_ZH.VIEW_PRECISE_DETAILS_BUTTON}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/90">
                  {results.map((item, index) => (
                    <tr 
                      key={`${item.partNumber}-${index}`} 
                      className={`hover:bg-indigo-50/30 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">
                        {item.partNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {item.partName || <span className="italic text-slate-400">N/A</span>}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                        item.stockQuantity === 'Error' ? 'text-red-600 font-semibold' : 
                        item.stockQuantity === 'N/A' ? 'text-orange-500 italic' : 
                        'text-slate-700'
                      }`}>
                        { String(item.stockQuantity) }
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors shadow-sm"
          >
            {LABELS_ZH.CLOSE_MODAL}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BatchStockViewModal;
