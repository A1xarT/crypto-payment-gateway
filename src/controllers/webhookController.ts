import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateWebhookSecret, testWebhookDelivery } from '../services/webhookService';
import { validateWebhookUrl } from '../lib/urlSafety';
import { ApiResponse } from '../types';

export interface WebhookResult {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  secret?: string; // Only present on creation — never returned again
}

export interface WebhookDeliveryResult {
  id: string;
  paymentId: string;
  status: string;
  responseCode: number | null;
  responseBody: string | null;
  attemptCount: number;
  nextRetryAt: string | null;
  createdAt: string;
}

export const webhookController = {
  async registerWebhook(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { url } = request.body as { url?: unknown };

    if (!url || typeof url !== 'string') {
      response.status(400).json({ success: false, error: 'url is required', code: 'INVALID_WEBHOOK_URL' });
      return;
    }

    const urlCheck = validateWebhookUrl(url);
    if (!urlCheck.valid) {
      response.status(400).json({ success: false, error: urlCheck.reason, code: 'INVALID_WEBHOOK_URL' });
      return;
    }

    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: { userId, url, secret },
    });

    const result: WebhookResult = {
      id: webhook.id,
      url: webhook.url,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      // Secret is returned once here and never again — merchant must store it
      secret,
    };

    const apiResponse: ApiResponse<WebhookResult> = { success: true, data: result };
    response.status(201).json(apiResponse);
  },

  async listWebhooks(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const results: WebhookResult[] = webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
    }));

    const apiResponse: ApiResponse<WebhookResult[]> = { success: true, data: results };
    response.status(200).json(apiResponse);
  },

  async deleteWebhook(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });

    if (!webhook || webhook.userId !== userId) {
      response.status(404).json({ success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' });
      return;
    }

    // Soft-delete by marking inactive rather than destroying delivery history
    await prisma.webhook.update({
      where: { id },
      data: { isActive: false },
    });

    response.status(200).json({ success: true, data: { id } });
  },

  async listDeliveries(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });

    if (!webhook || webhook.userId !== userId) {
      response.status(404).json({ success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' });
      return;
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const results: WebhookDeliveryResult[] = deliveries.map((delivery) => ({
      id: delivery.id,
      paymentId: delivery.paymentId,
      status: delivery.status,
      responseCode: delivery.responseCode,
      responseBody: delivery.responseBody,
      attemptCount: delivery.attemptCount,
      nextRetryAt: delivery.nextRetryAt?.toISOString() ?? null,
      createdAt: delivery.createdAt.toISOString(),
    }));

    const apiResponse: ApiResponse<WebhookDeliveryResult[]> = { success: true, data: results };
    response.status(200).json(apiResponse);
  },

  async testWebhook(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });

    if (!webhook || webhook.userId !== userId) {
      response.status(404).json({ success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' });
      return;
    }

    if (!webhook.isActive) {
      response.status(400).json({ success: false, error: 'Webhook is inactive', code: 'WEBHOOK_INACTIVE' });
      return;
    }

    const result = await testWebhookDelivery(webhook.url, webhook.secret);

    response.status(200).json({ success: true, data: result });
  },
};
