import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function idempotency(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];

  // Only applies to POST requests that carry the header and are authenticated
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !request.user) {
    next();
    return;
  }

  const userId = request.user.userId;
  const requestPath = request.path;

  // Check for an existing record with this key
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();

    if (age < TTL_MS && existing.userId === userId && existing.requestPath === requestPath) {
      // Replay the cached response — merchant receives identical result
      response.status(existing.responseStatus).json(existing.responseBody);
      return;
    }

    // Expired or mismatched context — remove stale record and proceed
    await prisma.idempotencyRecord
      .delete({ where: { id: existing.id } })
      .catch(() => {});
  }

  // Intercept res.json to capture the response before it is sent
  const originalJson = response.json.bind(response);

  response.json = (body: unknown) => {
    prisma.idempotencyRecord
      .create({
        data: {
          idempotencyKey,
          userId,
          requestPath,
          responseStatus: response.statusCode,
          responseBody: JSON.parse(JSON.stringify(body)),
        },
      })
      .catch((error) => {
        logger.error({ err: error }, '[Idempotency] Failed to save record');
      });

    return originalJson(body);
  };

  next();
}
