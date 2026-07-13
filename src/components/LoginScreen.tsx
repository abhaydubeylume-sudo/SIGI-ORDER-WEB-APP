import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Sparkles, UserCheck, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Quick credentials for evaluation
  const demoAccounts = [
    { label: 'Sarah Jenkins (Admin)', username: 'admin', password: 'admin123', role: 'Admin' as UserRole, color: 'border-red-500 bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400' },
    { label: 'Marcus Brody (Sales)', username: 'sales', password: 'sales123', role: 'Sales' as UserRole, color: 'border-green-500 bg-green-50 dark:bg-green-950/25 text-green-700 dark:text-green-400' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the server. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors duration-200">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Decorative Panel */}
        <div className="md:col-span-5 text-center md:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            SIGI JEWELRY MANUFACTURING
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Order Tracking <span className="text-blue-600 dark:text-blue-400">ERP</span>
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Replace complex Excel sheets with modern real-time tracking. Manage design specifications, casting phases, stone setting, QC approvals, and automated shipping schedules in a unified workspace.
          </p>
          <div className="hidden md:flex flex-col gap-3.5 border-l-2 border-blue-500 pl-4 py-1">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Enterprise Capabilities</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">✓ Role-Based Permissions Checklist</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">✓ Audit Logging of All Process Changes</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">✓ Automated Balance & Delivery Calculations</span>
          </div>
        </div>

        {/* Login Box Panel */}
        <div className="md:col-span-7 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access the manufacturing dashboard with your role credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <UserCheck className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                  placeholder="e.g. admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              <Shield className="w-3.5 h-3.5" />
              Quick Role Switch (Demo Accounts)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => selectDemoAccount(acc)}
                  className={`text-left p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition duration-150 flex flex-col justify-between hover:scale-[1.01] ${acc.color} ${
                    username === acc.username ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <span className="font-bold">{acc.role} Role</span>
                  <span className="text-[10px] opacity-75 mt-0.5">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
