import React, { useState, useEffect, useCallback } from 'react';
import { Order, User, AuthResponse } from './types';
import { LABELS_ZH, LOCAL_STORAGE_TOKEN_KEY } from './constants';
import apiClient from './apiClient';
import FileUpload from './components/order/FileUpload';
import { OrderList } from './components/order/OrderList';
import ConfirmationModal from './components/common/ConfirmationModal';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import InventorySearch from './components/inventory/InventorySearch';
import SmartMemo from './components/memo/SmartMemo';
import PostRegistrationInfoModal from './components/auth/PostRegistrationInfoModal';
import PartInfoExport from './components/part/PartInfoExport';

type AppView = 'login' | 'register' | 'app';

type AppConfirmationState = {
  action: 'deleteOrder' | 'restoreOrder' | 'permanentlyDeleteOrder';
  orderId: string;
  orderName?: string;
  callback: () => Promise<void>; 
} | null;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY));
  const [currentView, setCurrentView] = useState<AppView>('login'); 
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [recycledOrders, setRecycledOrders] = useState<Order[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [appConfirmationState, setAppConfirmationState] = useState<AppConfirmationState>(null);
  
  // State for Post Registration Info Modal
  const [postRegistrationInfo, setPostRegistrationInfo] = useState<{ email: string; passwordHint: string; } | null>(null);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem('currentUser');
    if (apiClient.defaults.headers.common['Authorization']) {
        delete apiClient.defaults.headers.common['Authorization'];
    }
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setRecycledOrders([]);
    setCurrentView('login');
    setAuthError(null); 
    setDataError(null);
    setIsLoading(false); 
  }, []);
  
  const fetchOrderLists = useCallback(async (activeToken: string | null) => {
    if (!activeToken) {
      setOrders([]);
      setRecycledOrders([]);
      setIsLoading(false); 
      return;
    }
    setIsLoading(true); 
    setDataError(null);
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;

      const [ordersResponse, recycledOrdersResponse] = await Promise.all([
        apiClient.get<Order[]>('/orders'), 
        apiClient.get<Order[]>('/orders/recycled')
      ]);

      const sortedOrders = ordersResponse.data.sort((a: Order, b: Order) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
      
      const sortedRecycledOrders = recycledOrdersResponse.data.sort((a: Order, b: Order) => 
        new Date(b.deletedDate || 0).getTime() - new Date(a.deletedDate || 0).getTime()
      );

      setOrders(sortedOrders);
      setRecycledOrders(sortedRecycledOrders);

    } catch (error: any) {
      console.error("Failed to fetch order lists:", error);
      if (error.response && error.response.status === 401) {
        // Interceptor handles this
      } else {
        setDataError(error.response?.data?.error || error.message || LABELS_ZH.ERROR_API_GENERAL);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); 

  const fetchUserProfileAndInitialData = useCallback(async (userToken: string) => {
    const storedUserStr = localStorage.getItem('currentUser');
    if (storedUserStr) {
        try {
            const userFromStorage: User = JSON.parse(storedUserStr);
            if (userFromStorage.role === 'admin') {
                window.location.href = '/admin.html';
                return;
            }
            
            setIsLoading(true);
            setAuthError(null);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
            setCurrentUser(userFromStorage);
            setCurrentView('app');
            await fetchOrderLists(userToken);
        } catch (e) {
            console.error("Failed to parse stored user, clearing auth data.", e);
            clearAuthData();
        }
    } else {
        clearAuthData();
    }
}, [fetchOrderLists, clearAuthData]);

  useEffect(() => {
    const handleAuthError401 = () => {
        clearAuthData(); 
        setAuthError(LABELS_ZH.LOGIN_PROMPT); 
    };
    window.addEventListener('authError_401', handleAuthError401);

    const initialToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (initialToken) {
      setToken(initialToken); 
      fetchUserProfileAndInitialData(initialToken);
    } else {
      clearAuthData(); 
    }
    return () => {
        window.removeEventListener('authError_401', handleAuthError401);
    };
  }, [clearAuthData, fetchUserProfileAndInitialData]);

  const handleLogin = async (loginIdentifier: string, passwordVal: string) => {
    setAuthError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { loginIdentifier, password: passwordVal });
      
      console.log("Login response from server:", response.data);
      
      const { token: userToken, userId, username, email, role } = response.data;
      const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : null;

      if (normalizedRole === 'admin') {
          const userToStore: User = { id: userId, username, email, role: 'admin' };
          localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, userToken);
          localStorage.setItem('currentUser', JSON.stringify(userToStore));
          window.location.href = '/admin.html';
          return;
      }
      
      if (normalizedRole !== 'user') {
          const receivedValue = role === null ? 'null' : role === undefined ? 'undefined' : `'${role}'`;
          const errorMsg = `服务器返回了无效或缺失的用户角色。收到的值: ${receivedValue}。请将此消息和浏览器控制台中的 'Login response from server' 日志提供给后端开发人员。`;
          console.error(errorMsg, "Full response:", response.data);
          throw new Error(errorMsg);
      }
      
      setIsLoading(true);
      const userToStore: User = { id: userId, username, email, role: 'user' };
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, userToken);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      
      setToken(userToken);
      setCurrentUser(userToStore);
      setCurrentView('app');
      await fetchOrderLists(userToken);

    } catch (error: any) {
      console.error("Login failed:", error);
      clearAuthData();
      setCurrentView('login');

      if (error.response && (error.response.status === 401 || error.response.status === 400)) {
        setAuthError(error.response?.data?.error || LABELS_ZH.ERROR_INVALID_CREDENTIALS);
      } else if (error.message.includes('无效或缺失的用户角色')) {
        setAuthError(error.message);
      } else if (!error.response) { 
        setAuthError(LABELS_ZH.ERROR_API_GENERAL + " (无法连接到服务器)");
      } else {
        setAuthError(LABELS_ZH.ERROR_API_GENERAL);
      }
    }
  };

  const handleRegister = async (usernameVal: string, passwordVal: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', { username: usernameVal, password: passwordVal });
      if (response.data.emailInfo) {
        setPostRegistrationInfo(response.data.emailInfo);
      }
      setCurrentView('login');

    } catch (error: any) {
      console.error("Registration failed:", error);
      setCurrentView('register');

      if (error.response && error.response.data && error.response.data.error) {
          if (error.response.data.error.includes("Username already in use")) {
            setAuthError(LABELS_ZH.ERROR_USERNAME_IN_USE);
          } else {
            setAuthError(error.response.data.error); 
          }
      } else if (!error.response) {
         setAuthError(LABELS_ZH.ERROR_API_GENERAL + " (无法连接到服务器)");
      } else {
        setAuthError(LABELS_ZH.ERROR_REGISTRATION_FAILED); 
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    clearAuthData();
  };

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setAuthError(LABELS_ZH.LOGIN_PROMPT);
      return Promise.reject(new Error(LABELS_ZH.LOGIN_PROMPT));
    }
    setIsLoading(true); 
    setDataError(null);
    const formData = new FormData();
    formData.append('orderFile', file); 

    try {
      const response = await apiClient.post<Order>('/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newlyCreatedOrder = response.data;
      
      await fetchOrderLists(token); 
      window.location.href = `/order.html?id=${newlyCreatedOrder.id}`;

    } catch (error: any) {
      console.error("Order upload failed:", error);
      setDataError(error.response?.data?.error || error.message || LABELS_ZH.ERROR_FILE_READ);
      setIsLoading(false);
      return Promise.reject(error); 
    }
  };

  const handleOrderSelection = (orderId: string) => {
    window.location.href = `/order.html?id=${orderId}`;
  };

  const handleOrderNameChange = async (orderId: string, newName: string) => {
    if (!token) {
        setDataError(LABELS_ZH.LOGIN_PROMPT);
        return;
    }
    setDataError(null);
    try {
        await apiClient.put(`/orders/${orderId}/rename`, { name: newName });
        await fetchOrderLists(token); 
    } catch (error: any) {
        console.error("Rename order failed:", error);
        setDataError(error.response?.data?.error || error.message || `订单重命名失败。`);
    }
  };

  const requestDeleteConfirmation = (order: Order) => {
    setAppConfirmationState({
        action: 'deleteOrder',
        orderId: order.id,
        orderName: order.name,
        callback: async () => {
            if (!token) { setDataError(LABELS_ZH.LOGIN_PROMPT); return; }
            setDataError(null);
            try {
                await apiClient.delete(`/orders/${order.id}`);
                await fetchOrderLists(token);
            } catch (error: any) {
                console.error("Delete order failed:", error);
                setDataError(error.response?.data?.error || error.message || `订单删除失败。`);
            }
        }
    });
  };

  const requestRestoreConfirmation = (order: Order) => {
    setAppConfirmationState({
        action: 'restoreOrder',
        orderId: order.id,
        orderName: order.name,
        callback: async () => {
            if (!token) { setDataError(LABELS_ZH.LOGIN_PROMPT); return; }
            setDataError(null);
            try {
                await apiClient.post(`/orders/${order.id}/restore`);
                await fetchOrderLists(token);
            } catch (error: any) {
                console.error("Restore order failed:", error);
                setDataError(error.response?.data?.error || error.message || `订单恢复失败。`);
            }
        }
    });
  };

  const requestPermanentlyDeleteConfirmation = (order: Order) => {
     setAppConfirmationState({
        action: 'permanentlyDeleteOrder',
        orderId: order.id,
        orderName: order.name,
        callback: async () => {
            if (!token) { setDataError(LABELS_ZH.LOGIN_PROMPT); return; }
            setDataError(null);
            try {
                await apiClient.delete(`/orders/${order.id}/permanent`);
                await fetchOrderLists(token);
            } catch (error: any) {
                console.error("Permanent delete order failed:", error);
                setDataError(error.response?.data?.error || error.message || `订单彻底删除失败。`);
            }
        }
    });
  };

  const renderContent = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        <div className="lg:col-span-1 space-y-8 sm:space-y-10">
          <FileUpload onOrderUploaded={handleFileUpload} />
          <InventorySearch />
          <SmartMemo />
        </div>
        <div className="lg:col-span-2 space-y-8 sm:space-y-10">
          <PartInfoExport />
          <OrderList 
            orders={orders} 
            recycledOrders={recycledOrders}
            onSelectOrder={handleOrderSelection} 
            onRequestDeleteOrder={requestDeleteConfirmation}
            onRequestRestoreOrder={requestRestoreConfirmation}
            onRequestPermanentlyDeleteOrder={requestPermanentlyDeleteConfirmation}
            onRenameOrder={handleOrderNameChange}
          />
        </div>
      </div>
    );
  };

  // --- Render logic ---
  if (isLoading && !currentUser) {
      return <div className="flex h-screen items-center justify-center text-sky-600"><div className="text-xl font-semibold p-8 bg-white rounded-lg shadow-md">{LABELS_ZH.LOADING}</div></div>;
  }
  
  if (!currentUser) {
    if (currentView === 'register') {
      return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => { setAuthError(null); setCurrentView('login'); }} isLoading={isLoading} error={authError} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => { setAuthError(null); setCurrentView('register'); }} isLoading={isLoading} error={authError} />;
  }
  
  // This is the main view for a logged-in regular user
  return (
    <div className="flex-grow flex flex-col">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-20 shadow-sm border-b border-slate-200/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl sm:text-2xl font-bold text-sky-700">{LABELS_ZH.APP_TITLE}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 hidden sm:inline">欢迎, <strong className="font-semibold">{currentUser.username}</strong></span>
              <a 
                href="/quote.html"
                className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500">
                {LABELS_ZH.QUOTE_MANAGEMENT_BUTTON}
              </a>
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
        {dataError && (
          <div role="alert" className="mb-4 text-sm text-center text-red-700 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            {dataError}
            <button onClick={() => setDataError(null)} className="ml-2 text-xs font-semibold underline">清除</button>
          </div>
        )}
        {renderContent()}
      </main>

      {/* Modals and Global Components */}
      <footer className="bg-white/80 backdrop-blur-lg py-4 border-t border-slate-200/80 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
              <p>&copy; {new Date().getFullYear()} {LABELS_ZH.APP_TITLE}. All Rights Reserved.</p>
          </div>
      </footer>
      
      {appConfirmationState && (
        <ConfirmationModal
          isOpen={!!appConfirmationState}
          onClose={() => setAppConfirmationState(null)}
          onConfirm={appConfirmationState.callback}
          title={
              appConfirmationState.action === 'deleteOrder' ? LABELS_ZH.CONFIRM_DELETE_ORDER_TITLE :
              appConfirmationState.action === 'restoreOrder' ? LABELS_ZH.CONFIRM_RESTORE_ORDER_TITLE :
              LABELS_ZH.CONFIRM_PERMANENTLY_DELETE_ORDER_TITLE
          }
          message={
              appConfirmationState.action === 'deleteOrder' ? `${LABELS_ZH.CONFIRM_DELETE_ORDER_MSG} (${appConfirmationState.orderName})` :
              appConfirmationState.action === 'restoreOrder' ? `${LABELS_ZH.CONFIRM_RESTORE_ORDER_MSG} (${appConfirmationState.orderName})` :
              `${LABELS_ZH.CONFIRM_PERMANENTLY_DELETE_ORDER_MSG} (${appConfirmationState.orderName})`
          }
        />
      )}
      
      {postRegistrationInfo && (
        <PostRegistrationInfoModal
          isOpen={!!postRegistrationInfo}
          onClose={() => setPostRegistrationInfo(null)}
          email={postRegistrationInfo.email}
          passwordHint={postRegistrationInfo.passwordHint}
        />
      )}
    </div>
  );
};

export default App;