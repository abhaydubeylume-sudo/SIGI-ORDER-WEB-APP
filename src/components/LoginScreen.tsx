import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Sparkles, UserCheck, Lock, Eye, EyeOff, UserPlus, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  // Modes: 'login' | 'register' | 'changePassword'
  const [mode, setMode] = useState<'login' | 'register' | 'changePassword'>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('Sales');
  const [registerPassword, setRegisterPassword] = useState('');

  // Change Password State
  const [changeUsername, setChangeUsername] = useState('');
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Quick credentials for evaluation
  const demoAccounts = [
    { label: 'Sarah Jenkins (Admin)', username: 'admin', password: 'adminsigi', role: 'Admin' as UserRole, color: 'border-red-500 bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400' },
    { label: 'Marcus Brody (Sales)', username: 'sales', password: 'sales123', role: 'Sales' as UserRole, color: 'border-green-500 bg-green-50 dark:bg-green-950/25 text-green-700 dark:text-green-400' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      // Handle Redirection Errors during deployment
      if (response.redirected) {
        console.warn("Redirection detected during login to:", response.url);
        if (isInIframe) {
          setError('Browser security blocked the login session cookie inside the preview iframe. Please click the "Open in new tab" button at the top right of your screen to access the app.');
        } else {
          setError('A secure HTTPS or routing redirect was detected. Please ensure you are logged in or reload the page.');
        }
        setLoading(false);
        return;
      }

      // Handle unexpected non-JSON (e.g. HTML error/redirect pages)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error("Non-JSON auth response received:", textResponse.substring(0, 150));
        if (isInIframe) {
          setError('Browser security blocked the login session cookie inside the preview iframe. Please click the "Open in new tab" button at the top right of your screen to log in.');
        } else {
          setError('Received an unexpected non-JSON response from the server. This may indicate a deployment redirection, gateway routing issue, or missing API resource.');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      console.error("Login request failed:", err);
      setError(`Failed to authenticate due to a connection or formatting issue: ${err?.message || 'Server did not respond correctly.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername || !registerName || !registerPassword) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          name: registerName,
          role: registerRole,
          password: registerPassword
        }),
      });

      // Handle Redirection Errors during deployment
      if (response.redirected) {
        console.warn("Redirection detected during registration to:", response.url);
        setError('Registration request was redirected. Please check your network connection.');
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error("Non-JSON registration response received:", textResponse.substring(0, 150));
        setError('Received an unexpected non-JSON response from the server during registration.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('Account created successfully! You can now sign in.');
        setUsername(registerUsername);
        setPassword(registerPassword);
        setMode('login');
        // Clear fields
        setRegisterUsername('');
        setRegisterName('');
        setRegisterPassword('');
      } else {
        setError(data.message || 'Failed to create account.');
      }
    } catch (err: any) {
      console.error("Registration request failed:", err);
      setError(`Failed to register due to a connection or formatting issue: ${err?.message || 'Server did not respond.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeUsername || !changeNewPassword) {
      setError('Please fill in username and new password.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: changeUsername,
          oldPassword: changeOldPassword,
          newPassword: changeNewPassword
        }),
      });

      // Handle Redirection Errors during deployment
      if (response.redirected) {
        console.warn("Redirection detected during password change to:", response.url);
        setError('Password change request was redirected. Please check your network connection.');
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error("Non-JSON password change response received:", textResponse.substring(0, 150));
        setError('Received an unexpected non-JSON response from the server during password change.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('Password updated successfully! Please sign in.');
        setUsername(changeUsername);
        setPassword(changeNewPassword);
        setMode('login');
        // Clear fields
        setChangeUsername('');
        setChangeOldPassword('');
        setChangeNewPassword('');
      } else {
        setError(data.message || 'Failed to change password. Double check username/current password.');
      }
    } catch (err: any) {
      console.error("Password change request failed:", err);
      setError(`Failed to change password due to a connection or formatting issue: ${err?.message || 'Server did not respond.'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
    setSuccessMessage('');
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

        {/* Form Box Panel */}
        <div className="md:col-span-7 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 space-y-8">
          
          {isInIframe && (
            <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 text-xs rounded flex flex-col gap-1.5 shadow-sm">
              <span className="font-semibold flex items-center gap-1 text-amber-800 dark:text-amber-400">
                ⚠️ Running in Preview IFrame
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Modern browsers block login cookies in iframes. Please click the <strong>Open in new tab</strong> button at the top-right of your screen or click the link below to access the ERP:
              </p>
              <a 
                href={typeof window !== 'undefined' ? window.location.href : '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-1 font-bold text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
              >
                Open SIGI ERP in New Tab →
              </a>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-sm rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-sm rounded flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access the manufacturing dashboard with your role credentials.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
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

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                  </button>

                  <div className="flex justify-between items-center text-sm pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('changePassword');
                        setError('');
                        setSuccessMessage('');
                        setChangeUsername(username);
                      }}
                      className="text-gray-500 hover:text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      Change Password
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick Demo Accounts Selection */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  Quick Role Switch (Demo Accounts)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            </>
          )}

          {mode === 'register' && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 cursor-pointer mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Register a new team member to start managing orders.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                    placeholder="e.g. jsmith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                    placeholder="e.g. John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">System Role</label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                  >
                    <option value="Sales">Sales (View Dashboard & Manage Logs)</option>
                    <option value="Admin">Admin (Full Manufacturing Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Password</label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? 'Registering Account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {mode === 'changePassword' && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 cursor-pointer mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your password or change the default admin credentials.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    value={changeUsername}
                    onChange={(e) => setChangeUsername(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                    placeholder="e.g. admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Current/Old Password</label>
                  <input
                    type="password"
                    value={changeOldPassword}
                    placeholder="Enter current password (if set)"
                    onChange={(e) => setChangeOldPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    value={changeNewPassword}
                    placeholder="Enter new password"
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white transition duration-150"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

