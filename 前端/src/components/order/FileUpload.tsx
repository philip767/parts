
import React, { useState, useCallback } from 'react';
import { LABELS_ZH } from '../constants';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onOrderUploaded: (file: File) => Promise<void>; // Make it async to await parent
}

const FileUpload: React.FC<FileUploadProps> = ({ onOrderUploaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileNameDisplay, setFileNameDisplay] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileNameDisplay(null);
    const fileInput = event.target; // Store reference to input
    const file = fileInput.files?.[0];
    
    if (!file) {
      fileInput.value = ''; 
      return;
    }

    setFileNameDisplay(file.name);

    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
      setError('请上传 TXT 格式的文件。');
      fileInput.value = ''; 
      setFileNameDisplay(null);
      return;
    }

    setIsUploading(true);
    try {
      await onOrderUploaded(file); 
      // Assuming parent (App.tsx) handles displaying success or errors globally
      // For immediate feedback here:
      setFileNameDisplay(`${file.name} - ${LABELS_ZH.SUCCESS_ORDER_UPLOADED}`); 
    } catch (uploadError: any) {
      // Error is primarily handled and displayed by App.tsx (setDataError)
      // This setError here can be a local fallback if needed, but App.tsx is the source of truth for API errors.
      setError(uploadError.message || LABELS_ZH.ERROR_FILE_READ);
      setFileNameDisplay(null); // Clear filename on error
    } finally {
      setIsUploading(false);
      fileInput.value = ''; // Reset file input so the same file can be selected again
      // Optionally clear fileNameDisplay after a delay, or let the next interaction clear it.
      // setTimeout(() => { if (!error) setFileNameDisplay(null); }, 5000); 
    }
  }, [onOrderUploaded]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.UPLOAD_TITLE}</h2>
      <div className="mb-6">
        <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <UploadIcon className="w-5 h-5 mr-2.5" />
          <span className="text-sm font-medium">{isUploading ? LABELS_ZH.LOADING : LABELS_ZH.UPLOAD_FILE}</span>
        </label>
        <input id="file-upload" type="file" accept=".txt,text/plain" onChange={handleFileChange} className="hidden" disabled={isUploading} />
        {fileNameDisplay && !error && <span className="ml-4 text-sm text-slate-600 italic">{fileNameDisplay}</span>}
      </div>
      <p className="text-sm text-slate-500 mb-6">{LABELS_ZH.FILE_FORMAT_NOTE}</p>
      {error && (
        <div role="alert" className="text-sm text-red-700 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <strong className="font-semibold">错误：</strong>{error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;