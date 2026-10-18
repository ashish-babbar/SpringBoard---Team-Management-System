import Session from '../models/Session.js';
import User from '../models/User.js';
import { sha256, randomToken, timingSafeEqualText } from '../utils/ids.js';
import { clearCsrfCookie, clearSessionCookie, sessionCookieName, setCsrfCookie, setSessionCookie } from '../utils/cookies.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const attachOptionalSession = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[sessionCookieName()];
  if (!token) return next();
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() }, revokedAt: null });
  if (!session) {
    clearSessionCookie(res);
    return next();
  }
  const user = await User.findOne({ _id: session.userId, isActive: true });
  if (!user) {
    session.revokedAt = new Date();
    await session.save();
    clearSessionCookie(res);
    clearCsrfCookie(res);
    return next();
  }
  req.sessionDoc = session;
  req.user = user;
  return next();
});

export function requireAuth(req, res, next) {
  if (!req.user || !req.sessionDoc) return next(unauthorized());
  next();
}
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('This action is restricted to workspace administrators.'));
    next();
  };
}
export function createSessionCookies(res, sessionToken, csrfToken, expiresAt) {
  setSessionCookie(res, sessionToken, expiresAt);
  // Keep the authenticated CSRF token alive for the session's lifetime so it cannot expire independently.
  const csrfExpiry = expiresAt;
  setCsrfCookie(res, csrfToken, csrfExpiry);
}
export async function createDbSession({ userId, userAgent = '', ip = '' }) {
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const expiresAt = new Date(Date.now() + Number(process.env.SESSION_TTL_DAYS || 7) * 86400000);
  const ipHash = ip ? sha256(ip) : '';
  const session = await Session.create({ tokenHash: sha256(token), csrfTokenHash: sha256(csrfToken), userId, expiresAt, userAgent: String(userAgent).slice(0, 500), ipHash });
  return { session, token, csrfToken, expiresAt };
}
export async function revokeCurrentSession(req, res) {
  if (req.sessionDoc) {
    req.sessionDoc.revokedAt = new Date();
    await req.sessionDoc.save();
  }
  clearSessionCookie(res);
  clearCsrfCookie(res);
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = req.cookies?.csrfToken || '';
  const header = req.get('x-csrf-token') || '';
  const requestPath = req.originalUrl.split('?')[0];
  const isPublicAuthPost = ['/auth/login', '/auth/forgot-password', '/auth/reset-password'].some((suffix) => requestPath.endsWith(suffix));
  // Login/recovery are JSON-only and CORS-protected. When a pre-auth CSRF cookie exists, still validate it.
  if (isPublicAuthPost && !cookie && !header) return next();
  if (!cookie || !header || !timingSafeEqualText(cookie, header) || (req.sessionDoc && !timingSafeEqualText(sha256(cookie), req.sessionDoc.csrfTokenHash))) {
    return res.status(403).json({ message: 'Security token expired. Refresh the page and try again.', code: 'CSRF_FAILED' });
  }
  next();
}
