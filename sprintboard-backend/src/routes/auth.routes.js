import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import Session from '../models/Session.js';
import PasswordReset from '../models/PasswordReset.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createDbSession, createSessionCookies, requireAuth, revokeCurrentSession } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { randomToken, sha256 } from '../utils/ids.js';
import { userDto } from '../utils/serializers.js';
import { logActivity } from '../utils/audit.js';
import { sendPasswordSetupEmail } from '../utils/mail.js';
import { unauthorized, badRequest } from '../utils/errors.js';

const router = Router();
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72).refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be 72 UTF-8 bytes or fewer.')
}).strict();
const forgotSchema = z.object({ email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()) }).strict();
const resetSchema = z.object({ token: z.string().min(20).max(300), password: z.string().min(12, 'Use at least 12 characters for a new password.').max(72).refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be 72 UTF-8 bytes or fewer.') }).strict();
const dummyHash = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

router.get('/csrf', (req, res) => {
  if (!req.cookies?.csrfToken) {
    const expiresAt = new Date(Date.now() + Number(process.env.CSRF_TTL_HOURS || 12) * 60 * 60 * 1000);
    // User session route is same-origin; token is intentionally readable by the React API client.
    res.cookie('csrfToken', randomToken(32), { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/', expires: expiresAt });
  }
  res.json({ data: { ready: true } });
});

router.get('/me', asyncHandler(async (req, res) => {
  if (!req.user) {
    if (!req.cookies?.csrfToken) {
      const expiresAt = new Date(Date.now() + Number(process.env.CSRF_TTL_HOURS || 12) * 60 * 60 * 1000);
      res.cookie('csrfToken', randomToken(32), { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/', expires: expiresAt });
    }
    throw unauthorized();
  }
  if (!req.cookies?.csrfToken || sha256(req.cookies.csrfToken) !== req.sessionDoc.csrfTokenHash) {
    const csrfToken = randomToken(32);
    req.sessionDoc.csrfTokenHash = sha256(csrfToken);
    await req.sessionDoc.save();
    res.cookie('csrfToken', csrfToken, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/', expires: req.sessionDoc.expiresAt });
  }
  res.set('Cache-Control', 'no-store').json({ data: { user: userDto(req.user) } });
}));

router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;
  const user = await User.findOne({ email }).select('+passwordHash');
  const candidateHash = user?.passwordHash || dummyHash;
  const valid = await bcrypt.compare(password, candidateHash);
  if (!user || !valid || !user.isActive) {
    throw unauthorized('Email or password is incorrect.');
  }
  if (user.mustResetPassword) throw unauthorized('Please reset your password using the link sent to your email.');
  const { session, token, csrfToken, expiresAt } = await createDbSession({ userId: user._id, userAgent: req.get('user-agent') || '', ip: req.ip });
  createSessionCookies(res, token, csrfToken, expiresAt);
  user.lastLoginAt = new Date();
  await user.save();
  await logActivity({ actorId: user._id, action: 'login', entityType: 'auth', entityId: session._id, summary: `${user.name} signed in` });
  res.set('Cache-Control', 'no-store');
  res.json({ data: { user: userDto(user) } });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await revokeCurrentSession(req, res);
  await logActivity({ actorId: userId, action: 'logout', entityType: 'auth', summary: 'User signed out' });
  res.set('Cache-Control', 'no-store').json({ data: { ok: true } });
}));

router.post('/forgot-password', validateBody(forgotSchema), asyncHandler(async (req, res) => {
  const { email } = req.validatedBody;
  const user = await User.findOne({ email, isActive: true });
  if (user) {
    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await PasswordReset.deleteMany({ userId: user._id, usedAt: null });
    await PasswordReset.create({ userId: user._id, tokenHash: sha256(rawToken), expiresAt });
    const link = `${(process.env.APP_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
    // Do not wait for SMTP before replying; this reduces response-time account enumeration.
    setImmediate(() => {
      sendPasswordSetupEmail({ to: user.email, name: user.name, link, subject: 'Reset your SprintBoard password' })
        .catch((error) => console.error('Password reset email delivery failed:', error.message));
    });
  }
  res.json({ data: { message: 'If an account exists for that email, password reset instructions will be sent.' } });
}));

router.post('/reset-password', validateBody(resetSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.validatedBody;
  const reset = await PasswordReset.findOneAndUpdate(
    { tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  if (!reset) throw badRequest('This reset link is invalid or has expired. Request a new one.');
  const user = await User.findOne({ _id: reset.userId, isActive: true }).select('+passwordHash');
  if (!user) throw badRequest('This reset link is invalid or has expired. Request a new one.');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.mustResetPassword = false;
  user.passwordChangedAt = new Date();
  await user.save();
  await Promise.all([
    PasswordReset.deleteMany({ userId: user._id, _id: { $ne: reset._id } }),
    Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
  ]);
  await logActivity({ actorId: user._id, action: 'password_reset', entityType: 'auth', summary: 'Password reset completed' });
  res.json({ data: { message: 'Password changed. Sign in with your new password.', email: user.email } });
}));

export default router;
