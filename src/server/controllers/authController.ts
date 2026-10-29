import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername, createUser, addLockLog, findUserById } from '../db.ts';
import { unlockLock } from '../lockState.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'securekey_jwt_secret_production_key_2026';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error('[AuthController] Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, email, pin } = req.body;

    if (!username || !password || !email || !pin) {
      res.status(400).json({ error: 'All fields (username, password, email, pin) are required' });
      return;
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      res.status(400).json({ error: 'PIN must be between 4 and 6 numeric digits' });
      return;
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    const newUser = await createUser({
      username,
      passwordHash,
      email,
      pin: pinHash,
    });

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err: any) {
    console.error('[AuthController] Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function unlock(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ error: 'PIN code is required' });
      return;
    }

    // Check authorization token if present
    let username = 'Mobile App User';
    let userRecord: any = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        username = decoded.username || username;
        if (decoded.id) {
          userRecord = await findUserById(decoded.id);
        }
      } catch {
        // Continue with PIN search
      }
    }

    // Verify PIN against authenticated user or any registered user
    let pinValid = false;

    if (userRecord && userRecord.pin) {
      pinValid = await bcrypt.compare(pin, userRecord.pin);
    } else {
      // Check admin default or demo user
      const admin = await findUserByUsername(username === 'Mobile App User' ? 'admin' : username);
      if (admin && admin.pin) {
        pinValid = await bcrypt.compare(pin, admin.pin);
      }
    }

    // If still not valid, verify against all registered users
    if (!pinValid) {
      const { findUserByPin } = await import('../db.ts');
      const matchedUser = await findUserByPin(pin);
      if (matchedUser) {
        pinValid = true;
        username = matchedUser.username;
      }
    }

    if (!pinValid) {
      // Log failed unlock attempt
      await addLockLog({
        user: username,
        action: 'UNLOCK_FAILED',
        method: 'MOBILE_APP',
        ipAddress,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid security PIN',
        command: 'DENY',
      });
      return;
    }

    // Unlock success!
    unlockLock('MOBILE_APP', username);

    await addLockLog({
      user: username,
      action: 'UNLOCK_SUCCESS',
      method: 'MOBILE_APP',
      ipAddress,
    });

    res.json({
      success: true,
      command: 'UNLOCK',
      holdSeconds: 5,
      message: 'Lock opened successfully. Auto-relock timer set to 5s.',
    });
  } catch (err: any) {
    console.error('[AuthController] Unlock error:', err);
    res.status(500).json({ error: 'Internal server error during unlock request' });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No authorization token provided' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await findUserById(decoded.id);

    if (!user) {
      res.status(404).json({ error: 'User session expired or not found' });
      return;
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
