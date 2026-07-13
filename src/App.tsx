import React, { useState, useEffect } from 'react';
import { User, Order, ActivityLog } from './types';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import OrderFormView from './components/OrderFormView';
import OrderTableView from './components/OrderTableView';
import ReportsView from './components/ReportsView';
import LogsView from './components/LogsView';
import { Shield, Sparkles, RefreshCcw } from 'lucide-react';

export default function App() {
  // Session authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Core application states
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation and active sub-view states
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [initialFilters, setInitialFilters] = useState<any>(undefined);

  // UI Theme mode toggles
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sigi_theme');
    return saved === 'dark';
  });

  // Check existing session cache on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem('sigi_auth_session');
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (err) {
        console.error("Failed to parse cached user session", err);
      }
    }
    setSessionChecked(true);
  }, []);

  // Sync theme mode to document element for Tailwind dark modifiers
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('sigi_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sigi_theme', 'light');
    }
  }, [isDarkMode]);

  // Fetch orders and activity logs from full-stack API
  const syncDatabase = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Parallel fetches for speed and zero-lag experience
      const [ordersRes, logsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/logs')
      ]);

      if (ordersRes.ok && logsRes.ok) {
        const ordersData = await ordersRes.json();
        const logsData = await logsRes.json();
        setOrders(ordersData);
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Network synchronization error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run sync whenever user signs in or changes
  useEffect(() => {
    if (currentUser) {
      syncDatabase();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sigi_auth_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sigi_auth_session');
    // Flush state
    setOrders([]);
    setLogs([]);
    setActiveView('dashboard');
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Order CRUD event relays
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    syncDatabase(); // Pull official logs
    setActiveView('orders');
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders((prev) => 
      prev.map(o => o.sigiOrderNumber === updatedOrder.sigiOrderNumber ? updatedOrder : o)
    );
    syncDatabase(); // Pull fresh activity logs
  };

  const handleOrderDeleted = (sigiOrderNumber: string) => {
    setOrders((prev) => prev.filter(o => o.sigiOrderNumber !== sigiOrderNumber));
    syncDatabase(); // Refetch logs
  };

  // Quick navigate to filtered orders from notifications
  const handleNavigateWithFilters = (filters?: any) => {
    setInitialFilters(filters);
    setActiveView('orders');
  };

  // Wait for session check to prevent flickering
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center font-semibold">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-500">Checking Active Session Cache...</span>
        </div>
      </div>
    );
  }

  // Gated Authentication Guard screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 overflow-hidden font-sans`}>
      
      {/* Sidebar Navigation Panel (HIDDEN DURING PHYSICAL PRINT) */}
      <div className="print:hidden">
        <Sidebar 
          user={currentUser}
          activeView={activeView}
          onViewChange={(view) => {
            if (view === 'orders') {
              setInitialFilters(undefined);
            }
            setActiveView(view);
          }}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Sync Banner (HIDDEN DURING PRINT) */}
        {isLoading && (
          <div className="absolute top-4 right-4 z-50 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-md flex items-center gap-2 animate-bounce print:hidden">
            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            Synchronizing Database...
          </div>
        )}

        {/* Dynamic View Swapper */}
        <div className="flex-1 h-full overflow-hidden">
          
          {activeView === 'dashboard' && (
            <DashboardView 
              orders={orders} 
              onNavigateToOrders={handleNavigateWithFilters} 
            />
          )}

          {activeView === 'orders' && (
            <OrderTableView 
              orders={orders}
              onOrderUpdated={handleOrderUpdated}
              onOrderDeleted={handleOrderDeleted}
              currentUser={currentUser}
              initialFilters={initialFilters}
            />
          )}

          {activeView === 'new-order' && (
            <OrderFormView 
              orders={orders}
              onOrderCreated={handleOrderCreated}
              operatorName={currentUser.name}
              operatorRole={currentUser.role}
            />
          )}

          {activeView === 'reports' && (
            <ReportsView orders={orders} currentUser={currentUser} />
          )}

          {activeView === 'logs' && (
            <LogsView 
              logs={logs}
              onRefresh={syncDatabase}
            />
          )}

        </div>

      </main>

    </div>
  );
}
