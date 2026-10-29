import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ListOrdered,
  AlertTriangle,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  Bell,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { User, LockState, LockLog, IntrusionAlert, SystemStatus } from './types.ts';
import { api, getStoredUser, clearSession } from './services/api.ts';

import { TopNav } from './components/TopNav.tsx';
import { LockStatusBadge } from './components/LockStatusBadge.tsx';
import { DigitalKeypad } from './components/DigitalKeypad.tsx';
import { ActivityLogsFeed } from './components/ActivityLogsFeed.tsx';
import { IntrusionFeed } from './components/IntrusionFeed.tsx';
import { Esp32HardwareLab } from './components/Esp32HardwareLab.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { EmailPreviewModal } from './components/EmailPreviewModal.tsx';
import { SystemInfoModal } from './components/SystemInfoModal.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lockState, setLockState] = useState<LockState | null>(null);
  const [logs, setLogs] = useState<LockLog[]>([]);
  const [alerts, setAlerts] = useState<IntrusionAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'keypad' | 'logs' | 'intrusion' | 'hardware'>('dashboard');
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);
  const [previewAlert, setPreviewAlert] = useState<IntrusionAlert | null>(null);

  // Quick Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'alert' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial user check
  useEffect(() => {
    const savedUser = getStoredUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  // Fetch lock status
  const fetchLockStatus = useCallback(async () => {
    try {
      const state = await api.getLockStatus();
      setLockState(state);
    } catch (err) {
      console.warn('Failed to fetch lock status', err);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const logList = await api.getLockLogs(50);
      setLogs(logList);
    } catch (err) {
      console.warn('Failed to fetch logs', err);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const alertList = await api.getIntrusionAlerts(50);
      setAlerts(alertList);
    } catch (err) {
      console.warn('Failed to fetch intrusion alerts', err);
    }
  }, []);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const sys = await api.getSystemStatus();
      setSystemStatus(sys);
    } catch (err) {
      console.warn('Failed to fetch system telemetry', err);
    }
  }, []);

  // Refresh all
  const refreshAll = useCallback(async () => {
    setIsLoadingState(true);
    await Promise.all([
      fetchLockStatus(),
      fetchLogs(),
      fetchAlerts(),
      fetchSystemStatus(),
    ]);
    setIsLoadingState(false);
  }, [fetchLockStatus, fetchLogs, fetchAlerts, fetchSystemStatus]);

  // Initial fetch and 1.5s polling loop for auto-relock sync
  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      fetchLockStatus();
    }, 1500);

    const slowTimer = setInterval(() => {
      fetchLogs();
      fetchAlerts();
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(slowTimer);
    };
  }, [refreshAll, fetchLockStatus, fetchLogs, fetchAlerts]);

  // Handle instant lock
  const handleInstantLock = async () => {
    try {
      setIsLoadingState(true);
      await api.instantLock(user?.username);
      await fetchLockStatus();
      await fetchLogs();
      showToast('Lock engaged immediately.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to lock', 'alert');
    } finally {
      setIsLoadingState(false);
    }
  };

  // Handle PIN unlock
  const handleUnlockWithPin = async (pin: string) => {
    setIsVerifyingPin(true);
    try {
      const res = await api.unlockWithPin(pin);
      await fetchLockStatus();
      await fetchLogs();
      showToast(res.message || 'Lock unlocked for 5 seconds!', 'success');
    } catch (err: any) {
      await fetchLogs();
      showToast(err.message || 'Invalid PIN entered', 'alert');
      throw err;
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Quick 5-second unlock from badge
  const handleQuickUnlock = async () => {
    // If not logged in or default, try default admin PIN '1234'
    try {
      await handleUnlockWithPin('1234');
    } catch {
      setActiveTab('keypad');
      showToast('Please enter your passcode on the keypad', 'info');
    }
  };

  // Simulate PIR Motion
  const handleSimulateMotion = async () => {
    try {
      const res = await api.reportIntrusion('PIR_MOTION_GPIO27', user?.email);
      await fetchAlerts();
      await fetchSystemStatus();
      showToast('🚨 PIR Motion Sensor Tripped! Nodemailer email dispatched.', 'alert');
      if (res.alert) {
        setPreviewAlert(res.alert);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to simulate motion', 'alert');
      throw err;
    }
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    showToast('Signed out of SecureKey session.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-cyan-500 selection:text-white pb-20 md:pb-8">
      {/* Top Bar Contract (3 zones) */}
      <TopNav
        user={user}
        lockState={lockState}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenSystemInfo={() => setIsSystemInfoOpen(true)}
      />

      {/* Main Responsive Canvas */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:py-8">
        {/* Toast alert banner */}
        {toast && (
          <div
            className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200 text-xs font-medium ${
              toast.type === 'alert'
                ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-950/50'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-slate-950/50'
            }`}
          >
            {toast.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <Bell className="h-4 w-4 text-cyan-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* View Switcher Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 md:space-y-8">
            {/* Top Overview Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Dynamic Status Badge */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <LockStatusBadge
                  lockState={lockState}
                  isLoading={isLoadingState}
                  onInstantLock={handleInstantLock}
                  onQuickUnlock={handleQuickUnlock}
                  onRefresh={fetchLockStatus}
                />
              </div>

              {/* Digital PIN Keypad Widget */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <DigitalKeypad
                  onUnlock={handleUnlockWithPin}
                  isLoading={isVerifyingPin}
                  defaultHintPin="1234"
                />
              </div>
            </div>

            {/* Quick Metrics Bar (Tabular figures) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                  Current Lock Status
                </div>
                <div className={`mt-1 font-display text-xl font-bold ${lockState?.status === 'UNLOCKED' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lockState?.status || 'LOCKED'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Hold: 5.0s Auto-Relock
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                  Audit Events
                </div>
                <div className="mt-1 font-display text-xl font-bold text-white tabular-nums">
                  {logs.length}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Stored in Mongo Atlas
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                  PIR Intrusion Trips
                </div>
                <div className="mt-1 font-display text-xl font-bold text-red-400 tabular-nums">
                  {alerts.length}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  GPIO27 Motion Trigger
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                  IoT Microcontroller
                </div>
                <div className="mt-1 font-display text-xl font-bold text-cyan-400">
                  ESP32 Online
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  WiFi HTTPS REST
                </div>
              </div>
            </div>

            {/* Recent Audit & Intrusion Feeds preview split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityLogsFeed
                logs={logs}
                isLoading={isLoadingState}
                onRefresh={fetchLogs}
              />

              <IntrusionFeed
                alerts={alerts}
                isLoading={isLoadingState}
                onRefresh={fetchAlerts}
                onSimulateMotion={handleSimulateMotion}
                onViewEmailPreview={(alert) => setPreviewAlert(alert)}
              />
            </div>
          </div>
        )}

        {/* Dedicated Keypad Tab */}
        {activeTab === 'keypad' && (
          <div className="flex flex-col items-center justify-center max-w-lg mx-auto py-4">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                Digital Passcode Keypad
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your 4 to 6 digit security code to release the deadbolt
              </p>
            </div>

            <DigitalKeypad
              onUnlock={handleUnlockWithPin}
              isLoading={isVerifyingPin}
              defaultHintPin="1234"
            />

            <div className="mt-6 flex items-center justify-center gap-3 w-full max-w-sm">
              <button
                onClick={handleInstantLock}
                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-medium text-xs transition-colors cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                Engage Instant Lock
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Audit Logs Tab */}
        {activeTab === 'logs' && (
          <ActivityLogsFeed
            logs={logs}
            isLoading={isLoadingState}
            onRefresh={fetchLogs}
          />
        )}

        {/* Dedicated Intrusion Feed Tab */}
        {activeTab === 'intrusion' && (
          <IntrusionFeed
            alerts={alerts}
            isLoading={isLoadingState}
            onRefresh={fetchAlerts}
            onSimulateMotion={handleSimulateMotion}
            onViewEmailPreview={(alert) => setPreviewAlert(alert)}
          />
        )}

        {/* Dedicated ESP32 Hardware Lab Tab */}
        {activeTab === 'hardware' && (
          <Esp32HardwareLab
            onRefreshLockState={fetchLockStatus}
            onRefreshLogs={fetchLogs}
            onRefreshAlerts={fetchAlerts}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Mobile Touch Ergonomics Pattern 1) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-safe">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`min-h-[44px] flex flex-col items-center justify-center text-center transition-colors ${
              activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <Lock className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">Control</span>
          </button>

          <button
            onClick={() => setActiveTab('keypad')}
            className={`min-h-[44px] flex flex-col items-center justify-center text-center transition-colors ${
              activeTab === 'keypad' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <KeyRound className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">Keypad</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`min-h-[44px] flex flex-col items-center justify-center text-center transition-colors ${
              activeTab === 'logs' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <ListOrdered className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('intrusion')}
            className={`min-h-[44px] flex flex-col items-center justify-center text-center transition-colors ${
              activeTab === 'intrusion' ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">Intrusion</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`min-h-[44px] flex flex-col items-center justify-center text-center transition-colors ${
              activeTab === 'hardware' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <Cpu className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">ESP32</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          showToast(`Welcome, ${loggedUser.username}!`, 'success');
        }}
      />

      <EmailPreviewModal
        alert={previewAlert}
        dispatch={null}
        onClose={() => setPreviewAlert(null)}
      />

      <SystemInfoModal
        isOpen={isSystemInfoOpen}
        onClose={() => setIsSystemInfoOpen(false)}
        systemStatus={systemStatus}
      />
    </div>
  );
}
