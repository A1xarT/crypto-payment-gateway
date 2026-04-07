import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { dispatchWebhooks } from './webhookService';
import { sweepPayment } from './sweepService';
import { emailService } from './emailService';
import { checkoutService } from './checkoutService';
import { paymentTotal, activePendingPayments } from '../lib/metrics';
import { logger } from '../lib/logger';

const POLL_INTERVAL_MS = 30_000;

// Convert a decimal ETH string like "0.1" to Wei as a bigint
function ethToWei(ethAmount: string): bigint {
  return ethers.parseEther(ethAmount);
}

function getRpcUrl(network: string): string {
  return network === 'TESTNET' ? config.blockchain.testnetRpcUrl : config.blockchain.rpcUrl;
}

type PendingPayment = Awaited<ReturnType<typeof loadPendingPayments>>[number];

async function loadPendingPayments() {
  return prisma.payment.findMany({
    where: { status: { in: ['PENDING', 'UNDERPAID'] } },
    include: { address: true, user: { select: { email: true } } },
  });
}

async function processPayment(payment: PendingPayment, provider: ethers.JsonRpcProvider, now: Date): Promise<void> {
  if (!payment.address) {
    logger.warn(`[PaymentMonitor] Payment ${payment.id} has no deposit address — skipping`);
    return;
  }

  // Expire payments whose window has closed before hitting the chain
  if (payment.expiresAt && payment.expiresAt <= now) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'EXPIRED' },
    });

    logger.info({ paymentId: payment.id }, `[PaymentMonitor] Payment ${payment.id} EXPIRED — deadline was ${payment.expiresAt.toISOString()}`);
    paymentTotal.inc({ status: 'EXPIRED', network: payment.network, currency: payment.currency });

    dispatchWebhooks(
      {
        id: payment.id,
        address: payment.address.address,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: 'EXPIRED',
        network: payment.network,
        reference: payment.reference ?? null,
        metadata: payment.metadata ?? null,
        receivedAmount: payment.receivedAmount?.toString() ?? null,
        expiresAt: payment.expiresAt.toISOString(),
      },
      'payment.expired'
    ).catch((error) => {
      logger.error({ err: error, paymentId: payment.id }, `[PaymentMonitor] Webhook dispatch failed for payment ${payment.id}`);
    });

    emailService
      .sendPaymentExpired(payment.user.email, payment.id, payment.amount.toString())
      .catch(() => {});

    checkoutService
      .updateSessionForPayment(payment.id, 'payment.expired')
      .catch(() => {});

    return;
  }

  try {
    const balanceWei = await provider.getBalance(payment.address.address);
    const expectedWei = ethToWei(payment.amount.toString());

    if (balanceWei >= expectedWei) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'CONFIRMED', receivedAmount: balanceWei.toString() },
      });

      logger.info({ paymentId: payment.id, network: payment.network },
        `[PaymentMonitor] Payment ${payment.id} CONFIRMED [${payment.network}] — address ${payment.address.address} received ${ethers.formatEther(balanceWei)} ETH`);
      paymentTotal.inc({ status: 'CONFIRMED', network: payment.network, currency: payment.currency });

      const confirmedResult = {
        id: payment.id,
        address: payment.address.address,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: 'CONFIRMED',
        network: payment.network,
        reference: payment.reference ?? null,
        metadata: payment.metadata ?? null,
        receivedAmount: balanceWei.toString(),
        expiresAt: payment.expiresAt?.toISOString() ?? null,
      };

      dispatchWebhooks(confirmedResult, 'payment.confirmed').catch((error) => {
        logger.error({ err: error, paymentId: payment.id }, `[PaymentMonitor] Webhook dispatch failed for payment ${payment.id}`);
      });

      sweepPayment(payment.id).catch((error) => {
        logger.error({ err: error, paymentId: payment.id }, `[PaymentMonitor] Sweep failed for payment ${payment.id}`);
      });

      emailService
        .sendPaymentConfirmed(
          payment.user.email,
          payment.id,
          ethers.formatEther(balanceWei),
          payment.address.address
        )
        .catch(() => {});

      checkoutService
        .updateSessionForPayment(payment.id, 'payment.confirmed')
        .catch(() => {});

    } else if (balanceWei > 0n) {
      // Partial payment received — update status to UNDERPAID and record amount
      const wasAlreadyUnderpaid = payment.status === 'UNDERPAID';
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'UNDERPAID', receivedAmount: balanceWei.toString() },
      });

      if (!wasAlreadyUnderpaid) {
        logger.info({ paymentId: payment.id },
          `[PaymentMonitor] Payment ${payment.id} UNDERPAID — received ${ethers.formatEther(balanceWei)} ETH, expected ${payment.amount.toString()} ETH`);

        dispatchWebhooks(
          {
            id: payment.id,
            address: payment.address.address,
            amount: payment.amount.toString(),
            currency: payment.currency,
            status: 'UNDERPAID',
            network: payment.network,
            reference: payment.reference ?? null,
            metadata: payment.metadata ?? null,
            receivedAmount: balanceWei.toString(),
            expiresAt: payment.expiresAt?.toISOString() ?? null,
          },
          'payment.underpaid'
        ).catch((error) => {
          logger.error({ err: error, paymentId: payment.id }, `[PaymentMonitor] Webhook dispatch failed for payment ${payment.id}`);
        });
      }
    } else {
      logger.debug({ paymentId: payment.id, network: payment.network },
        `[PaymentMonitor] Payment ${payment.id} still pending [${payment.network}] — no balance yet`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[PaymentMonitor] Error checking payment ${payment.id}: ${message}`);
  }
}

async function checkPendingPayments(): Promise<void> {
  const pendingPayments = await loadPendingPayments();

  // Update the active pending gauge every poll cycle
  activePendingPayments.set(pendingPayments.length);

  if (pendingPayments.length === 0) return;

  logger.info(`[PaymentMonitor] Checking ${pendingPayments.length} pending payment(s)...`);

  const now = new Date();

  // Group by network so we create one provider per network, not one per payment
  const byNetwork = new Map<string, typeof pendingPayments>();
  for (const payment of pendingPayments) {
    const group = byNetwork.get(payment.network) ?? [];
    group.push(payment);
    byNetwork.set(payment.network, group);
  }

  for (const [network, payments] of byNetwork) {
    const provider = new ethers.JsonRpcProvider(getRpcUrl(network));
    for (const payment of payments) {
      await processPayment(payment, provider, now);
    }
  }
}

export function startPaymentMonitor(): NodeJS.Timeout {
  logger.info(`[PaymentMonitor] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);

  // Run once immediately so the first check does not wait a full interval
  checkPendingPayments().catch((error) => {
    logger.error({ err: error }, '[PaymentMonitor] Initial check failed');
  });

  return setInterval(() => {
    checkPendingPayments().catch((error) => {
      logger.error({ err: error }, '[PaymentMonitor] Poll failed');
    });
  }, POLL_INTERVAL_MS);
}
