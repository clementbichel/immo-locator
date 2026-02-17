import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import locationRouter from './routes/location.js';

export function validateEnv() {
  const required = ['ADEME_API_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function createApp() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = [
    process.env.CORS_CHROME_ORIGIN,
    process.env.CORS_FIREFOX_ORIGIN,
  ].filter(Boolean).filter(o => o !== '*');

  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  }));

  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 30,
  }));

  app.use(pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { method: req.method, url: req.url, remoteAddress: req.remoteAddress };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }));
  app.use(express.json());
  app.use('/api/location', locationRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Global error handler — must have 4 params for Express to recognize it
  app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled error');
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
