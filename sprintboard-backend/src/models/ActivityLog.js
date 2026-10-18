import mongoose from 'mongoose';
const activityLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 80 },
  entityType: { type: String, enum: ['task', 'team', 'user', 'profile', 'auth'], required: true },
  entityId: { type: String, default: '' },
  summary: { type: String, required: true, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, versionKey: false });
activityLogSchema.index({ createdAt: -1 });
export default mongoose.model('ActivityLog', activityLogSchema);
