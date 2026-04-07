import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /api/v1/account:
 *   get:
 *     tags: [Account]
 *     summary: Get account details
 *     description: Returns the authenticated merchant's profile, including their configured payout address.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AccountResult'
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/', authenticate, accountController.getAccount);

/**
 * @openapi
 * /api/v1/account/payout-address:
 *   patch:
 *     tags: [Account]
 *     summary: Set payout address
 *     description: >
 *       Sets the Ethereum address where confirmed payment funds will be automatically
 *       swept to. The address is normalized to EIP-55 checksum format on save.
 *       Any payments confirmed before this address is set will not be retroactively swept.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payoutAddress]
 *             properties:
 *               payoutAddress:
 *                 type: string
 *                 example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
 *                 description: A valid Ethereum address
 *     responses:
 *       200:
 *         description: Payout address updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AccountResult'
 *       400:
 *         description: Missing or invalid address
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.patch('/payout-address', authenticate, accountController.setPayoutAddress);

export default router;
