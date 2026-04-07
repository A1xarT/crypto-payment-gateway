import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that rejects the request with 403 if the authenticated user is not an admin.
 * Must be used after `authenticate`.
 */
export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  if (!request.user?.isAdmin) {
    response.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}
