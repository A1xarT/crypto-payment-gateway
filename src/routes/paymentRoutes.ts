import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate } from '../middleware/authenticate';
import { requireSecretKey } from '../middleware/requireSecretKey';
import { idempotency } from '../middleware/idempotency';

const router = Router();

/**
 * @openapi
 * /api/v1/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Create a new payment
 *     description: >
 *       Creates a payment record with status `PENDING` and generates a unique
 *       Ethereum deposit address for it. The private key is stored encrypted
 *       (AES-256-CBC) and never returned in any response.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 0.05
 *                 description: Payment amount (positive number)
 *               currency:
 *                 type: string
 *                 enum: [ETH]
 *                 example: ETH
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentResult'
 *       400:
 *         description: Validation error (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/', authenticate, requireSecretKey, paymentController.listPayments);
// Publishable keys may create payments (client-side checkout)
router.post('/', authenticate, idempotency, paymentController.createPayment);

/**
 * @openapi
 * /api/v1/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment status
 *     description: >
 *       Returns the current status of a payment by its ID. The status is updated
 *       automatically by the background monitor, which polls the Ethereum blockchain
 *       every 30 seconds. Once the deposit address balance meets or exceeds the
 *       expected amount, the status transitions from `PENDING` to `CONFIRMED`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the payment
 *         example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *     responses:
 *       200:
 *         description: Payment found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentResult'
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// Public — no auth. Returns only {id, status, expiresAt} for client polling.
router.get('/:id/status', paymentController.getPaymentStatus);
router.get('/:id', authenticate, requireSecretKey, paymentController.getPayment);

export default router;
