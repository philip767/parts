
import React, { useEffect, useRef } from 'react';
import { LABELS_ZH } from '../constants';
import { CloseIcon, DownloadIcon } from './icons';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string; 
  imageName: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, imageName }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && modalRef.current) {
        // Basic focus trap
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>( // Specify HTMLElement
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el: HTMLElement) => el.offsetParent !== null); // Explicitly type el

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement; // Cast to HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement; // Cast to HTMLElement

        if (event.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Delay focus slightly to ensure modal is fully rendered and transition complete
      setTimeout(() => closeButtonRef.current?.focus(), 100); 
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageName || 'image';
    // For cross-origin images, `target="_blank"` might be necessary if direct download is blocked.
    // However, for direct download attribute to work reliably, ensure proper CORS headers (Content-Disposition) are set on the server serving the image.
    link.target = "_blank"; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity z-50 flex items-center justify-center p-4"
      aria-labelledby="image-preview-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose} 
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300/50"
        onClick={(e) => e.stopPropagation()} 
        role="document"
      >
        <header className="px-6 py-3 bg-slate-700 text-white flex justify-between items-center">
          <h2 id="image-preview-modal-title" className="text-lg font-semibold truncate pr-4">
            {LABELS_ZH.IMAGE_PREVIEW_TITLE}: <span className="opacity-80 font-normal">{imageName}</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center p-2 rounded-md text-slate-100 hover:bg-slate-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title={LABELS_ZH.DOWNLOAD_IMAGE}
              aria-label={LABELS_ZH.DOWNLOAD_IMAGE}
            >
              <DownloadIcon className="w-5 h-5 mr-1.5" />
              <span className="text-sm font-medium">{LABELS_ZH.DOWNLOAD_IMAGE}</span>
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-100 hover:bg-slate-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={LABELS_ZH.CLOSE_MODAL}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-4 flex-grow flex items-center justify-center bg-slate-100/50 overflow-auto">
          <img 
            src={imageUrl} 
            alt={imageName} 
            className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-md shadow-lg"
            aria-describedby="image-preview-modal-title"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
