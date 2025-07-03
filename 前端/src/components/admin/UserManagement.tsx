import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import { LABELS_ZH } from '../../constants';
import apiClient from '../../apiClient';
import { SpinnerIcon, TrashIcon, EditIcon } from '../icons';
import ConfirmationModal from '../ConfirmationModal';
import UserEditModal from './UserEditModal';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<User[]>('/admin/users');
      setUsers(response.data.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (err: any) {
      setError(err.response?.data?.error || LABELS_ZH.FETCH_USERS_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.delete(`/admin/users/${userToDelete.id}`);
      setNotification({ type: 'success', message: LABELS_ZH.DELETE_USER_SUCCESS });
      setUserToDelete(null);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || LABELS_ZH.DELETE_USER_ERROR });
      setUserToDelete(null);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setNotification({ type: 'success', message: LABELS_ZH.UPDATE_USER_SUCCESS});
  };

  const handleUpdateError = (errorMessage: string) => {
    setNotification({ type: 'error', message: errorMessage || LABELS_ZH.UPDATE_USER_ERROR});
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {LABELS_ZH.USERNAME_LABEL}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {LABELS_ZH.EMAIL_LABEL}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {LABELS_ZH.COLUMN_ROLE}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {LABELS_ZH.COLUMN_CREATED_AT}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                {LABELS_ZH.COLUMN_ACTIONS}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => setUserToEdit(user)} className="p-2 text-sky-600 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-colors" title={LABELS_ZH.ACTION_EDIT_USER}>
                    <EditIcon className="w-5 h-5"/>
                  </button>
                  <button onClick={() => setUserToDelete(user)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg transition-colors" title={LABELS_ZH.ACTION_DELETE_USER}>
                    <TrashIcon className="w-5 h-5"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userToDelete && (
        <ConfirmationModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
          title={LABELS_ZH.CONFIRM_DELETE_USER_TITLE}
          message={`${LABELS_ZH.CONFIRM_DELETE_USER_MSG} (用户: ${userToDelete.username})`}
        />
      )}

      {userToEdit && (
        <UserEditModal
          isOpen={!!userToEdit}
          onClose={() => setUserToEdit(null)}
          user={userToEdit}
          onUserUpdated={handleUpdateUser}
          onUpdateError={handleUpdateError}
        />
      )}
    </div>
  );
};

export default UserManagement;
