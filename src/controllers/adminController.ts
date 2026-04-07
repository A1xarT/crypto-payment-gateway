import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiResponse } from '../types';

const VALID_STATUSES = ['PENDING', 'UNDERPAID', 'CONFIRMED', 'FAILED', 'EXPIRED'];

export const adminController = {
  // GET /api/v1/admin/users
  async listUsers(request: Request, response: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(request.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(request.query.limit ?? '20'), 10) || 20));

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: { id: true, email: true, payoutAddress: true, isAdmin: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    response.json({
      success: true,
      data: users,
      pagination: { page, limit, total },
    });
  },

  // GET /api/v1/admin/payments
  async listAllPayments(request: Request, response: Response): Promise<void> {
    const page = Math.max(1, parseInt(String(request.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(request.query.limit ?? '20'), 10) || 20));
    const statusFilter = String(request.query.status ?? '').toUpperCase();

    const where: Record<string, unknown> = {};
    if (statusFilter && VALID_STATUSES.includes(statusFilter)) where['status'] = statusFilter;

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: { address: { select: { address: true } }, user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id: p.id,
      merchantEmail: p.user.email,
      address: p.address?.address ?? null,
      amount: p.amount.toString(),
      currency: p.currency,
      status: p.status,
      network: p.network,
      reference: p.reference ?? null,
      receivedAmount: p.receivedAmount?.toString() ?? null,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    response.json({
      success: true,
      data,
      pagination: { page, limit, total },
    });
  },

  // PATCH /api/v1/admin/payments/:id/status
  async overridePaymentStatus(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };
    const { status, reason } = request.body as { status?: unknown; reason?: unknown };

    if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status.toUpperCase())) {
      response.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      response.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    await prisma.payment.update({
      where: { id },
      data: { status: status.toUpperCase() as 'PENDING' },
    });

    const adminUserId = request.user!.userId;
    const reasonText = typeof reason === 'string' ? reason : 'no reason provided';
    // Log the override for audit trail
    const { logger } = await import('../lib/logger');
    logger.warn(
      { paymentId: id, adminUserId, oldStatus: payment.status, newStatus: status.toUpperCase(), reason: reasonText },
      `[Admin] Payment ${id} status manually overridden by admin ${adminUserId}`
    );

    const apiResponse: ApiResponse<{ id: string; status: string }> = {
      success: true,
      data: { id, status: status.toUpperCase() },
    };
    response.json(apiResponse);
  },

  // POST /api/v1/admin/webhook-deliveries/:id/retry
  async retryWebhookDelivery(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id },
      include: { webhook: true },
    });

    if (!delivery) {
      response.status(404).json({ success: false, error: 'Webhook delivery not found' });
      return;
    }

    // Reset so the retry poller picks it up on the next cycle
    await prisma.webhookDelivery.update({
      where: { id },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        nextRetryAt: new Date(),
      },
    });

    response.json({ success: true, data: { id, message: 'Delivery queued for retry' } });
  },

  // GET /api/v1/admin/sweeps — list failed sweeps for investigation
  async listFailedSweeps(request: Request, response: Response): Promise<void> {
    const sweeps = await prisma.sweep.findMany({
      where: { status: 'FAILED' },
      include: { payment: { select: { id: true, amount: true, currency: true, network: true, user: { select: { email: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const data = sweeps.map((s) => ({
      id: s.id,
      paymentId: s.paymentId,
      merchantEmail: s.payment.user.email,
      amount: s.payment.amount.toString(),
      network: s.payment.network,
      toAddress: s.toAddress,
      amountWei: s.amountWei,
      gasCostWei: s.gasCostWei,
      errorMessage: s.errorMessage,
      createdAt: s.createdAt.toISOString(),
    }));

    response.json({ success: true, data });
  },
};
