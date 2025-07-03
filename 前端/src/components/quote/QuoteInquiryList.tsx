import React, { useState, useEffect, useCallback } from 'react';
import { QuoteInquiry } from '../types';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { SpinnerIcon } from './icons';

const QuoteInquiryList: React.FC = () => {
    const [inquiries, setInquiries] = useState<QuoteInquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInquiries = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<QuoteInquiry[]>('/quote-inquiries');
            const sortedInquiries = response.data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setInquiries(sortedInquiries);
        } catch (err: any) {
            console.error("Failed to fetch quote inquiries:", err);
            setError(err.response?.data?.error || "加载报价单列表失败。");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInquiries();
    }, [fetchInquiries]);

    const handleSelectInquiry = (inquiryId: string) => {
        window.location.href = `/quote_inquiry.html?id=${inquiryId}`;
    };
    
    if (isLoading) {
        return <div className="text-center p-6"><SpinnerIcon className="w-6 h-6 mx-auto" /></div>;
    }

    if (error) {
        return <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
            <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.EXISTING_QUOTE_INQUIRIES}</h2>
            {inquiries.length > 0 ? (
                <div className="space-y-4">
                    {inquiries.map(inquiry => (
                        <div
                            key={inquiry.id}
                            onClick={() => handleSelectInquiry(inquiry.id)}
                            className="group p-5 border rounded-xl transition-all duration-200 ease-in-out border-slate-200/90 hover:shadow-lg hover:border-sky-300 bg-slate-50/50 hover:bg-white cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && handleSelectInquiry(inquiry.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-sky-600 group-hover:text-sky-700 transition-colors">{inquiry.fileName}</h3>
                                    <p className="text-sm font-medium text-slate-600 mt-1">{LABELS_ZH.CUSTOMER_NAME_LABEL}: {inquiry.customerName}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        创建于: {new Date(inquiry.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-slate-600 text-sm">{LABELS_ZH.COLUMN_ITEM_COUNT}</p>
                                    <p className="font-bold text-xl text-sky-600">{inquiry.itemCount}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-semibold text-slate-700">{LABELS_ZH.NO_QUOTE_INQUIRIES}</h3>
                    <p className="mt-2 text-sm text-slate-500">通过上传文件来创建一份新的报价单。</p>
                </div>
            )}
        </div>
    );
};

export default QuoteInquiryList;