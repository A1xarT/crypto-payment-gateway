import { Request, Response } from 'express';
import { checkoutService } from '../services/checkoutService';
import { ApiResponse } from '../types';
import { CheckoutSessionResult } from '../services/checkoutService';

export const checkoutController = {
  async createSession(request: Request, response: Response): Promise<void> {
    const { amount, currency, successUrl, cancelUrl } = request.body as {
      amount?: unknown;
      currency?: unknown;
      successUrl?: unknown;
      cancelUrl?: unknown;
    };
    const userId = request.user!.userId;

    if (amount === undefined || amount === null) {
      response.status(400).json({ success: false, error: 'amount is required' });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      response.status(400).json({ success: false, error: 'amount must be a positive number' });
      return;
    }

    if (currency !== 'ETH') {
      response.status(400).json({ success: false, error: 'currency must be ETH' });
      return;
    }

    if (!successUrl || typeof successUrl !== 'string') {
      response.status(400).json({ success: false, error: 'successUrl is required' });
      return;
    }

    if (!cancelUrl || typeof cancelUrl !== 'string') {
      response.status(400).json({ success: false, error: 'cancelUrl is required' });
      return;
    }

    // Validate URLs
    try {
      new URL(successUrl);
      new URL(cancelUrl);
    } catch {
      response.status(400).json({ success: false, error: 'successUrl and cancelUrl must be valid URLs' });
      return;
    }

    try {
      const result = await checkoutService.createSession({
        userId,
        amount: parsedAmount,
        currency: 'ETH',
        successUrl,
        cancelUrl,
        isTestMode: request.user!.isTestMode,
      });

      const apiResponse: ApiResponse<CheckoutSessionResult> = { success: true, data: result };
      response.status(201).json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      response.status(500).json({ success: false, error: message });
    }
  },

  async getSession(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      const session = await checkoutService.getSession(id);

      if (!session) {
        response.status(404).json({ success: false, error: 'Checkout session not found' });
        return;
      }

      const apiResponse: ApiResponse<typeof session> = { success: true, data: session };
      response.status(200).json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve session';
      response.status(500).json({ success: false, error: message });
    }
  },
};
