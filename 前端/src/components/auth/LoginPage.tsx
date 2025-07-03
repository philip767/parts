import React, { useState } from 'react';
import { LABELS_ZH } from '../constants';

interface LoginPageProps {
  onLogin: (loginIdentifier: string, password: string) => Promise<void>;
  onNavigateToRegister: () => void;
  isLoading: boolean;
  error: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, isLoading, error }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !loginIdentifier.trim() || !password.trim()) return;
    await onLogin(loginIdentifier, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-slate-50 to-sky-100 p-4 selection:bg-sky-200 selection:text-sky-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-slate-200/80">
        <h2 className="text-3xl font-bold text-center text-sky-700">{LABELS_ZH.LOGIN_TITLE}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="loginIdentifier" className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS_ZH.LOGIN_IDENTIFIER_LABEL}
            </label>
            <input
              id="loginIdentifier"
              name="loginIdentifier"
              type="text"
              autoComplete="username"
              required
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS_ZH.PASSWORD_LABEL}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading || !loginIdentifier.trim() || !password.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? LABELS_ZH.LOADING : LABELS_ZH.LOGIN_BUTTON}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-slate-600">
          {LABELS_ZH.NO_ACCOUNT_YET}{' '}
          <button 
            onClick={onNavigateToRegister} 
            disabled={isLoading}
            className="font-medium text-sky-600 hover:text-sky-500 underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {LABELS_ZH.REGISTER_HERE}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;