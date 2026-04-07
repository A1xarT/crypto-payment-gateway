import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error,
  request: Request,
  res: Response,
  _next: NextFunction
): void {
  const isNotFound = err.message.toLowerCase().includes('not found');
  const statusCode = isNotFound ? 404 : 500;

  if (statusCode === 500) {
    logger.error({ requestId: request.requestId, err }, 'Unhandled error');
  }

  const response: ApiResponse<never> = {
    success: false,
    error: err.message || 'Internal server error',
  };

  res.status(statusCode).json(response);
}
