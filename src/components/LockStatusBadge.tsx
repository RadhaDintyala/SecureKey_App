import React from 'react';
import { Lock, Unlock, ShieldAlert, Clock, RefreshCw } from 'lucide-react';
import { LockState } from '../types.ts';

interface LockStatusBadgeProps {
  lockState: LockState | null;
  isLoading: boolean;
  onInstantLock: () => void;
  onQuickUnlock: () => void;
  onRefresh: () => void;
}

export const LockStatusBadge: React.FC<LockStatusBadgeProps> = ({
  lockState,
  isLoading,
  onInstantLock,
  onQuickUnlock,
  onRefresh,
}) => {
  const isUnlocked = lockState?.status === 'UNLOCKED';
  const remainingSeconds = lockState?.remainingSeconds ?? 0;
  const totalSeconds = lockState?.autoRelockSeconds || 5;
  const progressPercent = isUnlocked
    ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))
    : 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-2xl">
      {/* Subtle radial background glow */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${
          isUnlocked ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Device & Sync Header */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-6">
          <span className="font-mono tracking-tight text-slate-300">
            Node: {lockState?.activeDeviceId || 'ESP32_SECUREKEY_01'}
          </span>
          <button
            onClick={onRefresh}
            title="Refresh lock state"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="text-[11px] font-mono">Sync</span>
          </button>
        </div>

        {/* Dynamic Circular Indicator */}
        <div className="relative my-4 flex items-center justify-center">
          {/* SVG Countdown Ring */}
          <svg className="h-44 w-44 md:h-52 md:w-52 -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Dynamic animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-300 ${
                isUnlocked ? 'stroke-emerald-500' : 'stroke-red-600'
              }`}
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Central Status Icon & Badge */}
          <div
            className={`absolute flex flex-col items-center justify-center h-32 w-32 md:h-36 md:w-36 rounded-full border transition-all duration-500 ${
              isUnlocked
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-lg shadow-emerald-900/30'
                : 'border-red-500/40 bg-red-950/40 text-red-400 shadow-lg shadow-red-900/30'
            }`}
          >
            {isUnlocked ? (
              <Unlock className="h-12 w-12 md:h-14 md:w-14 stroke-[2.2] animate-bounce-short" />
            ) : (
              <Lock className="h-12 w-12 md:h-14 md:w-14 stroke-[2.2]" />
            )}
            <span className="mt-1 font-display text-sm md:text-base font-bold tracking-wider">
              {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
        </div>

        {/* Live Auto-Relock Countdown Feedback */}
        {isUnlocked ? (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Auto-relocking in {remainingSeconds}s</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-mono">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Perimeter armed &bull; Solenoid engaged</span>
          </div>
        )}

        {/* Status Metadata */}
        <div className="mt-4 max-w-sm text-center">
          <p className="text-xs text-slate-400">
            {lockState?.lastAction || 'System active and monitoring'}
          </p>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            Updated {lockState?.lastUpdated ? new Date(lockState.lastUpdated).toLocaleTimeString() : 'Recently'}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-6 flex w-full max-w-md flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onInstantLock}
            disabled={!isUnlocked && false}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-lg shadow-red-950/50 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            Instant Lock
          </button>

          <button
            onClick={onQuickUnlock}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Unlock className="h-4 w-4" />
            Unlock (5s Timer)
          </button>
        </div>
      </div>
    </div>
  );
};
