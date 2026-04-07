import { Router } from 'express';
import { networkController } from '../controllers/networkController';

const router = Router();

/**
 * @openapi
 * /api/v1/network/stats:
 *   get:
 *     tags: [Network]
 *     summary: Get network statistics
 *     description: Returns the latest block number, network ID, current gas price, and peer count.
 *     responses:
 *       200:
 *         description: Network statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NetworkStats' }
 *       500:
 *         description: RPC or server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/stats', networkController.getStats);

export default router;
