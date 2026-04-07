import { createHmac, timingSafeEqual } from 'crypto';
import {
  AccountResult,
  ApiKeyPair,
  ApiKeyRecord,
  CreatePaymentInput,
  CryptoGatewayClientOptions,
  DailyVolume,
  ListPaymentsFilters,
  ListPaymentsResponse,
  PaymentResult,
  PaymentSummary,
  WebhookDeliveryResult,
  WebhookResult,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:3000';

export class CryptoGatewayClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: CryptoGatewayClientOptions) {
    this.apiKey  = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async createPayment(
    input: CreatePaymentInput,
    idempotencyKey?: string
  ): Promise<PaymentResult> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    return this.request<PaymentResult>('POST', '/api/v1/payments', input, headers);
  }

  async getPayment(id: string): Promise<PaymentResult> {
    return this.request<PaymentResult>('GET', `/api/v1/payments/${id}`);
  }

  async listPayments(page = 1, limit = 20, filters: ListPaymentsFilters = {}): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.status)    params.set('status', filters.status);
    if (filters.network)   params.set('network', filters.network);
    if (filters.reference) params.set('reference', filters.reference);

    const body = await this.requestRaw(`/api/v1/payments?${params.toString()}`);
    const payments = body.data as PaymentResult[];
    return {
      payments,
      total: body.pagination?.total ?? payments.length,
      page:  body.pagination?.page  ?? page,
      limit: body.pagination?.limit ?? limit,
    };
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  async registerWebhook(url: string): Promise<WebhookResult> {
    return this.request<WebhookResult>('POST', '/api/v1/webhooks', { url });
  }

  async listWebhooks(): Promise<WebhookResult[]> {
    return this.request<WebhookResult[]>('GET', '/api/v1/webhooks');
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request<{ id: string }>('DELETE', `/api/v1/webhooks/${id}`);
  }

  async listWebhookDeliveries(webhookId: string): Promise<WebhookDeliveryResult[]> {
    return this.request<WebhookDeliveryResult[]>('GET', `/api/v1/webhooks/${webhookId}/deliveries`);
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  async generateApiKeys(name: string, mode: 'live' | 'test' = 'live'): Promise<ApiKeyPair> {
    return this.request<ApiKeyPair>('POST', '/api/v1/api-keys', { name, mode });
  }

  async listApiKeys(): Promise<ApiKeyRecord[]> {
    return this.request<ApiKeyRecord[]>('GET', '/api/v1/api-keys');
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.request<{ id: string }>('DELETE', `/api/v1/api-keys/${id}`);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalyticsSummary(): Promise<PaymentSummary> {
    return this.request<PaymentSummary>('GET', '/api/v1/analytics/summary');
  }

  async getDailyVolume(days = 30): Promise<DailyVolume[]> {
    return this.request<DailyVolume[]>('GET', `/api/v1/analytics/volume?days=${days}`);
  }

  // ── Account ───────────────────────────────────────────────────────────────

  async getAccount(): Promise<AccountResult> {
    return this.request<AccountResult>('GET', '/api/v1/account');
  }

  async setPayoutAddress(payoutAddress: string): Promise<AccountResult> {
    return this.request<AccountResult>('PATCH', '/api/v1/account/payout-address', { payoutAddress });
  }

  // ── Pay page URL helper ───────────────────────────────────────────────────

  getPaymentPageUrl(paymentId: string): string {
    return `${this.baseUrl}/pay/${paymentId}`;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const response = await this.requestRaw(path, method, body, extraHeaders);
    return response.data as T;
  }

  private async requestRaw(
    path: string,
    method = 'GET',
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<{ data: unknown; pagination?: { page: number; limit: number; total?: number } }> {
    const url = this.baseUrl + path;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      pagination?: { page: number; limit: number; total?: number };
    };

    if (!json.success) {
      throw new CryptoGatewayError(json.error ?? 'Unknown error', response.status);
    }

    return { data: json.data, pagination: json.pagination };
  }
}

/**
 * Verifies the HMAC-SHA256 signature on an incoming webhook request.
 *
 * @param rawBody   - The raw request body string (before JSON.parse)
 * @param signature - The value of the `X-Webhook-Signature` header
 * @param secret    - The webhook secret returned when the endpoint was registered
 *
 * Usage (Express):
 *   app.post('/webhooks/crypto', express.raw({ type: '*\/*' }), (req, res) => {
 *     const valid = verifyWebhookSignature(req.body.toString(), req.headers['x-webhook-signature'], secret);
 *     if (!valid) return res.status(401).send('Invalid signature');
 *     const event = JSON.parse(req.body.toString());
 *     // handle event.event === 'payment.confirmed' | 'payment.expired'
 *   });
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // Buffer lengths differ — definitely not equal
    return false;
  }
}

export class CryptoGatewayError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'CryptoGatewayError';
  }
}
