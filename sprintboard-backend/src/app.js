import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { attachOptionalSession, csrfProtection } from './middleware/auth.js';
import { errorHandler } from './middleware/validate.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import teamRoutes from './routes/teams.routes.js';
import userRoutes from './routes/users.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import fileRoutes from './routes/files.routes.js';

const app = express();
const prefix = (process.env.API_PREFIX || '/api').replace(/\/$/, '') || '/api';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req, res, next) => {
  req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.set('X-Request-ID', req.id);
  next();
});
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not permitted by CORS.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID'],
  maxAge: 600
}));
app.use(express.json({ limit: '1mb', strict: true, type: 'application/json' }));
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 100 }));
app.use(cookieParser());
app.use(`${prefix}/auth/login`, rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many sign-in attempts. Try again later.' } }));
app.use(`${prefix}/auth/forgot-password`, rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many recovery requests. Try again later.' } }));
app.use(`${prefix}/auth/reset-password`, rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use(`${prefix}/users/invite`, rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use(prefix, attachOptionalSession, csrfProtection, (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'sprintboard-api', time: new Date().toISOString() }));
app.get(`${prefix}/health`, (req, res) => res.status(200).json({ data: { status: 'ok', service: 'sprintboard-api' } }));
app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/tasks`, taskRoutes);
app.use(`${prefix}/teams`, teamRoutes);
app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/notifications`, notificationRoutes);
app.use(`${prefix}/dashboard`, dashboardRoutes);
app.use(`${prefix}/files`, fileRoutes);
app.use((req, res) => res.status(404).json({ message: 'API route not found.', code: 'ROUTE_NOT_FOUND', requestId: req.id }));
app.use(errorHandler);
export default app;
