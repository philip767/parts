import React, { useState, useCallback, useEffect } from 'react';
import { InventoryFullDetailsResult } from '../types'; // Updated type
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { SearchIcon, SpinnerIcon, AlertIcon } from './icons';

interface InventorySearchProps {
  // No props needed for this component based on current requirements
}

// Define the order and mapping of table headers
const TABLE_COLUMN_CONFIG: { key: keyof InventoryFullDetailsResult; label: string }[] = [
  { key: 'partNumber', label: LABELS_ZH.COLUMN_PART_NUMBER },
  { key: 'partNameCn', label: LABELS_ZH.COLUMN_PART_NAME_CN },
  { key: 'vehicleModel', label: LABELS_ZH.COLUMN_VEHICLE_MODEL },
  { key: 'origin', label: LABELS_ZH.COLUMN_ORIGIN },
  { key: 'unit', label: LABELS_ZH.COLUMN_UNIT },
  { key: 'stockQuantity', label: LABELS_ZH.INVENTORY_STOCK_QUANTITY },
  { key: 'notes', label: LABELS_ZH.COLUMN_NOTES },
];

// 防抖函数
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const InventorySearch: React.FC<InventorySearchProps> = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<InventoryFullDetailsResult[]>([]); // Use the new specific type
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchAttempts, setSearchAttempts] = useState<number>(0);

  // 使用防抖，避免频繁请求
  const debouncedQuery = useDebounce(query, 500);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]); 
    setHasSearched(true);
    setSearchAttempts((prev: number) => prev + 1);

    try {
      const response = await apiClient.get(`/inventory/search-full-details`, {
        params: { query: searchQuery.trim() },
        timeout: 10000, // 10秒超时
      });

      // 适配新的API响应格式
      const responseData = response.data;
      if (responseData && responseData.success && Array.isArray(responseData.data)) {
        setResults(responseData.data);
      } else if (Array.isArray(responseData)) {
        // 兼容旧的响应格式
        setResults(responseData);
      } else {
        throw new Error('无效的响应格式');
      }

    } catch (apiError: any) {
      console.error("Inventory search failed:", apiError);
      
      // 根据错误类型显示不同的错误信息
      let errorMessage = LABELS_ZH.ERROR_INVENTORY_SEARCH;
      
      if (apiError.code === 'ECONNABORTED') {
        errorMessage = '查询超时，请稍后重试';
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response?.data?.error || '查询参数无效';
      } else if (apiError.response?.status === 429) {
        errorMessage = '查询过于频繁，请稍后再试';
      } else if (apiError.response?.status >= 500) {
        errorMessage = '库存查询服务暂时不可用，请稍后重试';
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }
      
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 当防抖后的查询值改变时，自动搜索
  useEffect(() => {
    if (debouncedQuery !== query) {
      handleSearch(debouncedQuery);
    }
  }, [debouncedQuery, handleSearch]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // 清除之前的结果和错误
    if (hasSearched) setHasSearched(false); 
    if (results.length > 0) setResults([]); 
    if (error) setError(null); 
  };

  const handleRetry = () => {
    if (query.trim()) {
      handleSearch(query);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8 flex items-center">
        <SearchIcon className="w-6 h-6 mr-3 text-sky-600" />
        {LABELS_ZH.INVENTORY_SEARCH_TITLE}
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-3 mb-6">
        <div className="flex-grow">
            <label htmlFor="inventory-search-input" className="sr-only">
            {LABELS_ZH.SEARCH_PART_NUMBER_LABEL}
            </label>
            <input
            id="inventory-search-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={LABELS_ZH.SEARCH_PART_NUMBER_PLACEHOLDER}
            className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            aria-label={LABELS_ZH.SEARCH_PART_NUMBER_LABEL}
            maxLength={100} // 限制输入长度
            />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center justify-center px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-live="polite"
        >
          <SearchIcon className="w-5 h-5 mr-2" />
          {isLoading ? LABELS_ZH.SEARCHING_BUTTON : LABELS_ZH.SEARCH_BUTTON}
        </button>
      </form>

      {isLoading && (
        <div className="text-center py-6 text-slate-600" aria-live="polite">
          <div role="status" className="inline-flex items-center">
            <SpinnerIcon className="w-6 h-6 mr-2 animate-spin" />
            <span className="text-sm font-medium">{LABELS_ZH.SEARCHING_BUTTON}</span>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="text-sm text-red-700 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm" aria-live="assertive">
          <div className="flex items-start">
            <AlertIcon className="w-5 h-5 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <strong className="font-semibold">查询失败：</strong>
              <span>{error}</span>
              {searchAttempts > 1 && (
                <button
                  onClick={handleRetry}
                  className="ml-2 text-red-600 hover:text-red-800 underline text-xs"
                >
                  重试
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-10 text-slate-500" aria-live="polite">
          <SearchIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" aria-hidden="true" />
          <p className="text-md font-medium">{LABELS_ZH.NO_INVENTORY_RESULTS}</p>
          <p className="text-xs text-slate-400 mt-1">请尝试使用不同的关键词搜索，API 最多返回 5 条结果。</p>
        </div>
      )}

      {!isLoading && results.length > 0 && !error && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm" aria-live="polite">
          <table className="min-w-full divide-y divide-slate-200/90 table-auto" aria-label="库存搜索结果">
            <thead className="bg-slate-100/70">
              <tr>
                {TABLE_COLUMN_CONFIG.map(col => (
                  <th 
                    key={col.key} 
                    scope="col" 
                    className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200/90">
              {results.map((item, index) => (
                <tr 
                    key={`result-row-${item.partNumber}-${index}`} // Using partNumber for a more stable key if possible
                    className={`hover:bg-sky-50/30 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {TABLE_COLUMN_CONFIG.map(col => (
                    <td 
                      key={`${col.key}-${item.partNumber}-${index}`} 
                      className="px-4 py-3 whitespace-nowrap text-sm text-slate-700"
                    >
                      {item[col.key] === null || item[col.key] === undefined 
                        ? <span className="italic text-slate-400">N/A</span> 
                        : String(item[col.key])
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          { results.length >= 1 && (
            <div className="text-xs text-slate-500 mt-2 p-2 text-center bg-slate-50">
              共显示 {results.length} 条结果。API 最多返回 5 条匹配记录。
              {query.length > 0 && (
                <span className="block mt-1">
                  搜索关键词: <span className="font-mono bg-slate-200 px-1 rounded">{query}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventorySearch;