import { User } from '../types';
import { 
  LayoutDashboard, 
  Layers, 
  FileText, 
  FileSpreadsheet, 
  History, 
  LogOut, 
  Sun, 
  Moon,
  Workflow,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function Sidebar({
  user,
  activeView,
  onViewChange,
  onLogout,
  isDarkMode,
  onToggleTheme
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Order Tracking', icon: Layers },
    { id: 'new-order', label: 'Add Order', icon: FileText, roles: ['Admin', 'Sales'] },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'logs', label: 'Activity Logs', icon: History, roles: ['Admin'] },
  ];

  // Filter menu items by user roles
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen shrink-0 transition-colors duration-200">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Workflow className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-black text-gray-900 dark:text-white tracking-wider uppercase leading-none">SIGI JEWELRY</h1>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">Manufacturing ERP</span>
        </div>
      </div>

      {/* Logged in User Badge */}
      <div className="p-4 mx-4 my-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{user.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 rounded-md uppercase tracking-wider">
            {user.role}
          </span>
          <span className="text-[9px] text-gray-400 font-mono">ID: {user.username}</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Settings & Logout */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {/* Toggle Dark/Light Mode */}
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition duration-150 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
            {isDarkMode ? 'Light Workspace' : 'Dark Workspace'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded uppercase tracking-widest text-gray-500">
            {isDarkMode ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 transition duration-150 cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4" />
          Log Out Session
        </button>
      </div>

    </aside>
  );
}
