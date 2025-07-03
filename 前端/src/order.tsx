import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { User } from './types';
import { LABELS_ZH, LOCAL_STORAGE_TOKEN_KEY } from './constants';
import apiClient from './apiClient';
import OrderDetails from './components/OrderDetails';
import PartDetailsModal from './components/PartDetailsModal';
import './index.css';

const OrderPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Precise Part Details Modal (moved from App.tsx)
    const [precisePartDetailsData, setPrecisePartDetailsData] = useState<Record<string, any> | null>(null);
    const [isLoadingPrecisePartDetails, setIsLoadingPrecisePartDetails] = useState<boolean>(false);
    const [precisePartDetailsError, setPrecisePartDetailsError] = useState<string | null>(null);
    const [isPartDetailsModalOpen, setIsPartDetailsModalOpen] = useState<boolean>(false);
    const [currentPartNumberForDetailsModal, setCurrentPartNumberForDetailsModal] = useState<string | null>(null);

    const redirectToLogin = () => {
        window.location.href = '/'; 
    };

    const handleLogout = () => {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem('currentUser');
        if (apiClient.defaults.headers.common['Authorization']) {
            delete apiClient.defaults.headers.common['Authorization'];
        }
        redirectToLogin();
    };
    
    // Callbacks for the modal (moved from App.tsx)
    const handleOpenPrecisePartDetailsModal = useCallback(async (partNumber: string) => {
        if (!partNumber || !partNumber.trim()) {
            setPrecisePartDetailsError("零件号不能为空。");
            setPrecisePartDetailsData(null);
            setIsLoadingPrecisePartDetails(false);
            setIsPartDetailsModalOpen(true);
            setCurrentPartNumberForDetailsModal(partNumber);
            return;
        }
        
        setCurrentPartNumberForDetailsModal(partNumber);
        setIsPartDetailsModalOpen(true);
        setIsLoadingPrecisePartDetails(true);
        setPrecisePartDetailsData(null);
        setPrecisePartDetailsError(null);

        try {
            const response = await apiClient.get<Record<string, any>>(`/inventory/part/${encodeURIComponent(partNumber.trim())}`);
            setPrecisePartDetailsData(response.data);
        } catch (error: any) {
            console.error("Failed to fetch precise part details:", error);
            if (error.response && error.response.status === 404) {
                setPrecisePartDetailsError(error.response.data?.error || `${LABELS_ZH.NOT_FOUND}: ${partNumber}`);
            } else {
                setPrecisePartDetailsError(error.response?.data?.error || LABELS_ZH.ERROR_FETCHING_PART_DETAILS);
            }
        } finally {
            setIsLoadingPrecisePartDetails(false);
        }
    }, []);

    const handleClosePrecisePartDetailsModal = useCallback(() => {
        setIsPartDetailsModalOpen(false);
        setTimeout(() => {
            setPrecisePartDetailsData(null);
            setPrecisePartDetailsError(null);
            setIsLoadingPrecisePartDetails(false);
            setCurrentPartNumberForDetailsModal(null);
        }, 300); 
    }, []);

    useEffect(() => {
        const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
        const storedUserStr = localStorage.getItem('currentUser');
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('id');

        if (!token || !storedUserStr) {
            setError(LABELS_ZH.LOGIN_PROMPT);
            setIsLoading(false);
            setTimeout(redirectToLogin, 2000);
            return;
        }

        if (!idFromUrl) {
            setError("未提供订单ID。正在返回列表...");
            setIsLoading(false);
            setTimeout(redirectToLogin, 2000);
            return;
        }
        
        try {
            const userFromStorage: User = JSON.parse(storedUserStr);
            setCurrentUser(userFromStorage);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setOrderId(idFromUrl);
        } catch (e) {
            setError("无法验证用户信息，请重新登录。");
            localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
            localStorage.removeItem('currentUser');
            setTimeout(redirectToLogin, 2000);
        } finally {
            setIsLoading(false);
        }

    }, []);

    const handleBack = () => {
        window.location.href = '/';
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center text-sky-600"><div className="text-xl font-semibold p-8 bg-white rounded-lg shadow-md">{LABELS_ZH.LOADING}</div></div>;
    }

    if (error) {
        return (
           <div className="flex h-screen items-center justify-center p-4">
             <div className="text-center p-8 bg-white rounded-lg shadow-md">
               <p className="text-red-600 mb-4">{error}</p>
               <p className="text-sm text-slate-500">正在重定向...</p>
             </div>
           </div>
       );
   }

    if (!currentUser || !orderId) {
        // This case should be handled by the loading/error states, but as a fallback:
        return <div className="flex h-screen items-center justify-center text-slate-500">正在重定向...</div>;
    }

    return (
        <div className="flex-grow flex flex-col">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-20 shadow-sm border-b border-slate-200/80">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-sky-700">{LABELS_ZH.APP_TITLE}</h1>
                    <div className="flex items-center space-x-4">
                    <span className="text-sm text-slate-600 hidden sm:inline">欢迎, <strong className="font-semibold">{currentUser.username}</strong></span>
                    <button 
                        onClick={handleLogout} 
                        className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500">
                        {LABELS_ZH.LOGOUT_BUTTON}
                    </button>
                    </div>
                </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                <OrderDetails 
                    orderId={orderId}
                    onBack={handleBack}
                    onViewPreciseDetails={handleOpenPrecisePartDetailsModal}
                />
            </main>
            
            <footer className="bg-white/80 backdrop-blur-lg py-4 border-t border-slate-200/80 mt-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
                    <p>&copy; {new Date().getFullYear()} {LABELS_ZH.APP_TITLE}. All Rights Reserved.</p>
                </div>
            </footer>

            <PartDetailsModal
                isOpen={isPartDetailsModalOpen}
                onClose={handleClosePrecisePartDetailsModal}
                partDetails={precisePartDetailsData}
                isLoading={isLoadingPrecisePartDetails}
                error={precisePartDetailsError}
                partNumberSearched={currentPartNumberForDetailsModal || ''}
            />
        </div>
    );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <OrderPage />
    </React.StrictMode>
);
