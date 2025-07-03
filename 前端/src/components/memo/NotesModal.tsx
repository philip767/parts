
import React, { useState, useCallback, useEffect } from 'react';
import { EnhancedNote, NoteImage } from '../types';
import { LABELS_ZH, MAX_NOTE_IMAGES, MAX_IMAGE_SIZE_MB } from '../constants';
import apiClient from '../apiClient';
import { CloseIcon, ImagePlusIcon, TrashIcon, EyeIcon } from './icons';
import ImagePreviewModal from './ImagePreviewModal';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  partName: string;
  partId: string;
  orderId: string;
  currentNote: EnhancedNote; 
  onDataDidChange: () => Promise<void>; // Callback to signal data change (e.g., image upload/delete)
  onSaveText: (partId: string, newText: string) => Promise<void>; // Callback to save text content
}

const NotesModal: React.FC<NotesModalProps> = ({ 
    isOpen, 
    onClose, 
    partName, 
    partId, 
    orderId, 
    currentNote, 
    onDataDidChange,
    onSaveText
}) => {
  const [text, setText] = useState('');
  // Images state is removed, images are now rendered directly from props.currentNote.images
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen) { 
      setText(currentNote?.text || '');
      // Images are directly from props.currentNote.images, no need to set local state for them.
      setError(null);
    } else {
      // Reset states when modal is not open, useful if it's forced closed by parent
      setIsPreviewModalOpen(false);
      setPreviewImage(null);
      setText(''); // Reset text as well
      setError(null);
      setIsLoading(false);
    }
  }, [currentNote, isOpen]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentImagesCount = currentNote.images?.length || 0;
    if (currentImagesCount + files.length > MAX_NOTE_IMAGES) {
      setError(LABELS_ZH.MAX_IMAGES_REACHED.replace('{maxCount}', MAX_NOTE_IMAGES.toString()));
      event.target.value = ''; 
      return;
    }

    setIsLoading(true);
    let atLeastOneSuccess = false;
    let firstErrorMessage: string | null = null;

    for (const file of Array.from(files)) {
      const currentFile = file as File; // Cast to File
      if (currentFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        if (!firstErrorMessage) firstErrorMessage = LABELS_ZH.IMAGE_TOO_LARGE.replace('{maxSizeMB}', MAX_IMAGE_SIZE_MB.toString()) + ` (${currentFile.name})`;
        continue; 
      }
      if (!currentFile.type.startsWith('image/')) {
        if (!firstErrorMessage) firstErrorMessage = `文件 ${currentFile.name} 不是有效的图片格式。`;
        continue; 
      }

      const formData = new FormData();
      formData.append('noteImage', currentFile); // Now currentFile is correctly typed as File

      try {
        // We don't need the response data directly for state update here anymore
        await apiClient.post(`/orders/${orderId}/parts/${partId}/images`, formData, { 
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        atLeastOneSuccess = true;
      } catch (uploadError: any) {
        // 👇👇👇 添加这行关键的日志 👇👇👇
        console.error("Backend responded with 400 error. Response data:", uploadError.response?.data);
        
        console.error("Image upload failed:", uploadError);
        if (!firstErrorMessage) firstErrorMessage = uploadError.response?.data?.error || `图片 ${currentFile.name} 上传失败。`;
      }
    }
    
    if (firstErrorMessage) {
        setError(firstErrorMessage);
    }

    if (atLeastOneSuccess) {
      try {
        await onDataDidChange(); // Signal parent to refresh data
      } catch (refreshError) {
        console.error("Failed to refresh data after image upload:", refreshError);
        setError("图片已上传，但刷新数据失败。请手动关闭并重新打开备注。");
      }
    }
    
    setIsLoading(false);
    event.target.value = ''; 
  }, [currentNote.images, orderId, partId, onDataDidChange]);

  const handleDeleteImage = async (imageIdToDelete: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.delete(`/orders/${orderId}/parts/${partId}/images/${imageIdToDelete}`);
      await onDataDidChange(); // Signal parent to refresh data
    } catch (deleteError: any) {
      console.error("Image delete failed:", deleteError);
      setError(deleteError.response?.data?.error || "删除图片失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveText = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onSaveText(partId, text); // Pass partId and newText
      onClose(); // Close modal on successful text save
    } catch (saveError: any) {
        console.error("Failed to save note text:", saveError);
        setError(saveError.response?.data?.error || "保存文本备注失败。");
        // Do not close modal if save fails, user might want to retry or copy text
    } finally {
        setIsLoading(false);
    }
  };

  const openImagePreview = (image: NoteImage) => {
    setPreviewImage({ url: image.imageUrl, name: image.imageName });
    setIsPreviewModalOpen(true);
  };

  const closeImagePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImage(null);
  };

  if (!isOpen) return null;

  const imagesToDisplay = currentNote.images || [];

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity z-40 flex items-center justify-center p-4"
        aria-labelledby="notes-modal-title"
        role="dialog"
        aria-modal="true"
        onClick={isLoading ? undefined : onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-300/50"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="px-6 py-4 bg-sky-600 text-white flex justify-between items-center">
            <h2 id="notes-modal-title" className="text-lg sm:text-xl font-semibold truncate pr-4">
              {LABELS_ZH.NOTES_MODAL_TITLE_PREFIX} <span className="font-bold opacity-90">{partName}</span>
            </h2>
            <button
              onClick={isLoading ? undefined : onClose}
              disabled={isLoading}
              className="p-1.5 rounded-full text-slate-100 hover:bg-sky-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
              aria-label={LABELS_ZH.CLOSE_MODAL}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </header>

          <div className="p-6 flex-grow overflow-y-auto fancy-scrollbar space-y-6">
            {error && (
              <div role="alert" className="text-sm text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                {error}
                <button onClick={() => setError(null)} className="ml-2 text-red-700 font-semibold underline text-xs">清除</button>
              </div>
            )}

            <div>
              <label htmlFor="text-note" className="block text-sm font-medium text-slate-700 mb-1.5">{LABELS_ZH.TEXT_NOTE_LABEL}</label>
              <textarea
                id="text-note"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
                placeholder="在此输入文本备注..."
                rows={5}
                className="w-full p-3 border border-slate-300 rounded-lg focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 shadow-sm transition-colors duration-150 ease-in-out bg-white hover:border-slate-400 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">{LABELS_ZH.IMAGE_PREVIEW} ({imagesToDisplay.length}/{MAX_NOTE_IMAGES})</label>
                {(imagesToDisplay.length < MAX_NOTE_IMAGES) && (
                  <label 
                    htmlFor="image-upload-notes" 
                    className={`inline-flex items-center px-4 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${isLoading || imagesToDisplay.length >= MAX_NOTE_IMAGES ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <ImagePlusIcon className="w-4 h-4 mr-1.5" />
                    {LABELS_ZH.ADD_IMAGE}
                  </label>
                )}
                <input 
                  id="image-upload-notes" 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageUpload} 
                  className="hidden"
                  disabled={isLoading || imagesToDisplay.length >= MAX_NOTE_IMAGES}
                />
              </div>

              {imagesToDisplay.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagesToDisplay.map((image) => (
                    <div key={image.id} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden shadow">
                      <img 
                        src={image.imageUrl} 
                        alt={image.imageName} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-1.5 space-y-1.5">
                        <button
                          onClick={() => openImagePreview(image)}
                          disabled={isLoading}
                          className="flex items-center justify-center w-full text-xs py-1.5 px-2 bg-sky-500/80 text-white rounded hover:bg-sky-600/90 transition-colors disabled:opacity-50"
                          title={LABELS_ZH.VIEW_RECYCLED_IMAGE}
                        >
                          <EyeIcon className="w-3.5 h-3.5 mr-1" /> 查看
                        </button>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={isLoading}
                          className="flex items-center justify-center w-full text-xs py-1.5 px-2 bg-red-500/80 text-white rounded hover:bg-red-600/90 transition-colors disabled:opacity-50"
                          title={LABELS_ZH.DELETE_IMAGE}
                        >
                           <TrashIcon className="w-3.5 h-3.5 mr-1" /> 删除
                        </button>
                      </div>
                       <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate text-center group-hover:opacity-0 transition-opacity duration-150" title={image.imageName}>
                        {image.imageName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-center text-slate-500 text-sm py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  {isLoading ? LABELS_ZH.LOADING : LABELS_ZH.NO_IMAGES_UPLOADED}
                </p>
              )}
            </div>
          </div>

          <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200/90 flex justify-end space-x-3">
            <button
              type="button"
              onClick={isLoading ? undefined : onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {LABELS_ZH.CANCEL}
            </button>
            <button
              type="button"
              onClick={handleSaveText}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? LABELS_ZH.LOADING : LABELS_ZH.SAVE_NOTES}
            </button>
          </footer>
        </div>
      </div>
      {previewImage && isPreviewModalOpen && (
        <ImagePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={closeImagePreview}
          imageUrl={previewImage.url}
          imageName={previewImage.name}
        />
      )}
    </>
  );
};

export default NotesModal;
