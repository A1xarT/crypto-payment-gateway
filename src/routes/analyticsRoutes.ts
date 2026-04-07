import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /api/v1/analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Payment summary
 *     description: >
 *       Returns aggregate payment statistics for the authenticated merchant:
 *       total counts by status, ETH revenue, conversion rate, and a per-network breakdown.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentSummary'
 *       401:
 *         description: Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/summary', authenticate, analyticsController.getSummary);

/**
 * @openapi
 * /api/v1/analytics/volume:
 *   get:
 *     tags: [Analytics]
 *     summary: Daily confirmed payment volume
 *     description: >
 *       Returns confirmed payment counts and ETH revenue aggregated by day for the
 *       last N days (default 30, max 90). Missing days are included with zero values
 *       so the result always covers a continuous date range.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 30
 *         description: Number of days to include
 *     responses:
 *       200:
 *         description: Daily volume data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyVolume'
 *       401:
 *         description: Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/volume', authenticate, analyticsController.getDailyVolume);

export default router;
