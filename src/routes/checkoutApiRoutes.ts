import { Router } from 'express';
import { checkoutController } from '../controllers/checkoutController';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @openapi
 * /api/v1/checkout/sessions:
 *   post:
 *     tags: [Checkout]
 *     summary: Create a checkout session
 *     description: |
 *       Creates a hosted checkout session that redirects the buyer to a pre-built
 *       payment page. On payment confirmation the buyer is redirected to `successUrl`;
 *       on expiry or cancellation to `cancelUrl`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency, successUrl, cancelUrl]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 0.05
 *               currency:
 *                 type: string
 *                 enum: [ETH]
 *                 example: ETH
 *               successUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://myshop.com/orders/123/success
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://myshop.com/orders/123/cancel
 *     responses:
 *       201:
 *         description: Session created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/sessions', authenticate, checkoutController.createSession);

/**
 * @openapi
 * /api/v1/checkout/sessions/{id}:
 *   get:
 *     tags: [Checkout]
 *     summary: Retrieve a checkout session
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session found
 *       404:
 *         description: Not found
 */
router.get('/sessions/:id', authenticate, checkoutController.getSession);

// Public status endpoint — polled by the hosted checkout page (no auth required)
router.get('/sessions/:id/status', async (request, response) => {
  const { id } = request.params as { id: string };
  const session = await prisma.checkoutSession.findUnique({
    where: { id },
    select: { status: true, successUrl: true, cancelUrl: true },
  });
  if (!session) {
    response.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  response.json({ success: true, data: { status: session.status } });
});

export default router;
