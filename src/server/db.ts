import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel, IUser } from './models/User.ts';
import { LockLogModel, ILockLog } from './models/LockLog.ts';
import { IntrusionAlertModel, IIntrusionAlert } from './models/IntrusionAlert.ts';

let mongoConnected = false;
let mongoError: string | null = null;

// In-Memory fallback store
interface MemoryUser {
  _id: string;
  username: string;
  passwordHash: string;
  email: string;
  pin: string;
  createdAt: Date;
}

interface MemoryLockLog {
  _id: string;
  timestamp: Date;
  user: string;
  action: 'UNLOCK_SUCCESS' | 'UNLOCK_FAILED' | 'AUTO_RELOCK' | 'MANUAL_LOCK' | 'STATUS_CHANGE';
  method: 'MOBILE_APP' | 'MANUAL' | 'ESP32_KEYPAD' | 'AUTO';
  ipAddress: string;
}

interface MemoryIntrusionAlert {
  _id: string;
  timestamp: Date;
  sensor: string;
  status: 'MOTION_DETECTED' | 'ALERT_DISPATCHED' | 'SIMULATION_TEST';
  emailSentTo: string;
  notes?: string;
}

const memoryStore = {
  users: [] as MemoryUser[],
  lockLogs: [] as MemoryLockLog[],
  intrusionAlerts: [] as MemoryIntrusionAlert[],
};

// Seed initial memory data
async function seedInitialData() {
  if (memoryStore.users.length > 0) return;

  const adminPassHash = await bcrypt.hash('admin123', 10);
  const adminPinHash = await bcrypt.hash('1234', 10);

  const demoPassHash = await bcrypt.hash('demo123', 10);
  const demoPinHash = await bcrypt.hash('9876', 10);

  memoryStore.users.push(
    {
      _id: 'usr_admin_001',
      username: 'admin',
      passwordHash: adminPassHash,
      email: process.env.EMAIL_USER || 'dintyalaradhakalyani@gmail.com',
      pin: adminPinHash,
      createdAt: new Date(Date.now() - 86400000 * 7),
    },
    {
      _id: 'usr_demo_002',
      username: 'demo',
      passwordHash: demoPassHash,
      email: 'demo@securekey.io',
      pin: demoPinHash,
      createdAt: new Date(Date.now() - 86400000 * 2),
    }
  );

  // Seed lock logs
  const now = Date.now();
  memoryStore.lockLogs.push(
    {
      _id: 'log_001',
      timestamp: new Date(now - 1000 * 60 * 12),
      user: 'admin',
      action: 'UNLOCK_SUCCESS',
      method: 'MOBILE_APP',
      ipAddress: '192.168.1.104',
    },
    {
      _id: 'log_002',
      timestamp: new Date(now - 1000 * 60 * 11 - 55000),
      user: 'ESP32 Auto-Lock',
      action: 'AUTO_RELOCK',
      method: 'AUTO',
      ipAddress: '192.168.1.50',
    },
    {
      _id: 'log_003',
      timestamp: new Date(now - 1000 * 60 * 60 * 2),
      user: 'ESP32 Keypad',
      action: 'UNLOCK_SUCCESS',
      method: 'MANUAL',
      ipAddress: '192.168.1.50',
    },
    {
      _id: 'log_004',
      timestamp: new Date(now - 1000 * 60 * 60 * 5),
      user: 'unknown',
      action: 'UNLOCK_FAILED',
      method: 'MANUAL',
      ipAddress: '192.168.1.50',
    }
  );

  // Seed intrusion alert
  memoryStore.intrusionAlerts.push({
    _id: 'alert_001',
    timestamp: new Date(now - 1000 * 60 * 60 * 24),
    sensor: 'PIR_MOTION_GPIO27',
    status: 'ALERT_DISPATCHED',
    emailSentTo: process.env.EMAIL_USER || 'dintyalaradhakalyani@gmail.com',
    notes: 'PIR triggered during LOCKED armed perimeter state.',
  });
}

export async function initDatabase(): Promise<{ connected: boolean; mode: string }> {
  await seedInitialData();

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri || mongoUri.includes('<username>')) {
    console.log('[Database] MONGO_URI not set or contains placeholder - using In-Memory Fallback Engine.');
    mongoConnected = false;
    mongoError = 'No valid MONGO_URI specified in environment.';
    return { connected: false, mode: 'In-Memory Mock Store' };
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    mongoConnected = true;
    mongoError = null;
    console.log('[Database] Successfully connected to MongoDB Atlas!');

    // Seed admin user in MongoDB if not exists
    const existingAdmin = await UserModel.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminPassHash = await bcrypt.hash('admin123', 10);
      const adminPinHash = await bcrypt.hash('1234', 10);
      await UserModel.create({
        username: 'admin',
        passwordHash: adminPassHash,
        email: process.env.EMAIL_USER || 'dintyalaradhakalyani@gmail.com',
        pin: adminPinHash,
      });
      console.log('[Database] Seeded default admin user in MongoDB Atlas.');
    }

    return { connected: true, mode: 'MongoDB Atlas' };
  } catch (err: any) {
    mongoConnected = false;
    mongoError = err.message;
    console.warn('[Database] Failed to connect to MongoDB Atlas, switching to In-Memory Engine:', err.message);
    return { connected: false, mode: 'In-Memory Fallback Store' };
  }
}

// User Operations
export async function findUserByUsername(username: string): Promise<any | null> {
  const cleanUsername = username.trim().toLowerCase();
  if (mongoConnected) {
    try {
      return await UserModel.findOne({ username: cleanUsername });
    } catch {
      // Fallback
    }
  }
  return memoryStore.users.find(u => u.username.toLowerCase() === cleanUsername) || null;
}

export async function findUserById(id: string): Promise<any | null> {
  if (mongoConnected) {
    try {
      return await UserModel.findById(id);
    } catch {
      // Fallback
    }
  }
  return memoryStore.users.find(u => u._id === id) || null;
}

export async function createUser(data: {
  username: string;
  passwordHash: string;
  email: string;
  pin: string;
}): Promise<any> {
  const cleanUsername = data.username.trim().toLowerCase();
  if (mongoConnected) {
    try {
      return await UserModel.create({
        username: cleanUsername,
        passwordHash: data.passwordHash,
        email: data.email.trim().toLowerCase(),
        pin: data.pin,
      });
    } catch (err) {
      console.warn('[Database] Mongoose create error, saving to memory fallback:', err);
    }
  }

  const newUser: MemoryUser = {
    _id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    passwordHash: data.passwordHash,
    email: data.email.trim().toLowerCase(),
    pin: data.pin,
    createdAt: new Date(),
  };
  memoryStore.users.push(newUser);
  return newUser;
}

// Find user by matching PIN (for ESP32 device unlock verification)
export async function findUserByPin(pin: string): Promise<any | null> {
  // Check users one by one using bcrypt.compare
  const users = mongoConnected
    ? await UserModel.find({})
    : memoryStore.users;

  for (const user of users) {
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (isMatch) {
      return user;
    }
  }
  return null;
}

// Lock Log Operations
export async function addLockLog(data: {
  user: string;
  action: 'UNLOCK_SUCCESS' | 'UNLOCK_FAILED' | 'AUTO_RELOCK' | 'MANUAL_LOCK' | 'STATUS_CHANGE';
  method: 'MOBILE_APP' | 'MANUAL' | 'ESP32_KEYPAD' | 'AUTO';
  ipAddress: string;
}): Promise<any> {
  if (mongoConnected) {
    try {
      return await LockLogModel.create(data);
    } catch (err) {
      console.warn('[Database] Mongoose addLockLog failed:', err);
    }
  }

  const newLog: MemoryLockLog = {
    _id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date(),
    user: data.user,
    action: data.action,
    method: data.method,
    ipAddress: data.ipAddress,
  };
  memoryStore.lockLogs.unshift(newLog);
  if (memoryStore.lockLogs.length > 200) memoryStore.lockLogs.pop();
  return newLog;
}

export async function getLockLogs(limit = 50): Promise<any[]> {
  if (mongoConnected) {
    try {
      return await LockLogModel.find({}).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) {
      console.warn('[Database] Mongoose getLockLogs failed:', err);
    }
  }
  return [...memoryStore.lockLogs].slice(0, limit);
}

// Intrusion Alert Operations
export async function addIntrusionAlert(data: {
  sensor: string;
  status: 'MOTION_DETECTED' | 'ALERT_DISPATCHED' | 'SIMULATION_TEST';
  emailSentTo: string;
  notes?: string;
}): Promise<any> {
  if (mongoConnected) {
    try {
      return await IntrusionAlertModel.create(data);
    } catch (err) {
      console.warn('[Database] Mongoose addIntrusionAlert failed:', err);
    }
  }

  const newAlert: MemoryIntrusionAlert = {
    _id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date(),
    sensor: data.sensor,
    status: data.status,
    emailSentTo: data.emailSentTo,
    notes: data.notes,
  };
  memoryStore.intrusionAlerts.unshift(newAlert);
  if (memoryStore.intrusionAlerts.length > 100) memoryStore.intrusionAlerts.pop();
  return newAlert;
}

export async function getIntrusionAlerts(limit = 50): Promise<any[]> {
  if (mongoConnected) {
    try {
      return await IntrusionAlertModel.find({}).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) {
      console.warn('[Database] Mongoose getIntrusionAlerts failed:', err);
    }
  }
  return [...memoryStore.intrusionAlerts].slice(0, limit);
}

export function getDatabaseStatus() {
  return {
    mongoConnected,
    mongoError,
    activeMode: mongoConnected ? 'MongoDB Atlas' : 'In-Memory MERN Store',
    userCount: memoryStore.users.length,
    logCount: memoryStore.lockLogs.length,
    alertCount: memoryStore.intrusionAlerts.length,
  };
}
