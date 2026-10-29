import { User, LockState, LockLog, IntrusionAlert, EmailDispatch, SystemStatus } from '../types.ts';

const TOKEN_KEY = 'securekey_jwt_token';
const USER_KEY = 'securekey_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth API
  async login(username: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to authenticate');
    setSession(data.token, data.user);
    return data;
  },

  async register(username: string, password: string, email: string, pin: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register account');
    setSession(data.token, data.user);
    return data;
  },

  async unlockWithPin(pin: string): Promise<{ success: boolean; command: string; holdSeconds: number; message: string }> {
    const res = await fetch('/api/auth/unlock', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'PIN verification failed');
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session expired');
    return data;
  },

  // Lock API
  async getLockStatus(): Promise<LockState> {
    const res = await fetch('/api/lock/status');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch lock status');
    return data.data;
  },

  async instantLock(username?: string): Promise<{ success: boolean; command: string; status: LockState }> {
    const res = await fetch('/api/lock/instant-lock', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username: username || getStoredUser()?.username || 'Mobile App' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Instant lock failed');
    return data;
  },

  async getLockLogs(limit = 50): Promise<LockLog[]> {
    const res = await fetch(`/api/lock/logs?limit=${limit}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
    return data.logs || [];
  },

  // ESP32 Hardware API (Direct IoT simulation)
  async esp32VerifyPin(pin: string, deviceId = 'ESP32_SECUREKEY_01'): Promise<{ authenticated: boolean; user?: string; holdSeconds: number; command?: string }> {
    const res = await fetch('/api/lock/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, deviceId }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 401) throw new Error(data.error || 'ESP32 request error');
    return data;
  },

  async esp32UpdateStatus(state: 'LOCKED' | 'UNLOCKED' | 'AUTO_RELOCKED', deviceId = 'ESP32_SECUREKEY_01', reason?: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/lock/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, deviceId, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update ESP32 status');
    return data;
  },

  // Intrusion API
  async reportIntrusion(sensor = 'PIR_MOTION_GPIO27', targetEmail?: string): Promise<{ success: boolean; message: string; alert: IntrusionAlert; emailDelivery: any }> {
    const res = await fetch('/api/intrusion/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor, targetEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to report intrusion');
    return data;
  },

  async getIntrusionAlerts(limit = 50): Promise<IntrusionAlert[]> {
    const res = await fetch(`/api/intrusion/alerts?limit=${limit}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch intrusion alerts');
    return data.alerts || [];
  },

  async getEmailDispatches(): Promise<EmailDispatch[]> {
    const res = await fetch('/api/intrusion/dispatches');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch email dispatches');
    return data.dispatches || [];
  },

  // System API
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch('/api/system/status');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch system telemetry');
    return data;
  },
};
