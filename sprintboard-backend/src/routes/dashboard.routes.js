import { Router } from 'express';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { taskDto } from '../utils/serializers.js';
const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const match = req.user.role === 'Admin' ? {} : { assigneeId: req.user._id };
  const [total, statusCounts, overdue, recentDocs, recentActivity] = await Promise.all([
    Task.countDocuments(match),
    Task.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.countDocuments({ ...match, dueDate: { $ne: '', $lt: new Date().toISOString().slice(0, 10) }, status: { $ne: 'Done' } }),
    Task.find(match).sort({ updatedAt: -1 }).limit(8).populate('assigneeId', 'name avatarFileId').populate('createdBy', 'name'),
    req.user.role === 'Admin' ? ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('actorId', 'name').lean() : ActivityLog.find({ actorId: req.user._id }).sort({ createdAt: -1 }).limit(10).populate('actorId', 'name').lean()
  ]);
  const status = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]));
  res.set('Cache-Control', 'no-store').json({ data: {
    stats: { total, todo: status.Todo || 0, inProgress: status['In progress'] || 0, completed: status.Done || 0, overdue },
    recentTasks: recentDocs.map(taskDto),
    recentActivity: recentActivity.map((item) => ({ id: String(item._id), actor: item.actorId?.name || 'Workspace member', action: item.action, summary: item.summary, entityType: item.entityType, entityId: item.entityId, createdAt: item.createdAt }))
  } });
}));
export default router;
