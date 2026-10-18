import mongoose from 'mongoose';
const attachmentSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 255 },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: false });
const taskSchema = new mongoose.Schema({
  taskCode: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  team: { type: String, trim: true, maxlength: 80, default: 'General', index: true },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  assigneeIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [], index: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium', index: true },
  status: { type: String, enum: ['Todo', 'In progress', 'Done'], default: 'Todo', index: true },
  dueDate: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: { type: [attachmentSchema], default: [] }
}, { timestamps: true, versionKey: false });
taskSchema.index({ title: 'text', description: 'text', taskCode: 'text', team: 'text' });
taskSchema.index({ createdAt: -1 });
export default mongoose.model('Task', taskSchema);
