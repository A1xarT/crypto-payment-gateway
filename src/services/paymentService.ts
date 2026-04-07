import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { generateWallet } from './walletService';
import { config } from '../config';

export type PaymentCurrency = 'ETH';

export interface CreatePaymentInput {
  userId: string;
  amount: number;
  currency: PaymentCurrency;
  network: 'MAINNET' | 'TESTNET';
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFilters {
  status?: string;
  network?: string;
  reference?: string;
}

export interface PaymentResult {
  id: string;
  address: string;
  amount: string;
  currency: string;
  status: string;
  network: string;
  reference: string | null;
  metadata: unknown;
  receivedAmount: string | null; // in Wei, null if nothing received yet
  expiresAt: string | null;
}

export interface ListPaymentsResult {
  payments: PaymentResult[];
  total: number;
  page: number;
  limit: number;
}

export const paymentService = {
  async listPayments(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: PaymentFilters = {}
  ): Promise<ListPaymentsResult> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (filters.status) where['status'] = filters.status;
    if (filters.network) where['network'] = filters.network;
    if (filters.reference) where['reference'] = filters.reference;

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: { address: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments: payments
        .filter((p) => p.address)
        .map((p) => ({
          id: p.id,
          address: p.address!.address,
          amount: p.amount.toString(),
          currency: p.currency,
          status: p.status,
          network: p.network,
          reference: p.reference ?? null,
          metadata: p.metadata ?? null,
          receivedAmount: p.receivedAmount?.toString() ?? null,
          expiresAt: p.expiresAt?.toISOString() ?? null,
        })),
      total,
      page,
      limit,
    };
  },

  async getPaymentById(paymentId: string): Promise<PaymentResult | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { address: true },
    });

    if (!payment || !payment.address) return null;

    return {
      id: payment.id,
      address: payment.address.address,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      network: payment.network,
      reference: payment.reference ?? null,
      metadata: payment.metadata ?? null,
      receivedAmount: payment.receivedAmount?.toString() ?? null,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
    };
  },

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const { address, privateKeyEncrypted } = generateWallet();

    const expiresAt = new Date(
      Date.now() + config.payment.expiryMinutes * 60 * 1000
    );

    // Create payment and its address in a single transaction so they are
    // always consistent — no orphaned payments without an address.
    const payment = await prisma.$transaction(async (transaction) => {
      const newPayment = await transaction.payment.create({
        data: {
          userId: input.userId,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency,
          status: 'PENDING',
          network: input.network,
          reference: input.reference ?? null,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
          expiresAt,
        },
      });

      await transaction.paymentAddress.create({
        data: {
          paymentId: newPayment.id,
          address,
          privateKeyEncrypted,
        },
      });

      return newPayment;
    });

    return {
      id: payment.id,
      address,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      network: payment.network,
      reference: payment.reference ?? null,
      metadata: payment.metadata ?? null,
      receivedAmount: null,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
    };
  },
};
