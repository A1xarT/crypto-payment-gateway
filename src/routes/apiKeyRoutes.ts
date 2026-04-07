import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKeyController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /api/v1/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Generate a key pair
 *     description: >
 *       Generates a `SECRET` key (`sk_live_...`) and a `PUBLISHABLE` key (`pk_live_...`)
 *       for the authenticated merchant. Both full key values are returned **once only** —
 *       store them securely. Only the `sk_live_` key authenticates API requests.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Production
 *                 description: A label to identify this key pair
 *               mode:
 *                 type: string
 *                 enum: [live, test]
 *                 default: live
 *                 description: >
 *                   "live" generates sk_live_/pk_live_ keys (mainnet).
 *                   "test" generates sk_test_/pk_test_ keys (Sepolia testnet).
 *     responses:
 *       201:
 *         description: Key pair created — full keys shown once
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiKeyPair'
 *       400:
 *         description: Missing name
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/', authenticate, apiKeyController.generateKeyPair);

/**
 * @openapi
 * /api/v1/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List API keys
 *     description: >
 *       Returns all API keys for the authenticated merchant. Full key values are
 *       never returned — only the prefix (e.g. `sk_live_a3f1c2d4`) for identification.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
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
 *                     $ref: '#/components/schemas/ApiKeyRecord'
 *       401:
 *         description: Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/', authenticate, apiKeyController.listKeys);

/**
 * @openapi
 * /api/v1/api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     description: Marks the key as inactive. Any requests using this key will immediately be rejected.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     responses:
 *       200:
 *         description: Key revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Missing or invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Key not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.delete('/:id', authenticate, apiKeyController.revokeKey);

export default router;
