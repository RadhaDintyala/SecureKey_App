/**
 * SecureKey IoT MERN Stack
 * User Mongoose Model
 */
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  pin: {
    type: String,
    required: [true, 'PIN is required'], // 4 to 6 digit encrypted unlock code
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
