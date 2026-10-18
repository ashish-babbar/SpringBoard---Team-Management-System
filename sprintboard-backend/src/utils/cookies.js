const isProd = () => process.env.NODE_ENV === 'production';
export const sessionCookieName = () => process.env.COOKIE_NAME || 'sb_session';
export function setSessionCookie(res, token, expiresAt) {
  res.cookie(sessionCookieName(), token, {
    httpOnly: true, secure: isProd(), sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/', expires: expiresAt, priority: 'high'
  });
}
export function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName(), {
    httpOnly: true, secure: isProd(), sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/'
  });
}
export function setCsrfCookie(res, token, expiresAt) {
  res.cookie('csrfToken', token, {
    httpOnly: false, secure: isProd(), sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/', expires: expiresAt, priority: 'high'
  });
}
export function clearCsrfCookie(res) {
  res.clearCookie('csrfToken', {
    httpOnly: false, secure: isProd(), sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/'
  });
}
