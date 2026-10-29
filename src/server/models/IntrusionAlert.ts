import mongoose, { Document, Schema } from 'mongoose';

export interface IIntrusionAlert extends Document {
  timestamp: Date;
  sensor: string;
  status: 'MOTION_DETECTED' | 'ALERT_DISPATCHED' | 'SIMULATION_TEST';
  emailSentTo: string;
  notes?: string;
}

const IntrusionAlertSchema = new Schema<IIntrusionAlert>({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  sensor: {
    type: String,
    required: true,
    default: 'PIR_MOTION_GPIO27',
  },
  status: {
    type: String,
    required: true,
    enum: ['MOTION_DETECTED', 'ALERT_DISPATCHED', 'SIMULATION_TEST'],
    default: 'ALERT_DISPATCHED',
  },
  emailSentTo: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
});

export const IntrusionAlertModel = mongoose.models.IntrusionAlert || mongoose.model<IIntrusionAlert>('IntrusionAlert', IntrusionAlertSchema);
export default IntrusionAlertModel;
