import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import locationRouter from './routes/location.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';
import { adminAuth } from './middleware/admin-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function validateEnv() {
  const required = ['ADEME_API_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  try {
    new URL(process.env.ADEME_API_URL);
  } catch {
    throw new Error('ADEME_API_URL must be a valid URL');
  }

  if (!process.env.CORS_CHROME_ORIGIN || process.env.CORS_CHROME_ORIGIN === '*') {
    throw new Error('CORS_CHROME_ORIGIN requis');
  }

  if (process.env.PORT) {
    const port = Number(process.env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be an integer between 1 and 65535');
    }
  }

  if (process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY.length < 32) {
    throw new Error('ADMIN_API_KEY must be at least 32 characters');
  }
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());

  const allowedOrigins = [process.env.CORS_CHROME_ORIGIN].filter(Boolean).filter((o) => o !== '*');

  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      if (origin.startsWith('moz-extension://')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
  });

  // Exclude /api/admin and /dashboard from CORS (same-origin only)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/dashboard')) {
      return next();
    }
    corsMiddleware(req, res, next);
  });

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
    })
  );

  app.use(
    '/api/location/search',
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      message: { error: 'RATE_LIMIT', message: 'Trop de recherches, réessayez dans une minute.' },
    })
  );

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          const ip =
            req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket?.remoteAddress;
          return { method: req.method, url: req.url, remoteAddress: ip };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    })
  );
  app.use(
    '/api/admin',
    rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      message: { error: 'RATE_LIMIT', message: 'Too many admin requests, try again later.' },
    })
  );

  app.use(express.json({ limit: '10kb' }));
  app.use('/api/admin', adminAuth, adminRouter);
  app.use('/dashboard', express.static(path.resolve(__dirname, '..', 'dashboard')));
  app.use('/api/location', locationRouter);
  app.use('/api/reports', reportsRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use((req, res) => {
    logger.warn({ method: req.method, path: req.path, ip: req.ip }, 'Unknown route');
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  // Global error handler — must have 4 params for Express to recognize it
  app.use((err, req, res, _next) => {
    logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur.',
    });
  });

  return app;
}

// Start server (unless imported by tests via NODE_ENV=test)
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    logger.info({ port: Number(port) }, 'Server running');
  });
}
