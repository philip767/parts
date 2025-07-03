import React, { useState, useCallback } from 'react';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { UploadIcon, SpinnerIcon } from './icons';

const QuoteHistoryUpload: React.FC = () => {
    const [customerName, setCustomerName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccessMessage(null);
        const file = event.target.files?.[0] || null;
        if (file) {
            const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            const validExtensions = ['.xls', '.xlsx'];
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

            if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
                 setSelectedFile(file);
            } else {
                setError("文件格式不正确，请选择 .xls 或 .xlsx 文件。");
                setSelectedFile(null);
                event.target.value = '';
            }
        } else {
            setSelectedFile(null);
        }
    };
    
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedFile || !customerName.trim() || isLoading) {
            if (!customerName.trim()) setError("客户名称不能为空。");
            if (!selectedFile) setError("请选择一个报价文件。");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append('quoteFile', selectedFile);
        formData.append('customerName', customerName.trim());

        try {
            const response = await apiClient.post<{ message: string }>('/quotes/upload-history', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccessMessage(response.data.message || LABELS_ZH.UPLOAD_QUOTE_SUCCESS);
            setCustomerName('');
            setSelectedFile(null);
            // Manually reset the file input visually
            const fileInput = document.getElementById('quote-file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (err: any) {
            console.error("Quote upload failed:", err);
            setError(err.response?.data?.error || LABELS_ZH.UPLOAD_QUOTE_ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
            <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.UPLOAD_HISTORY_TITLE}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="customer-name" className="block text-sm font-medium text-slate-700 mb-1.5">{LABELS_ZH.CUSTOMER_NAME_LABEL}</label>
                    <input
                        id="customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={LABELS_ZH.CUSTOMER_NAME_PLACEHOLDER}
                        required
                        disabled={isLoading}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div>
                     <label htmlFor="quote-file-upload" className="block text-sm font-medium text-slate-700 mb-1.5">{LABELS_ZH.QUOTE_FILE_LABEL}</label>
                     <input 
                        id="quote-file-upload" 
                        type="file" 
                        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                        onChange={handleFileChange} 
                        disabled={isLoading}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50"
                    />
                    <p className="mt-2 text-xs text-slate-500">{LABELS_ZH.QUOTE_FILE_NOTE}</p>
                </div>
                
                {error && (
                    <div role="alert" className="text-sm text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div role="status" className="text-sm text-green-700 p-3 bg-green-50 border border-green-200 rounded-lg">
                        {successMessage}
                    </div>
                )}
                
                <button
                    type="submit"
                    disabled={isLoading || !selectedFile || !customerName.trim()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <UploadIcon className="w-5 h-5" />}
                    <span className="ml-2">{isLoading ? LABELS_ZH.UPLOADING_QUOTE_FILE : LABELS_ZH.UPLOAD_QUOTE_FILE_BUTTON}</span>
                </button>
            </form>
        </div>
    );
};

export default QuoteHistoryUpload;
