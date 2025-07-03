import React, { useState, useCallback } from 'react';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { QuoteInquiry } from '../types';
import { DocumentTextIcon, SpinnerIcon } from './icons';

const QuoteBatchInquiry: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = event.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            return;
        }

        const validExtensions = ['.xls', '.xlsx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            setError("文件格式不正确，请选择 .xls 或 .xlsx 文件。");
            setSelectedFile(null);
            event.target.value = '';
        } else {
            setSelectedFile(file);
        }
    };
    
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedFile || !customerName.trim() || isLoading) {
            if (!customerName.trim()) setError("报价客户名称不能为空。");
            if (!selectedFile) setError("请选择一个包含零件号的Excel文件。");
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('partNumbersFile', selectedFile!);
        formData.append('customerName', customerName.trim());

        try {
            const response = await apiClient.post<QuoteInquiry>('/quote-inquiries/upload-and-save', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            const newInquiryData = response.data;
            console.log('[QUOTE BATCH INQUIRY] Response from creation:', newInquiryData);

            const newInquiryId = newInquiryData?.id;

            if (newInquiryId) {
                // Robustness check for items vs inquiryDetails
                const inquiryItems = newInquiryData.inquiryDetails || newInquiryData.items || [];
                if (inquiryItems.length === 0) {
                   console.warn('[QUOTE BATCH INQUIRY] The created inquiry was returned with no items. This might be a backend logic issue during file parsing.');
                }
                window.location.href = `/quote_inquiry.html?id=${newInquiryId}`;
            } else {
                throw new Error("创建报价单成功，但服务器未能返回有效的ID。请联系管理员。");
            }
        } catch (err: any) {
            console.error("Batch inquiry creation failed:", err);
            const errorMessage = (err as Error).message || err.response?.data?.error || "创建报价单时发生未知错误。";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
            <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.CREATE_QUOTE_INQUIRY_TITLE}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label htmlFor="quote-customer-name" className="block text-sm font-medium text-slate-700 mb-1.5">{LABELS_ZH.CUSTOMER_NAME_LABEL}</label>
                    <input
                        id="quote-customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={LABELS_ZH.CUSTOMER_NAME_PLACEHOLDER}
                        required
                        disabled={isLoading}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                </div>
                 <div>
                     <label htmlFor="batch-inquiry-upload" className="block text-sm font-medium text-slate-700 mb-1.5">{LABELS_ZH.QUOTE_FILE_LABEL}</label>
                     <input 
                        id="batch-inquiry-upload" 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={handleFileChange} 
                        disabled={isLoading}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                    />
                    <p className="mt-2 text-xs text-slate-500">{LABELS_ZH.CREATE_QUOTE_INQUIRY_NOTE}</p>
                </div>

                {error && (
                    <div role="alert" className="text-sm text-red-700 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        {error}
                    </div>
                )}
                
                <button
                    type="submit"
                    disabled={isLoading || !selectedFile || !customerName.trim()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <DocumentTextIcon className="w-5 h-5" />}
                    <span className="ml-2">{isLoading ? LABELS_ZH.CREATING_QUOTE_INQUIRY : LABELS_ZH.CREATE_QUOTE_INQUIRY_BUTTON}</span>
                </button>
            </form>
        </div>
    );
};

export default QuoteBatchInquiry;