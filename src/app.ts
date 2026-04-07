import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { apiKeyRateLimiter } from './middleware/apiKeyRateLimiter';
import { requestId } from './middleware/requestId';
import { httpLogger } from './middleware/httpLogger';
import healthRoutes from './routes/healthRoutes';
import blockRoutes from './routes/blockRoutes';
import transactionRoutes from './routes/transactionRoutes';
import addressRoutes from './routes/addressRoutes';
import networkRoutes from './routes/networkRoutes';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { startPaymentMonitor } from './services/paymentMonitorService';
import { startWebhookRetryPoller } from './services/webhookService';
import { startSweepConfirmationPoller } from './services/sweepService';
import webhookRoutes from './routes/webhookRoutes';
import payRoutes from './routes/payRoutes';
import accountRoutes from './routes/accountRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import checkoutApiRoutes from './routes/checkoutApiRoutes';
import checkoutPageRoutes from './routes/checkoutPageRoutes';
import adminRoutes from './routes/adminRoutes';
import { register as metricsRegistry } from './lib/metrics';

// ── Startup validation ──────────────────────────────────────────────────────

function validateConfig(): void {
  // Hard failures — cannot start without these
  const required = ['DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing required environment variables — cannot start');
    process.exit(1);
  }

  // Soft warnings — service starts but production use will be broken/insecure
  const isProduction = config.nodeEnv === 'production';

  if (config.jwt.secret === 'change_me_to_a_long_random_secret') {
    if (isProduction) {
      logger.fatal('JWT_SECRET is the default insecure value — refusing to start in production');
      process.exit(1);
    }
    logger.warn('JWT_SECRET is insecure — set a strong random value before going to production');
  }

  if (!process.env.ENCRYPTION_KEY) {
    if (isProduction) {
      logger.fatal('ENCRYPTION_KEY is not set — refusing to start in production (private keys would be insecure)');
      process.exit(1);
    }
    logger.warn('ENCRYPTION_KEY is not set — deriving from JWT_SECRET (acceptable for dev only). Generate one: openssl rand -hex 32');
  } else if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
    logger.fatal('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes) — cannot start');
    process.exit(1);
  }

  const rpcPlaceholders = ['YOUR_PROJECT_ID', 'YOUR_ALCHEMY_KEY', 'infura.io/v3/YOUR'];
  if (rpcPlaceholders.some((p) => config.blockchain.rpcUrl.includes(p))) {
    if (isProduction) {
      logger.fatal('ETH_RPC_URL is a placeholder value — refusing to start in production');
      process.exit(1);
    }
    logger.warn('ETH_RPC_URL is a placeholder — mainnet payments will not work until you set a real RPC endpoint');
  }

  if (config.jwt.secret.length < 32) {
    logger.warn('JWT_SECRET is shorter than 32 characters — use a longer secret for security');
  }
}

// ── App setup ───────────────────────────────────────────────────────────────

const app = express();

app.use(requestId);
app.use(httpLogger);

// Helmet — apply globally, but disable CSP for routes that serve inline HTML
app.use((req, res, next) => {
  if (
    req.path.startsWith('/docs') ||
    req.path.startsWith('/pay') ||
    req.path.startsWith('/checkout') ||
    req.path.startsWith('/dashboard')
  ) return next();
  helmet()(req, res, next);
});

// Clickjacking protection for the hosted payment/checkout pages
app.use((req, res, next) => {
  if (req.path.startsWith('/pay') || req.path.startsWith('/checkout')) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
    );
  }
  next();
});

// CORS — restrict to explicit origin list in production.
// Set CORS_ORIGINS as a comma-separated list: https://myshop.com,https://app.myshop.com
// Leave unset in development to allow all origins.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (!allowedOrigins) return callback(null, true); // dev: allow all
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);
app.use(apiKeyRateLimiter);

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Prometheus metrics ────────────────────────────────────────────────────────
// Optionally protected by a bearer token (METRICS_TOKEN env var).
// Scrape at: GET /metrics

app.get('/metrics', async (request, response) => {
  const metricsToken = process.env.METRICS_TOKEN;

  if (metricsToken) {
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${metricsToken}`) {
      response.status(401).send('Unauthorized');
      return;
    }
  }

  response.setHeader('Content-Type', metricsRegistry.contentType);
  response.send(await metricsRegistry.metrics());
});

// ── Health check ────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);

// ── Routes ──────────────────────────────────────────────────────────────────

const API_PREFIX = '/api/v1';

// Public routes
app.use('/pay', payRoutes);
app.use('/checkout', checkoutPageRoutes);
app.use('/dashboard', dashboardRoutes);

// Authenticated API routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/account`, accountRoutes);
app.use(`${API_PREFIX}/api-keys`, apiKeyRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/checkout`, checkoutApiRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
app.use(`${API_PREFIX}/blocks`, blockRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);
app.use(`${API_PREFIX}/addresses`, addressRoutes);
app.use(`${API_PREFIX}/network`, networkRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────────────────────

validateConfig();

const server = app.listen(config.port, () => {
  logger.info(`Crypto Gateway API running on port ${config.port} [${config.nodeEnv}]`);
  logger.info(`Network: ${config.blockchain.network} | RPC: ${config.blockchain.rpcUrl}`);
  logger.info(`Swagger UI: http://localhost:${config.port}/docs`);
  logger.info(`Dashboard:  http://localhost:${config.port}/dashboard`);
});

// Prune expired revoked tokens once on startup, then daily
import { authService } from './services/authService';
authService.pruneExpiredTokens().catch(() => {});
setInterval(() => authService.pruneExpiredTokens().catch(() => {}), 24 * 60 * 60 * 1000);

const paymentMonitorHandle = startPaymentMonitor();
const webhookRetryHandle = startWebhookRetryPoller();
const sweepConfirmationHandle = startSweepConfirmationPoller();

// ── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully`);

  // Stop background pollers immediately so no new work starts
  clearInterval(paymentMonitorHandle);
  clearInterval(webhookRetryHandle);
  clearInterval(sweepConfirmationHandle);

  // Stop accepting new HTTP connections and wait for in-flight requests to finish
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database disconnected — exiting');
    process.exit(0);
  });

  // Force-exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception — exiting');
  process.exit(1);
});

export default app;
