import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { User } from './types';
import { LABELS_ZH, LOCAL_STORAGE_TOKEN_KEY } from './constants';
import apiClient from './apiClient';
import './index.css';

import QuoteHistoryUpload from './components/QuoteHistoryUpload';
import QuoteBatchInquiry from './components/QuoteBatchInquiry';
import QuoteSearch from './components/QuoteSearch';
import QuoteInquiryList from './components/QuoteInquiryList';

const QuotePage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const redirectToHome = () => {
        window.location.href = '/'; 
    };
    
    const handleLogout = () => {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem('currentUser');
        redirectToHome();
    };

    useEffect(() => {
        const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
        const storedUserStr = localStorage.getItem('currentUser');

        if (!token || !storedUserStr) {
            setError(LABELS_ZH.LOGIN_PROMPT);
            setIsLoading(false);
            setTimeout(redirectToHome, 2000);
            return;
        }

        try {
            const userFromStorage: User = JSON.parse(storedUserStr);
            setCurrentUser(userFromStorage);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (e) {
            setError("无法验证用户信息，请重新登录。");
            localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
            localStorage.removeItem('currentUser');
            setTimeout(redirectToHome, 2000);
        } finally {
            setIsLoading(false);
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
    
    if (!currentUser) {
        return <div className="flex h-screen items-center justify-center text-slate-500">正在重定向...</div>;
    }

    return (
        <div className="flex-grow flex flex-col min-h-screen">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-20 shadow-sm border-b border-slate-200/80">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-sky-700">{LABELS_ZH.QUOTE_MANAGEMENT_TITLE}</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-slate-600 hidden sm:inline">欢迎, <strong className="font-semibold">{currentUser.username}</strong></span>
                            <a href="/" className="px-4 py-2 text-sm font-medium bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500">
                                {LABELS_ZH.BACK_TO_HOME}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
                    <div className="lg:col-span-1 space-y-8 sm:space-y-10">
                       <QuoteHistoryUpload />
                       <QuoteBatchInquiry />
                       <QuoteInquiryList />
                    </div>
                    <div className="lg:col-span-2">
                        <QuoteSearch />
                    </div>
                </div>
            </main>

            <footer className="bg-white/80 backdrop-blur-lg py-4 border-t border-slate-200/80 mt-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
                    <p>&copy; {new Date().getFullYear()} {LABELS_ZH.APP_TITLE}. All Rights Reserved.</p>
                </div>
            </footer>
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
        <QuotePage />
    </React.StrictMode>
);