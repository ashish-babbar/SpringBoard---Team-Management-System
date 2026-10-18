import { Router } from 'express';
import { createReadStream } from 'node:fs';
import FileAsset from '../models/FileAsset.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { notFound, forbidden } from '../utils/errors.js';
import { resolveFilePath } from '../utils/files.js';
const router = Router();
router.get('/:publicId', requireAuth, asyncHandler(async (req, res, next) => {
  const asset = await FileAsset.findOne({ publicId: req.params.publicId });
  if (!asset) throw notFound('File not found.');
  if (asset.category === 'taskAttachment') {
    const task = await Task.findById(asset.taskId).select('assigneeId');
    if (!task) throw notFound('File not found.');
    const assigned = task.assigneeId && String(task.assigneeId) === String(req.user._id);
    if (req.user.role !== 'Admin' && !assigned) throw forbidden('You do not have access to this attachment.');
  }
  const filePath = await resolveFilePath(asset);
  const safeName = asset.originalName.replace(/["\\\r\n]/g, '_');
  res.set({
    'Content-Type': asset.mimeType,
    'Content-Length': String(asset.size),
    'Content-Disposition': `${asset.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename="${safeName}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox"
  });
  const stream = createReadStream(filePath);
  stream.on('error', next);
  stream.pipe(res);
}));
export default router;
