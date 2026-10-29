/**
 * SecureKey Auth Controller (controllers/authController.js)
 * Handles mobile app user authentication, JWT signing, and PIN passcode verification.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import LockLog from '../models/LockLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'securekey_jwt_secret_production_key_2026';

/**
 * POST /api/auth/login
 * Authenticates mobile app user, returns JWT token.
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

/**
 * POST /api/auth/unlock
 * Receives PIN from app keypad, verifies PIN against user hash, logs event in LockLog,
 * and returns { success: true, command: "UNLOCK" }.
 */
export async function unlock(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN code is required' });
    }

    let username = 'Mobile App User';
    let user = null;

    // Check token if user is signed in
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id);
        if (user) username = user.username;
      } catch (e) {
        // Fallback to checking PIN across users
      }
    }

    let pinValid = false;
    if (user && user.pin) {
      pinValid = await bcrypt.compare(pin, user.pin);
    } else {
      const users = await User.find({});
      for (const u of users) {
        if (await bcrypt.compare(pin, u.pin)) {
          pinValid = true;
          username = u.username;
          break;
        }
      }
    }

    if (!pinValid) {
      await LockLog.create({
        user: username,
        action: 'UNLOCK_FAILED',
        method: 'MOBILE_APP',
        ipAddress,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid security PIN',
        command: 'DENY',
      });
    }

    // Success: log unlock event
    await LockLog.create({
      user: username,
      action: 'UNLOCK_SUCCESS',
      method: 'MOBILE_APP',
      ipAddress,
    });

    return res.json({
      success: true,
      command: 'UNLOCK',
      holdSeconds: 5,
    });
  } catch (err) {
    console.error('[Auth] Unlock error:', err);
    return res.status(500).json({ error: 'Internal server error during unlock request' });
  }
}

export default { login, unlock };
