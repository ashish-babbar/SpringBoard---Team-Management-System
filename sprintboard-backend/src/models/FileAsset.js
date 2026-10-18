import mongoose from 'mongoose';
const fileAssetSchema = new mongoose.Schema({
  publicId: { type: String, required: true, unique: true, index: true },
  storageName: { type: String, required: true, unique: true },
  originalName: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
  size: { type: Number, required: true, min: 1 },
  category: { type: String, enum: ['avatar', 'taskAttachment'], required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true }
}, { timestamps: true, versionKey: false });
export default mongoose.model('FileAsset', fileAssetSchema);
