import { addLockLog } from './db.ts';

export type LockStatusType = 'LOCKED' | 'UNLOCKED';

interface LockState {
  status: LockStatusType;
  unlockedAt: number | null;
  autoRelockSeconds: number;
  lastAction: string;
  lastUpdated: Date;
  activeDeviceId: string;
}

const state: LockState = {
  status: 'LOCKED',
  unlockedAt: null,
  autoRelockSeconds: 5,
  lastAction: 'SYSTEM_STARTUP',
  lastUpdated: new Date(),
  activeDeviceId: 'ESP32_SECUREKEY_01',
};

let autoRelockTimer: NodeJS.Timeout | null = null;

export function getLockState() {
  let remainingSeconds = 0;
  if (state.status === 'UNLOCKED' && state.unlockedAt) {
    const elapsedSeconds = Math.floor((Date.now() - state.unlockedAt) / 1000);
    remainingSeconds = Math.max(0, state.autoRelockSeconds - elapsedSeconds);
  }

  return {
    ...state,
    remainingSeconds,
  };
}

export function unlockLock(source: 'MOBILE_APP' | 'ESP32_KEYPAD' | 'MANUAL', username = 'User'): boolean {
  if (autoRelockTimer) {
    clearTimeout(autoRelockTimer);
    autoRelockTimer = null;
  }

  state.status = 'UNLOCKED';
  state.unlockedAt = Date.now();
  state.lastAction = `UNLOCKED by ${username} via ${source}`;
  state.lastUpdated = new Date();

  // Schedule auto-relock after 5 seconds
  autoRelockTimer = setTimeout(async () => {
    state.status = 'LOCKED';
    state.unlockedAt = null;
    state.lastAction = 'AUTO_RELOCK triggered by ESP32 timer';
    state.lastUpdated = new Date();
    autoRelockTimer = null;

    await addLockLog({
      user: 'ESP32 Auto-Lock',
      action: 'AUTO_RELOCK',
      method: 'AUTO',
      ipAddress: 'ESP32_HARDWARE_NODE',
    });
    console.log('[LockState] Auto-relock timer expired - lock set to LOCKED.');
  }, state.autoRelockSeconds * 1000);

  return true;
}

export function lockInstantly(source = 'MANUAL', username = 'User'): boolean {
  if (autoRelockTimer) {
    clearTimeout(autoRelockTimer);
    autoRelockTimer = null;
  }

  state.status = 'LOCKED';
  state.unlockedAt = null;
  state.lastAction = `LOCKED manually by ${username}`;
  state.lastUpdated = new Date();

  return true;
}

export function updateLockStateFromEsp32(newStatus: LockStatusType, notes?: string) {
  if (autoRelockTimer) {
    clearTimeout(autoRelockTimer);
    autoRelockTimer = null;
  }
  state.status = newStatus;
  state.unlockedAt = newStatus === 'UNLOCKED' ? Date.now() : null;
  state.lastAction = notes || `Hardware status update: ${newStatus}`;
  state.lastUpdated = new Date();
}
