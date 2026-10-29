export interface User {
  id: string;
  username: string;
  email: string;
}

export interface LockState {
  status: 'LOCKED' | 'UNLOCKED';
  unlockedAt: number | null;
  autoRelockSeconds: number;
  remainingSeconds: number;
  lastAction: string;
  lastUpdated: string;
  activeDeviceId: string;
}

export interface LockLog {
  _id: string;
  timestamp: string;
  user: string;
  action: 'UNLOCK_SUCCESS' | 'UNLOCK_FAILED' | 'AUTO_RELOCK' | 'MANUAL_LOCK' | 'STATUS_CHANGE';
  method: 'MOBILE_APP' | 'MANUAL' | 'ESP32_KEYPAD' | 'AUTO';
  ipAddress: string;
}

export interface IntrusionAlert {
  _id: string;
  timestamp: string;
  sensor: string;
  status: 'MOTION_DETECTED' | 'ALERT_DISPATCHED' | 'SIMULATION_TEST';
  emailSentTo: string;
  notes?: string;
}

export interface EmailDispatch {
  success: boolean;
  recipient: string;
  subject: string;
  messageId?: string;
  simulated: boolean;
  previewHtml: string;
  timestamp: string;
}

export interface SystemStatus {
  status: string;
  uptime: number;
  timestamp: string;
  database: {
    mongoConnected: boolean;
    mongoError: string | null;
    activeMode: string;
    userCount: number;
    logCount: number;
    alertCount: number;
  };
  lockState: LockState;
  smtp: {
    configured: boolean;
    user: string;
  };
}
