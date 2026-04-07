/**
 * Generates JWT tokens and fake DB records for use in integration tests.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-that-is-long-enough';

export function makeUserToken(userId = 'user-1', email = 'test@example.com'): string {
  return jwt.sign({ userId, email, isTestMode: false }, JWT_SECRET);
}

export function makeTestKeyToken(userId = 'user-1'): string {
  // Fake sk_test_ key — will be caught by the apiKeyService mock
  return 'sk_test_' + 'a'.repeat(64);
}

export const fakeUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: '$2a$12$fake',
  payoutAddress: null,
  createdAt: new Date('2026-01-01'),
};

export const fakePayment = {
  id: 'pay-1',
  userId: 'user-1',
  amount: { toString: () => '0.05' },
  currency: 'ETH',
  status: 'PENDING',
  network: 'MAINNET',
  reference: null,
  metadata: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  address: { address: '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef' },
};

export const fakeWebhook = {
  id: 'wh-1',
  userId: 'user-1',
  url: 'https://example.com/webhook',
  secret: 'wh-secret-abc',
  isActive: true,
  createdAt: new Date('2026-01-01'),
};
