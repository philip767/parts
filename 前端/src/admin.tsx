import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { User } from './types';
import { LOCAL_STORAGE_TOKEN_KEY, LABELS_ZH } from './constants';
import apiClient from './apiClient';
import AdminDashboard from './components/admin/AdminDashboard';
import './index.css';

const AdminApp: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const redirectToLogin = () => {
        // In development, this redirects to index.html. In production, this should redirect to the root domain.
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

    useEffect(() => {
        const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
        const storedUserStr = localStorage.getItem('currentUser');

        if (!token || !storedUserStr) {
            setError(LABELS_ZH.LOGIN_PROMPT);
            setIsLoading(false);
            setTimeout(redirectToLogin, 2000);
            return;
        }

        try {
            const userFromStorage: User = JSON.parse(storedUserStr);
            if (userFromStorage.role !== 'admin') {
                setError("权限不足。您将被重定向到主页。");
                setIsLoading(false);
                setTimeout(redirectToLogin, 2000);
            } else {
                setCurrentUser(userFromStorage);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setIsLoading(false);
            }
        } catch (e) {
            setError("无法验证用户信息，请重新登录。");
            setIsLoading(false);
            localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
            localStorage.removeItem('currentUser');
            setTimeout(redirectToLogin, 2000);
        }
    }, []);

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
    
    if (currentUser) {
        return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
    }

    // This case should ideally not be reached if logic is correct
    return <div className="flex h-screen items-center justify-center text-slate-500">正在重定向...</div>;
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);