import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Order, Part, EnhancedNote, PartScaffoldForCreate, InventorySearchResult, InventoryFullDetailsResult, NoteImage, CsvExportRow } from '../types';
import { convertToCSV } from '../utils';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { 
    ChevronLeftIcon, TrashIcon, PlusIcon, NotesIcon, RestoreIcon, SearchIcon, SpinnerIcon,
    EditIcon, DiskSaveIcon, DownloadIcon, ListIcon, ChevronDownIcon 
} from './icons'; 
import NotesModal from './NotesModal';
import ConfirmationModal from './ConfirmationModal';
import InventoryStockModal from './InventoryStockModal';
import BatchStockViewModal from './BatchStockViewModal';

interface OrderDetailsProps {
  orderId: string;
  onBack: () => void;
  onViewPreciseDetails: (partNumber: string) => void;
}

type PartFieldErrors = Record<string, string | null>; // partId-field -> error message
type EditedFields = Record<string, Partial<Part>>; // partId -> { field: newValue }

type ActionConfirmationState = {
  action: 'discardChanges' | 'deletePart' | 'restorePart' | 'permanentlyDeletePart';
  partId?: string; 
  partName?: string;
  callback: () => Promise<void> | void; 
} | null;

const OrderDetails: React.FC<OrderDetailsProps> = ({ 
    orderId, 
    onBack,
    onViewPreciseDetails
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [initialOrderState, setInitialOrderState] = useState<Order | null>(null); // For reverting changes
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<EditedFields>({});
  
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [editingPartIdForNotes, setEditingPartIdForNotes] = useState<string | null>(null);
  const [actionConfirmationState, setActionConfirmationState] = useState<ActionConfirmationState>(null);
  
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PartFieldErrors>({}); 
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [updatingMonitoringPartId, setUpdatingMonitoringPartId] = useState<string | null>(null);
  const [expandedPartIds, setExpandedPartIds] = useState<Set<string>>(new Set());
  
  const [stockCheckModalState, setStockCheckModalState] = useState<{isOpen: boolean, isLoading: boolean, error: string | null, results: InventorySearchResult[] | null, targetPartNumber: string | null, targetPartName?: string | null}>({
    isOpen: false, isLoading: false, error: null, results: null, targetPartNumber: null, targetPartName: null
  });

  const [batchStockViewModalState, setBatchStockViewModalState] = useState<{isOpen: boolean, isLoading: boolean, error: string | null, results: { partNumber: string; partName?: string; stockQuantity: number | 'N/A' | 'Error' }[] | null }>({
    isOpen: false, isLoading: false, error: null, results: null
  });

  const hasUnsavedChanges = useMemo(() => Object.keys(editedFields).length > 0, [editedFields]);

  const toggleExpandPart = (partId: string) => {
    setExpandedPartIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(partId)) {
            newSet.delete(partId);
        } else {
            newSet.add(partId);
        }
        return newSet;
    });
  };

 const transformBackendPartToFrontendPart = useCallback((backendPart: any): Part => {
    const transformedImages: NoteImage[] = (backendPart.images || []).map((backendImage: any) => ({
        id: backendImage.id,
        imageUrl: backendImage.imageUrlOrPath, // Key transformation for URL
        imageName: backendImage.imageName,
        imageType: backendImage.imageType,
        uploadedAt: backendImage.uploadedAt,
    }));

    return {
        id: backendPart.id,
        partNumber: backendPart.partNumber,
        partName: backendPart.partName,
        quantity: backendPart.quantity,
        notes: { 
            text: backendPart.notesText || '', 
            images: transformedImages,          
        },
        supplier: backendPart.supplier,
        purchaser: backendPart.purchaser,
        estimatedShippingDate: backendPart.estimatedShippingDate,
        isArrived: backendPart.isArrived,
        isOrderComplete: backendPart.isOrderComplete,
        sortOrder: backendPart.sortOrder,
        deletedDate: backendPart.deletedDate,
        orderId: backendPart.orderId,
        // New monitoring fields
        initialStock: backendPart.initialStock,
        latestStock: backendPart.latestStock,
        lastStockCheck: backendPart.lastStockCheck,
        stockCheckInterval: backendPart.stockCheckInterval,
        isMonitored: backendPart.isMonitored,
    };
  }, []);

  const fetchOrderDetails = useCallback(async (currentOrderId: string) => {
      if (!currentOrderId) return;
      setIsLoading(true);
      setGlobalError(null);
      try {
          const response = await apiClient.get<any>(`/orders/${currentOrderId}`, { 
              params: { _cb: Date.now() } 
          });
          
          const rawOrderData = response.data;
          let transformedParts = (rawOrderData.parts || []).map(transformBackendPartToFrontendPart);
          let transformedRecycledParts = (rawOrderData.recycledParts || []).map(transformBackendPartToFrontendPart);

          // Sort parts based on sortOrder. This is a more robust implementation.
          transformedParts.sort((a, b) => {
            const orderA = a.sortOrder === null || a.sortOrder === undefined ? Infinity : a.sortOrder;
            const orderB = b.sortOrder === null || b.sortOrder === undefined ? Infinity : b.sortOrder;
            if (orderA === Infinity && orderB === Infinity) {
                return 0; // Keep original relative order for items without sortOrder
            }
            return orderA - orderB;
          });

          // Also sort recycled parts for consistency.
          transformedRecycledParts.sort((a, b) => {
            const orderA = a.sortOrder === null || a.sortOrder === undefined ? Infinity : a.sortOrder;
            const orderB = b.sortOrder === null || b.sortOrder === undefined ? Infinity : b.sortOrder;
            if (orderA === Infinity && orderB === Infinity) {
                return 0; // Keep original relative order for items without sortOrder
            }
            return orderA - orderB;
          });

          const transformedOrderData: Order = {
              ...rawOrderData,
              parts: transformedParts,
              recycledParts: transformedRecycledParts,
          };
          
          setOrder(transformedOrderData);
          setInitialOrderState(JSON.parse(JSON.stringify(transformedOrderData))); // Deep copy for resetting
          setEditedFields({});
          setIsEditMode(false);
      } catch (error: any) {
          console.error(`Failed to fetch details for order ${currentOrderId}:`, error);
          setGlobalError(error.response?.data?.error || error.message || `无法加载订单 ${currentOrderId} 的详情。`);
          setOrder(null);
          setInitialOrderState(null);
      } finally {
          setIsLoading(false);
      }
  }, [transformBackendPartToFrontendPart]);

  useEffect(() => {
    fetchOrderDetails(orderId);
  }, [orderId, fetchOrderDetails]);


  const handleLocalPartInputChange = <K extends keyof Part>(partId: string, field: K, value: Part[K]) => {
    if (!isEditMode || !order || !initialOrderState) return;

    setFieldErrors(prev => ({ ...prev, [`${partId}-${String(field)}`]: null })); 
    
    setOrder(prevOrder => {
      if (!prevOrder) return null;
      return {
        ...prevOrder,
        parts: (prevOrder.parts || []).map(p => 
            p.id === partId ? { ...p, [field]: value } : p
        )
      }
    });

    setEditedFields(prev => {
        const originalPartForComparison = initialOrderState.parts?.find(p => p.id === partId);
        const existingChangesForPart = prev[partId] || {};
        const newChangesForPart = { ...existingChangesForPart, [field]: value };

        if (originalPartForComparison) {
            let fieldIsSameAsOriginal = JSON.stringify(originalPartForComparison[field]) === JSON.stringify(value);
            if (fieldIsSameAsOriginal) {
                const remainingChanges = { ...newChangesForPart };
                delete remainingChanges[field];
                
                if (Object.keys(remainingChanges).length === 0) {
                    const { [partId]: __, ...allOtherPartsChanges } = prev;
                    return allOtherPartsChanges;
                }
                return { ...prev, [partId]: remainingChanges };
            }
        }
        return { ...prev, [partId]: newChangesForPart };
    });
  };

  const handleMonitoringChange = async (partId: string, field: 'isMonitored' | 'stockCheckInterval', value: boolean | number) => {
    if (!order) return;
  
    let payload: { isMonitored?: boolean; stockCheckInterval?: number } = {};
  
    if (field === 'isMonitored') {
      payload = { isMonitored: value as boolean };
    } else if (field === 'stockCheckInterval') {
      const minutes = Number(value);
      if (isNaN(minutes) || minutes <= 0) {
        setFieldErrors(prev => ({ ...prev, [`${partId}-stockCheckInterval`]: "间隔必须是正数。" }));
        return; 
      }
      setFieldErrors(prev => ({ ...prev, [`${partId}-stockCheckInterval`]: null }));
      payload = { stockCheckInterval: minutes * 60 };
    }
  
    setUpdatingMonitoringPartId(partId);
    setGlobalError(null);
  
    try {
      await apiClient.put(`/monitoring/parts/${partId}`, payload);
      await fetchOrderDetails(order.id);
    } catch (error: any) {
      console.error(`Failed to update monitoring for part ${partId}:`, error);
      const errorMsg = error.response?.data?.error || `更新零件 ${partId} 的监控设置失败。`;
      setGlobalError(errorMsg);
      // Data will be resynced by fetchOrderDetails in finally block if it fails here
    } finally {
      setUpdatingMonitoringPartId(null);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || !order) {
      setIsEditMode(false); 
      return;
    }
    setGlobalLoadingMessage(LABELS_ZH.SAVING_CHANGES);
    setGlobalError(null);
    setFieldErrors({});
    let successCount = 0;
    const currentEditedPartIds = Object.keys(editedFields);
    const promises = [];

    for (const partId of currentEditedPartIds) {
        const changes = editedFields[partId];
        if (!changes || Object.keys(changes).length === 0) continue;

        const partInCurrentUIData = order.parts?.find(p => p.id === partId);
        if(!partInCurrentUIData) continue;

        const payload = { ...partInCurrentUIData }; 
        if (typeof payload.quantity === 'string') {
          payload.quantity = parseInt(payload.quantity as any, 10);
          if (isNaN(payload.quantity)) {
            setFieldErrors(prev => ({ ...prev, [`${partId}-quantity`]: "数量必须是数字。" }));
            setGlobalLoadingMessage(null);
            return; 
          }
        }
        
        promises.push(
            apiClient.put<Part>(`/orders/${order.id}/parts/${partId}`, payload)
                .then(() => {
                    successCount++;
                })
                .catch(apiError => {
                    console.error(`Failed to update part ${partId}:`, apiError);
                    const errorMsg = apiError.response?.data?.error || apiError.message || `更新零件 ${partInCurrentUIData.partName || partInCurrentUIData.partNumber} 失败`;
                    setFieldErrors(prev => ({ ...prev, [`${partId}-general`]: errorMsg }));
                    return Promise.reject(errorMsg); 
                })
        );
    }

    await Promise.allSettled(promises);
    setGlobalLoadingMessage(null);
    await fetchOrderDetails(order.id); // Refresh data regardless of outcome
  };

  const handleToggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
        setActionConfirmationState({
            action: 'discardChanges',
            callback: () => {
                setIsEditMode(false);
                setEditedFields({});
                setOrder(initialOrderState ? JSON.parse(JSON.stringify(initialOrderState)) : null);
                setFieldErrors({});
                setGlobalError(null);
                setActionConfirmationState(null);
            },
            partName: LABELS_ZH.UNSAVED_CHANGES_TITLE 
        });
    } else {
        setIsEditMode(!isEditMode);
        if (isEditMode) { // Was true, now turning off
            setEditedFields({});
            setOrder(initialOrderState ? JSON.parse(JSON.stringify(initialOrderState)) : null);
        }
    }
  };

  const handleAttemptNavigateBack = () => {
    if (isEditMode && hasUnsavedChanges) {
        setActionConfirmationState({
            action: 'discardChanges',
            callback: () => {
                setIsEditMode(false); 
                setEditedFields({}); 
                setActionConfirmationState(null);
                onBack(); 
            },
            partName: LABELS_ZH.UNSAVED_CHANGES_TITLE
        });
    } else {
        onBack();
    }
  };

  const handleAddPart = useCallback(async () => {
    if(!order) return;
    setGlobalError(null);
    const newPartScaffold: PartScaffoldForCreate = {
      partNumber: '新零件号', partName: '新零件名称', quantity: 1, notesText: '', 
      supplier: '', purchaser: '', estimatedShippingDate: null, 
      isArrived: false, isOrderComplete: false,
    };
    
    setGlobalLoadingMessage(LABELS_ZH.ADDING_PART);
    try {
        await apiClient.post(`/orders/${order.id}/parts`, newPartScaffold);
        await fetchOrderDetails(order.id);
    } catch (apiError: any) {
        setGlobalError("添加零件失败：" + (apiError.response?.data?.error || apiError.message || "未知错误"));
    } finally {
        setGlobalLoadingMessage(null);
    }
  }, [order, fetchOrderDetails]);

  const createPartActionHandler = (actionType: 'deletePart' | 'restorePart' | 'permanentlyDeletePart', part: Part) => {
    if (!order) return;
    setGlobalError(null);
    let callback: () => Promise<void>;
    let loadingMessage = "";
    switch (actionType) {
        case 'deletePart':
            loadingMessage = LABELS_ZH.DELETING_PART;
            callback = async () => { 
                try { await apiClient.delete(`/orders/${order.id}/parts/${part.id}`); await fetchOrderDetails(order.id); } 
                catch(e:any) {setGlobalError(e.response?.data?.error || e.message || "删除零件失败"); throw e;} 
            };
            break;
        case 'restorePart':
            loadingMessage = LABELS_ZH.RESTORING_PART;
            callback = async () => { 
                try { await apiClient.post(`/orders/${order.id}/parts/${part.id}/restore`); await fetchOrderDetails(order.id); } 
                catch(e:any) {setGlobalError(e.response?.data?.error ||e.message || "恢复零件失败"); throw e;} 
            };
            break;
        case 'permanentlyDeletePart':
            loadingMessage = LABELS_ZH.DELETING_PART_PERMANENTLY;
            callback = async () => { 
                try { await apiClient.delete(`/orders/${order.id}/parts/${part.id}/permanent`); await fetchOrderDetails(order.id); } 
                catch(e:any) {setGlobalError(e.response?.data?.error ||e.message || "彻底删除零件失败"); throw e;} 
            };
            break;
        default: return;
    }
    
    const wrappedCallback = async () => {
        setGlobalLoadingMessage(loadingMessage);
        try {
            await callback();
        } finally {
            setGlobalLoadingMessage(null);
            setActionConfirmationState(null);
        }
    };
    setActionConfirmationState({ action: actionType, partId: part.id, partName: part.partName || part.partNumber, callback: wrappedCallback });
  };

  const openNotesModal = (part: Part) => { setEditingPartIdForNotes(part.id); setIsNotesModalOpen(true); };
  const closeNotesModal = () => { setIsNotesModalOpen(false); setEditingPartIdForNotes(null); };
  
  const handleSaveNoteTextFromModal = async (partForTextUpdateId: string, newText: string) => {
    if (!order) return Promise.reject(new Error("Order not found"));
    const partToUpdate = order.parts?.find(p => p.id === partForTextUpdateId);
    if (!partToUpdate) { return Promise.reject(new Error("Part not found")); }
    
    if (isEditMode) {
      handleLocalPartInputChange(partForTextUpdateId, 'notes', { ...partToUpdate.notes, text: newText });
      return Promise.resolve();
    } else {
      setGlobalLoadingMessage(LABELS_ZH.SAVING_CHANGES);
      try {
        await apiClient.put<Part>(`/orders/${order.id}/parts/${partForTextUpdateId}`, { ...partToUpdate, notes: { ...partToUpdate.notes, text: newText }});
        await fetchOrderDetails(order.id);
      } catch (e: any) {
        setGlobalError("保存备注文本失败: " + (e.response?.data?.error || e.message));
        return Promise.reject(e);
      } finally {
        setGlobalLoadingMessage(null);
      }
    }
  };

  const handleNotesDataChangedViaImages = async () => { 
    if (!order) return;
    await fetchOrderDetails(order.id);
  };

  const handleCheckStock = useCallback(async (partId: string, partNumber: string, partName?: string) => {
     if (!partNumber || !partNumber.trim()) {
        setStockCheckModalState({ isOpen: true, isLoading: false, results: null, error: "零件号无效", targetPartNumber: partNumber, targetPartName: partName });
        return;
    }
    setStockCheckModalState({ isOpen: true, isLoading: true, results: null, error: null, targetPartNumber: partNumber.trim(), targetPartName: partName });
    try {
        const orderPartNumber = partNumber.trim();
        const response = await apiClient.get<InventorySearchResult[]>(`/inventory/search`, { params: { query: orderPartNumber } });
        
        const potentialMatches = response.data.filter(item => 
            item.partNumber.toUpperCase().includes(orderPartNumber.toUpperCase())
        );
        
        if (potentialMatches.length > 0) {
            potentialMatches.sort((a, b) => a.partNumber.length - b.partNumber.length);
            setStockCheckModalState(prev => ({ ...prev, isLoading: false, results: potentialMatches, error: null }));
        } else {
            setStockCheckModalState(prev => ({ ...prev, isLoading: false, results: [], error: null }));
        }

    } catch (apiError: any) {
        const errorMsg = apiError.response?.data?.error || apiError.message || LABELS_ZH.ERROR_INVENTORY_SEARCH;
        setStockCheckModalState(prev => ({ ...prev, isLoading: false, results: null, error: errorMsg }));
    }
  }, []); 

  const closeStockCheckModal = () => setStockCheckModalState({ isOpen: false, isLoading: false, error: null, results: null, targetPartNumber: null, targetPartName: null });

  const handleExportOrderPartsDetails = async () => {
    if (!order) return;
    setGlobalLoadingMessage(LABELS_ZH.EXPORTING_DATA);
    setGlobalError(null);

    try {
        const partsToExport = order.parts || [];
        if (partsToExport.length === 0) {
            setGlobalError("订单中没有零件可供导出。");
            setGlobalLoadingMessage(null);
            return;
        }

        const detailPromises = partsToExport.map(async (orderPart): Promise<CsvExportRow> => {
            const orderPartNumberOriginal = orderPart.partNumber;
            const orderPartNameOriginal = orderPart.partName || null;

            try {
                const res = await apiClient.get<InventoryFullDetailsResult[]>(`/inventory/search-full-details`, { params: { query: orderPartNumberOriginal } });
                
                const potentialMatches = res.data.filter(item => 
                    item.partNumber.toUpperCase().includes(orderPartNumberOriginal.toUpperCase())
                );

                if (potentialMatches.length > 0) {
                    potentialMatches.sort((a, b) => a.partNumber.length - b.partNumber.length);
                    const bestMatch = potentialMatches[0];
                    return {
                        orderPartNumberOriginal: orderPartNumberOriginal,
                        orderPartNameOriginal: orderPartNameOriginal,
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
                        orderPartNumberOriginal: orderPartNumberOriginal,
                        orderPartNameOriginal: orderPartNameOriginal,
                        inventoryPartNumber: null,
                        partNameCn: LABELS_ZH.NOT_FOUND,
                        vehicleModel: LABELS_ZH.NOT_FOUND,
                        origin: LABELS_ZH.NOT_FOUND,
                        unit: LABELS_ZH.NOT_FOUND,
                        stockQuantity: 0,
                        notes: `未在库存记录中找到与订单零件 ${orderPartNumberOriginal} 相似的项`,
                    };
                }
            } catch (apiError) {
                console.error(`Error fetching details for part ${orderPartNumberOriginal}:`, apiError);
                return {
                    orderPartNumberOriginal: orderPartNumberOriginal,
                    orderPartNameOriginal: orderPartNameOriginal,
                    inventoryPartNumber: null,
                    partNameCn: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
                    vehicleModel: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
                    origin: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
                    unit: LABELS_ZH.ERROR_FETCHING_PART_DETAILS,
                    stockQuantity: 'Error',
                    notes: `查询订单零件 ${orderPartNumberOriginal} 的库存详情时出错`,
                };
            }
        });
        
        const results: CsvExportRow[] = await Promise.all(detailPromises);

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
        link.setAttribute("download", `${order.name}_零件库存详情_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (err: any) {
        console.error("Export failed:", err);
        setGlobalError(err.message || "导出数据失败。");
    } finally {
        setGlobalLoadingMessage(null);
    }
  };

  const handleBatchStockCheck = async () => {
    if (!order) return;
    setGlobalLoadingMessage(LABELS_ZH.BATCH_CHECKING_STOCK); 
    setBatchStockViewModalState({ isOpen: true, isLoading: true, results: null, error: null });
    try {
        const partsForStockCheck = order.parts || [];
        if (partsForStockCheck.length === 0) {
            setBatchStockViewModalState({ isOpen: true, isLoading: false, results: [], error: LABELS_ZH.NO_PARTS_FOR_BATCH_STOCK });
            setGlobalLoadingMessage(null);
            return;
        }
        
        const stockPromises = partsForStockCheck.map(async (orderPart) => {
            const orderPartNumber = orderPart.partNumber; 
            const orderPartName = orderPart.partName;   
            try {
                const response = await apiClient.get<InventorySearchResult[]>(`/inventory/search`, { params: { query: orderPartNumber } });
                
                const potentialMatches = response.data.filter(item => 
                    item.partNumber.toUpperCase().includes(orderPartNumber.toUpperCase())
                );

                if (potentialMatches.length > 0) {
                    potentialMatches.sort((a, b) => a.partNumber.length - b.partNumber.length);
                    const bestMatch = potentialMatches[0]; 
                    return { 
                        partNumber: orderPartNumber,
                        partName: orderPartName,
                        stockQuantity: bestMatch.stockQuantity
                    };
                } else {
                    return { partNumber: orderPartNumber, partName: orderPartName, stockQuantity: 'N/A' };
                }
            } catch (searchError){
                console.error(`Error checking stock for part ${orderPartNumber}:`, searchError);
                return { partNumber: orderPartNumber, partName: orderPartName, stockQuantity: 'Error' };
            }
        });

        const results = await Promise.all(stockPromises);
        setBatchStockViewModalState({ isOpen: true, isLoading: false, results, error: null });

    } catch (err: any) {
        console.error("Batch stock check failed:", err);
        setBatchStockViewModalState({ isOpen: true, isLoading: false, results: null, error: err.message || "批量查询库存失败。" });
    } finally {
      setGlobalLoadingMessage(null); 
    }
  };
  
  const commonInputClass = "w-full p-1.5 sm:p-2.5 border border-slate-300 rounded-lg focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 text-xs sm:text-sm shadow-sm transition-colors duration-150 ease-in-out bg-white hover:border-slate-400 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
  const commonCheckboxClass = "h-4 w-4 sm:h-5 sm:w-5 text-sky-600 border-slate-400 rounded focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 shadow-sm transition-all";
  
  const mainOperationInProgress = !!globalLoadingMessage;

  const getActionConfirmationModalProps = () => {
    if (!actionConfirmationState) return null;
    const { action, partName, callback } = actionConfirmationState;
    let title = '';
    let message: React.ReactNode = '';

    switch (action) {
      case 'discardChanges':
        title = LABELS_ZH.UNSAVED_CHANGES_TITLE;
        message = LABELS_ZH.UNSAVED_CHANGES_MESSAGE;
        break;
      case 'deletePart':
        title = LABELS_ZH.CONFIRM_DELETE_PART_TITLE;
        message = `${LABELS_ZH.CONFIRM_DELETE_PART_MSG} (零件: ${partName || '该零件'})`;
        break;
      case 'restorePart':
        title = LABELS_ZH.CONFIRM_RESTORE_PART_TITLE;
        message = `${LABELS_ZH.CONFIRM_RESTORE_PART_MSG} (零件: ${partName || '该零件'})`;
        break;
      case 'permanentlyDeletePart':
        title = LABELS_ZH.CONFIRM_PERMANENTLY_DELETE_PART_TITLE;
        message = `${LABELS_ZH.CONFIRM_PERMANENTLY_DELETE_PART_MSG} (零件: ${partName || '该零件'})`;
        break;
      default: return null;
    }
    return { title, message, onConfirm: callback };
  };
  const confirmationModalContent = getActionConfirmationModalProps();

  const partForNotesModal = editingPartIdForNotes && order?.parts
    ? order.parts.find(p => p.id === editingPartIdForNotes) 
    : null;

  if (isLoading) {
      return <div className="flex-grow flex items-center justify-center text-sky-600"><div className="text-xl font-semibold p-8 bg-white rounded-lg shadow-md">{LABELS_ZH.LOADING_ORDER_DETAILS}</div></div>;
  }

  if (!order) {
    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <div role="alert" className="w-full max-w-lg text-sm text-center text-red-700 p-6 bg-red-50 border border-red-300 rounded-lg shadow-xl">
                <p className="font-semibold text-lg mb-2">无法加载订单</p>
                <p>{globalError || '订单未找到或加载时发生未知错误。'}</p>
                 <button onClick={onBack} className="mt-4 px-5 py-2 bg-sky-600 text-white text-xs font-medium rounded-md hover:bg-sky-700 transition-colors">
                    {LABELS_ZH.BACK_TO_ORDERS}
                </button>
            </div>
        </div>
    );
  }

  const tableHeaders = [
      { label: '', width: "min-w-[3rem]" }, // Expander
      { label: LABELS_ZH.COLUMN_PART_NUMBER, width: "min-w-[10rem]" },
      { label: LABELS_ZH.COLUMN_PART_NAME, width: "min-w-[12rem]" },
      { label: LABELS_ZH.COLUMN_QUANTITY, width: "min-w-[5rem]" },
      { label: LABELS_ZH.COLUMN_INITIAL_STOCK, width: "min-w-[5rem]" },
      { label: LABELS_ZH.COLUMN_LATEST_STOCK, width: "min-w-[5rem]" },
      { label: LABELS_ZH.COLUMN_LAST_STOCK_CHECK, width: "min-w-[9rem]" },
      { label: LABELS_ZH.COLUMN_STOCK_CHECK, width: "min-w-[8rem]" },
      { label: LABELS_ZH.COLUMN_IS_ARRIVED, width: "min-w-[4rem]" },
      { label: LABELS_ZH.COLUMN_IS_ORDER_COMPLETE, width: "min-w-[5rem]" },
      { label: LABELS_ZH.COLUMN_ACTIONS, width: "min-w-[5rem]" }
  ];
  const colSpan = tableHeaders.length;


  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-200/80 space-y-6 w-full">
        <div className="mb-6 space-y-4">
            <div className="relative">
                <button
                onClick={handleAttemptNavigateBack}
                disabled={mainOperationInProgress}
                aria-label={LABELS_ZH.BACK_TO_ORDERS}
                className="absolute top-0 left-0 flex items-center text-sky-600 hover:text-sky-700 transition-colors text-sm font-medium p-2 pr-3 rounded-lg hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:opacity-60"
                >
                <ChevronLeftIcon className="w-5 h-5 mr-1" />
                {LABELS_ZH.BACK_TO_ORDERS}
                </button>
                <h2 className="text-2xl sm:text-3xl font-semibold text-sky-700 text-center pt-10 sm:pt-0">
                {LABELS_ZH.ORDER_DETAILS_FOR} <span className="font-bold text-sky-600">{order.name}</span>
                </h2>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 border-b pb-4 border-slate-200">
                <button
                    onClick={handleToggleEditMode}
                    disabled={mainOperationInProgress}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60
                                ${isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white focus-visible:ring-amber-500' 
                                            : 'bg-sky-600 hover:bg-sky-700 text-white focus-visible:ring-sky-500'}`}
                >
                    <EditIcon className="w-4 h-4 mr-1.5" />
                    {isEditMode ? (hasUnsavedChanges ? LABELS_ZH.CANCEL_EDIT_MODE : LABELS_ZH.FINISH_EDIT_MODE) : LABELS_ZH.EDIT_MODE}
                </button>
                {isEditMode && (
                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasUnsavedChanges || mainOperationInProgress}
                        className="flex items-center px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                    >
                        <DiskSaveIcon className="w-4 h-4 mr-1.5" />
                        {LABELS_ZH.SAVE_CHANGES_BUTTON}
                    </button>
                )}
                <button
                    onClick={handleExportOrderPartsDetails}
                    disabled={mainOperationInProgress || isEditMode}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-60"
                >
                    <DownloadIcon className="w-4 h-4 mr-1.5" />
                    {LABELS_ZH.EXPORT_BUTTON}
                </button>
                <button
                    onClick={handleBatchStockCheck}
                    disabled={mainOperationInProgress || isEditMode}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-60"
                >
                    <ListIcon className="w-4 h-4 mr-1.5" />
                    {LABELS_ZH.BATCH_STOCK_CHECK_BUTTON}
                </button>
                 <button
                    onClick={handleAddPart}
                    disabled={mainOperationInProgress || isEditMode} // Disable add part in edit mode
                    className="flex items-center px-4 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:opacity-60 ml-auto" // ml-auto to push to the right
                >
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    {LABELS_ZH.ADD_PART}
                </button>
            </div>
        </div>

        {globalLoadingMessage && <div className="flex items-center justify-center p-3 my-3 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-sm"><SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> {globalLoadingMessage}</div>}
        {globalError && <div role="alert" className="mb-4 text-sm text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">{globalError} <button onClick={() => setGlobalError(null)} className="ml-2 text-xs font-semibold underline">清除</button></div>}
        
        <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200/90 table-fixed">
            <thead className="bg-slate-100/70">
            <tr>
                {tableHeaders.map(header => (
                <th key={header.label} scope="col" className={`px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${header.width}`}>
                    {header.label}
                </th>
                ))}
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200/90">
            {(order.parts || []).map((part, index) => {
                const isExpanded = expandedPartIds.has(part.id);
                return (
                    <React.Fragment key={part.id}>
                    <tr onClick={() => toggleExpandPart(part.id)} className={`cursor-pointer hover:bg-sky-50/30 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${mainOperationInProgress && !isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
                        <td className="px-3 py-2.5 text-slate-400">
                            <ChevronDownIcon className={`w-5 h-5 mx-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-700 align-top">
                            <input type="text" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_PART_NUMBER} for ${part.partName || 'new part'}`} value={part.partNumber} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => handleLocalPartInputChange(part.id, 'partNumber', e.target.value)} 
                                    className={`${commonInputClass} ${fieldErrors[`${part.id}-partNumber`] || fieldErrors[`${part.id}-general`] ? 'border-red-500 ring-red-500' : ''}`}/>
                            {(fieldErrors[`${part.id}-partNumber`] || fieldErrors[`${part.id}-general`]) && <p className="text-xs text-red-500 mt-1">{fieldErrors[`${part.id}-partNumber`] || fieldErrors[`${part.id}-general`]}</p>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-700 align-top">
                            <input type="text" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_PART_NAME} for ${part.partNumber || 'new part'}`} value={part.partName} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => handleLocalPartInputChange(part.id, 'partName', e.target.value)}
                                    className={`${commonInputClass} ${fieldErrors[`${part.id}-partName`] ? 'border-red-500 ring-red-500' : ''}`}/>
                            {fieldErrors[`${part.id}-partName`] && <p className="text-xs text-red-500 mt-1">{fieldErrors[`${part.id}-partName`]}</p>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-700 align-top">
                            <input type="number" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_QUANTITY} for ${part.partName || 'new part'}`} value={part.quantity} 
                                    min="0"
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => handleLocalPartInputChange(part.id, 'quantity', parseInt(e.target.value,10) || 0)}
                                    className={`${commonInputClass} text-center ${fieldErrors[`${part.id}-quantity`] ? 'border-red-500 ring-red-500' : ''}`}/>
                            {fieldErrors[`${part.id}-quantity`] && <p className="text-xs text-red-500 mt-1">{fieldErrors[`${part.id}-quantity`]}</p>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-700 align-middle text-center">
                            {part.initialStock ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm align-middle text-center">
                            <span className={
                                typeof part.initialStock === 'number' && typeof part.latestStock === 'number'
                                ? part.latestStock > part.initialStock ? 'text-emerald-600 font-semibold' : part.latestStock < part.initialStock ? 'text-amber-600' : ''
                                : ''
                            }>
                                {part.latestStock ?? '—'}
                                {typeof part.initialStock === 'number' && typeof part.latestStock === 'number' && part.latestStock > part.initialStock && <span className="ml-1">▲</span>}
                            </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500 align-middle text-center">
                            {part.lastStockCheck ? new Date(part.lastStockCheck).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-700 text-center align-middle">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCheckStock(part.id, part.partNumber, part.partName); }}
                                disabled={mainOperationInProgress || stockCheckModalState.isLoading || isEditMode}
                                className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-100 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                title={LABELS_ZH.CHECK_STOCK_BUTTON} aria-label={`${LABELS_ZH.CHECK_STOCK_BUTTON} for ${part.partName || part.partNumber}`}
                            >
                                <SearchIcon className="w-4 h-4 mr-1.5" /> {LABELS_ZH.CHECK_STOCK_BUTTON}
                            </button>
                        </td>
                        <td className="px-3 py-2.5 text-center align-middle">
                            <label onClick={e => e.stopPropagation()} htmlFor={`isArrived-${part.id}`} className={`flex items-center justify-center p-1 ${!isEditMode || mainOperationInProgress ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input id={`isArrived-${part.id}`} type="checkbox" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_IS_ARRIVED} for ${part.partName || 'new part'}`} checked={part.isArrived} 
                                    onChange={(e) => handleLocalPartInputChange(part.id, 'isArrived', e.target.checked)}
                                    className={`${commonCheckboxClass} ${!isEditMode || mainOperationInProgress ? 'disabled:opacity-70 disabled:cursor-not-allowed' : 'cursor-pointer'}`}/>
                            </label>
                        </td>
                        <td className="px-3 py-2.5 text-center align-middle">
                            <label onClick={e => e.stopPropagation()} htmlFor={`isOrderComplete-${part.id}`} className={`flex items-center justify-center p-1 ${!isEditMode || mainOperationInProgress ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input id={`isOrderComplete-${part.id}`} type="checkbox" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_IS_ORDER_COMPLETE} for ${part.partName || 'new part'}`} checked={part.isOrderComplete} 
                                    onChange={(e) => handleLocalPartInputChange(part.id, 'isOrderComplete', e.target.checked)}
                                    className={`${commonCheckboxClass} ${!isEditMode || mainOperationInProgress ? 'disabled:opacity-70 disabled:cursor-not-allowed' : 'cursor-pointer'}`}/>
                            </label>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-center align-middle">
                            <button
                            onClick={(e) => { e.stopPropagation(); createPartActionHandler('deletePart', part); }}
                            disabled={mainOperationInProgress || isEditMode}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed"
                            title={LABELS_ZH.DELETE_PART} aria-label={`${LABELS_ZH.DELETE_PART} ${part.partName || part.partNumber}`}
                            > <TrashIcon className="w-5 h-5" /> </button>
                        </td>
                    </tr>
                    <tr className="bg-white">
                        <td colSpan={colSpan} className="collapsible-td p-0 border-none">
                            <div className={`collapsible-content-container ${isExpanded ? 'expanded' : ''}`}>
                                <div className="collapsible-content-inner grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                    {/* -- Supplier -- */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">{LABELS_ZH.COLUMN_SUPPLIER}</label>
                                        <input type="text" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_SUPPLIER} for ${part.partName || 'new part'}`} value={part.supplier || ''} 
                                                onChange={(e) => handleLocalPartInputChange(part.id, 'supplier', e.target.value)}
                                                className={`${commonInputClass} ${fieldErrors[`${part.id}-supplier`] ? 'border-red-500 ring-red-500' : ''}`}/>
                                    </div>
                                     {/* -- Purchaser -- */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">{LABELS_ZH.COLUMN_PURCHASER}</label>
                                        <input type="text" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_PURCHASER} for ${part.partName || 'new part'}`} value={part.purchaser || ''} 
                                                onChange={(e) => handleLocalPartInputChange(part.id, 'purchaser', e.target.value)}
                                                className={`${commonInputClass} ${fieldErrors[`${part.id}-purchaser`] ? 'border-red-500 ring-red-500' : ''}`}/>
                                    </div>
                                    {/* -- Est. Shipping Date -- */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">{LABELS_ZH.COLUMN_ESTIMATED_SHIPPING_DATE}</label>
                                        <input type="date" disabled={!isEditMode || mainOperationInProgress} aria-label={`${LABELS_ZH.COLUMN_ESTIMATED_SHIPPING_DATE} for ${part.partName || 'new part'}`} value={part.estimatedShippingDate || ''} 
                                                onChange={(e) => handleLocalPartInputChange(part.id, 'estimatedShippingDate', e.target.value)}
                                                className={`${commonInputClass} ${fieldErrors[`${part.id}-estimatedShippingDate`] ? 'border-red-500 ring-red-500' : ''}`}/>
                                    </div>
                                    {/* -- Notes -- */}
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => openNotesModal(part)}
                                            disabled={mainOperationInProgress && !isEditMode}
                                            className="flex items-center justify-center w-full px-3 py-2.5 text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed"
                                            title={LABELS_ZH.EDIT_NOTES} aria-label={`${LABELS_ZH.EDIT_NOTES} for ${part.partName || part.partNumber}`}
                                        >
                                            <NotesIcon className="w-5 h-5 mr-1.5 flex-shrink-0" /> <span className="text-sm font-medium">{LABELS_ZH.EDIT_NOTES}</span>
                                        </button>
                                    </div>
                                    {/* -- Monitoring Settings -- */}
                                    <div className="lg:col-span-2 p-3 bg-slate-100/70 rounded-lg">
                                        <label className="block text-xs font-semibold text-slate-600 mb-2">{LABELS_ZH.COLUMN_MONITORING_SETTINGS}</label>
                                         {updatingMonitoringPartId === part.id ? (
                                            <div className="flex items-center justify-center h-full p-4">
                                                <SpinnerIcon className="w-6 h-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-6">
                                                <label htmlFor={`isMonitored-${part.id}`} className="flex items-center cursor-pointer text-sm">
                                                    <input
                                                    id={`isMonitored-${part.id}`}
                                                    type="checkbox"
                                                    checked={part.isMonitored ?? true}
                                                    onChange={(e) => handleMonitoringChange(part.id, 'isMonitored', e.target.checked)}
                                                    disabled={mainOperationInProgress}
                                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                    <span className="ml-2 text-slate-700 select-none">{LABELS_ZH.LABEL_IS_MONITORED}</span>
                                                </label>
                                                <div className="flex items-center">
                                                    <input
                                                    type="number"
                                                    min="1"
                                                    disabled={!(part.isMonitored ?? true) || mainOperationInProgress}
                                                    defaultValue={part.stockCheckInterval ? part.stockCheckInterval / 60 : 15}
                                                    onBlur={(e) => handleMonitoringChange(part.id, 'stockCheckInterval', parseInt(e.target.value, 10))}
                                                    aria-label={LABELS_ZH.LABEL_CHECK_INTERVAL_MIN}
                                                    className={`${commonInputClass.replace('w-full', '')} w-20 text-center text-sm p-1 disabled:bg-slate-200/70 disabled:cursor-not-allowed`}
                                                    />
                                                    <span className="ml-1.5 text-xs text-slate-600 select-none">{LABELS_ZH.LABEL_CHECK_INTERVAL_MIN}</span>
                                                </div>
                                                {fieldErrors[`${part.id}-stockCheckInterval`] && <p className="text-xs text-red-500 mt-1">{fieldErrors[`${part.id}-stockCheckInterval`]}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    </React.Fragment>
                );
            })}
            </tbody>
        </table>
        {(order.parts || []).length === 0 && <p className="text-center text-slate-500 py-10 text-md">此订单中没有活动零件。</p>}
        </div>

        {(order.recycledParts && order.recycledParts.length > 0) && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-700 mb-4 pt-4 border-t border-slate-200/80">{LABELS_ZH.RECYCLED_PARTS_TITLE}</h3>
            <div className={`overflow-x-auto rounded-lg border border-slate-200/90 shadow-sm ${mainOperationInProgress || isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
              <table className="min-w-full divide-y divide-slate-200/90">
                 <thead className="bg-slate-100/70">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.COLUMN_PART_NUMBER}</th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.COLUMN_PART_NAME}</th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.DELETED_ON}</th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{LABELS_ZH.COLUMN_ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/90">
                  {(order.recycledParts || []).map((part, index) => (
                    <tr key={`recycled-${part.id}`} className={`hover:bg-slate-50/30 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{part.partNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{part.partName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {part.deletedDate ? new Date(part.deletedDate).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour:'2-digit', minute:'2-digit'}) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => createPartActionHandler('restorePart', part)}
                          disabled={mainOperationInProgress || isEditMode}
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed"
                          title={LABELS_ZH.RESTORE} aria-label={`${LABELS_ZH.RESTORE} ${part.partName || part.partNumber}`}
                        ><RestoreIcon className="w-5 h-5" /></button>
                        <button
                          onClick={() => createPartActionHandler('permanentlyDeletePart', part)}
                          disabled={mainOperationInProgress || isEditMode}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed"
                          title={LABELS_ZH.PERMANENTLY_DELETE} aria-label={`${LABELS_ZH.PERMANENTLY_DELETE} ${part.partName || part.partNumber}`}
                        ><TrashIcon className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <InventoryStockModal
        isOpen={stockCheckModalState.isOpen}
        onClose={closeStockCheckModal}
        isLoading={stockCheckModalState.isLoading}
        error={stockCheckModalState.error}
        results={stockCheckModalState.results}
        searchedPartNumber={stockCheckModalState.targetPartNumber}
        searchedPartName={stockCheckModalState.targetPartName}
        onViewPreciseDetails={onViewPreciseDetails}
      />

      <BatchStockViewModal
        isOpen={batchStockViewModalState.isOpen}
        onClose={() => setBatchStockViewModalState({ isOpen: false, isLoading: false, results: null, error: null })}
        isLoading={batchStockViewModalState.isLoading}
        error={batchStockViewModalState.error}
        results={batchStockViewModalState.results}
        orderName={order.name}
        onViewPreciseDetails={onViewPreciseDetails}
      />

      {partForNotesModal && isNotesModalOpen && (
        <NotesModal
          key={partForNotesModal.id}
          isOpen={isNotesModalOpen}
          onClose={closeNotesModal}
          partName={partForNotesModal.partName || partForNotesModal.partNumber}
          partId={partForNotesModal.id}
          orderId={order.id}
          currentNote={partForNotesModal.notes || { text: '', images: [] }}
          onDataDidChange={handleNotesDataChangedViaImages} 
          onSaveText={handleSaveNoteTextFromModal}
        />
      )}
      {actionConfirmationState && confirmationModalContent && (
        <ConfirmationModal
          isOpen={!!actionConfirmationState}
          onClose={() => setActionConfirmationState(null)}
          onConfirm={confirmationModalContent.onConfirm}
          title={confirmationModalContent.title}
          message={confirmationModalContent.message}
        />
      )}
    </>
  );
};

export default OrderDetails;