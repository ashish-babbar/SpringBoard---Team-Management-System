import multer from 'multer';
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.MAX_ATTACHMENT_BYTES || 10 * 1024 * 1024), files: 1, fields: 0 } });
export const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.MAX_AVATAR_BYTES || 2 * 1024 * 1024), files: 1, fields: 0 } }).single('avatar');
export const uploadAttachment = memoryUpload.single('attachment');
