import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';

export async function logActivity({ actorId, action, entityType, entityId = '', summary, metadata = {} }) {
  return ActivityLog.create({ actorId, action, entityType, entityId: String(entityId || ''), summary, metadata });
}
export async function notifyUser({ userId, title, message, type = 'system', relatedTaskId = null }) {
  if (!userId) return null;
  return Notification.create({ userId, title, message, type, relatedTaskId });
}
