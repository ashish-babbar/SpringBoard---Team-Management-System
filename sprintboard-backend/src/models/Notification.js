import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 500 },
  read: { type: Boolean, default: false, index: true },
  type: { type: String, enum: ['task', 'team', 'member', 'system'], default: 'system' },
  relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null }
}, { timestamps: true, versionKey: false });
notificationSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
