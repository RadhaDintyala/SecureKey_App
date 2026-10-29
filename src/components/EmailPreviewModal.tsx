import React from 'react';
import { X, Mail, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { IntrusionAlert, EmailDispatch } from '../types.ts';

interface EmailPreviewModalProps {
  alert: IntrusionAlert | null;
  dispatch: EmailDispatch | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  alert,
  dispatch,
  onClose,
}) => {
  if (!alert && !dispatch) return null;

  const recipient = alert?.emailSentTo || dispatch?.recipient || 'user@example.com';
  const timestamp = alert?.timestamp || dispatch?.timestamp || new Date().toISOString();
  const sensor = alert?.sensor || 'PIR_MOTION_GPIO27';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Nodemailer Gmail SMTP Dispatch Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Rendered HTML alert dispatched to registered user
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

        {/* Dispatch Metadata bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Recipient:</span>
            <span className="text-slate-200">{recipient}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Trigger Sensor:</span>
            <span className="text-red-400">{sensor}</span>
          </div>
          <div>
            <span className="text-slate-500 block">SMTP Transport:</span>
            <span className="text-cyan-400">smtp.gmail.com:465</span>
          </div>
        </div>

        {/* Rendered Email Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          <div className="w-full max-w-lg rounded-xl border border-red-600/80 bg-slate-900 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-red-800 to-red-600 p-6 text-center text-white">
              <h2 className="text-xl font-bold tracking-tight">SECUREKEY IOT SECURITY ALERT</h2>
              <p className="text-xs opacity-90 mt-1">Real-Time Intrusion Alarm System</p>
            </div>

            <div className="p-6 text-sm text-slate-200">
              <div className="inline-block px-3 py-1 rounded-md bg-red-500 text-white font-bold text-xs mb-4">
                MOTION DETECTED DURING ARMED STATE
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                A security sensor trip was registered while the IoT smart lock was in <strong>LOCKED</strong> state.
              </p>

              <div className="my-5 rounded-lg border border-slate-800 bg-slate-950/70 divide-y divide-slate-800 text-xs font-mono">
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-400">Sensor Trigger</span>
                  <span className="text-white font-semibold">{sensor}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="text-white">{new Date(timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-400">Lock State</span>
                  <span className="text-red-400 font-bold">LOCKED (Armed)</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-400">Hardware Node</span>
                  <span className="text-cyan-400">ESP32_SECUREKEY_01</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs leading-relaxed">
                <strong>Immediate Action Recommended:</strong> Check your live access logs in your SecureKey Mobile Web App or verify camera feeds.
              </div>
            </div>

            <div className="p-4 text-center border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500">
              SecureKey Node.js Backend &bull; ESP32 IoT Hardware Gateway &bull; Powered by MERN
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
