import { Request, Response } from 'express';
import { paymentService, PaymentCurrency, ListPaymentsResult, PaymentFilters } from '../services/paymentService';
import { ApiResponse } from '../types';
import { PaymentResult } from '../services/paymentService';
import { priceService } from '../services/priceService';

const SUPPORTED_CURRENCIES: PaymentCurrency[] = ['ETH'];
const SUPPORTED_FIAT_CURRENCIES = ['USD'];

export const paymentController = {
  async listPayments(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const page = Math.max(1, parseInt(String(request.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(request.query.limit ?? '20'), 10) || 20));

    const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'];
    const VALID_NETWORKS = ['MAINNET', 'TESTNET'];

    const filters: PaymentFilters = {};
    const statusParam = String(request.query.status ?? '').toUpperCase();
    const networkParam = String(request.query.network ?? '').toUpperCase();
    const referenceParam = String(request.query.reference ?? '');

    if (statusParam && VALID_STATUSES.includes(statusParam)) filters.status = statusParam;
    if (networkParam && VALID_NETWORKS.includes(networkParam)) filters.network = networkParam;
    if (referenceParam) filters.reference = referenceParam;

    const result = await paymentService.listPayments(userId, page, limit, filters);

    const apiResponse: ApiResponse<ListPaymentsResult['payments']> = {
      success: true,
      data: result.payments,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    };
    response.status(200).json(apiResponse);
  },

  // Public — no authentication required. Returns only the minimal fields a
  // client needs to poll for confirmation: id, status, expiresAt.
  async getPaymentStatus(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      const result = await paymentService.getPaymentById(id);

      if (!result) {
        response.status(404).json({ success: false, error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
        return;
      }

      response.status(200).json({
        success: true,
        data: { id: result.id, status: result.status, expiresAt: result.expiresAt },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve payment';
      response.status(500).json({ success: false, error: message, code: 'INTERNAL_ERROR' });
    }
  },

  async getPayment(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      const result = await paymentService.getPaymentById(id);

      if (!result) {
        response.status(404).json({ success: false, error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
        return;
      }

      const apiResponse: ApiResponse<PaymentResult> = { success: true, data: result };
      response.status(200).json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve payment';
      response.status(500).json({ success: false, error: message, code: 'INTERNAL_ERROR' });
    }
  },

  async createPayment(request: Request, response: Response): Promise<void> {
    const { amount, currency, fiatAmount, fiatCurrency, reference, metadata } = request.body as {
      amount?: unknown;
      currency?: unknown;
      fiatAmount?: unknown;
      fiatCurrency?: unknown;
      reference?: unknown;
      metadata?: unknown;
    };
    const userId = request.user!.userId;

    const hasFiat = fiatAmount !== undefined || fiatCurrency !== undefined;
    const hasCrypto = amount !== undefined || currency !== undefined;

    if (hasFiat && hasCrypto) {
      response.status(400).json({
        success: false,
        error: 'Provide either (amount + currency) or (fiatAmount + fiatCurrency), not both.',
        code: 'INVALID_AMOUNT',
      });
      return;
    }

    if (reference !== undefined && (typeof reference !== 'string' || reference.length > 255)) {
      response.status(400).json({
        success: false,
        error: 'reference must be a string of max 255 characters',
        code: 'INVALID_REFERENCE',
      });
      return;
    }

    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
      response.status(400).json({ success: false, error: 'metadata must be a plain object', code: 'INVALID_METADATA' });
      return;
    }

    let ethAmount: number;
    let fiatContext: { fiatAmount: number; fiatCurrency: string; exchangeRate: number } | undefined;

    if (hasFiat) {
      // Fiat path — convert to ETH using the live exchange rate
      if (fiatAmount === undefined || fiatAmount === null) {
        response.status(400).json({ success: false, error: 'fiatAmount is required when using fiat currency', code: 'INVALID_AMOUNT' });
        return;
      }

      const parsedFiatAmount = Number(fiatAmount);
      if (!Number.isFinite(parsedFiatAmount) || parsedFiatAmount <= 0) {
        response.status(400).json({ success: false, error: 'fiatAmount must be a positive number', code: 'INVALID_AMOUNT' });
        return;
      }

      if (!fiatCurrency || !SUPPORTED_FIAT_CURRENCIES.includes(fiatCurrency as string)) {
        response.status(400).json({
          success: false,
          error: `fiatCurrency must be one of: ${SUPPORTED_FIAT_CURRENCIES.join(', ')}`,
          code: 'INVALID_CURRENCY',
        });
        return;
      }

      try {
        const conversion = await priceService.convertFiatToEth(parsedFiatAmount, fiatCurrency as string);
        ethAmount = conversion.ethAmount;
        fiatContext = { fiatAmount: parsedFiatAmount, fiatCurrency: fiatCurrency as string, exchangeRate: conversion.exchangeRate };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch exchange rate';
        response.status(503).json({ success: false, error: message, code: 'RATE_UNAVAILABLE' });
        return;
      }
    } else {
      // Crypto path — direct ETH amount
      if (amount === undefined || amount === null) {
        response.status(400).json({ success: false, error: 'amount is required', code: 'INVALID_AMOUNT' });
        return;
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        response.status(400).json({ success: false, error: 'amount must be a positive number', code: 'INVALID_AMOUNT' });
        return;
      }

      if (!currency || !SUPPORTED_CURRENCIES.includes(currency as PaymentCurrency)) {
        response.status(400).json({
          success: false,
          error: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
          code: 'INVALID_CURRENCY',
        });
        return;
      }

      ethAmount = parsedAmount;
    }

    try {
      // Merge fiat context into metadata so it can be retrieved later
      const mergedMetadata: Record<string, unknown> | undefined = fiatContext
        ? { ...(metadata as Record<string, unknown> | undefined), _fiatContext: fiatContext }
        : (metadata as Record<string, unknown> | undefined);

      const result = await paymentService.createPayment({
        userId,
        amount: ethAmount,
        currency: 'ETH',
        network: request.user!.isTestMode ? 'TESTNET' : 'MAINNET',
        reference: reference as string | undefined,
        metadata: mergedMetadata,
      });

      const apiResponse: ApiResponse<PaymentResult> = { success: true, data: result };
      response.status(201).json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payment';
      response.status(500).json({ success: false, error: message, code: 'INTERNAL_ERROR' });
    }
  },
};
