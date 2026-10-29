import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { initDatabase, getDatabaseStatus } from './src/server/db.ts';
import { login, register, unlock, getCurrentUser } from './src/server/controllers/authController.ts';
import {
  verifyEsp32Pin,
  receiveLockStatus,
  getCurrentLockStatus,
  handleInstantLock,
  getLogs,
} from './src/server/controllers/lockController.ts';
import {
  reportIntrusion,
  getAlertHistory,
  getDispatchedEmails,
} from './src/server/controllers/intrusionController.ts';
import { getLockState } from './src/server/lockState.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function bootstrap() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize MongoDB Atlas connection with in-memory fallback
  const dbInfo = await initDatabase();
  console.log(`[SecureKey] Database initialized in mode: ${dbInfo.mode}`);

  // --- API Routes ---

  // A. Auth & Mobile User Routes (/api/auth)
  app.post('/api/auth/login', login);
  app.post('/api/auth/register', register);
  app.post('/api/auth/unlock', unlock);
  app.get('/api/auth/me', getCurrentUser);

  // B. ESP32 Hardware Integration Routes (/api/lock)
  app.post('/api/lock/verify-pin', verifyEsp32Pin);
  app.post('/api/lock/status', receiveLockStatus);
  app.get('/api/lock/status', getCurrentLockStatus);
  app.post('/api/lock/instant-lock', handleInstantLock);
  app.get('/api/lock/logs', getLogs);

  // C. Intrusion & SMTP Alert Routes (/api/intrusion)
  app.post('/api/intrusion/alert', reportIntrusion);
  app.get('/api/intrusion/alerts', getAlertHistory);
  app.get('/api/intrusion/dispatches', getDispatchedEmails);

  // D. System Telemetry & Status (/api/system)
  app.get('/api/system/status', (_req: Request, res: Response) => {
    res.json({
      status: 'ONLINE',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: getDatabaseStatus(),
      lockState: getLockState(),
      smtp: {
        configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 4)}***@gmail.com` : 'Not configured (Simulated Dispatches active)',
      },
    });
  });

  // Serve Frontend
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware integration for live development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SecureKey Server] Running full-stack IoT server on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[SecureKey Server] Fatal startup failure:', err);
  process.exit(1);
});
