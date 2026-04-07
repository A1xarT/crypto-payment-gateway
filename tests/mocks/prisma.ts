/**
 * A Jest manual mock for the Prisma client.
 * Import this in tests via jest.mock('../../src/lib/prisma').
 * Each model method is a jest.fn() so you can stub return values per test.
 */

const createModelMock = () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
});

export const prismaMock = {
  user: createModelMock(),
  payment: createModelMock(),
  paymentAddress: createModelMock(),
  webhook: createModelMock(),
  webhookDelivery: createModelMock(),
  apiKey: createModelMock(),
  sweep: createModelMock(),
  idempotencyRecord: createModelMock(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

// Wire the mock into Jest's module system
jest.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock,
}));
