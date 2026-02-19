import pino from 'pino';
import { createStream as rfsCreateStream } from 'rotating-file-stream';
import { mkdirSync } from 'fs';

mkdirSync('logs', { recursive: true });

const fileStream = rfsCreateStream(
  (time, index) => {
    if (!time) return 'app.log';
    const date = time.toISOString().split('T')[0];
    return `app.${date}.log`;
  },
  {
    interval: '1d',
    path: 'logs',
    maxFiles: 5,
  }
);

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.multistream([
    { stream: process.stdout },
    { stream: fileStream },
  ])
);
