import React, { useState, useEffect, useCallback } from 'react';
import { QuoteGroup } from '../types';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { SearchIcon, SpinnerIcon, ChevronDownIcon, CurrencyYuanIcon, NotesIcon, CalendarIcon } from './icons';

const QuoteSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<QuoteGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedPartNumber, setExpandedPartNumber] = useState<string | null>(null);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const response = await apiClient.get<QuoteGroup[]>('/quotes/search', {
                params: { query: searchQuery.trim() }
            });

            // Defensive check for the response data
            const searchResults = Array.isArray(response.data) ? response.data : [];
            setResults(searchResults);

            if(searchResults.length === 1) {
                setExpandedPartNumber(searchResults[0].partNumber);
            } else {
                setExpandedPartNumber(null);
            }
        } catch (err: any) {
            console.error("Quote search failed:", err);
            setError(err.response?.data?.error || "报价查询失败。");
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            setError(null);
            return;
        };
        const handler = setTimeout(() => {
            performSearch(query);
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [query, performSearch]);

    const handleToggleExpand = (partNumber: string) => {
        setExpandedPartNumber(prev => prev === partNumber ? null : partNumber);
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80 h-full">
            <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.SEARCH_QUOTES_TITLE}</h2>
            <div className="relative mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={LABELS_ZH.SEARCH_QUOTES_PLACEHOLDER}
                    className="w-full p-4 pl-12 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {isLoading ? <SpinnerIcon className="w-5 h-5 text-slate-400" /> : <SearchIcon className="w-5 h-5 text-slate-400" />}
                </div>
            </div>

            <div className="space-y-4">
                {error && <div role="alert" className="text-red-600 text-sm">{error}</div>}
                
                {hasSearched && !isLoading && results.length === 0 && !error && (
                    <div className="text-center py-10 text-slate-500">
                        <SearchIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" aria-hidden="true" />
                        <p className="text-md font-medium">{LABELS_ZH.NO_QUOTE_RESULTS}</p>
                    </div>
                )}
                
                {results.map(group => (
                    <div key={group.partNumber} className="border border-slate-200 rounded-lg overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => handleToggleExpand(group.partNumber)}
                            className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 focus:outline-none"
                            aria-expanded={expandedPartNumber === group.partNumber}
                        >
                            <span className="font-semibold text-sky-800">{group.partNumber}</span>
                            <div className="flex items-center">
                                <span className="text-sm text-slate-500 mr-2">共 {group.quotes.length} 条报价</span>
                                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${expandedPartNumber === group.partNumber ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {expandedPartNumber === group.partNumber && (
                             <div className="bg-white p-4 border-t border-slate-200">
                                {group.quotes.length > 0 ? (
                                    <ul className="space-y-3">
                                        {group.quotes.map(quote => (
                                            <li key={quote.quoteId} className="p-3 bg-slate-50/70 rounded-md border border-slate-200/80">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-semibold text-slate-700">{quote.customerName}</p>
                                                    <p className="flex items-center text-sm font-bold text-emerald-600">
                                                        <CurrencyYuanIcon className="w-4 h-4 mr-1"/>
                                                        {quote.priceRMB || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center text-xs text-slate-500 mb-2">
                                                     <CalendarIcon className="w-3.5 h-3.5 mr-1.5"/>
                                                     {formatDate(quote.quoteDate)}
                                                </div>
                                                {quote.notes && (
                                                    <div className="flex items-start text-xs text-slate-600 bg-slate-100 p-2 rounded">
                                                        <NotesIcon className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0"/>
                                                        <p>{quote.notes}</p>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">{LABELS_ZH.NO_QUOTE_RESULTS}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuoteSearch;