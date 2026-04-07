import { Request, Response, NextFunction } from 'express';

/**
 * Rejects requests authenticated with a publishable key (pk_live_ / pk_test_).
 * JWT-authenticated users and secret-key users pass through.
 * Apply this middleware after `authenticate` on any endpoint that must not be
 * accessible from a client-side context.
 */
export function requireSecretKey(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (request.user?.keyType === 'PUBLISHABLE') {
    response.status(403).json({
      success: false,
      error: 'This endpoint requires a secret key. Publishable keys may only create payments.',
      code: 'SECRET_KEY_REQUIRED',
    });
    return;
  }
  next();
}
