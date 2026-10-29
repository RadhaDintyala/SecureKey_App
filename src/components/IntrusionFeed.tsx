import React, { useState } from 'react';
import { AlertTriangle, Mail, ShieldAlert, Radio, RefreshCw, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { IntrusionAlert } from '../types.ts';

interface IntrusionFeedProps {
  alerts: IntrusionAlert[];
  isLoading: boolean;
  onRefresh: () => void;
  onSimulateMotion: () => Promise<void>;
  onViewEmailPreview: (alert: IntrusionAlert) => void;
}

export const IntrusionFeed: React.FC<IntrusionFeedProps> = ({
  alerts,
  isLoading,
  onRefresh,
  onSimulateMotion,
  onViewEmailPreview,
}) => {
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      await onSimulateMotion();
      setTriggerSuccess(true);
      setTimeout(() => setTriggerSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Banner / Trigger Action Card */}
      <div className="relative overflow-hidden rounded-2xl border border-red-900/60 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 p-6 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
              <ShieldAlert className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                  Perimeter Intrusion Detection System
                </h3>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  GPIO 27 Armed
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                When the ESP32 PIR motion sensor triggers during locked state, Nodemailer dispatches an immediate HTML alert via Gmail SMTP to the security recipient.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className={`flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-medium text-xs sm:text-sm text-white transition-all active:scale-95 shadow-lg ${
                triggerSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                  : 'bg-red-600 hover:bg-red-500 shadow-red-950/50'
              } disabled:opacity-50 cursor-pointer`}
            >
              {triggering ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Tripping PIR Sensor...
                </>
              ) : triggerSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Alert & Email Dispatched!
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  Simulate Motion Trip (PIR)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Feed List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
              Intrusion Incident Logs
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical breaches, motion triggers, and email dispatches
            </p>
          </div>
          <button
            onClick={onRefresh}
            title="Refresh alerts"
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3.5">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <CheckCircle className="h-10 w-10 text-emerald-500/60 mb-2" />
              <p className="text-sm font-medium text-slate-300">All Perimeters Clear</p>
              <p className="text-xs text-slate-500 mt-1">No intrusion alerts recorded in MongoDB collection</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const date = new Date(alert.timestamp);
              return (
                <div
                  key={alert._id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-red-900/40 bg-red-950/20 hover:border-red-800/60 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-red-200">
                          {alert.status === 'ALERT_DISPATCHED' ? 'MOTION DETECTED & ALERT DISPATCHED' : alert.status}
                        </span>
                        <span className="font-mono text-[11px] text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-900/60">
                          {alert.sensor}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-slate-400">Sent to:</span>
                          <span className="font-mono text-slate-200">{alert.emailSentTo}</span>
                        </span>
                        {alert.notes && (
                          <span className="text-slate-400 italic">
                            &bull; {alert.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-red-950/60 sm:border-t-0">
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums text-left sm:text-right">
                      <div>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-slate-500">{date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>

                    <button
                      onClick={() => onViewEmailPreview(alert)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                      View Email
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
