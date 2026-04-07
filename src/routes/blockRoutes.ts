import { Router } from 'express';
import { blockController } from '../controllers/blockController';

const router = Router();

/**
 * @openapi
 * /api/v1/blocks/latest:
 *   get:
 *     tags: [Blocks]
 *     summary: Get the latest block
 *     description: Returns the most recently mined block on the network.
 *     responses:
 *       200:
 *         description: Latest block data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Block' }
 *       500:
 *         description: RPC or server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/latest', blockController.getLatestBlock);

/**
 * @openapi
 * /api/v1/blocks/number/{number}:
 *   get:
 *     tags: [Blocks]
 *     summary: Get a block by number
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema: { type: integer, example: 21000000 }
 *         description: The block number
 *     responses:
 *       200:
 *         description: Block data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Block' }
 *       400:
 *         description: Invalid block number
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/number/:number', blockController.getBlockByNumber);

/**
 * @openapi
 * /api/v1/blocks/hash/{hash}:
 *   get:
 *     tags: [Blocks]
 *     summary: Get a block by hash
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema: { type: string, example: '0xabc123...' }
 *         description: The block hash (66-char hex string)
 *     responses:
 *       200:
 *         description: Block data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Block' }
 *       400:
 *         description: Invalid block hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/hash/:hash', blockController.getBlockByHash);

export default router;
