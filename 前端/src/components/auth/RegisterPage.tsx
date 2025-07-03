import React, { useState } from 'react';
import { LABELS_ZH } from '../constants';

interface RegisterPageProps {
  onRegister: (username: string, password: string) => Promise<void>;
  onNavigateToLogin: () => void;
  isLoading: boolean;
  error: string | null; // Error from App.tsx (API errors)
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onNavigateToLogin, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null); // For client-side validation errors

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); 
    if (isLoading) return;
    
    if (password.length < 6) {
        setFormError("密码长度至少需要6位。");
        return;
    }
    if (!username.trim()) {
        setFormError("用户名不能为空。");
        return;
    }

    await onRegister(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-100 via-slate-50 to-teal-100 p-4 selection:bg-teal-200 selection:text-teal-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-slate-200/80">
        <h2 className="text-3xl font-bold text-center text-teal-700">{LABELS_ZH.REGISTER_TITLE}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS_ZH.USERNAME_LABEL}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              autoComplete="new-password"
              required
              minLength={6} 
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {formError && <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{formError}</p>}
          {error && !formError && <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>} {/* Display API error if no formError */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !username.trim() || password.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? LABELS_ZH.LOADING : LABELS_ZH.REGISTER_BUTTON}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-slate-600">
          {LABELS_ZH.ALREADY_HAVE_ACCOUNT}{' '}
          <button 
            onClick={onNavigateToLogin} 
            disabled={isLoading}
            className="font-medium text-teal-600 hover:text-teal-500 underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 rounded disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {LABELS_ZH.LOGIN_HERE}
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;