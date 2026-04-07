import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';
import { apiKeyService } from '../../src/services/apiKeyService';

describe('apiKeyService', () => {
  describe('generateKeyPair', () => {
    it('returns secret and publishable keys with correct prefixes for live mode', async () => {
      // $transaction executes the callback and returns both records
      prismaMock.$transaction.mockResolvedValue([
        { id: 'sk-id', keyPrefix: 'sk_live_a3b4', type: 'SECRET' },
        { id: 'pk-id', keyPrefix: 'pk_live_c5d6', type: 'PUBLISHABLE' },
      ]);

      const result = await apiKeyService.generateKeyPair('user-1', 'Production', 'live');

      expect(result.secretKey.fullKey).toMatch(/^sk_live_/);
      expect(result.publishableKey.fullKey).toMatch(/^pk_live_/);
    });

    it('uses sk_test_ prefix in test mode', async () => {
      prismaMock.$transaction.mockResolvedValue([
        { id: 'sk-id', keyPrefix: 'sk_test_a3b4', type: 'SECRET' },
        { id: 'pk-id', keyPrefix: 'pk_test_c5d6', type: 'PUBLISHABLE' },
      ]);

      const result = await apiKeyService.generateKeyPair('user-1', 'Test env', 'test');

      expect(result.secretKey.fullKey).toMatch(/^sk_test_/);
      expect(result.publishableKey.fullKey).toMatch(/^pk_test_/);
    });

    it('produces a fullKey of length prefix(8) + 64 hex chars = 72 chars', async () => {
      prismaMock.$transaction.mockResolvedValue([
        { id: 'sk-id', keyPrefix: 'sk_live_a3b4', type: 'SECRET' },
        { id: 'pk-id', keyPrefix: 'pk_live_c5d6', type: 'PUBLISHABLE' },
      ]);

      const result = await apiKeyService.generateKeyPair('user-1', 'Test', 'live');

      expect(result.secretKey.fullKey).toHaveLength(8 + 64); // 'sk_live_' + 64 hex
      expect(result.publishableKey.fullKey).toHaveLength(8 + 64);
    });
  });

  describe('verifyKey', () => {
    it('returns userId for a valid active SECRET key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId: 'user-1',
        isActive: true,
        type: 'SECRET',
      });
      prismaMock.apiKey.update.mockResolvedValue({});

      const result = await apiKeyService.verifyKey('sk_live_' + 'a'.repeat(64));

      expect(result).toEqual({ userId: 'user-1' });
    });

    it('returns null for an inactive key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId: 'user-1',
        isActive: false,
        type: 'SECRET',
      });

      const result = await apiKeyService.verifyKey('sk_live_' + 'b'.repeat(64));

      expect(result).toBeNull();
    });

    it('returns null for a PUBLISHABLE key (cannot authenticate)', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId: 'user-1',
        isActive: true,
        type: 'PUBLISHABLE',
      });

      const result = await apiKeyService.verifyKey('pk_live_' + 'c'.repeat(64));

      expect(result).toBeNull();
    });

    it('returns null when key does not exist', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await apiKeyService.verifyKey('sk_live_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('revokeKey', () => {
    it('returns true and deactivates the key when it belongs to the user', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'key-id', userId: 'user-1' });
      prismaMock.apiKey.update.mockResolvedValue({});

      const result = await apiKeyService.revokeKey('key-id', 'user-1');

      expect(result).toBe(true);
      expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-id' },
        data: { isActive: false },
      });
    });

    it('returns false when the key belongs to a different user', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'key-id', userId: 'user-2' });

      const result = await apiKeyService.revokeKey('key-id', 'user-1');

      expect(result).toBe(false);
      expect(prismaMock.apiKey.update).not.toHaveBeenCalled();
    });

    it('returns false when the key does not exist', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      const result = await apiKeyService.revokeKey('key-id', 'user-1');

      expect(result).toBe(false);
    });
  });
});
