import { Request, Response } from 'express';
import { addLockLog, getLockLogs, findUserByPin } from '../db.ts';
import { getLockState, unlockLock, lockInstantly, updateLockStateFromEsp32 } from '../lockState.ts';

export async function verifyEsp32Pin(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ESP32_DEVICE';
  try {
    const { deviceId, pin } = req.body;

    if (!pin) {
      res.status(400).json({ error: 'PIN payload required' });
      return;
    }

    const matchedUser = await findUserByPin(pin);

    if (!matchedUser) {
      await addLockLog({
        user: `ESP32 [${deviceId || 'Device'}]`,
        action: 'UNLOCK_FAILED',
        method: 'ESP32_KEYPAD',
        ipAddress,
      });

      res.status(401).json({
        authenticated: false,
        message: 'Invalid security code',
        holdSeconds: 0,
      });
      return;
    }

    // Success: Unlock the lock for 5 seconds
    unlockLock('ESP32_KEYPAD', matchedUser.username);

    await addLockLog({
      user: matchedUser.username,
      action: 'UNLOCK_SUCCESS',
      method: 'ESP32_KEYPAD',
      ipAddress,
    });

    res.status(200).json({
      authenticated: true,
      user: matchedUser.username,
      holdSeconds: 5,
      command: 'SOLENOID_TRIGGER_HIGH',
    });
  } catch (err: any) {
    console.error('[LockController] Verify PIN error:', err);
    res.status(500).json({ error: 'Internal server error verifying hardware PIN' });
  }
}

export async function receiveLockStatus(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ESP32_STATUS_CLIENT';
  try {
    const { state, deviceId, reason } = req.body;

    if (!state || !['LOCKED', 'UNLOCKED', 'AUTO_RELOCKED'].includes(state)) {
      res.status(400).json({ error: 'Valid state required (LOCKED, UNLOCKED, AUTO_RELOCKED)' });
      return;
    }

    const mappedState = state === 'UNLOCKED' ? 'UNLOCKED' : 'LOCKED';
    updateLockStateFromEsp32(mappedState, reason || `Reported by ${deviceId || 'ESP32'}`);

    if (state === 'AUTO_RELOCKED') {
      await addLockLog({
        user: 'ESP32 Auto-Lock',
        action: 'AUTO_RELOCK',
        method: 'AUTO',
        ipAddress,
      });
    } else {
      await addLockLog({
        user: deviceId || 'ESP32 Node',
        action: 'STATUS_CHANGE',
        method: 'MANUAL',
        ipAddress,
      });
    }

    res.json({
      success: true,
      currentStatus: getLockState(),
    });
  } catch (err: any) {
    console.error('[LockController] Status update error:', err);
    res.status(500).json({ error: 'Failed to record lock status update' });
  }
}

export function getCurrentLockStatus(_req: Request, res: Response): void {
  const current = getLockState();
  res.json({
    success: true,
    data: current,
  });
}

export async function handleInstantLock(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  try {
    const username = req.body?.username || 'Mobile App User';
    lockInstantly('MANUAL', username);

    await addLockLog({
      user: username,
      action: 'MANUAL_LOCK',
      method: 'MOBILE_APP',
      ipAddress,
    });

    res.json({
      success: true,
      command: 'LOCK_ENGAGED',
      status: getLockState(),
    });
  } catch (err: any) {
    console.error('[LockController] Instant lock error:', err);
    res.status(500).json({ error: 'Failed to engage instant lock' });
  }
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await getLockLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    console.error('[LockController] Get logs error:', err);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
}
