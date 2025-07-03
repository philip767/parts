import React from 'react';
import { LABELS_ZH } from '../../constants';
import { UsersIcon, PackageIcon } from '../icons';

type AdminView = 'users' | 'orders';

interface AdminSidebarProps {
  currentView: AdminView;
  onSetView: (view: AdminView) => void;
  onLogout: () => void;
  username: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onSetView, onLogout, username }) => {
  const navItemClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150";
  const activeClasses = "bg-sky-600 text-white shadow-md";
  const inactiveClasses = "text-slate-600 hover:bg-slate-200 hover:text-slate-800";

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-slate-200 px-4">
        <h1 className="text-xl font-bold text-sky-700 tracking-tight">{LABELS_ZH.ADMIN_DASHBOARD}</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSetView('users'); }}
          className={`${navItemClasses} ${currentView === 'users' ? activeClasses : inactiveClasses}`}
        >
          <UsersIcon className="w-5 h-5 mr-3" />
          {LABELS_ZH.USER_MANAGEMENT}
        </a>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSetView('orders'); }}
          className={`${navItemClasses} ${currentView === 'orders' ? activeClasses : inactiveClasses}`}
        >
          <PackageIcon className="w-5 h-5 mr-3" />
          {LABELS_ZH.ORDER_MANAGEMENT}
        </a>
      </nav>
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="text-sm text-slate-600 mb-3">
          已登录为: <span className="font-semibold">{username}</span>
        </div>
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
        >
          {LABELS_ZH.ADMIN_LOGOUT}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
