/**
 * Creates the Express app in isolation — no background pollers, no validateConfig().
 * Used by integration tests via supertest.
 */
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../../src/middleware/errorHandler';
import authRoutes from '../../src/routes/authRoutes';
import paymentRoutes from '../../src/routes/paymentRoutes';
import webhookRoutes from '../../src/routes/webhookRoutes';
import apiKeyRoutes from '../../src/routes/apiKeyRoutes';
import accountRoutes from '../../src/routes/accountRoutes';
import analyticsRoutes from '../../src/routes/analyticsRoutes';

export function buildTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const API_PREFIX = '/api/v1';
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/payments`, paymentRoutes);
  app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
  app.use(`${API_PREFIX}/api-keys`, apiKeyRoutes);
  app.use(`${API_PREFIX}/account`, accountRoutes);
  app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

  app.use(errorHandler);
  return app;
}
