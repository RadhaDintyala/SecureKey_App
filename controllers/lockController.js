/**
 * SecureKey Lock Controller (controllers/lockController.js)
 * Handles ESP32 Hardware Integration Endpoints and Access Logs
 */
import LockLog from '../models/LockLog.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * POST /api/lock/verify-pin
 * Receives JSON payload { deviceId, pin } from ESP32, verifies PIN, logs result,
 * returns HTTP 200 { authenticated: true, holdSeconds: 5 }.
 */
export async function verifyPin(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ESP32_DEVICE';
  try {
    const { deviceId, pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN payload required' });
    }

    const users = await User.find({});
    let authenticatedUser = null;

    for (const user of users) {
      const match = await bcrypt.compare(pin, user.pin);
      if (match) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      await LockLog.create({
        user: `ESP32 [${deviceId || 'Device'}]`,
        action: 'UNLOCK_FAILED',
        method: 'MANUAL',
        ipAddress,
      });

      return res.status(401).json({
        authenticated: false,
        message: 'Invalid security PIN code',
      });
    }

    await LockLog.create({
      user: authenticatedUser.username,
      action: 'UNLOCK_SUCCESS',
      method: 'MANUAL',
      ipAddress,
    });

    return res.status(200).json({
      authenticated: true,
      holdSeconds: 5,
      command: 'UNLOCK_SOLENOID',
    });
  } catch (err) {
    console.error('[Lock] Verify PIN error:', err);
    return res.status(500).json({ error: 'Internal server error verifying hardware PIN' });
  }
}

/**
 * POST /api/lock/status
 * Receives state updates from ESP32 ('LOCKED', 'UNLOCKED', 'AUTO_RELOCKED').
 */
export async function updateStatus(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ESP32_STATUS_CLIENT';
  try {
    const { state, deviceId } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'Lock state required' });
    }

    if (state === 'AUTO_RELOCKED') {
      await LockLog.create({
        user: 'ESP32 Auto-Lock',
        action: 'AUTO_RELOCK',
        method: 'MANUAL',
        ipAddress,
      });
    }

    return res.json({
      success: true,
      receivedState: state,
    });
  } catch (err) {
    console.error('[Lock] Status error:', err);
    return res.status(500).json({ error: 'Failed to record lock status update' });
  }
}

/**
 * GET /api/lock/logs
 * Returns recent 50 access logs for the mobile app dashboard.
 */
export async function getLogs(req, res) {
  try {
    const logs = await LockLog.find({}).sort({ timestamp: -1 }).limit(50);
    return res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error('[Lock] Get logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch access logs' });
  }
}

export default { verifyPin, updateStatus, getLogs };
