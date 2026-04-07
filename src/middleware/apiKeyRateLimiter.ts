/**
 * Per-API-key rate limiter.
 *
 * Uses an in-memory sliding-window counter keyed by the API key prefix
 * (first 16 chars — never the full key).  The global IP-based limiter still
 * applies for JWT-authenticated and unauthenticated traffic; this middleware
 * adds a stricter, per-key limit for API key callers.
 *
 * Default: 60 requests per minute per key (configurable via env).
 */
import { Request, Response, NextFunction } from 'express';

const MAX_REQUESTS = parseInt(process.env.API_KEY_RATE_LIMIT_MAX ?? '60', 10);
const WINDOW_MS    = parseInt(process.env.API_KEY_RATE_LIMIT_WINDOW_MS ?? '60000', 10);

interface WindowEntry {
  count: number;
  windowStart: number;
}

// In-memory store — keyed by key prefix (never the full secret key)
const store = new Map<string, WindowEntry>();

// Periodic cleanup so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key);
  }
}, WINDOW_MS * 2);

function extractApiKeyPrefix(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token.startsWith('sk_live_') && !token.startsWith('sk_test_')) return null;
  // Use the first 16 chars as the bucket identifier — safe to log/store
  return token.slice(0, 16);
}

export function apiKeyRateLimiter(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const keyPrefix = extractApiKeyPrefix(request.headers.authorization);

  // Only applies to API key callers
  if (!keyPrefix) {
    next();
    return;
  }

  const now = Date.now();
  const entry = store.get(keyPrefix);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(keyPrefix, { count: 1, windowStart: now });
    response.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
    response.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS - 1));
    next();
    return;
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetAt = Math.ceil((entry.windowStart + WINDOW_MS) / 1000);

  response.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
  response.setHeader('X-RateLimit-Remaining', String(remaining));
  response.setHeader('X-RateLimit-Reset', String(resetAt));

  if (entry.count > MAX_REQUESTS) {
    response.status(429).json({
      success: false,
      error: 'API key rate limit exceeded. Please slow down.',
    });
    return;
  }

  next();
}
