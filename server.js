/**
 * SecureKey IoT Smart Lock & Intrusion Alarm System
 * Express Server & REST Route Configuration
 * 
 * Powered by Node.js, Express, MongoDB Atlas & ESP32 Microcontroller
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection (MongoDB Atlas)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/securekey';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('[MongoDB] Connected successfully to Atlas cluster.'))
  .catch((err) => console.warn('[MongoDB] Connection warning (using fallback mode):', err.message));

// Import Controllers
import * as authController from './src/server/controllers/authController.ts';
import * as lockController from './src/server/controllers/lockController.ts';
import * as intrusionController from './src/server/controllers/intrusionController.ts';

// --- API Route Definitions ---

// A. Auth & Mobile User Routes (/api/auth)
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.post('/api/auth/unlock', authController.unlock);
app.get('/api/auth/me', authController.getCurrentUser);

// B. ESP32 Hardware Integration Routes (/api/lock)
app.post('/api/lock/verify-pin', lockController.verifyEsp32Pin);
app.post('/api/lock/status', lockController.receiveLockStatus);
app.get('/api/lock/status', lockController.getCurrentLockStatus);
app.post('/api/lock/instant-lock', lockController.handleInstantLock);
app.get('/api/lock/logs', lockController.getLogs);

// C. Intrusion & SMTP Alert Routes (/api/intrusion)
app.post('/api/intrusion/alert', intrusionController.reportIntrusion);
app.get('/api/intrusion/alerts', intrusionController.getAlertHistory);
app.get('/api/intrusion/dispatches', intrusionController.getDispatchedEmails);

export default app;
