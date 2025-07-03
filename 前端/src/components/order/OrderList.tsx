import React, { useState, useRef, useEffect } from 'react';
import { Order } from '../types';
import { LABELS_ZH } from '../constants';
import { TrashIcon, EditIcon, SaveIcon, CloseIcon, RestoreIcon } from './icons';

interface OrderListProps {
  orders: Order[];
  recycledOrders: Order[];
  onSelectOrder: (orderId: string) => void;
  onRequestDeleteOrder: (order: Order) => void; 
  onRequestRestoreOrder: (order: Order) => void;
  onRequestPermanentlyDeleteOrder: (order: Order) => void;
  onRenameOrder: (orderId: string, newName: string) => Promise<void>; // Ensure it can be async
}

export const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  recycledOrders,
  onSelectOrder, 
  onRequestDeleteOrder,
  onRequestRestoreOrder,
  onRequestPermanentlyDeleteOrder,
  onRenameOrder 
}) => {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingOrderId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingOrderId]);

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrderId(order.id);
    setEditingName(order.name);
  };

  const handleSaveName = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (editingName.trim() && !isRenaming) {
      setIsRenaming(true);
      try {
        await onRenameOrder(orderId, editingName.trim());
      } catch (error) {
        console.error("Rename failed in OrderList:", error);
        // Optionally, inform parent or show local error
      } finally {
        setIsRenaming(false);
        setEditingOrderId(null);
      }
    } else {
      setEditingOrderId(null); // If name is empty, just cancel
    }
  };
  
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrderId(null);
  };

  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, orderId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (editingName.trim() && !isRenaming) {
        setIsRenaming(true);
        try {
          await onRenameOrder(orderId, editingName.trim());
        } catch (error) {
           console.error("Rename failed (Enter):", error);
        } finally {
          setIsRenaming(false);
          setEditingOrderId(null);
        }
      } else {
        setEditingOrderId(null);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingOrderId(null);
    }
  };

  const renderOrderCard = (order: Order, isRecycled = false) => (
    <div
      key={order.id}
      className={`group p-5 sm:p-6 border rounded-xl transition-all duration-200 ease-in-out ${
        isRecycled 
        ? 'border-slate-300/70 bg-slate-100/60 hover:shadow-lg hover:border-slate-400' 
        : 'border-slate-200/90 hover:shadow-2xl hover:border-sky-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500 focus-within:ring-offset-white bg-slate-50/50 hover:bg-white'
      } ${!isRecycled && editingOrderId !== order.id && 'cursor-pointer'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRecycled && editingOrderId !== order.id) { // Only trigger if click is on the card itself
            onSelectOrder(order.id);
        }
      }}
      tabIndex={!isRecycled && editingOrderId === order.id ? -1 : 0}
      onKeyPress={(e) => {
        if (e.target === e.currentTarget && e.key === 'Enter' && !isRecycled && editingOrderId !== order.id) {
            onSelectOrder(order.id);
        }
      }}
      role={!isRecycled ? "button" : undefined}
      aria-label={!isRecycled ? `查看订单 ${order.name} 详情` : `已回收订单 ${order.name}`}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-start">
        <div className="mb-4 sm:mb-0 flex-grow">
          {editingOrderId === order.id && !isRecycled ? (
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={handleNameInputChange}
                onKeyDown={(e) => handleKeyDown(e, order.id)}
                disabled={isRenaming}
                className="text-lg font-semibold text-sky-700 border-b-2 border-sky-500 focus:outline-none py-1.5 px-2 w-full bg-transparent focus:bg-white rounded-t-md disabled:opacity-70"
                aria-label={LABELS_ZH.EDIT_ORDER_NAME}
              />
              <button 
                  onClick={(e) => handleSaveName(e, order.id)} 
                  disabled={isRenaming || !editingName.trim()}
                  className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={LABELS_ZH.SAVE_ORDER_NAME} aria-label={LABELS_ZH.SAVE_ORDER_NAME}
              ><SaveIcon className="w-5 h-5"/></button>
              <button 
                  onClick={handleCancelEdit}
                  disabled={isRenaming}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={LABELS_ZH.CANCEL_EDIT} aria-label={LABELS_ZH.CANCEL_EDIT}
              ><CloseIcon className="w-5 h-5"/></button>
            </div>
          ) : (
            <div className="flex items-center">
               <h3 
                  className={`text-xl font-semibold mr-2 leading-tight ${isRecycled ? 'text-slate-600' : 'text-sky-600 group-hover:text-sky-700 transition-colors'}`}
                  onClick={(e) => { e.stopPropagation(); if (!isRecycled) onSelectOrder(order.id); }}
               >
                  {order.name}
              </h3>
              {!isRecycled && (
                <button 
                    onClick={(e) => handleEditClick(e, order)} 
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-100 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    title={LABELS_ZH.RENAME_ORDER} aria-label={`${LABELS_ZH.RENAME_ORDER} for order ${order.name}`}
                ><EditIcon className="w-4 h-4"/></button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1.5">{LABELS_ZH.FILE_NAME}: <span className="font-medium">{order.fileName}</span></p>
          <p className="text-xs text-slate-500">
            {isRecycled && order.deletedDate ? `${LABELS_ZH.DELETED_ON}: ` : `${LABELS_ZH.UPLOAD_DATE}: `}
            {new Date(isRecycled && order.deletedDate ? order.deletedDate : order.uploadDate).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
           <p className={`text-base mt-2 ${isRecycled ? 'text-slate-500' : 'text-slate-600'}`}>零件数量: <span className={`font-semibold ${isRecycled ? 'text-slate-600' : 'text-sky-600'}`}>{order.partCount || 0}</span></p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 mt-3 sm:mt-0 self-start">
          {isRecycled ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRequestRestoreOrder(order); }}
                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                title={LABELS_ZH.RESTORE} aria-label={`${LABELS_ZH.RESTORE} order ${order.name}`}
              ><RestoreIcon className="w-5 h-5" /></button>
              <button
                onClick={(e) => { e.stopPropagation(); onRequestPermanentlyDeleteOrder(order); }}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                title={LABELS_ZH.PERMANENTLY_DELETE} aria-label={`${LABELS_ZH.PERMANENTLY_DELETE} order ${order.name}`}
              ><TrashIcon className="w-5 h-5" /></button>
            </>
          ) : (
            <>
              <button
                  onClick={(e) => { e.stopPropagation(); onRequestDeleteOrder(order);}}
                  disabled={editingOrderId === order.id || isRenaming}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={LABELS_ZH.DELETE_ORDER} aria-label={`${LABELS_ZH.DELETE_ORDER} order ${order.name}`}
              ><TrashIcon className="w-5 h-5" /></button>
              <button
                onClick={(e) => { e.stopPropagation(); if (editingOrderId !== order.id) onSelectOrder(order.id); }}
                disabled={editingOrderId === order.id || isRenaming}
                className="px-5 py-2.5 text-sm font-medium bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label={`${LABELS_ZH.VIEW_DETAILS} for order ${order.name}`}
              >{LABELS_ZH.VIEW_DETAILS}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Active Orders Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
        <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8">{LABELS_ZH.EXISTING_ORDERS}</h2>
        {orders.length > 0 ? (
          <div className="space-y-5 sm:space-y-6">
            {orders.map(order => renderOrderCard(order, false))}
          </div>
        ) : (
           <div className="text-center py-12 sm:py-16">
            <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-slate-700">{LABELS_ZH.NO_ORDERS}</h3>
            <p className="mt-2 text-sm text-slate-500">通过上传文件开始创建新订单。</p>
          </div>
        )}
      </div>

      {/* Recycle Bin Section */}
      {recycledOrders.length > 0 && (
        <div className="mt-10 sm:mt-12 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
          <h2 className="text-2xl font-semibold text-orange-600 mb-6 sm:mb-8">{LABELS_ZH.RECYCLE_BIN_TITLE}</h2>
          <div className="space-y-5 sm:space-y-6">
            {recycledOrders.map(order => renderOrderCard(order, true))}
          </div>
        </div>
      )}
    </>
  );
};