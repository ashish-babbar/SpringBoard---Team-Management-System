import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['Admin', 'Employee'], default: 'Employee', index: true },
  team: { type: String, trim: true, maxlength: 80, default: '' },
  avatarFileId: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  mustResetPassword: { type: Boolean, default: false },
  lastLoginAt: Date,
  passwordChangedAt: Date
}, { timestamps: true, versionKey: false });
userSchema.index({ name: 'text', email: 'text' });
export default mongoose.model('User', userSchema);
