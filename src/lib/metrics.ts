import client from 'prom-client';

// Use the default registry — prom-client auto-collects Node.js runtime metrics
const register = client.register;
client.collectDefaultMetrics({ register });

// ── Custom counters and histograms ────────────────────────────────────────────

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const paymentTotal = new client.Counter({
  name: 'payment_total',
  help: 'Total number of payments by final status',
  labelNames: ['status', 'network', 'currency'],
  registers: [register],
});

export const webhookDeliveryTotal = new client.Counter({
  name: 'webhook_delivery_total',
  help: 'Total webhook delivery attempts by outcome',
  labelNames: ['status'],
  registers: [register],
});

export const sweepTotal = new client.Counter({
  name: 'sweep_total',
  help: 'Total fund sweep attempts by outcome',
  labelNames: ['status'],
  registers: [register],
});

export const activePendingPayments = new client.Gauge({
  name: 'active_pending_payments',
  help: 'Number of payments currently in PENDING or UNDERPAID state',
  registers: [register],
});

export { register };
