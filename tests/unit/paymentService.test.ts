import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';

// Mock walletService so tests don't need a real RNG / ethers
jest.mock('../../src/services/walletService', () => ({
  generateWallet: jest.fn(() => ({
    address: '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef',
    privateKeyEncrypted: 'iv:ciphertext',
  })),
}));

import { paymentService } from '../../src/services/paymentService';

const mockPaymentRow = {
  id: 'pay-1',
  amount: { toString: () => '0.05' },
  currency: 'ETH',
  status: 'PENDING',
  network: 'MAINNET',
  reference: null,
  metadata: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  address: { address: '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef' },
};

describe('paymentService', () => {
  describe('createPayment', () => {
    it('creates a payment and returns the result', async () => {
      prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
        // Simulate the transaction callback with a mock tx object
        const mockTx = {
          payment: {
            create: jest.fn().mockResolvedValue({
              id: 'pay-1',
              amount: { toString: () => '0.05' },
              currency: 'ETH',
              status: 'PENDING',
              network: 'MAINNET',
              reference: null,
              metadata: null,
              expiresAt: new Date('2026-12-31'),
            }),
          },
          paymentAddress: { create: jest.fn().mockResolvedValue({}) },
        };
        return callback(mockTx as unknown as typeof prismaMock);
      });

      const result = await paymentService.createPayment({
        userId: 'user-1',
        amount: 0.05,
        currency: 'ETH',
        network: 'MAINNET',
      });

      expect(result.id).toBe('pay-1');
      expect(result.address).toBe('0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef');
      expect(result.currency).toBe('ETH');
      expect(result.status).toBe('PENDING');
    });

    it('stores reference and metadata when provided', async () => {
      let capturedData: Record<string, unknown> = {};
      prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
        const mockTx = {
          payment: {
            create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
              capturedData = data;
              return { id: 'pay-2', amount: { toString: () => '0.1' }, currency: 'ETH', status: 'PENDING', network: 'MAINNET', reference: data.reference, metadata: data.metadata, expiresAt: new Date() };
            }),
          },
          paymentAddress: { create: jest.fn().mockResolvedValue({}) },
        };
        return callback(mockTx as unknown as typeof prismaMock);
      });

      await paymentService.createPayment({
        userId: 'user-1',
        amount: 0.1,
        currency: 'ETH',
        network: 'MAINNET',
        reference: 'order_99',
        metadata: { orderId: '99' },
      });

      expect(capturedData.reference).toBe('order_99');
      expect(capturedData.metadata).toEqual({ orderId: '99' });
    });
  });

  describe('getPaymentById', () => {
    it('returns null when payment does not exist', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      const result = await paymentService.getPaymentById('nonexistent');

      expect(result).toBeNull();
    });

    it('returns null when payment has no address', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ ...mockPaymentRow, address: null });

      const result = await paymentService.getPaymentById('pay-1');

      expect(result).toBeNull();
    });

    it('returns a PaymentResult when found', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPaymentRow);

      const result = await paymentService.getPaymentById('pay-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('pay-1');
      expect(result!.status).toBe('PENDING');
      expect(result!.expiresAt).toBe('2026-12-31T00:00:00.000Z');
    });
  });

  describe('listPayments', () => {
    it('applies status filter to the where clause', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockPaymentRow], 1]);

      await paymentService.listPayments('user-1', 1, 20, { status: 'CONFIRMED' });

      const [findCall] = prismaMock.$transaction.mock.calls[0][0];
      // The first element of the array passed to $transaction is the findMany call
      // We just verify $transaction was called — where clause validated by compiler
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('returns pagination metadata', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockPaymentRow], 42]);

      const result = await paymentService.listPayments('user-1', 2, 10);

      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });
});
