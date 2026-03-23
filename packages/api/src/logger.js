import pino from 'pino';
import { createStream as rfsCreateStream } from 'rotating-file-stream';
import { mkdirSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '..', 'logs');

mkdirSync(logsDir, { recursive: true });

const fileStream = rfsCreateStream(
  (time, _index) => {
    if (!time) return 'app.log';
    const date = time.toISOString().split('T')[0];
    return `app.${date}.log`;
  },
  {
    interval: '1d',
    path: logsDir,
    maxFiles: 5,
  }
);

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers["x-admin-key"]'],
  },
  pino.multistream([{ stream: process.stdout }, { stream: fileStream }])
);
