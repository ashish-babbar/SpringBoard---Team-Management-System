import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { notFound } from '../utils/errors.js';
import { notificationDto } from '../utils/serializers.js';
const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.set('Cache-Control', 'no-store').json({ data: { items: items.map(notificationDto) } });
}));
router.patch('/read-all', requireAuth, asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
  res.json({ data: { updated: result.modifiedCount } });
}));
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Notification not found.');
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } }, { new: true });
  if (!item) throw notFound('Notification not found.');
  res.json({ data: { notification: notificationDto(item) } });
}));
export default router;
