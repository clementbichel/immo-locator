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
  ].filter(Boolean);

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

// Start server when run directly
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
