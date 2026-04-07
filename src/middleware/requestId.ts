import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const id = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
  request.requestId = id;
  response.setHeader('X-Request-ID', id);
  next();
}
