/**
 * SecureKey IoT MERN Stack
 * LockLog Mongoose Model
 */
import mongoose from 'mongoose';

const LockLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  user: {
    type: String,
    required: true,
    default: 'ESP32 Auto-Lock',
  },
  action: {
    type: String,
    required: true,
    enum: ['UNLOCK_SUCCESS', 'UNLOCK_FAILED', 'AUTO_RELOCK', 'MANUAL_LOCK', 'STATUS_CHANGE'],
  },
  method: {
    type: String,
    required: true,
    enum: ['MOBILE_APP', 'MANUAL', 'ESP32_KEYPAD', 'AUTO'],
    default: 'MOBILE_APP',
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1',
  },
});

export const LockLog = mongoose.models.LockLog || mongoose.model('LockLog', LockLogSchema);
export default LockLog;
