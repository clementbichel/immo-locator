import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      { target: 'pino/file', options: { destination: 1 } },
      {
        target: 'pino-roll',
        options: {
          file: 'logs/app.log',
          frequency: 'daily',
          limit: { count: 5 },
          mkdir: true,
        },
      },
    ],
  },
});
