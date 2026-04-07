import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { PaymentResult } from './paymentService';
import { validateWebhookUrl } from '../lib/urlSafety';
import { webhookDeliveryTotal } from '../lib/metrics';
import { logger } from '../lib/logger';

// Retry delays after each failed attempt: 5 min, then 30 min, then give up
const RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // 3 total attempts
const DELIVERY_TIMEOUT_MS = 10_000;
const RETRY_POLL_INTERVAL_MS = 60_000;

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Sign the raw JSON body with HMAC-SHA256 so merchants can verify authenticity.
// Merchants should compute: sha256=HMAC(secret, rawBody) and compare to this header.
function signPayload(rawBody: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

async function attemptDelivery(
  deliveryId: string,
  webhookUrl: string,
  webhookSecret: string,
  payload: object,
  currentAttemptCount: number
): Promise<void> {
  // Re-validate on every attempt to prevent DNS rebinding attacks
  const urlCheck = validateWebhookUrl(webhookUrl);
  if (!urlCheck.valid) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        responseBody: `URL validation failed: ${urlCheck.reason}`,
        attemptCount: currentAttemptCount + 1,
        nextRetryAt: null,
      },
    });
    logger.warn({ deliveryId, webhookUrl, reason: urlCheck.reason },
      '[WebhookService] Delivery aborted — URL failed safety check');
    webhookDeliveryTotal.inc({ status: 'FAILED' });
    return;
  }

  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, webhookSecret);

  let responseCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      timeout: DELIVERY_TIMEOUT_MS,
      // Capture non-2xx responses instead of throwing so we can log the code
      validateStatus: () => true,
    });

    responseCode = response.status;
    const rawResponse =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    responseBody = rawResponse.slice(0, 500);
    success = response.status >= 200 && response.status < 300;
  } catch (error) {
    // Network errors (timeout, DNS failure, etc.)
    responseBody = error instanceof Error ? error.message : String(error);
  }

  const newAttemptCount = currentAttemptCount + 1;

  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        responseCode,
        responseBody,
        attemptCount: newAttemptCount,
        nextRetryAt: null,
      },
    });

    logger.info({ deliveryId, attempt: newAttemptCount }, `[WebhookService] Delivery ${deliveryId} succeeded (attempt ${newAttemptCount})`);
    webhookDeliveryTotal.inc({ status: 'DELIVERED' });
  } else {
    const hasMoreRetries = newAttemptCount < MAX_ATTEMPTS;
    const retryDelayMs = RETRY_DELAYS_MS[newAttemptCount - 1];

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: hasMoreRetries ? 'PENDING' : 'FAILED',
        responseCode,
        responseBody,
        attemptCount: newAttemptCount,
        nextRetryAt: hasMoreRetries ? new Date(Date.now() + retryDelayMs) : null,
      },
    });

    logger.warn(
      { deliveryId, attempt: newAttemptCount, maxAttempts: MAX_ATTEMPTS },
      `[WebhookService] Delivery ${deliveryId} failed (attempt ${newAttemptCount}/${MAX_ATTEMPTS})` +
        (hasMoreRetries ? ` — retrying in ${retryDelayMs / 60_000} min` : ' — no more retries, marking FAILED')
    );
    if (!hasMoreRetries) webhookDeliveryTotal.inc({ status: 'FAILED' });
  }
}

export type WebhookEvent = 'payment.confirmed' | 'payment.expired' | 'payment.underpaid';

// Called by the payment monitor when a payment changes status.
// Finds all active webhooks for the payment's owner and fires them.
export async function dispatchWebhooks(
  payment: PaymentResult,
  event: WebhookEvent
): Promise<void> {
  const paymentRecord = await prisma.payment.findUnique({
    where: { id: payment.id },
    select: { userId: true },
  });
  if (!paymentRecord) return;

  const activeWebhooks = await prisma.webhook.findMany({
    where: { userId: paymentRecord.userId, isActive: true },
  });

  if (activeWebhooks.length === 0) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data: payment,
  };

  for (const webhook of activeWebhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        paymentId: payment.id,
        // JSON round-trip produces a plain object that satisfies Prisma's InputJsonValue
        payload: JSON.parse(JSON.stringify(payload)),
        status: 'PENDING',
        attemptCount: 0,
        nextRetryAt: new Date(),
      },
    });

    // Fire and don't await — delivery errors are logged internally
    attemptDelivery(delivery.id, webhook.url, webhook.secret, payload, 0).catch((error) => {
      logger.error({ err: error, deliveryId: delivery.id }, `[WebhookService] Unexpected error on delivery ${delivery.id}`);
    });
  }
}

// Picks up PENDING deliveries whose nextRetryAt has passed and re-attempts them.
export async function retryPendingDeliveries(): Promise<void> {
  const dueDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: { lte: new Date() },
    },
    include: { webhook: true },
  });

  if (dueDeliveries.length === 0) return;

  logger.info(`[WebhookService] Retrying ${dueDeliveries.length} pending delivery(ies)...`);

  for (const delivery of dueDeliveries) {
    attemptDelivery(
      delivery.id,
      delivery.webhook.url,
      delivery.webhook.secret,
      delivery.payload as object,
      delivery.attemptCount
    ).catch((error) => {
      logger.error({ err: error, deliveryId: delivery.id }, `[WebhookService] Retry error for delivery ${delivery.id}`);
    });
  }
}

export interface TestDeliveryResult {
  success: boolean;
  responseCode: number | null;
  responseBody: string | null;
}

// Fires a fake payment.confirmed payload to a webhook URL and returns the outcome.
// Used by the test endpoint so merchants can verify their callback URL works.
export async function testWebhookDelivery(webhookUrl: string, webhookSecret: string): Promise<TestDeliveryResult> {
  const urlCheck = validateWebhookUrl(webhookUrl);
  if (!urlCheck.valid) {
    return { success: false, responseCode: null, responseBody: `URL validation failed: ${urlCheck.reason}` };
  }

  const payload = {
    event: 'payment.confirmed' as WebhookEvent,
    timestamp: new Date().toISOString(),
    test: true,
    data: {
      id: '00000000-0000-0000-0000-000000000000',
      address: '0x0000000000000000000000000000000000000000',
      amount: '0.01',
      currency: 'ETH',
      status: 'CONFIRMED',
      network: 'TESTNET',
      reference: 'test',
      metadata: null,
      receivedAmount: '0.01',
      expiresAt: null,
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, webhookSecret);

  try {
    const httpResponse = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      timeout: DELIVERY_TIMEOUT_MS,
      validateStatus: () => true,
    });

    const rawResponse =
      typeof httpResponse.data === 'string' ? httpResponse.data : JSON.stringify(httpResponse.data);

    return {
      success: httpResponse.status >= 200 && httpResponse.status < 300,
      responseCode: httpResponse.status,
      responseBody: rawResponse.slice(0, 500),
    };
  } catch (error) {
    return {
      success: false,
      responseCode: null,
      responseBody: error instanceof Error ? error.message : String(error),
    };
  }
}

export function startWebhookRetryPoller(): NodeJS.Timeout {
  logger.info(`[WebhookService] Retry poller started — checking every ${RETRY_POLL_INTERVAL_MS / 1000}s`);

  return setInterval(() => {
    retryPendingDeliveries().catch((error) => {
      logger.error({ err: error }, '[WebhookService] Retry poll failed');
    });
  }, RETRY_POLL_INTERVAL_MS);
}
