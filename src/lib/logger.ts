import pino from 'pino';
import { config } from '../config';

const isDev = config.nodeEnv !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  // In development, pino-pretty gives human-readable coloured output.
  // In production, emit plain JSON for log aggregators (Datadog, CloudWatch, etc.)
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
