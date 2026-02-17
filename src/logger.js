import pino from 'pino';
import { mkdirSync } from 'node:fs';

mkdirSync('logs', { recursive: true });

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      { target: 'pino/file', options: { destination: 1 } },
      { target: 'pino/file', options: { destination: 'logs/app.log', mkdir: true } },
    ],
  },
});
