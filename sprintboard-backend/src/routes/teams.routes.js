import { Router } from 'express';
import { z } from 'zod';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { badRequest, notFound } from '../utils/errors.js';
import { logActivity } from '../utils/audit.js';

const router = Router();
const colorValues = ['teal', 'blue', 'purple', 'green', 'orange', 'pink'];
const createSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(500).default('') }).strict();
const updateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(500).optional(), color: z.enum(colorValues).optional() }).strict().refine((v) => Object.keys(v).length > 0, 'Provide a field to update.');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ name: 1 }).lean();
  const [memberCounts, taskCounts, doneCounts] = await Promise.all([
    User.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$team', count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$team', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: { status: 'Done' } }, { $group: { _id: '$team', count: { $sum: 1 } } }])
  ]);
  const countMap = (entries) => new Map(entries.map((x) => [x._id || '', x.count]));
  const members = countMap(memberCounts), tasks = countMap(taskCounts), done = countMap(doneCounts);
  const items = teams.map((team) => {
    const taskCount = tasks.get(team.name) || 0;
    return { id: String(team._id), _id: String(team._id), name: team.name, description: team.description, color: team.color, members: members.get(team.name) || 0, tasks: taskCount, progress: taskCount ? Math.round((done.get(team.name) || 0) / taskCount * 100) : 0, createdAt: team.createdAt, updatedAt: team.updatedAt };
  });
  res.json({ data: { items } });
}));

router.post('/', requireAuth, requireRole('Admin'), validateBody(createSchema), asyncHandler(async (req, res) => {
  const team = await Team.create({ ...req.validatedBody, createdBy: req.user._id, color: colorValues[(await Team.countDocuments()) % colorValues.length] });
  await logActivity({ actorId: req.user._id, action: 'team_created', entityType: 'team', entityId: team._id, summary: `${req.user.name} created team ${team.name}` });
  res.status(201).json({ data: { team: { id: String(team._id), _id: String(team._id), name: team.name, description: team.description, color: team.color, members: 0, tasks: 0, progress: 0, createdAt: team.createdAt } } });
}));

router.patch('/:id', requireAuth, requireRole('Admin'), validateBody(updateSchema), asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw notFound('Team not found.');
  const oldName = team.name;
  Object.assign(team, req.validatedBody);
  await team.save();
  if (oldName !== team.name) await Promise.all([
    User.updateMany({ team: oldName }, { $set: { team: team.name } }),
    Task.updateMany({ team: oldName }, { $set: { team: team.name } })
  ]);
  await logActivity({ actorId: req.user._id, action: 'team_updated', entityType: 'team', entityId: team._id, summary: `${req.user.name} updated team ${team.name}` });
  const [members, tasks, done] = await Promise.all([User.countDocuments({ isActive: true, team: team.name }), Task.countDocuments({ team: team.name }), Task.countDocuments({ team: team.name, status: 'Done' })]);
  res.json({ data: { team: { id: String(team._id), _id: String(team._id), name: team.name, description: team.description, color: team.color, members, tasks, progress: tasks ? Math.round(done / tasks * 100) : 0 } } });
}));

router.delete('/:id', requireAuth, requireRole('Admin'), asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw notFound('Team not found.');
  const [memberCount, taskCount] = await Promise.all([User.countDocuments({ team: team.name }), Task.countDocuments({ team: team.name })]);
  if (memberCount || taskCount) throw badRequest('Move this team’s members and tasks before deleting it.');
  await team.deleteOne();
  await logActivity({ actorId: req.user._id, action: 'team_deleted', entityType: 'team', entityId: team._id, summary: `${req.user.name} deleted team ${team.name}` });
  res.status(204).end();
}));
export default router;
