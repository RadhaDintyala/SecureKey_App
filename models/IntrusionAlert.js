/**
 * SecureKey IoT MERN Stack
 * IntrusionAlert Mongoose Model
 */
import mongoose from 'mongoose';

const IntrusionAlertSchema = new mongoose.Schema({
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

export const IntrusionAlert = mongoose.models.IntrusionAlert || mongoose.model('IntrusionAlert', IntrusionAlertSchema);
export default IntrusionAlert;
