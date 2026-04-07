import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { apiKeyService } from '../services/apiKeyService';
import { authService } from '../services/authService';

export interface JwtPayload {
  userId: string;
  email: string;
  isTestMode: boolean;
  isAdmin: boolean;
  keyType?: 'SECRET' | 'PUBLISHABLE';
  jti?: string;
  exp?: number;
}

// Extend Express Request so downstream handlers can access the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function isApiKey(token: string): boolean {
  return (
    token.startsWith('sk_live_') ||
    token.startsWith('sk_test_') ||
    token.startsWith('pk_live_') ||
    token.startsWith('pk_test_')
  );
}

function isTestKey(token: string): boolean {
  return token.startsWith('sk_test_') || token.startsWith('pk_test_');
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    response.status(401).json({ success: false, error: 'Missing or malformed Authorization header', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);

  // API key path — hashed lookup, no JWT verification
  if (isApiKey(token)) {
    const result = await apiKeyService.verifyKey(token);

    if (!result) {
      response.status(401).json({ success: false, error: 'Invalid or revoked API key', code: 'UNAUTHORIZED' });
      return;
    }

    request.user = {
      userId: result.userId,
      email: '',
      isTestMode: isTestKey(token),
      isAdmin: false,
      keyType: result.keyType,
    };
    next();
    return;
  }

  // JWT path
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Check revocation blacklist if the token carries a jti
    if (payload.jti) {
      const revoked = await authService.isTokenRevoked(payload.jti);
      if (revoked) {
        response.status(401).json({ success: false, error: 'Token has been revoked', code: 'UNAUTHORIZED' });
        return;
      }
    }

    request.user = { ...payload, isTestMode: false, isAdmin: payload.isAdmin ?? false };
    next();
  } catch {
    response.status(401).json({ success: false, error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
}
