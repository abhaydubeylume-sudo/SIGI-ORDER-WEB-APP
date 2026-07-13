import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { History, Search, Filter, Shield, AlertTriangle, ArrowRight } from 'lucide-react';

interface LogsViewProps {
  logs: ActivityLog[];
  onRefresh: () => void;
}

export default function LogsView({ logs, onRefresh }: LogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  // Auto-refresh on mount
  useEffect(() => {
    onRefresh();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(l => {
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const matchUser = l.username.toLowerCase().includes(s);
      const matchOrder = l.orderNumber.toLowerCase().includes(s);
      const matchField = l.field && l.field.toLowerCase().includes(s);
      if (!matchUser && !matchOrder && !matchField) return false;
    }

    if (selectedRole && l.userRole !== selectedRole) return false;
    if (selectedAction && l.action !== selectedAction) return false;

    return true;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE_ORDER':
        return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400';
      case 'DELETE_ORDER':
        return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
      case 'UPDATE_STAGE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
      case 'ADD_ATTACHMENT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatTimestamp = (iso: string) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      
      {/* Title Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> Administrative Audit Trail
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automated tracking ledger recording every order insertion, field update, stage change, and document upload.</p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition duration-150 cursor-pointer flex items-center gap-1.5"
        >
          Force Sync Log Ledger
        </button>
      </div>

      {/* Interactive Logs Filtering controls */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        
        {/* Search */}
        <div className="md:col-span-6 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by operator name, order #, or field label..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          />
        </div>

        {/* Role filter */}
        <div className="md:col-span-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-2.5 py-2 text-xs bg-gray-50 dark:bg-gray-950 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl font-bold"
          >
            <option value="">All Operator Roles</option>
            <option value="Admin">Admin</option>
            <option value="Sales">Sales</option>
          </select>
        </div>

        {/* Action filter */}
        <div className="md:col-span-3">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-2.5 py-2 text-xs bg-gray-50 dark:bg-gray-950 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl font-bold"
          >
            <option value="">All Action Types</option>
            <option value="CREATE_ORDER">Create Order</option>
            <option value="UPDATE_ORDER">Update Order Detail</option>
            <option value="UPDATE_STAGE">Update Staging</option>
            <option value="ADD_ATTACHMENT">Add File Link</option>
            <option value="DELETE_ATTACHMENT">Remove File Link</option>
            <option value="DELETE_ORDER">Delete Order Master</option>
          </select>
        </div>

      </div>

      {/* Main Ledger Table */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            
            <thead className="bg-gray-50 dark:bg-gray-950 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest sticky top-0 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-4 py-4">Operator</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Action Code</th>
                <th className="px-4 py-4">Order #</th>
                <th className="px-6 py-4">Changes Registered</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400 dark:text-gray-500 font-medium">
                    No administrative audit logs meet the current filter requirements.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/10 transition">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 font-mono text-gray-500 font-bold whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>

                    {/* Operator name */}
                    <td className="px-4 py-4 font-black text-gray-950 dark:text-white">
                      {log.username}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-4">
                      <span className="text-[9px] font-extrabold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded uppercase">
                        {log.userRole}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Order No */}
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{log.orderNumber}</span>
                    </td>

                    {/* Changes Registered details */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[300px] break-words">
                      {log.field ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">Field: {log.field}</span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] bg-gray-50 dark:bg-gray-950 p-1.5 rounded border border-gray-100 dark:border-gray-800">
                            <span className="text-red-500 truncate max-w-[100px]" title={log.oldValue}>{log.oldValue || 'Empty'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-green-600 truncate max-w-[120px]" title={log.newValue}>{log.newValue || 'Empty'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-bold">System recorded successful routine action.</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-400 tracking-wider">
          <span>COMPILED LOG MATRIX: {filteredLogs.length} LOGS</span>
          <span>ADMIN AUDIT CONTROLLER ACTIVE</span>
        </div>

      </div>

    </div>
  );
}
