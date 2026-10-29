import mongoose, { Document, Schema } from 'mongoose';

export interface ILockLog extends Document {
  timestamp: Date;
  user: string;
  action: 'UNLOCK_SUCCESS' | 'UNLOCK_FAILED' | 'AUTO_RELOCK' | 'MANUAL_LOCK' | 'STATUS_CHANGE';
  method: 'MOBILE_APP' | 'MANUAL' | 'ESP32_KEYPAD' | 'AUTO';
  ipAddress: string;
}

const LockLogSchema = new Schema<ILockLog>({
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

export const LockLogModel = mongoose.models.LockLog || mongoose.model<ILockLog>('LockLog', LockLogSchema);
export default LockLogModel;
