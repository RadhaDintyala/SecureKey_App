import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Lock, RefreshCw, Smartphone, Key, Cpu, ShieldCheck } from 'lucide-react';
import { LockLog } from '../types.ts';

interface ActivityLogsFeedProps {
  logs: LockLog[];
  isLoading: boolean;
  onRefresh: () => void;
}

type FilterType = 'ALL' | 'SUCCESS' | 'FAILED' | 'AUTO';

export const ActivityLogsFeed: React.FC<ActivityLogsFeedProps> = ({
  logs,
  isLoading,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'SUCCESS' && log.action !== 'UNLOCK_SUCCESS') return false;
    if (filter === 'FAILED' && log.action !== 'UNLOCK_FAILED') return false;
    if (filter === 'AUTO' && log.action !== 'AUTO_RELOCK') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: LockLog['action']) => {
    switch (action) {
      case 'UNLOCK_SUCCESS':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            SUCCESS
          </span>
        );
      case 'UNLOCK_FAILED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
            <XCircle className="h-4 w-4 shrink-0 text-red-400" />
            FAILED
          </span>
        );
      case 'AUTO_RELOCK':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <RotateCcw className="h-4 w-4 shrink-0 text-amber-400" />
            AUTO RELOCK
          </span>
        );
      case 'MANUAL_LOCK':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
            <Lock className="h-4 w-4 shrink-0 text-blue-400" />
            MANUAL LOCK
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
            {action}
          </span>
        );
    }
  };

  const getMethodIcon = (method: LockLog['method']) => {
    switch (method) {
      case 'MOBILE_APP':
        return (
          <span title="Mobile App" className="inline-flex items-center">
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
          </span>
        );
      case 'ESP32_KEYPAD':
        return (
          <span title="ESP32 Keypad" className="inline-flex items-center">
            <Key className="h-3.5 w-3.5 text-amber-400" />
          </span>
        );
      case 'AUTO':
        return (
          <span title="Auto Hardware Timer" className="inline-flex items-center">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          </span>
        );
      default:
        return (
          <span title="Manual" className="inline-flex items-center">
            <Key className="h-3.5 w-3.5 text-slate-400" />
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800">
        <div>
          <h2 className="font-display text-lg font-bold text-white tracking-tight">
            Lock Access Logs & Audit Feed
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time event stream stored in MongoDB Atlas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            {(['ALL', 'SUCCESS', 'FAILED', 'AUTO'] as FilterType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === tab
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'SUCCESS' ? 'Pass' : tab === 'FAILED' ? 'Denied' : 'Relock'}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            title="Refresh logs"
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by user, IP, or method..."
          className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
        />
      </div>

      {/* Logs Table / List */}
      <div className="overflow-x-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <ShieldCheck className="h-10 w-10 stroke-[1.5] mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No access logs matching filter</p>
            <p className="text-xs text-slate-500 mt-1">Unlock actions from app or ESP32 will log here</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 sm:px-6">Status & Action</th>
                <th className="py-3 px-4">User / Source</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 hidden sm:table-cell">IP Address</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
                return (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-200">
                      {log.user}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {getMethodIcon(log.method)}
                        <span className="font-mono text-[11px]">{log.method}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap font-mono text-[11px] text-slate-400 tabular-nums">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px] text-slate-400 tabular-nums">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <span className="hidden md:inline text-slate-600 ml-1.5">
                        {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500 font-mono">
        <span>Showing {filteredLogs.length} of {logs.length} events</span>
        <span>Storage: Collection `LockLogs`</span>
      </div>
    </div>
  );
};
