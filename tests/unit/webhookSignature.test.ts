/**
 * Tests for the HMAC-SHA256 webhook signature utilities.
 * Covers both the server-side signPayload logic and the SDK verifyWebhookSignature.
 */
import crypto from 'crypto';
import { verifyWebhookSignature } from '../../sdk/src/client';

function signPayload(rawBody: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('webhook signature verification', () => {
  const secret = 'test-webhook-secret-abc123';
  const body = JSON.stringify({ event: 'payment.confirmed', data: { id: 'pay-1' } });

  it('verifies a correctly signed payload', () => {
    const signature = signPayload(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = signPayload(body, secret);
    const tamperedBody = body.replace('pay-1', 'pay-2');
    expect(verifyWebhookSignature(tamperedBody, signature, secret)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const signature = signPayload(body, 'wrong-secret');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it('rejects a signature without the sha256= prefix', () => {
    // Raw hex without prefix — different length, should return false
    const bareHex = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, bareHex, secret)).toBe(false);
  });

  it('rejects an empty signature', () => {
    expect(verifyWebhookSignature(body, '', secret)).toBe(false);
  });
});
