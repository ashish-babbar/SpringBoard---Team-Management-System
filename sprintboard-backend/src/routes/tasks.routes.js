import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Counter from '../models/Counter.js';
import FileAsset from '../models/FileAsset.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { taskDto } from '../utils/serializers.js';
import { logActivity, notifyUser } from '../utils/audit.js';
import { uploadAttachment } from '../middleware/upload.js';
import { persistUpload, removeFileAsset } from '../utils/files.js';

const router = Router();
const statusValues = ['Todo', 'In progress', 'Done'];
const priorityValues = ['High', 'Medium', 'Low'];
const taskFields = {
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(3000).optional(),
  team: z.string().trim().min(1).max(80).optional(),
  assignee: z.string().trim().max(100).optional(),
  assigneeId: z.string().trim().max(64).optional(),
  priority: z.enum(priorityValues).optional(),
  status: z.enum(statusValues).optional(),
  dueDate: z.string().trim().max(10).optional()
};
const createSchema = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().max(3000).default(''),
  team: z.string().trim().min(1).max(80).default('General'), assignee: z.string().trim().max(100).optional().default(''),
  assigneeId: z.string().trim().max(64).optional().default(''), priority: z.enum(priorityValues).default('Medium'),
  status: z.enum(statusValues).default('Todo'), dueDate: z.string().trim().max(10).default(''), attachments: z.array(z.unknown()).max(20).optional()
}).strict();
const updateSchema = z.object(taskFields).strict().refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update.');
const statusSchema = z.object({ status: z.enum(statusValues) }).strict();
const isObjectId = (value) => mongoose.isValidObjectId(value);
async function findTask(rawId) {
  const key = String(rawId || '');
  const where = [{ taskCode: key }];
  if (isObjectId(key)) where.push({ _id: key });
  return Task.findOne({ $or: where }).populate('assigneeId', 'name avatarFileId').populate('createdBy', 'name');
}
async function resolveAssignee(input) {
  const id = String(input.assigneeId || '').trim();
  const name = String(input.assignee || '').trim();
  if (id && isObjectId(id)) {
    const user = await User.findOne({ _id: id, isActive: true });
    if (!user) throw badRequest('The selected assignee is not an active workspace member.');
    return user;
  }
  if (id) throw badRequest('Invalid assignee identifier.');
  if (name) {
    const user = await User.findOne({ name, isActive: true }).collation({ locale: 'en', strength: 2 });
    if (!user) throw badRequest('The selected assignee is not an active workspace member.');
    return user;
  }
  return null;
}
async function validateTeam(name) {
  const normalized = (name || 'General').trim();
  if (!normalized) return 'General';
  const exists = await Team.findOne({ name: normalized }).collation({ locale: 'en', strength: 2 }).select('_id');
  if (!exists && normalized.toLowerCase() !== 'general') throw badRequest('Choose an existing team.');
  return normalized;
}
function parseDueDate(value) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw badRequest('Due date must be a valid calendar date in YYYY-MM-DD format.');
  return value;
}
async function nextTaskCode() {
  const counter = await Counter.findOneAndUpdate({ _id: 'taskCode' }, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  return `SB-${String(counter.seq).padStart(4, '0')}`;
}
async function populateTask(taskId) {
  return Task.findById(taskId).populate('assigneeId', 'name avatarFileId').populate('createdBy', 'name');
}
async function canReadTask(task, user) {
  if (user.role === 'Admin') return true;
  return Boolean(task.assigneeId && String(task.assigneeId._id || task.assigneeId) === String(user._id));
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page || '1', 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit || '100', 10) || 100));
  const query = {};
  if (req.user.role !== 'Admin') query.assigneeId = req.user._id;
  const status = String(req.query.status || '').trim();
  const priority = String(req.query.priority || '').trim();
  if (status) { if (!statusValues.includes(status)) throw badRequest('Invalid status filter.'); query.status = status; }
  if (priority) { if (!priorityValues.includes(priority)) throw badRequest('Invalid priority filter.'); query.priority = priority; }
  if (req.query.team) query.team = String(req.query.team).slice(0, 80);
  if (req.query.assigneeId && req.user.role === 'Admin') {
    if (!isObjectId(String(req.query.assigneeId))) throw badRequest('Invalid assignee filter.');
    query.assigneeId = req.query.assigneeId;
  }
  const q = String(req.query.q || req.query.search || '').trim().slice(0, 100);
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ title: new RegExp(escaped, 'i') }, { description: new RegExp(escaped, 'i') }, { team: new RegExp(escaped, 'i') }, { taskCode: new RegExp(escaped, 'i') }];
  }
  if (req.query.dueBefore) query.dueDate = { ...(query.dueDate || {}), $lte: parseDueDate(String(req.query.dueBefore)) };
  if (req.query.dueAfter) query.dueDate = { ...(query.dueDate || {}), $gte: parseDueDate(String(req.query.dueAfter)) };
  const sortKey = ['dueDate', 'priority', 'title', 'createdAt', 'updatedAt', 'status'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const [docs, total] = await Promise.all([
    Task.find(query).sort({ [sortKey]: sortOrder, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('assigneeId', 'name avatarFileId').populate('createdBy', 'name'),
    Task.countDocuments(query)
  ]);
  res.set('Cache-Control', 'no-store').json({ data: { items: docs.map(taskDto), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}));

router.post('/', requireAuth, requireRole('Admin'), validateBody(createSchema), asyncHandler(async (req, res) => {
  const input = req.validatedBody;
  const assignee = await resolveAssignee(input);
  const team = await validateTeam(input.team);
  const dueDate = parseDueDate(input.dueDate);
  const task = await Task.create({ taskCode: await nextTaskCode(), title: input.title, description: input.description, team, assigneeId: assignee?._id || null, priority: input.priority, status: input.status, dueDate, createdBy: req.user._id });
  await logActivity({ actorId: req.user._id, action: 'task_created', entityType: 'task', entityId: task.taskCode, summary: `${req.user.name} created ${task.title}` });
  if (assignee && String(assignee._id) !== String(req.user._id)) await notifyUser({ userId: assignee._id, title: 'New task assigned', message: `${req.user.name} assigned you “${task.title}”.`, type: 'task', relatedTaskId: task._id });
  const result = await populateTask(task._id);
  res.status(201).json({ data: { task: taskDto(result) } });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task || !(await canReadTask(task, req.user))) throw notFound('Task not found or you do not have access to it.');
  res.set('Cache-Control', 'no-store').json({ data: { task: taskDto(task) } });
}));

router.patch('/:id/status', requireAuth, validateBody(statusSchema), asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) throw notFound('Task not found.');
  const taskAssigneeId = task.assigneeId?._id || task.assigneeId;
  if (req.user.role !== 'Admin' && String(taskAssigneeId || '') !== String(req.user._id)) throw forbidden('Employees can update status only on tasks assigned to them.');
  const previousStatus = task.status;
  task.status = req.validatedBody.status;
  await task.save();
  await logActivity({ actorId: req.user._id, action: 'task_status_changed', entityType: 'task', entityId: task.taskCode, summary: `${req.user.name} changed “${task.title}” from ${previousStatus} to ${task.status}`, metadata: { from: previousStatus, to: task.status } });
  const creatorId = task.createdBy?._id || task.createdBy;
  if (String(creatorId) !== String(req.user._id)) await notifyUser({ userId: creatorId, title: 'Task status updated', message: `${req.user.name} changed “${task.title}” to ${task.status}.`, type: 'task', relatedTaskId: task._id });
  const result = await populateTask(task._id);
  res.json({ data: { task: taskDto(result) } });
}));

router.patch('/:id', requireAuth, requireRole('Admin'), validateBody(updateSchema), asyncHandler(async (req, res) => {
  const task = await Task.findOne({ $or: [{ taskCode: req.params.id }, ...(isObjectId(req.params.id) ? [{ _id: req.params.id }] : [])] });
  if (!task) throw notFound('Task not found.');
  const input = req.validatedBody;
  const previousAssignee = task.assigneeId ? String(task.assigneeId) : '';
  if (Object.hasOwn(input, 'title')) task.title = input.title;
  if (Object.hasOwn(input, 'description')) task.description = input.description;
  if (Object.hasOwn(input, 'team')) task.team = await validateTeam(input.team);
  if (Object.hasOwn(input, 'priority')) task.priority = input.priority;
  if (Object.hasOwn(input, 'status')) task.status = input.status;
  if (Object.hasOwn(input, 'dueDate')) task.dueDate = parseDueDate(input.dueDate);
  if (Object.hasOwn(input, 'assigneeId') || Object.hasOwn(input, 'assignee')) {
    const assignee = await resolveAssignee(input);
    task.assigneeId = assignee?._id || null;
  }
  await task.save();
  await logActivity({ actorId: req.user._id, action: 'task_updated', entityType: 'task', entityId: task.taskCode, summary: `${req.user.name} updated ${task.title}` });
  const freshAssigneeId = task.assigneeId ? String(task.assigneeId) : '';
  if (freshAssigneeId && freshAssigneeId !== previousAssignee && freshAssigneeId !== String(req.user._id)) await notifyUser({ userId: freshAssigneeId, title: 'New task assigned', message: `${req.user.name} assigned you “${task.title}”.`, type: 'task', relatedTaskId: task._id });
  const result = await populateTask(task._id);
  res.json({ data: { task: taskDto(result) } });
}));

router.post('/:id/attachments', requireAuth, uploadAttachment, asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task || !(await canReadTask(task, req.user))) throw notFound('Task not found or you do not have access to it.');
  if (!req.file) throw badRequest('Choose an attachment to upload.');
  const asset = await persistUpload({ file: req.file, category: 'taskAttachment', uploadedBy: req.user._id, taskId: task._id });
  const url = `${process.env.API_PREFIX || '/api'}/files/${encodeURIComponent(asset.publicId)}`;
  task.attachments.push({ fileId: asset.publicId, name: asset.originalName, size: asset.size, url, uploadedAt: new Date(), uploadedBy: req.user._id });
  try { await task.save(); } catch (error) { await removeFileAsset(asset); throw error; }
  await logActivity({ actorId: req.user._id, action: 'task_attachment_added', entityType: 'task', entityId: task.taskCode, summary: `${req.user.name} attached a file to ${task.title}`, metadata: { fileId: asset.publicId } });
  res.status(201).json({ data: { attachment: { fileId: asset.publicId, name: asset.originalName, size: asset.size, url, uploadedAt: asset.createdAt } } });
}));

router.delete('/:id', requireAuth, requireRole('Admin'), asyncHandler(async (req, res) => {
  const task = await Task.findOne({ $or: [{ taskCode: req.params.id }, ...(isObjectId(req.params.id) ? [{ _id: req.params.id }] : [])] });
  if (!task) throw notFound('Task not found.');
  const assets = await FileAsset.find({ taskId: task._id });
  for (const asset of assets) await removeFileAsset(asset);
  await Promise.all([Task.deleteOne({ _id: task._id }), logActivity({ actorId: req.user._id, action: 'task_deleted', entityType: 'task', entityId: task.taskCode, summary: `${req.user.name} deleted ${task.title}` })]);
  res.status(204).end();
}));

export default router;
