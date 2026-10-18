import crypto from 'node:crypto';
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const timingSafeEqualText = (a = '', b = '') => {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
export const safeFileId = () => crypto.randomBytes(18).toString('hex');
