import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { httpRequestDuration } from '../lib/metrics';

export function httpLogger(request: Request, response: Response, next: NextFunction): void {
  const startMs = Date.now();
  const startHr = process.hrtime();

  response.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const level = response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs,
    }, `${request.method} ${request.path} ${response.statusCode}`);

    // Record prometheus metric — use a normalised route label to avoid high cardinality
    const hrDiff = process.hrtime(startHr);
    const durationSec = hrDiff[0] + hrDiff[1] / 1e9;
    // Collapse UUIDs/IDs in path to avoid label explosion
    const routeLabel = request.path.replace(/[0-9a-f-]{8,}/gi, ':id');
    httpRequestDuration.observe(
      { method: request.method, route: routeLabel, status_code: String(response.statusCode) },
      durationSec
    );
  });

  next();
}
