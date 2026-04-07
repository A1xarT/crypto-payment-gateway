import { Router } from 'express';
import { addressController } from '../controllers/addressController';

const router = Router();

/**
 * @openapi
 * /api/v1/addresses/{address}:
 *   get:
 *     tags: [Addresses]
 *     summary: Get address information
 *     description: Returns balance, transaction count, and whether the address is a smart contract.
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string, example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }
 *         description: Ethereum address (42-char hex string)
 *     responses:
 *       200:
 *         description: Address information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AddressInfo' }
 *       400:
 *         description: Invalid Ethereum address
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:address', addressController.getAddressInfo);

export default router;
