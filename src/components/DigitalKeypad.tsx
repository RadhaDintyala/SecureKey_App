import React, { useState } from 'react';
import { Delete, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react';

interface DigitalKeypadProps {
  onUnlock: (pin: string) => Promise<void>;
  isLoading: boolean;
  defaultHintPin?: string;
}

export const DigitalKeypad: React.FC<DigitalKeypadProps> = ({
  onUnlock,
  isLoading,
  defaultHintPin = '1234',
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleKeyPress = (num: string) => {
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleClear = () => {
    if (isLoading) return;
    setPin('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleDeleteOne = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (pin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }

    try {
      setErrorMsg(null);
      await onUnlock(pin);
      setSuccessMsg('Security PIN verified! Solenoid released.');
      setPin('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect PIN code');
      setPin('');
    }
  };

  const handleFillHint = () => {
    setPin(defaultHintPin);
    setErrorMsg(null);
  };

  const keypadButtons = [
    { label: '1', sub: '' },
    { label: '2', sub: 'ABC' },
    { label: '3', sub: 'DEF' },
    { label: '4', sub: 'GHI' },
    { label: '5', sub: 'JKL' },
    { label: '6', sub: 'MNO' },
    { label: '7', sub: 'PQRS' },
    { label: '8', sub: 'TUV' },
    { label: '9', sub: 'WXYZ' },
    { label: 'CLEAR', action: 'clear' },
    { label: '0', sub: '+' },
    { label: 'UNLOCK', action: 'unlock' },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="h-5 w-5 text-cyan-400" />
        <h3 className="font-display text-base font-semibold text-slate-100">
          Digital PIN Keypad
        </h3>
      </div>

      {/* PIN Digit Indicators (4 to 6 slots) */}
      <div className="flex items-center justify-center gap-3 my-3 h-12 w-full max-w-[240px] px-4 rounded-xl bg-slate-950/70 border border-slate-800">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const isFilled = index < pin.length;
          return (
            <div
              key={index}
              className={`h-4 w-4 rounded-full transition-all duration-200 ${
                isFilled
                  ? 'bg-cyan-400 ring-4 ring-cyan-500/20 shadow-md shadow-cyan-500/40 scale-110'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          );
        })}
      </div>

      {/* Messages */}
      <div className="h-6 mb-2 flex items-center justify-center text-xs font-medium">
        {isLoading && (
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying crypt hash...
          </span>
        )}
        {errorMsg && !isLoading && (
          <span className="flex items-center gap-1.5 text-red-400 animate-shake">
            <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
          </span>
        )}
        {successMsg && !isLoading && (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Check className="h-3.5 w-3.5" /> {successMsg}
          </span>
        )}
        {!isLoading && !errorMsg && !successMsg && (
          <span className="text-slate-500 text-[11px]">
            Enter 4–6 digit security passcode
          </span>
        )}
      </div>

      {/* 3x4 Touch Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
        {keypadButtons.map((btn) => {
          if (btn.action === 'clear') {
            return (
              <button
                key="clear"
                onClick={handleClear}
                disabled={isLoading}
                className="flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700/60 text-slate-300 transition-all font-display font-medium text-xs tracking-wider"
              >
                <Delete className="h-4 w-4 mb-0.5 text-slate-400" />
                CLEAR
              </button>
            );
          }

          if (btn.action === 'unlock') {
            return (
              <button
                key="unlock"
                onClick={handleSubmit}
                disabled={isLoading || pin.length < 4}
                className="flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all font-display font-bold text-xs tracking-wider shadow-lg shadow-emerald-950/40 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check className="h-4 w-4 mb-0.5 stroke-[2.5]" />
                UNLOCK
              </button>
            );
          }

          return (
            <button
              key={btn.label}
              onClick={() => handleKeyPress(btn.label)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700/90 active:scale-95 border border-slate-700/60 text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                {btn.label}
              </span>
              {btn.sub && (
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase -mt-0.5">
                  {btn.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Backspace helper + Default PIN quick shortcut */}
      <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-400 px-1">
        <button
          onClick={handleDeleteOne}
          className="hover:text-slate-200 transition-colors py-1 px-2 rounded hover:bg-slate-800/60"
        >
          &larr; Backspace
        </button>
        <button
          onClick={handleFillHint}
          className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] underline underline-offset-2 transition-colors py-1 px-2 rounded hover:bg-slate-800/60"
        >
          Quick PIN: {defaultHintPin}
        </button>
      </div>
    </div>
  );
};
