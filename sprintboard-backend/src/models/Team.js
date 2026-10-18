import mongoose from 'mongoose';
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  color: { type: String, enum: ['teal', 'blue', 'purple', 'green', 'orange', 'pink'], default: 'teal' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });
teamSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
export default mongoose.model('Team', teamSchema);
