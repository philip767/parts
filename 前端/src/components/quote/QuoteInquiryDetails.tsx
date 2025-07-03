import React, { useState, useEffect, useCallback } from 'react';
import { QuoteInquiry, QuoteExportRow, QuoteInquiryItem } from '../types';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { ChevronLeftIcon, SpinnerIcon, DownloadIcon, TrashIcon } from './icons';
import { convertToCSV } from '../utils';
import ConfirmationModal from './ConfirmationModal';

interface QuoteInquiryDetailsProps {
    inquiryId: string;
}

const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
};

const QuoteInquiryDetails: React.FC<QuoteInquiryDetailsProps> = ({ inquiryId }) => {
    const [inquiry, setInquiry] = useState<QuoteInquiry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchInquiryDetails = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<QuoteInquiry>(`/quote-inquiries/${inquiryId}`);
            const inquiryData = response.data;
            console.log(`[QUOTE INQUIRY DETAILS] Fetched data for ID ${inquiryId}:`, inquiryData);

            // --- START OF NORMALIZATION LOGIC ---
            // Normalize top-level 'items' property to 'inquiryDetails' for consistency.
            if (inquiryData && !inquiryData.inquiryDetails && inquiryData.items) {
                console.warn("[QUOTE INQUIRY DETAILS] Backend returned 'items' field instead of 'inquiryDetails'. Normalizing data.");
                inquiryData.inquiryDetails = inquiryData.items;
            }

            // Normalize individual item properties for robustness.
            if (inquiryData && inquiryData.inquiryDetails) {
                inquiryData.inquiryDetails = inquiryData.inquiryDetails.map((item: any) => {
                    const normalizedItem: QuoteInquiryItem = { ...item };
                    
                    // Normalize 'quotes' from 'quotesJson' if 'quotes' is missing or empty.
                    if ((!normalizedItem.quotes || normalizedItem.quotes.length === 0) && normalizedItem.quotesJson) {
                        normalizedItem.quotes = normalizedItem.quotesJson;
                    }

                    // Normalize 'queryPartNumber' from 'partNumber' if 'queryPartNumber' is missing.
                    if (!normalizedItem.queryPartNumber && normalizedItem.partNumber) {
                        normalizedItem.queryPartNumber = normalizedItem.partNumber;
                    }
                    
                    return normalizedItem;
                });
            }
            // --- END OF NORMALIZATION LOGIC ---
            
            setInquiry(inquiryData);

            if (!inquiryData?.inquiryDetails || inquiryData.inquiryDetails.length === 0) {
                 console.warn(`[QUOTE INQUIRY DETAILS] Fetched inquiry for ID ${inquiryId} has no items. This could be a backend issue if items were expected.`);
            }
        } catch (err: any) {
            console.error("Failed to fetch inquiry details:", err);
            setError(err.response?.data?.error || "加载报价单详情失败。");
        } finally {
            setIsLoading(false);
        }
    }, [inquiryId]);

    useEffect(() => {
        fetchInquiryDetails();
    }, [fetchInquiryDetails]);

    const handleSelectionChange = async (itemId: string, selectedQuoteId: string | null) => {
        if (!inquiry || isSaving) return;

        const originalState = JSON.parse(JSON.stringify(inquiry)); // Deep copy for potential revert

        // Optimistically update UI
        setInquiry(prevInquiry => {
            if (!prevInquiry) return null;
            const items = prevInquiry.inquiryDetails || [];
            return {
                ...prevInquiry,
                inquiryDetails: items.map(item =>
                    item.id === itemId ? { ...item, selectedQuoteId } : item
                )
            };
        });

        setIsSaving(true);
        setError(null);
        try {
            await apiClient.put(`/quote-inquiries/${inquiry.id}/items/${itemId}`, { selectedQuoteId });
            // On success, no need to do anything as UI is already updated.
        } catch (err: any) {
            console.error("Failed to save selection:", err);
            setError(LABELS_ZH.SAVING_SELECTION_ERROR);
            // Revert optimistic update on failure by restoring the original state
            setInquiry(originalState);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        if (!inquiry || !inquiry.inquiryDetails) return;

        const dataToExport: QuoteExportRow[] = [];
        inquiry.inquiryDetails.forEach(item => {
            if (item.selectedQuoteId) {
                const selectedQuote = item.quotes.find(q => q.quoteId === item.selectedQuoteId);
                if (selectedQuote) {
                    const price = parseFloat(selectedQuote.priceRMB || '');
                    dataToExport.push({
                        partNumber: item.queryPartNumber,
                        quoteDate: formatDate(selectedQuote.quoteDate),
                        customerName: selectedQuote.customerName,
                        priceRMB: isNaN(price) ? '0.00' : price.toFixed(2),
                    });
                }
            }
        });
        
        if (dataToExport.length === 0) {
            setError("没有已选择的报价可供导出。");
            setTimeout(() => setError(null), 5000);
            return;
        }

        const headers: { key: keyof QuoteExportRow; label: string }[] = [
            { key: 'partNumber', label: LABELS_ZH.COLUMN_QUERY_PART_NUMBER },
            { key: 'quoteDate', label: LABELS_ZH.COLUMN_QUOTE_DATE },
            { key: 'customerName', label: LABELS_ZH.COLUMN_CUSTOMER_NAME },
            { key: 'priceRMB', label: LABELS_ZH.COLUMN_QUOTE_PRICE_RMB },
        ];

        const csvData = convertToCSV(dataToExport, headers);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const safeFileName = inquiry.fileName.replace(/\.[^/.]+$/, "");
        link.setAttribute("download", `报价单_${inquiry.customerName}_${safeFileName}_导出_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async () => {
        if (!inquiry || isDeleting) return;
        
        setIsDeleting(true);
        setError(null);
        try {
            await apiClient.delete(`/quote-inquiries/${inquiry.id}`);
            window.location.href = '/quote.html';
        } catch (err: any) {
            console.error("Failed to delete inquiry:", err);
            setError(err.response?.data?.error || "删除报价单失败。");
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const hasAnyQuotesAvailable = inquiry?.inquiryDetails?.some(item => item.quotes && item.quotes.length > 0) ?? false;
    const inquiryItems = inquiry?.inquiryDetails || [];


    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center text-sky-600"><div className="text-xl font-semibold p-8 bg-white rounded-lg shadow-md">{LABELS_ZH.LOADING}</div></div>;
    }

    if (error && !inquiry) {
        return (
            <div className="flex-grow flex items-center justify-center p-4">
                <div role="alert" className="w-full max-w-lg text-sm text-center text-red-700 p-6 bg-red-50 border border-red-300 rounded-lg shadow-xl">
                    <p className="font-semibold text-lg mb-2">无法加载报价单</p>
                    <p>{error}</p>
                    <a href="/quote.html" className="mt-4 inline-block px-5 py-2 bg-sky-600 text-white text-xs font-medium rounded-md hover:bg-sky-700 transition-colors">
                        {LABELS_ZH.BACK_TO_QUOTE_MANAGEMENT}
                    </a>
                </div>
            </div>
        );
    }
    
    if (!inquiry) {
        return null; // Should be covered by loading/error states
    }

    return (
        <>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-200/80 space-y-6 w-full">
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <a
                        href="/quote.html"
                        aria-label={LABELS_ZH.BACK_TO_QUOTE_MANAGEMENT}
                        className="absolute top-0 left-0 flex items-center text-sky-600 hover:text-sky-700 transition-colors text-sm font-medium p-2 pr-3 rounded-lg hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                    >
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        {LABELS_ZH.BACK_TO_QUOTE_MANAGEMENT}
                    </a>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-sky-700 text-center pt-10 sm:pt-0">
                        {inquiry.fileName} <span className="text-lg text-slate-500 font-normal">({inquiry.customerName})</span>
                    </h2>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-3 border-b pb-4 border-slate-200">
                     <button
                        onClick={handleExport}
                        disabled={isSaving || isDeleting}
                        className="flex items-center px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                    >
                        <DownloadIcon className="w-4 h-4 mr-1.5" />
                        {LABELS_ZH.EXPORT_SELECTED_QUOTES_BUTTON}
                    </button>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={isSaving || isDeleting}
                        className="flex items-center px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-60 ml-auto"
                    >
                        <TrashIcon className="w-4 h-4 mr-1.5" />
                        {LABELS_ZH.DELETE_QUOTE_INQUIRY_BUTTON}
                    </button>
                </div>
            </div>

            {error && <div role="alert" className="mb-4 text-sm text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">{error} <button onClick={() => setError(null)} className="ml-2 text-xs font-semibold underline">清除</button></div>}
            
            {!hasAnyQuotesAvailable && (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                    <p className="font-medium">未找到任何零件的历史报价记录。</p>
                    <p className="text-xs mt-1">请先上传历史报价，或检查后台数据关联是否正确。</p>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200/90">
                    <thead className="bg-slate-100/70">
                        <tr>
                            <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.COLUMN_QUERY_PART_NUMBER}</th>
                            <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.COLUMN_HISTORICAL_QUOTES}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200/90">
                        {inquiryItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 align-top">{item.queryPartNumber}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                    {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : (
                                        (item.quotes && item.quotes.length > 0) ? (
                                            <select
                                                value={item.selectedQuoteId || ''}
                                                onChange={(e) => handleSelectionChange(item.id, e.target.value || null)}
                                                className="block w-full max-w-md p-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                                            >
                                                <option value="">{LABELS_ZH.SELECT_A_QUOTE}</option>
                                                {item.quotes.map(quote => (
                                                    <option key={quote.quoteId} value={quote.quoteId}>
                                                        {`${formatDate(quote.quoteDate)} - ${quote.customerName} - ¥${quote.priceRMB || 'N/A'}`}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            !hasAnyQuotesAvailable && <span className="text-xs text-slate-400 italic">{LABELS_ZH.NO_QUOTE_RESULTS}</span>
                                        )
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {inquiryItems.length === 0 && (
                    <p className="text-center text-slate-500 py-10 text-md">此报价单中没有项目。</p>
                )}
            </div>
        </div>
        <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
            title={LABELS_ZH.CONFIRM_DELETE_QUOTE_INQUIRY_TITLE}
            message={LABELS_ZH.CONFIRM_DELETE_QUOTE_INQUIRY_MSG}
        />
        </>
    );
};

export default QuoteInquiryDetails;
