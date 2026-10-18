import mongoose from 'mongoose';
const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  csrfTokenHash: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, maxlength: 500, default: '' },
  ipHash: { type: String, maxlength: 128, default: '' }
}, { timestamps: true, versionKey: false });
export default mongoose.model('Session', sessionSchema);
