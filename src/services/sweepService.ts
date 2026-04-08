import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { decryptPrivateKey } from './walletService';
import { sweepTotal } from '../lib/metrics';
import { logger } from '../lib/logger';

const ETH_TRANSFER_GAS_LIMIT = 21_000n;
const PLATFORM_FEE_BPS = 50n; // 0.5% = 50 basis points out of 10,000

// How often the confirmation poller runs
const CONFIRMATION_POLL_INTERVAL_MS = 60_000;
// How many blocks to wait before considering a tx confirmed
const REQUIRED_CONFIRMATIONS = 3;
// How many times to retry a failed sweep before giving up
const MAX_SWEEP_ATTEMPTS = 3;
// How long a BROADCAST sweep can be unconfirmed before we retry (30 min)
const BROADCAST_TIMEOUT_MS = 30 * 60 * 1000;

function getRpcUrl(network: string): string {
  return network === 'TESTNET' ? config.blockchain.testnetRpcUrl : config.blockchain.rpcUrl;
}

// ── Idempotency guard ─────────────────────────────────────────────────────────

async function getActiveSweep(paymentId: string) {
  return prisma.sweep.findFirst({
    where: {
      paymentId,
      status: { in: ['PENDING', 'BROADCAST', 'CONFIRMED'] },
    },
  });
}

// ── Main sweep entry point ────────────────────────────────────────────────────

export async function sweepPayment(paymentId: string): Promise<void> {
  // Idempotency: don't start a second sweep if one is already in progress or confirmed
  const existing = await getActiveSweep(paymentId);
  if (existing) {
    logger.info({ paymentId, sweepId: existing.id, status: existing.status },
      `[SweepService] Sweep already exists for payment ${paymentId} (${existing.status}) — skipping`);
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      address: true,
      user: { select: { payoutAddress: true } },
    },
  });

  if (!payment || !payment.address) {
    logger.warn(`[SweepService] Payment ${paymentId} not found or has no deposit address`);
    return;
  }

  const payoutAddress = payment.user.payoutAddress;
  if (!payoutAddress) {
    logger.warn(`[SweepService] Payment ${paymentId} confirmed but owner has no payout address — skipping sweep`);
    return;
  }

  await attemptSweep(paymentId, payment.address.address, payment.address.privateKeyEncrypted, payoutAddress, payment.network, 1);
}

async function attemptSweep(
  paymentId: string,
  depositAddress: string,
  privateKeyEncrypted: string,
  payoutAddress: string,
  network: string,
  attemptNumber: number
): Promise<void> {
  const provider = new ethers.JsonRpcProvider(getRpcUrl(network));
  const balanceWei = await provider.getBalance(depositAddress);

  if (balanceWei === 0n) {
    logger.warn(`[SweepService] Payment ${paymentId} deposit address has zero balance`);
    return;
  }

  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;

  if (maxFeePerGas === 0n) {
    await recordFailedSweep(paymentId, payoutAddress, balanceWei, 0n, 'Could not fetch gas price', attemptNumber);
    return;
  }

  const gasCostWei = ETH_TRANSFER_GAS_LIMIT * maxFeePerGas;
  const sweepAmountWei = balanceWei - gasCostWei;

  if (sweepAmountWei <= 0n) {
    await recordFailedSweep(
      paymentId, payoutAddress, balanceWei, gasCostWei,
      `Balance (${balanceWei} wei) too low to cover gas (${gasCostWei} wei)`,
      attemptNumber
    );
    return;
  }

  const platformFeeWei = sweepAmountWei * PLATFORM_FEE_BPS / 10_000n;
  const merchantAmountWei = sweepAmountWei - platformFeeWei;

  const sweep = await prisma.sweep.create({
    data: {
      paymentId,
      toAddress: payoutAddress,
      amountWei: merchantAmountWei.toString(),
      gasCostWei: gasCostWei.toString(),
      platformFeeWei: platformFeeWei.toString(),
      status: 'PENDING',
      attemptCount: attemptNumber,
    },
  });

  try {
    const privateKey = decryptPrivateKey(privateKeyEncrypted);
    const depositWallet = new ethers.Wallet(privateKey, provider);

    const tx = await depositWallet.sendTransaction({
      to: payoutAddress,
      value: merchantAmountWei,
      gasLimit: ETH_TRANSFER_GAS_LIMIT,
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? maxFeePerGas,
    });

    await prisma.sweep.update({
      where: { id: sweep.id },
      data: { txHash: tx.hash, status: 'BROADCAST' },
    });

    sweepTotal.inc({ status: 'broadcast' });
    logger.info({ paymentId, txHash: tx.hash, toAddress: payoutAddress, attempt: attemptNumber, platformFeeWei: platformFeeWei.toString() },
      `[SweepService] Payment ${paymentId} sweep broadcast — ${ethers.formatEther(merchantAmountWei)} ETH → ${payoutAddress} (fee: ${ethers.formatEther(platformFeeWei)} ETH)`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.sweep.update({
      where: { id: sweep.id },
      data: { status: 'FAILED', errorMessage: message },
    });
    sweepTotal.inc({ status: 'failed' });
    logger.error({ paymentId, attempt: attemptNumber }, `[SweepService] Sweep failed for payment ${paymentId}: ${message}`);
  }
}

async function recordFailedSweep(
  paymentId: string,
  toAddress: string,
  balanceWei: bigint,
  gasCostWei: bigint,
  errorMessage: string,
  attemptNumber: number
): Promise<void> {
  await prisma.sweep.create({
    data: {
      paymentId,
      toAddress,
      amountWei: balanceWei.toString(),
      gasCostWei: gasCostWei.toString(),
      status: 'FAILED',
      errorMessage,
      attemptCount: attemptNumber,
    },
  });
  sweepTotal.inc({ status: 'failed' });
  logger.error(`[SweepService] Payment ${paymentId} sweep pre-flight failed: ${errorMessage}`);
}

// ── Confirmation poller ───────────────────────────────────────────────────────

async function checkBroadcastSweeps(): Promise<void> {
  const broadcastSweeps = await prisma.sweep.findMany({
    where: { status: 'BROADCAST', txHash: { not: null } },
    include: {
      payment: {
        include: {
          address: true,
          user: { select: { payoutAddress: true } },
        },
      },
    },
  });

  if (broadcastSweeps.length === 0) return;

  logger.info(`[SweepService] Checking ${broadcastSweeps.length} broadcast sweep(s) for confirmation...`);

  for (const sweep of broadcastSweeps) {
    try {
      const provider = new ethers.JsonRpcProvider(getRpcUrl(sweep.payment.network));
      const receipt = await provider.getTransactionReceipt(sweep.txHash!);

      if (receipt) {
        const currentBlock = await provider.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber + 1;

        if (receipt.status === 0) {
          // Transaction reverted on-chain
          await prisma.sweep.update({
            where: { id: sweep.id },
            data: { status: 'FAILED', errorMessage: 'Transaction reverted on-chain' },
          });
          sweepTotal.inc({ status: 'failed' });
          logger.error({ sweepId: sweep.id, paymentId: sweep.paymentId, txHash: sweep.txHash },
            '[SweepService] Sweep transaction reverted on-chain');

        } else if (confirmations >= REQUIRED_CONFIRMATIONS) {
          await prisma.sweep.update({
            where: { id: sweep.id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
          sweepTotal.inc({ status: 'confirmed' });
          logger.info({ sweepId: sweep.id, paymentId: sweep.paymentId, txHash: sweep.txHash, confirmations },
            `[SweepService] Sweep confirmed with ${confirmations} blocks`);

        } else {
          logger.debug({ sweepId: sweep.id, confirmations, required: REQUIRED_CONFIRMATIONS },
            '[SweepService] Sweep tx mined but waiting for more confirmations');
        }

      } else {
        // No receipt yet — check if the tx has been pending too long
        const ageMs = Date.now() - sweep.createdAt.getTime();
        if (ageMs > BROADCAST_TIMEOUT_MS) {
          logger.warn({ sweepId: sweep.id, paymentId: sweep.paymentId, ageMs },
            '[SweepService] Broadcast sweep timed out — marking failed for retry');

          await prisma.sweep.update({
            where: { id: sweep.id },
            data: { status: 'FAILED', errorMessage: 'Transaction not mined within timeout window' },
          });

          // Retry if under the attempt limit and deposit address + payout address still valid
          const { payment } = sweep;
          if (
            payment.address &&
            payment.user.payoutAddress &&
            sweep.attemptCount < MAX_SWEEP_ATTEMPTS
          ) {
            logger.info({ paymentId: sweep.paymentId, attempt: sweep.attemptCount + 1 },
              '[SweepService] Retrying sweep...');
            await attemptSweep(
              sweep.paymentId,
              payment.address.address,
              payment.address.privateKeyEncrypted,
              payment.user.payoutAddress,
              payment.network,
              sweep.attemptCount + 1
            );
          } else {
            logger.error({ paymentId: sweep.paymentId, attempts: sweep.attemptCount },
              '[SweepService] Sweep exceeded max attempts — manual intervention required');
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, sweepId: sweep.id }, '[SweepService] Error checking sweep confirmation');
    }
  }
}

export function startSweepConfirmationPoller(): NodeJS.Timeout {
  logger.info(`[SweepService] Confirmation poller started — checking every ${CONFIRMATION_POLL_INTERVAL_MS / 1000}s`);

  return setInterval(() => {
    checkBroadcastSweeps().catch((error) => {
      logger.error({ err: error }, '[SweepService] Confirmation poll failed');
    });
  }, CONFIRMATION_POLL_INTERVAL_MS);
}
