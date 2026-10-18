import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new HttpError(400, 'Please check the submitted fields.', 'VALIDATION_ERROR', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
    req.validatedBody = parsed.data;
    next();
  };
}
export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(new HttpError(400, 'Invalid query parameters.', 'VALIDATION_ERROR', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
    req.validatedQuery = parsed.data;
    next();
  };
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) return res.status(400).json({ message: 'Invalid request.', errors: error.issues });
  let status = error.status || 500;
  let message = error.message || 'An unexpected error occurred.';
  let code = error.code || 'INTERNAL_ERROR';
  if (error.name === 'ValidationError') { status = 400; message = 'Please check the submitted fields.'; code = 'VALIDATION_ERROR'; }
  if (error.code === 11000) { status = 409; message = 'A record with that value already exists.'; code = 'DUPLICATE_KEY'; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid resource identifier.'; code = 'INVALID_ID'; }
  if (error.name === 'MulterError') { status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = error.code === 'LIMIT_FILE_SIZE' ? 'The selected file is too large.' : 'The upload could not be accepted.'; code = 'UPLOAD_ERROR'; }
  if (status >= 500) {
    console.error({ message: error.message, name: error.name, path: req.originalUrl, method: req.method, requestId: req.id });
    if (process.env.NODE_ENV === 'production') message = 'An unexpected error occurred. Please try again.';
  }
  const payload = { message, code, requestId: req.id };
  if (error.details) payload.errors = error.details;
  res.status(status).json(payload);
}
