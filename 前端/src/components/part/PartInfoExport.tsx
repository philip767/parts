
import React, { useState, useCallback } from 'react';
import { LABELS_ZH } from '../constants';
import { CsvExportRow, InventoryFullDetailsResult } from '../types';
import { convertToCSV } from '../utils';
import apiClient from '../apiClient';
import { DownloadIcon, SpinnerIcon } from './icons';

const PartInfoExport: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    const fileInput = event.target;
    const file = fileInput.files?.[0];

    if (!file) {
      fileInput.value = '';
      return;
    }

    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
      setError(LABELS_ZH.PART_INFO_EXPORT_FILE_ERROR);
      fileInput.value = '';
      return;
    }
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        setError(LABELS_ZH.ERROR_FILE_READ);
        setIsLoading(false);
        fileInput.value = '';
        return;
      }

      const partNumbers = text.split('\n').map(line => line.trim()).filter(Boolean);
      if (partNumbers.length === 0) {
        setError(LABELS_ZH.PART_INFO_EXPORT_NO_PARTS);
        setIsLoading(false);
        fileInput.value = '';
        return;
      }
      
      try {
        const detailPromises = partNumbers.map(async (partNumber): Promise<CsvExportRow> => {
          try {
            const res = await apiClient.get<InventoryFullDetailsResult[]>(`/inventory/search-full-details`, { params: { query: partNumber } });
            const potentialMatches = res.data;
            if (potentialMatches.length > 0) {
              potentialMatches.sort((a, b) => a.partNumber.length - b.partNumber.length);
              const bestMatch = potentialMatches[0];
              return {
                orderPartNumberOriginal: partNumber,
                orderPartNameOriginal: null,
                inventoryPartNumber: bestMatch.partNumber,
                partNameCn: bestMatch.partNameCn,
                vehicleModel: bestMatch.vehicleModel,
                origin: bestMatch.origin,
                unit: bestMatch.unit,
                stockQuantity: bestMatch.stockQuantity,
                notes: bestMatch.notes,
              };
            } else {
              return {
                orderPartNumberOriginal: partNumber,
                orderPartNameOriginal: null,
                inventoryPartNumber: null,
                partNameCn: LABELS_ZH.NOT_FOUND,
                vehicleModel: LABELS_ZH.NOT_FOUND,
                origin: LABELS_ZH.NOT_FOUND,
                unit: LABELS_ZH.NOT_FOUND,
                stockQuantity: 'N/A',
                notes: `未在库存记录中找到与零件 ${partNumber} 相似的项`,
              };
            }
          } catch (apiError) {
            console.error(`Error fetching details for part ${partNumber}:`, apiError);
            return {
              orderPartNumberOriginal: partNumber,
              orderPartNameOriginal: null,
              inventoryPartNumber: null,
              partNameCn: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
              vehicleModel: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
              origin: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
              unit: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
              stockQuantity: 'Error',
              notes: `查询零件 ${partNumber} 的库存详情时出错`,
            };
          }
        });

        const results = await Promise.all(detailPromises);
        
        const headers: { key: keyof CsvExportRow; label: string }[] = [
            { key: 'orderPartNumberOriginal', label: LABELS_ZH.COLUMN_ORDER_PART_NUMBER_ORIGINAL },
            { key: 'orderPartNameOriginal', label: LABELS_ZH.COLUMN_ORDER_PART_NAME_ORIGINAL },
            { key: 'inventoryPartNumber', label: LABELS_ZH.COLUMN_PART_NUMBER }, 
            { key: 'partNameCn', label: LABELS_ZH.COLUMN_PART_NAME_CN },
            { key: 'vehicleModel', label: LABELS_ZH.COLUMN_VEHICLE_MODEL },
            { key: 'origin', label: LABELS_ZH.COLUMN_ORIGIN },
            { key: 'unit', label: LABELS_ZH.COLUMN_UNIT },
            { key: 'stockQuantity', label: LABELS_ZH.INVENTORY_STOCK_QUANTITY },
            { key: 'notes', label: LABELS_ZH.COLUMN_NOTES },
        ];

        const csvData = convertToCSV(results, headers);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const safeFileName = file.name.replace(/\.[^/.]+$/, "");
        link.setAttribute("download", `${safeFileName}_零件信息导出_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccessMessage(LABELS_ZH.PART_INFO_EXPORT_SUCCESS);
      } catch (err: any) {
        console.error("Export process failed:", err);
        setError(err.message || LABELS_ZH.PART_INFO_EXPORT_ERROR);
      } finally {
        setIsLoading(false);
        fileInput.value = '';
      }
    };
    
    reader.onerror = () => {
        setError(LABELS_ZH.ERROR_FILE_READ);
        setIsLoading(false);
        fileInput.value = '';
    };

    reader.readAsText(file);
  }, []);
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.PART_INFO_EXPORT_TITLE}</h2>
      <div className="mb-6">
        <label htmlFor="part-info-export-upload" className={`cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          {isLoading ? <SpinnerIcon className="w-5 h-5 mr-2.5" /> : <DownloadIcon className="w-5 h-5 mr-2.5" />}
          <span className="text-sm font-medium">{isLoading ? LABELS_ZH.EXPORTING_PART_INFO : LABELS_ZH.PART_INFO_EXPORT_BUTTON}</span>
        </label>
        <input id="part-info-export-upload" type="file" accept=".txt,text/plain" onChange={handleFileSelect} className="hidden" disabled={isLoading} />
      </div>
      <p className="text-sm text-slate-500 mb-6">{LABELS_ZH.PART_INFO_EXPORT_NOTE}</p>
      
      {error && (
        <div role="alert" className="text-sm text-red-700 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <strong className="font-semibold">错误：</strong>{error}
        </div>
      )}
      {successMessage && (
        <div role="status" className="text-sm text-green-700 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default PartInfoExport;
