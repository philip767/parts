import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { LABELS_ZH } from '../../constants';
import apiClient from '../../apiClient';
import { CloseIcon, SpinnerIcon } from '../icons';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated: (user: User) => void;
  onUpdateError: (message: string) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, user, onUserUpdated, onUpdateError }) => {
  const [role, setRole] = useState<'user' | 'admin'>(user.role);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setRole(user.role);
      setPassword('');
      setError(null);
      setIsLoading(false);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const payload: { role: string; password?: string } = { role };
    if (password) {
      if (password.length < 6) {
        setError("密码长度至少需要6位。");
        setIsLoading(false);
        return;
      }
      payload.password = password;
    }

    try {
      const response = await apiClient.put(`/admin/users/${user.id}`, payload);
      onUserUpdated(response.data);
      onClose();
    } catch (err: any) {
      const apiError = err.response?.data?.error || LABELS_ZH.UPDATE_USER_ERROR;
      setError(apiError);
      onUpdateError(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">
              {LABELS_ZH.UPDATE_USER_TITLE}: <span className="font-bold text-sky-700">{user.username}</span>
            </h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200"><CloseIcon className="w-5 h-5" /></button>
          </header>
          
          <main className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{error}</div>}
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-slate-700 mb-1">{LABELS_ZH.COLUMN_ROLE}</label>
              <select
                id="user-role"
                ref={firstInputRef}
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="user-password">{LABELS_ZH.PASSWORD_LABEL}</label>
              <input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={LABELS_ZH.PASSWORD_LEAVE_BLANK}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm"
              />
            </div>
          </main>

          <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-sm">
              {LABELS_ZH.CANCEL}
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 shadow-sm disabled:opacity-50 flex items-center">
              {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
              {isLoading ? LABELS_ZH.LOADING : LABELS_ZH.SAVE_CHANGES}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
