import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { paymentService } from './paymentService';
import { config } from '../config';
import { logger } from '../lib/logger';

const SESSION_EXPIRY_MINUTES = config.payment.expiryMinutes;

export interface CreateCheckoutSessionInput {
  userId: string;
  amount: number;
  currency: 'ETH';
  successUrl: string;
  cancelUrl: string;
  isTestMode: boolean;
}

export interface CheckoutSessionResult {
  id: string;
  sessionUrl: string;
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  expiresAt: string;
}

export const checkoutService = {
  async createSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000);

    // Create the underlying payment first
    const payment = await paymentService.createPayment({
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      network: input.isTestMode ? 'TESTNET' : 'MAINNET',
    });

    const session = await prisma.checkoutSession.create({
      data: {
        userId: input.userId,
        paymentId: payment.id,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        status: 'OPEN',
        expiresAt,
      },
    });

    logger.info({ sessionId: session.id, paymentId: payment.id }, '[CheckoutService] Session created');

    const baseUrl = (process.env.BASE_URL ?? `http://localhost:${config.port}`).replace(/\/$/, '');

    return {
      id: session.id,
      sessionUrl: `${baseUrl}/checkout/${session.id}`,
      paymentId: payment.id,
      amount: input.amount.toString(),
      currency: input.currency,
      status: 'OPEN',
      expiresAt: expiresAt.toISOString(),
    };
  },

  async getSession(sessionId: string) {
    return prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });
  },

  // Called by the payment monitor when a payment confirms/expires
  async updateSessionForPayment(
    paymentId: string,
    event: 'payment.confirmed' | 'payment.expired'
  ): Promise<void> {
    const session = await prisma.checkoutSession.findUnique({
      where: { paymentId },
    });
    if (!session || session.status !== 'OPEN') return;

    const newStatus = event === 'payment.confirmed' ? 'PAID' : 'EXPIRED';
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: { status: newStatus },
    });

    logger.info({ sessionId: session.id, newStatus }, '[CheckoutService] Session status updated');
  },
};
