
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LABELS_ZH } from '../constants';
import { CloseIcon, KeyIcon, ClipboardIcon, CheckIcon } from './icons';

interface PostRegistrationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  passwordHint: string;
}

const PostRegistrationInfoModal: React.FC<PostRegistrationInfoModalProps> = ({ isOpen, onClose, email, passwordHint }) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false); // Reset copy state when modal opens
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(email).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }, (err) => {
      console.error('Could not copy text: ', err);
      // Optionally, show an error message to the user
    });
  }, [email]);

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

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity z-50 flex items-center justify-center p-4"
      aria-labelledby="reg-info-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-lg w-full border border-slate-300/50"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="px-6 py-4 bg-teal-600 text-white flex justify-between items-center">
          <h2 id="reg-info-modal-title" className="text-lg sm:text-xl font-semibold">
            {LABELS_ZH.POST_REGISTRATION_TITLE}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-teal-100 hover:bg-teal-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={LABELS_ZH.CLOSE_MODAL}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600">{LABELS_ZH.POST_REGISTRATION_INSTRUCTIONS}</p>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{LABELS_ZH.POST_REGISTRATION_EMAIL_LABEL}</label>
              <div className="flex items-center gap-2">
                <p className="flex-grow min-w-0 text-lg font-semibold text-sky-800 bg-sky-100/70 p-3 rounded-lg border border-sky-200 break-all">
                    {email}
                </p>
                <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center justify-center px-3 py-3 rounded-lg transition-all duration-200 ease-in-out shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                        isCopied
                        ? 'bg-emerald-500 text-white border-emerald-600 focus-visible:ring-emerald-500'
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 hover:border-slate-400 focus-visible:ring-slate-500'
                    }`}
                    aria-live="polite"
                    aria-label={isCopied ? '邮箱地址已复制' : '复制邮箱地址'}
                >
                    {isCopied ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
                    <span className="sr-only">{isCopied ? LABELS_ZH.COPIED_BUTTON : LABELS_ZH.COPY_BUTTON}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{LABELS_ZH.POST_REGISTRATION_PASSWORD_HINT_LABEL}</label>
              <div className="flex items-center mt-1 text-lg font-semibold text-emerald-800 bg-emerald-100/60 p-3 rounded-lg border border-emerald-200">
                <KeyIcon className="w-6 h-6 mr-3 text-emerald-600 flex-shrink-0" />
                <p>{passwordHint}</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200/90 flex justify-end">
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-base font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm"
          >
            {LABELS_ZH.POST_REGISTRATION_CONFIRM_BUTTON}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PostRegistrationInfoModal;
