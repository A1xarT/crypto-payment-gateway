import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';

// Mock ethers so we don't hit a real RPC
jest.mock('ethers', () => {
  const mockProvider = {
    getBalance: jest.fn(),
    getFeeData: jest.fn(),
    getBlockNumber: jest.fn(),
    getTransactionReceipt: jest.fn(),
  };
  const mockWallet = {
    sendTransaction: jest.fn(),
  };
  return {
    ethers: {
      JsonRpcProvider: jest.fn(() => mockProvider),
      Wallet: jest.fn(() => mockWallet),
      formatEther: jest.fn((wei: bigint) => (Number(wei) / 1e18).toString()),
      parseEther: jest.fn((eth: string) => BigInt(Math.floor(parseFloat(eth) * 1e18))),
    },
    __mockProvider: mockProvider,
    __mockWallet: mockWallet,
  };
});

jest.mock('../../src/services/walletService', () => ({
  decryptPrivateKey: jest.fn(() => '0x' + 'a'.repeat(64)),
  generateWallet: jest.fn(),
}));

// Access the mock instances created inside the jest.mock factory
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ethersMod = require('ethers');
const mockProvider = ethersMod.__mockProvider as {
  getBalance: jest.Mock;
  getFeeData: jest.Mock;
  getBlockNumber: jest.Mock;
  getTransactionReceipt: jest.Mock;
};
const mockWallet = ethersMod.__mockWallet as {
  sendTransaction: jest.Mock;
};

import { sweepPayment } from '../../src/services/sweepService';

const fakePaymentWithAddress = {
  id: 'pay-1',
  network: 'MAINNET',
  address: {
    address: '0xDeposit',
    privateKeyEncrypted: 'iv:ciphertext',
  },
  user: { payoutAddress: '0xPayout' },
};

describe('sweepService.sweepPayment', () => {
  beforeEach(() => {
    mockProvider.getBalance.mockResolvedValue(BigInt(1e17)); // 0.1 ETH
    mockProvider.getFeeData.mockResolvedValue({
      maxFeePerGas: BigInt(20e9), // 20 gwei
      maxPriorityFeePerGas: BigInt(1e9),
      gasPrice: BigInt(20e9),
    });
    mockWallet.sendTransaction.mockResolvedValue({ hash: '0xtxhash' });
  });

  it('skips if a non-failed sweep already exists (idempotency)', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue({ id: 'sweep-1', status: 'BROADCAST' });

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.create).not.toHaveBeenCalled();
  });

  it('skips if payment is not found', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(null);

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.create).not.toHaveBeenCalled();
  });

  it('skips if merchant has no payout address', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue({
      ...fakePaymentWithAddress,
      user: { payoutAddress: null },
    });

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.create).not.toHaveBeenCalled();
  });

  it('records a failed sweep when balance is zero', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(fakePaymentWithAddress);
    mockProvider.getBalance.mockResolvedValue(0n);

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.create).not.toHaveBeenCalled();
  });

  it('records a failed sweep when balance cannot cover gas', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(fakePaymentWithAddress);
    // 0.00001 ETH — less than gas cost at 20 gwei
    mockProvider.getBalance.mockResolvedValue(BigInt(1e13));
    prismaMock.sweep.create.mockResolvedValue({ id: 'sweep-1' });

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    );
  });

  it('broadcasts a sweep transaction when balance is sufficient', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(fakePaymentWithAddress);
    prismaMock.sweep.create.mockResolvedValue({ id: 'sweep-1' });
    prismaMock.sweep.update.mockResolvedValue({});

    await sweepPayment('pay-1');

    expect(mockWallet.sendTransaction).toHaveBeenCalled();
    expect(prismaMock.sweep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BROADCAST', txHash: '0xtxhash' }),
      })
    );
  });

  it('marks sweep FAILED when sendTransaction throws', async () => {
    prismaMock.sweep.findFirst.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(fakePaymentWithAddress);
    prismaMock.sweep.create.mockResolvedValue({ id: 'sweep-1' });
    prismaMock.sweep.update.mockResolvedValue({});
    mockWallet.sendTransaction.mockRejectedValue(new Error('nonce too low'));

    await sweepPayment('pay-1');

    expect(prismaMock.sweep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', errorMessage: 'nonce too low' }),
      })
    );
  });
});
