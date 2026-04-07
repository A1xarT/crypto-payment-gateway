import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';

// Mock ethers provider
const mockProvider = {
  getBalance: jest.fn(),
};

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(() => mockProvider),
    formatEther: jest.fn((wei: bigint) => (Number(wei) / 1e18).toFixed(4)),
    parseEther: jest.fn((eth: string) => BigInt(Math.floor(parseFloat(eth) * 1e18))),
  },
}));

// Mock downstream services so the monitor tests stay focused
jest.mock('../../src/services/webhookService', () => ({
  dispatchWebhooks: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/sweepService', () => ({
  sweepPayment: jest.fn().mockResolvedValue(undefined),
  startSweepConfirmationPoller: jest.fn(),
}));
jest.mock('../../src/services/emailService', () => ({
  emailService: {
    sendPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
    sendPaymentExpired: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../src/services/checkoutService', () => ({
  checkoutService: { updateSessionForPayment: jest.fn().mockResolvedValue(undefined) },
}));

import { dispatchWebhooks } from '../../src/services/webhookService';
import { sweepPayment } from '../../src/services/sweepService';

// Re-import startPaymentMonitor *after* mocks are set up
// We test the internal logic by poking the DB mock and seeing what happens
const pendingPayment = {
  id: 'pay-1',
  amount: { toString: () => '0.05' },
  currency: 'ETH',
  status: 'PENDING',
  network: 'MAINNET',
  reference: null,
  metadata: null,
  receivedAmount: null,
  expiresAt: null,
  address: { address: '0xDeposit', privateKeyEncrypted: 'iv:ct' },
  user: { email: 'merchant@example.com' },
};

describe('payment monitor logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms a payment when balance meets expected amount', async () => {
    prismaMock.payment.findMany.mockResolvedValue([pendingPayment]);
    prismaMock.payment.update.mockResolvedValue({});
    // Balance exactly matches 0.05 ETH
    mockProvider.getBalance.mockResolvedValue(BigInt(5e16));

    // Import and trigger monitor directly
    const { startPaymentMonitor } = await import('../../src/services/paymentMonitorService');
    const handle = startPaymentMonitor();
    clearInterval(handle);

    // Give async work a tick to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      })
    );
    expect(sweepPayment).toHaveBeenCalledWith('pay-1');
    expect(dispatchWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMED' }),
      'payment.confirmed'
    );
  });

  it('marks payment UNDERPAID when partial balance is received', async () => {
    prismaMock.payment.findMany.mockResolvedValue([pendingPayment]);
    prismaMock.payment.update.mockResolvedValue({});
    // Only 0.01 ETH received — less than expected 0.05
    mockProvider.getBalance.mockResolvedValue(BigInt(1e16));

    const { startPaymentMonitor } = await import('../../src/services/paymentMonitorService');
    const handle = startPaymentMonitor();
    clearInterval(handle);
    await new Promise((r) => setTimeout(r, 50));

    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'UNDERPAID' }),
      })
    );
    expect(sweepPayment).not.toHaveBeenCalled();
  });

  it('marks payment EXPIRED when expiresAt has passed', async () => {
    const expiredPayment = {
      ...pendingPayment,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    };
    prismaMock.payment.findMany.mockResolvedValue([expiredPayment]);
    prismaMock.payment.update.mockResolvedValue({});

    const { startPaymentMonitor } = await import('../../src/services/paymentMonitorService');
    const handle = startPaymentMonitor();
    clearInterval(handle);
    await new Promise((r) => setTimeout(r, 50));

    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'EXPIRED' }),
      })
    );
    expect(dispatchWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'EXPIRED' }),
      'payment.expired'
    );
    // Should NOT check balance or sweep an expired payment
    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(sweepPayment).not.toHaveBeenCalled();
  });

  it('does nothing when balance is zero', async () => {
    prismaMock.payment.findMany.mockResolvedValue([pendingPayment]);
    mockProvider.getBalance.mockResolvedValue(0n);

    const { startPaymentMonitor } = await import('../../src/services/paymentMonitorService');
    const handle = startPaymentMonitor();
    clearInterval(handle);
    await new Promise((r) => setTimeout(r, 50));

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(dispatchWebhooks).not.toHaveBeenCalled();
  });
});
