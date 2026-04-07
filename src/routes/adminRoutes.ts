import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { adminController } from '../controllers/adminController';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all merchant accounts
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Paginated user list }
 *       403: { description: Admin access required }
 */
router.get('/users', adminController.listUsers);

/**
 * @openapi
 * /api/v1/admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: List all payments across all merchants
 *     parameters:
 *       - { name: status, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Paginated payments }
 *       403: { description: Admin access required }
 */
router.get('/payments', adminController.listAllPayments);

/**
 * @openapi
 * /api/v1/admin/payments/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Override a payment's status
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, UNDERPAID, CONFIRMED, FAILED, EXPIRED]
 *               reason:
 *                 type: string
 *                 description: Audit reason for the override
 *     responses:
 *       200: { description: Status updated }
 *       404: { description: Payment not found }
 */
router.patch('/payments/:id/status', adminController.overridePaymentStatus);

/**
 * @openapi
 * /api/v1/admin/webhook-deliveries/{id}/retry:
 *   post:
 *     tags: [Admin]
 *     summary: Force-retry a failed webhook delivery
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Delivery queued }
 *       404: { description: Delivery not found }
 */
router.post('/webhook-deliveries/:id/retry', adminController.retryWebhookDelivery);

/**
 * @openapi
 * /api/v1/admin/sweeps/failed:
 *   get:
 *     tags: [Admin]
 *     summary: List failed fund sweeps
 *     responses:
 *       200: { description: Failed sweeps }
 *       403: { description: Admin access required }
 */
router.get('/sweeps/failed', adminController.listFailedSweeps);

export default router;
