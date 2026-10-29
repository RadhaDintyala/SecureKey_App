import React from 'react';
import { X, Server, Database, ShieldCheck, Mail, Cpu, Check, Layers } from 'lucide-react';
import { SystemStatus } from '../types.ts';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemStatus: SystemStatus | null;
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({
  isOpen,
  onClose,
  systemStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                SecureKey MERN Architecture & Diagnostics
              </h3>
              <p className="text-xs text-slate-400">
                Full-Stack IoT Integration Specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Database className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-slate-200">Database Engine</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {systemStatus?.database.activeMode || 'MERN Store'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {systemStatus?.database.logCount ?? 0} Lock Logs &bull; {systemStatus?.database.alertCount ?? 0} Intrusion Alerts
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Mail className="h-4 w-4 text-red-400" />
                <span className="font-medium text-slate-200">Nodemailer SMTP</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {systemStatus?.smtp.configured ? 'Gmail SMTP' : 'Active (Simulated)'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {systemStatus?.smtp.user}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="font-medium text-slate-200">ESP32 Hardware</span>
              </div>
              <div className="font-mono text-sm font-bold text-cyan-400">
                HTTPS REST v2.4
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                PIR GPIO27 &bull; Solenoid GPIO26
              </div>
            </div>
          </div>

          {/* Endpoints Catalog */}
          <div>
            <h4 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              REST API Endpoints Specification
            </h4>
            <div className="rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800 font-mono text-[11px]">
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cyan-400">POST /api/auth/login</span>
                <span className="text-slate-400">Authenticates mobile user & returns JWT token</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cyan-400">POST /api/auth/unlock</span>
                <span className="text-slate-400">Verifies 4-6 digit PIN hash, logs access, triggers unlock</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-amber-400">POST /api/lock/verify-pin</span>
                <span className="text-slate-400">ESP32 hardware PIN authentication endpoint</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-amber-400">POST /api/lock/status</span>
                <span className="text-slate-400">ESP32 hardware lock state sync (LOCKED / UNLOCKED)</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-amber-400">GET /api/lock/logs</span>
                <span className="text-slate-400">Returns 50 chronological access logs for audit</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-red-400">POST /api/intrusion/alert</span>
                <span className="text-slate-400">PIR motion trigger: saves alert & dispatches Nodemailer email</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-red-400">GET /api/intrusion/alerts</span>
                <span className="text-slate-400">Returns recent intrusion security alerts</span>
              </div>
            </div>
          </div>

          {/* Mongoose Models Breakdown */}
          <div>
            <h4 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              Mongoose Schemas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold mb-1">User.js</div>
                <div className="text-slate-400">
                  username (unique)<br />
                  passwordHash (bcrypt)<br />
                  email (required)<br />
                  pin (encrypted)<br />
                  createdAt (Date)
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-amber-400 font-bold mb-1">LockLog.js</div>
                <div className="text-slate-400">
                  timestamp (Date)<br />
                  user (String)<br />
                  action (UNLOCK_SUCCESS...)<br />
                  method (MOBILE_APP...)<br />
                  ipAddress (String)
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-red-400 font-bold mb-1">IntrusionAlert.js</div>
                <div className="text-slate-400">
                  timestamp (Date)<br />
                  sensor (PIR_GPIO27)<br />
                  status (DISPATCHED)<br />
                  emailSentTo (String)<br />
                  notes (String)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
