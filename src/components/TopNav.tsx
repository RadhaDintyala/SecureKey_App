import React from 'react';
import { ShieldCheck, Lock, Unlock, LogOut, User as UserIcon, Cpu, AlertTriangle, ListOrdered, KeyRound } from 'lucide-react';
import { User, LockState } from '../types.ts';

interface TopNavProps {
  user: User | null;
  lockState: LockState | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSystemInfo: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  lockState,
  activeTab,
  onTabChange,
  onOpenAuth,
  onLogout,
  onOpenSystemInfo,
}) => {
  const isLocked = lockState?.status !== 'UNLOCKED';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${isLocked ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <button
            onClick={() => onTabChange('dashboard')}
            className="text-left font-display text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-slate-200 transition-colors"
          >
            SecureKey <span className="font-mono text-xs font-normal text-slate-400">IoT</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'dashboard' ? 'text-white font-semibold' : 'hover:text-slate-200'}`}
          >
            <Lock className="h-4 w-4" />
            Control
          </button>
          <button
            onClick={() => onTabChange('keypad')}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'keypad' ? 'text-white font-semibold' : 'hover:text-slate-200'}`}
          >
            <KeyRound className="h-4 w-4" />
            Keypad
          </button>
          <button
            onClick={() => onTabChange('logs')}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'logs' ? 'text-white font-semibold' : 'hover:text-slate-200'}`}
          >
            <ListOrdered className="h-4 w-4" />
            Audit Logs
          </button>
          <button
            onClick={() => onTabChange('intrusion')}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'intrusion' ? 'text-white font-semibold' : 'hover:text-slate-200'}`}
          >
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Intrusion Feed
          </button>
          <button
            onClick={() => onTabChange('hardware')}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'hardware' ? 'text-white font-semibold' : 'hover:text-slate-200'}`}
          >
            <Cpu className="h-4 w-4 text-cyan-400" />
            ESP32 Lab
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action / Session */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenSystemInfo}
            title="System & MERN Architecture"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md border border-slate-800 transition-colors"
          >
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            MERN API
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {user.username}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
