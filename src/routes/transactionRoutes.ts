import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';

const router = Router();

/**
 * @openapi
 * /api/v1/transactions/{hash}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a transaction by hash
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema: { type: string, example: '0xabc123...' }
 *         description: The transaction hash (66-char hex string)
 *     responses:
 *       200:
 *         description: Transaction data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Transaction' }
 *       400:
 *         description: Invalid transaction hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:hash', transactionController.getTransaction);

/**
 * @openapi
 * /api/v1/transactions/{hash}/receipt:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a transaction receipt by hash
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema: { type: string, example: '0xabc123...' }
 *         description: The transaction hash (66-char hex string)
 *     responses:
 *       200:
 *         description: Transaction receipt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TransactionReceipt' }
 *       400:
 *         description: Invalid transaction hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Receipt not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:hash/receipt', transactionController.getTransactionReceipt);

export default router;
