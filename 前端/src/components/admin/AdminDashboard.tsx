import React, { useState } from 'react';
import { User } from '../../types';
import { LABELS_ZH } from '../../constants';
import AdminSidebar from './AdminSidebar';
import UserManagement from './UserManagement';
import OrderManagement from './OrderManagement';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

type AdminView = 'users' | 'orders';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [currentView, setCurrentView] = useState<AdminView>('users');

  const renderContent = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'orders':
        return <OrderManagement />;
      default:
        return <div className="p-6 text-slate-600">请从侧边栏选择一个视图。</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <AdminSidebar
        currentView={currentView}
        onSetView={setCurrentView}
        onLogout={onLogout}
        username={currentUser.username}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 z-10">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-slate-800">
              {currentView === 'users' ? LABELS_ZH.USER_MANAGEMENT : LABELS_ZH.ORDER_MANAGEMENT}
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
