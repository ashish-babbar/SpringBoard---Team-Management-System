import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import Team from '../models/Team.js';
import FileAsset from '../models/FileAsset.js';
import PasswordReset from '../models/PasswordReset.js';
import Session from '../models/Session.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { badRequest, conflict, notFound, HttpError } from '../utils/errors.js';
import { userDto } from '../utils/serializers.js';
import { logActivity, notifyUser } from '../utils/audit.js';
import { randomToken, sha256 } from '../utils/ids.js';
import { sendPasswordSetupEmail, mailConfigured } from '../utils/mail.js';
import { uploadAvatar } from '../middleware/upload.js';
import { persistUpload, removeFileAsset } from '../utils/files.js';

const router = Router();
const profileSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()) }).strict();
const inviteSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()), role: z.enum(['Admin', 'Employee']).default('Employee'), team: z.string().trim().max(80).default('') }).strict();
const memberUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()).optional(),
  role: z.enum(['Admin', 'Employee']).optional(),
  team: z.string().trim().max(80).optional()
}).strict().refine((input) => Object.keys(input).length > 0, 'Update at least one member field.');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const items = await User.find({ isActive: true }).sort({ name: 1 });
  res.set('Cache-Control', 'no-store').json({ data: { items: items.map(userDto) } });
}));

router.post('/invite', requireAuth, requireRole('Admin'), validateBody(inviteSchema), asyncHandler(async (req, res) => {
  const input = req.validatedBody;
  const manualInvitesEnabled = process.env.NODE_ENV !== 'production' || process.env.ALLOW_MANUAL_INVITES === 'true';
  const emailConfigured = mailConfigured();
  if (process.env.NODE_ENV === 'production' && !emailConfigured && !manualInvitesEnabled) throw new HttpError(503, 'Email delivery is not configured; invitations are temporarily unavailable.', 'MAIL_NOT_CONFIGURED');
  if (await User.exists({ email: input.email })) throw conflict('An account with this email already exists.');
  if (input.team && !(await Team.findOne({ name: input.team }).collation({ locale: 'en', strength: 2 }))) throw badRequest('Choose an existing team.');
  const tempPassword = randomToken(32);
  const user = await User.create({ name: input.name, email: input.email, role: input.role, team: input.team, passwordHash: await bcrypt.hash(tempPassword, 12), mustResetPassword: true });
  const resetToken = randomToken(32);
  await PasswordReset.create({ userId: user._id, tokenHash: sha256(resetToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
  const link = `${(process.env.APP_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
  let setupUrl = manualInvitesEnabled && !emailConfigured ? link : null;
  try {
    if (emailConfigured) await sendPasswordSetupEmail({ to: user.email, name: user.name, link, subject: 'You’ve been invited to SprintBoard' });
  } catch (error) {
    await Promise.all([User.deleteOne({ _id: user._id }), PasswordReset.deleteMany({ userId: user._id })]);
    console.error('Invitation email delivery failed:', error.message);
    throw new HttpError(503, 'The invitation email could not be sent. Please try again later.', 'INVITATION_EMAIL_FAILED');
  }
  await logActivity({ actorId: req.user._id, action: 'member_invited', entityType: 'user', entityId: user._id, summary: `${req.user.name} invited ${user.name}` });
  await notifyUser({ userId: req.user._id, title: 'Invitation sent', message: `An invitation was sent to ${user.email}.`, type: 'member' });
  res.status(201).json({ data: { user: userDto(user), setupUrl } });
}));

router.patch('/:id', requireAuth, requireRole('Admin'), validateBody(memberUpdateSchema), asyncHandler(async (req, res) => {
  const input = req.validatedBody;
  if (String(req.params.id) === String(req.user._id) && input.role && input.role !== 'Admin') throw badRequest('You cannot remove your own administrator role.');
  const target = await User.findById(req.params.id);
  if (!target) throw notFound('User not found.');
  if (input.email && await User.exists({ email: input.email, _id: { $ne: target._id } })) throw conflict('That email address is already used by another account.');
  const previousRole = target.role;
  Object.assign(target, input);
  await target.save();
  if (previousRole === 'Admin' && target.role === 'Employee') await Session.updateMany({ userId: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await logActivity({ actorId: req.user._id, action: 'member_updated', entityType: 'user', entityId: target._id, summary: `${req.user.name} updated ${target.name}'s account`, metadata: { fields: Object.keys(input) } });
  res.json({ data: { user: userDto(target) } });
}));

router.patch('/me', requireAuth, validateBody(profileSchema), asyncHandler(async (req, res) => {
  const { name, email } = req.validatedBody;
  const duplicate = await User.exists({ email, _id: { $ne: req.user._id } });
  if (duplicate) throw conflict('That email address is already used by another account.');
  req.user.name = name;
  req.user.email = email;
  await req.user.save();
  await logActivity({ actorId: req.user._id, action: 'profile_updated', entityType: 'profile', entityId: req.user._id, summary: `${req.user.name} updated profile details` });
  res.json({ data: { user: userDto(req.user) } });
}));

router.post('/me/avatar', requireAuth, uploadAvatar, asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Choose a profile photo to upload.');
  const asset = await persistUpload({ file: req.file, category: 'avatar', uploadedBy: req.user._id });
  const oldPublicId = req.user.avatarFileId;
  req.user.avatarFileId = asset.publicId;
  try { await req.user.save(); }
  catch (error) { await removeFileAsset(asset); throw error; }
  if (oldPublicId && oldPublicId !== asset.publicId) {
    const oldAsset = await FileAsset.findOne({ publicId: oldPublicId, category: 'avatar' });
    if (oldAsset) await removeFileAsset(oldAsset);
  }
  await logActivity({ actorId: req.user._id, action: 'avatar_updated', entityType: 'profile', entityId: req.user._id, summary: `${req.user.name} updated profile photo` });
  res.status(201).json({ data: { avatarUrl: `${process.env.API_PREFIX || '/api'}/files/${encodeURIComponent(asset.publicId)}`, user: userDto(req.user) } });
}));

router.patch('/:id/role', requireAuth, requireRole('Admin'), asyncHandler(async (req, res) => {
  const parsed = z.object({ role: z.enum(['Admin', 'Employee']) }).strict().safeParse(req.body);
  if (!parsed.success) throw badRequest('Role must be Admin or Employee.');
  if (String(req.params.id) === String(req.user._id) && parsed.data.role !== 'Admin') throw badRequest('You cannot remove your own administrator role.');
  const target = await User.findById(req.params.id);
  if (!target) throw notFound('User not found.');
  target.role = parsed.data.role;
  await target.save();
  if (target.role !== 'Admin') await Session.updateMany({ userId: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await logActivity({ actorId: req.user._id, action: 'member_role_changed', entityType: 'user', entityId: target._id, summary: `${req.user.name} updated ${target.name}’s role` });
  res.json({ data: { user: userDto(target) } });
}));

router.delete('/:id', requireAuth, requireRole('Admin'), asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw badRequest('You cannot deactivate your own account.');
  const target = await User.findById(req.params.id);
  if (!target) throw notFound('User not found.');
  target.isActive = false;
  await target.save();
  await Session.updateMany({ userId: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await logActivity({ actorId: req.user._id, action: 'member_deactivated', entityType: 'user', entityId: target._id, summary: `${req.user.name} deactivated ${target.name}` });
  res.status(204).end();
}));
export default router;
