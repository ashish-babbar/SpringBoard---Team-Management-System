const apiPrefix = () => process.env.API_PREFIX || '/api';
export function userDto(user) {
  if (!user) return null;
  const id = String(user._id || user.id);
  return {
    id, _id: id, name: user.name, email: user.email, role: user.role,
    team: user.team || '', avatarUrl: user.avatarFileId ? `${apiPrefix()}/files/${encodeURIComponent(user.avatarFileId)}` : '',
    isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt
  };
}
export function taskDto(task) {
  const assignedUsers = Array.isArray(task.assigneeIds)
    ? task.assigneeIds.filter((user) => user && typeof user === 'object' && user.name)
    : [];
  const legacyAssignee = task.assigneeId && typeof task.assigneeId === 'object' && task.assigneeId.name
    ? task.assigneeId
    : null;
  const assignees = assignedUsers.length ? assignedUsers : (legacyAssignee ? [legacyAssignee] : []);
  const firstAssignee = assignees[0] || null;
  const creator = task.createdBy && typeof task.createdBy === 'object' && task.createdBy.name;
  const assigneeIds = task.assigneeIds?.length
    ? task.assigneeIds.map((user) => String(user._id || user.id || user))
    : (task.assigneeId ? [String(task.assigneeId._id || task.assigneeId)] : []);
  return {
    id: task.taskCode || String(task._id), _id: String(task._id),
    title: task.title, description: task.description || '', team: task.team || 'General',
    assigneeIds, assignees: assignees.map((user) => ({
      id: String(user._id || user.id), name: user.name,
      avatarUrl: user.avatarFileId ? `${apiPrefix()}/files/${encodeURIComponent(user.avatarFileId)}` : ''
    })),
    assigneeId: assigneeIds[0] || '',
    assignee: firstAssignee?.name || '',
    assigneeAvatar: firstAssignee?.avatarFileId ? `${apiPrefix()}/files/${encodeURIComponent(firstAssignee.avatarFileId)}` : '',
    priority: task.priority, status: task.status, dueDate: task.dueDate || '',
    createdBy: creator || (task.createdBy ? String(task.createdBy) : ''),
    attachments: (task.attachments || []).map((a) => ({ fileId: a.fileId, name: a.name, size: a.size, url: a.url, uploadedAt: a.uploadedAt, uploadedBy: a.uploadedBy ? String(a.uploadedBy) : '' })),
    createdAt: task.createdAt, updatedAt: task.updatedAt
  };
}
export function notificationDto(item) {
  return { id: String(item._id), _id: String(item._id), title: item.title, message: item.message, read: Boolean(item.read), isRead: Boolean(item.read), type: item.type, relatedTaskId: item.relatedTaskId ? String(item.relatedTaskId) : '', createdAt: item.createdAt, time: item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '' };
}
