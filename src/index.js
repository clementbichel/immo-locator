import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import locationRouter from './routes/location.js';

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

  app.use(express.json());
  app.use('/api/location', locationRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}

// Start server (unless imported by tests via NODE_ENV=test)
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
