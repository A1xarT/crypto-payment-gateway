import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export interface GeneratedKey {
  id: string;
  fullKey: string;   // Shown once — merchant must store it
  keyPrefix: string; // e.g. sk_live_a3f1c2d4 — safe to display later
  type: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  type: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

function buildKey(type: 'SECRET' | 'PUBLISHABLE', mode: 'live' | 'test'): {
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const prefix =
    type === 'SECRET'
      ? mode === 'live' ? 'sk_live_' : 'sk_test_'
      : mode === 'live' ? 'pk_live_' : 'pk_test_';
  const random = crypto.randomBytes(32).toString('hex');
  const fullKey = prefix + random;
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  // Store first 16 chars (prefix + first 8 hex chars) for visual identification
  const keyPrefix = fullKey.slice(0, 16);
  return { fullKey, keyHash, keyPrefix };
}

export const apiKeyService = {
  // Creates a SECRET + PUBLISHABLE key pair for a merchant.
  // Full key values are returned once and never stored — only the SHA-256 hash is persisted.
  async generateKeyPair(
    userId: string,
    name: string,
    mode: 'live' | 'test' = 'live'
  ): Promise<{ secretKey: GeneratedKey; publishableKey: GeneratedKey }> {
    const secret = buildKey('SECRET', mode);
    const publishable = buildKey('PUBLISHABLE', mode);

    const [secretRecord, publishableRecord] = await prisma.$transaction([
      prisma.apiKey.create({
        data: {
          userId,
          name,
          keyHash: secret.keyHash,
          keyPrefix: secret.keyPrefix,
          type: 'SECRET',
        },
      }),
      prisma.apiKey.create({
        data: {
          userId,
          name,
          keyHash: publishable.keyHash,
          keyPrefix: publishable.keyPrefix,
          type: 'PUBLISHABLE',
        },
      }),
    ]);

    return {
      secretKey: { id: secretRecord.id, fullKey: secret.fullKey, keyPrefix: secret.keyPrefix, type: 'SECRET' },
      publishableKey: { id: publishableRecord.id, fullKey: publishable.fullKey, keyPrefix: publishable.keyPrefix, type: 'PUBLISHABLE' },
    };
  },

  async listKeys(userId: string): Promise<ApiKeyRecord[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      type: key.type,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    }));
  },

  async revokeKey(keyId: string, userId: string): Promise<boolean> {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!key || key.userId !== userId) return false;

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return true;
  },

  // Used by the authenticate middleware — looks up by hash and touches lastUsedAt
  async verifyKey(rawKey: string): Promise<{ userId: string; keyType: 'SECRET' | 'PUBLISHABLE' } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true, isActive: true, type: true },
    });

    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.type !== 'SECRET' && apiKey.type !== 'PUBLISHABLE') return null;

    // Update lastUsedAt without blocking the request
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return { userId: apiKey.userId, keyType: apiKey.type as 'SECRET' | 'PUBLISHABLE' };
  },
};
