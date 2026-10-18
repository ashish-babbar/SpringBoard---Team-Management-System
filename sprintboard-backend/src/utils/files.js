import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import FileAsset from '../models/FileAsset.js';
import { safeFileId } from './ids.js';
import { badRequest, notFound } from './errors.js';

import { detectFileType } from './fileSignatures.js';

const getUploadDir = () => path.resolve(process.cwd(), process.env.UPLOAD_DIR || './storage/uploads');
export { detectFileType };
export async function persistUpload({ file, category, uploadedBy, taskId = null }) {
  if (!file?.buffer?.length) throw badRequest('Choose a file to upload.');
  const maxBytes = category === 'avatar' ? Number(process.env.MAX_AVATAR_BYTES || 2 * 1024 * 1024) : Number(process.env.MAX_ATTACHMENT_BYTES || 10 * 1024 * 1024);
  if (file.size > maxBytes) throw badRequest(`File exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
  const detected = detectFileType(file.buffer);
  const allowed = category === 'avatar' ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!detected || !allowed.includes(detected.mime)) throw badRequest('The uploaded file content is not an accepted file type.');
  const publicId = safeFileId();
  const storageName = `${publicId}${detected.ext}`;
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const destination = path.join(uploadDir, storageName);
  await writeFile(destination, file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    const originalName = path.basename(String(file.originalname || 'upload').replace(/[\u0000-\u001f]/g, '')).slice(0, 255) || 'upload';
    return await FileAsset.create({ publicId, storageName, originalName, mimeType: detected.mime, size: file.size, category, uploadedBy, taskId });
  } catch (error) {
    await unlink(destination).catch(() => {});
    throw error;
  }
}
export async function removeFileAsset(asset) {
  if (!asset) return;
  await unlink(path.join(getUploadDir(), asset.storageName)).catch(() => {});
  await FileAsset.deleteOne({ _id: asset._id });
}
export async function resolveFilePath(asset) {
  const resolved = path.resolve(getUploadDir(), asset.storageName);
  if (!resolved.startsWith(`${getUploadDir()}${path.sep}`)) throw notFound('File not found.');
  return resolved;
}
