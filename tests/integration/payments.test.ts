import request from 'supertest';
import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';
import { buildTestApp } from '../helpers/testApp';
import { makeUserToken, fakePayment } from '../helpers/factories';

jest.mock('../../src/services/walletService', () => ({
  generateWallet: jest.fn(() => ({
    address: '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef',
    privateKeyEncrypted: 'iv:ciphertext',
  })),
}));

const app = buildTestApp();
const token = makeUserToken();
const authHeader = `Bearer ${token}`;

describe('POST /api/v1/payments', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
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
      }
    );
  });

  it('creates a payment and returns 201', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ amount: 0.05, currency: 'ETH' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('pay-1');
    expect(response.body.data.address).toBe('0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef');
  });

  it('accepts optional reference and metadata', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ amount: 0.1, currency: 'ETH', reference: 'order_42', metadata: { item: 'book' } });

    expect(response.status).toBe(201);
  });

  it('returns 400 when amount is missing', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ currency: 'ETH' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when amount is not positive', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ amount: -1, currency: 'ETH' });

    expect(response.status).toBe(400);
  });

  it('returns 400 for unsupported currency', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ amount: 0.1, currency: 'BTC' });

    expect(response.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .send({ amount: 0.1, currency: 'ETH' });

    expect(response.status).toBe(401);
  });

  it('returns 400 when metadata is an array', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({ amount: 0.1, currency: 'ETH', metadata: [1, 2, 3] });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/v1/payments/:id', () => {
  it('returns 200 with the payment', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(fakePayment);

    const response = await request(app)
      .get('/api/v1/payments/pay-1')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('pay-1');
  });

  it('returns 404 when payment does not exist', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/payments/nonexistent')
      .set('Authorization', authHeader);

    expect(response.status).toBe(404);
  });
});

describe('GET /api/v1/payments', () => {
  it('returns paginated list', async () => {
    prismaMock.$transaction.mockResolvedValue([[fakePayment], 1]);

    const response = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination.total).toBe(1);
  });

  it('accepts status filter', async () => {
    prismaMock.$transaction.mockResolvedValue([[], 0]);

    const response = await request(app)
      .get('/api/v1/payments?status=CONFIRMED')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
  });

  it('accepts reference filter', async () => {
    prismaMock.$transaction.mockResolvedValue([[fakePayment], 1]);

    const response = await request(app)
      .get('/api/v1/payments?reference=order_42')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
  });
});
