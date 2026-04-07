export interface PaymentResult {
  id: string;
  address: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'UNDERPAID' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  network: 'MAINNET' | 'TESTNET';
  reference: string | null;
  metadata: Record<string, unknown> | null;
  receivedAmount: string | null; // Wei string, null until first payment received
  expiresAt: string | null;
}

export interface CreatePaymentInput {
  amount: number;
  currency: 'ETH';
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsFilters {
  status?: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  network?: 'MAINNET' | 'TESTNET';
  reference?: string;
}

export interface ListPaymentsResponse {
  payments: PaymentResult[];
  total: number;
  page: number;
  limit: number;
}

export interface WebhookResult {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  secret?: string;
}

export interface WebhookDeliveryResult {
  id: string;
  paymentId: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  responseCode: number | null;
  responseBody: string | null;
  attemptCount: number;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface GeneratedKey {
  id: string;
  fullKey: string;
  keyPrefix: string;
  type: string;
}

export interface ApiKeyPair {
  secretKey: GeneratedKey;
  publishableKey: GeneratedKey;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  type: 'SECRET' | 'PUBLISHABLE';
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AccountResult {
  id: string;
  email: string;
  payoutAddress: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  totalPayments: number;
  confirmedPayments: number;
  pendingPayments: number;
  expiredPayments: number;
  failedPayments: number;
  conversionRate: number;
  totalRevenueEth: string;
  byNetwork: {
    mainnet: { total: number; confirmed: number; revenueEth: string };
    testnet: { total: number; confirmed: number; revenueEth: string };
  };
}

export interface DailyVolume {
  date: string;
  count: number;
  revenueEth: string;
}

export interface CryptoGatewayClientOptions {
  apiKey: string;
  baseUrl?: string;
}

// Webhook event payloads received at the merchant's callback URL
export interface WebhookPayload {
  event: 'payment.confirmed' | 'payment.expired' | 'payment.underpaid';
  timestamp: string;
  data: PaymentResult;
}
