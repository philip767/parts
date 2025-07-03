import React, { useState, useEffect, useCallback } from 'react';
import { AdminOrder } from '../../types';
import { LABELS_ZH } from '../../constants';
import apiClient from '../../apiClient';
import { SpinnerIcon, TrashIcon } from '../icons';
import ConfirmationModal from '../ConfirmationModal';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [orderToDelete, setOrderToDelete] = useState<AdminOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AdminOrder[]>('/admin/orders');
      setOrders(response.data.sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
    } catch (err: any) {
      setError(err.response?.data?.error || LABELS_ZH.FETCH_ORDERS_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      await apiClient.delete(`/admin/orders/${orderToDelete.id}`);
      setNotification({ type: 'success', message: LABELS_ZH.FORCE_DELETE_ORDER_SUCCESS });
      setOrderToDelete(null);
      fetchOrders(); // Refresh list
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || LABELS_ZH.FORCE_DELETE_ORDER_ERROR });
      setOrderToDelete(null);
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><SpinnerIcon className="w-8 h-8" /></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
      {notification && (
        <div className={`p-4 mb-4 rounded-lg text-sm ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{LABELS_ZH.ORDER_NAME}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{LABELS_ZH.COLUMN_ORDER_OWNER}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{LABELS_ZH.COLUMN_QUANTITY}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{LABELS_ZH.UPLOAD_DATE}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{LABELS_ZH.COLUMN_ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{order.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{order.user?.username || '(未知用户)'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{order.partCount || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(order.uploadDate).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setOrderToDelete(order)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg transition-colors" title={LABELS_ZH.PERMANENTLY_DELETE}>
                    <TrashIcon className="w-5 h-5"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orderToDelete && (
        <ConfirmationModal
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={handleDeleteOrder}
          title={LABELS_ZH.FORCE_DELETE_ORDER_TITLE}
          message={`${LABELS_ZH.FORCE_DELETE_ORDER_MSG} (订单: ${orderToDelete.name}, 所属用户: ${orderToDelete.user?.username || '(未知用户)'})`}
        />
      )}
    </div>
  );
};

export default OrderManagement;