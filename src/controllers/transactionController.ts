import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { ApiResponse, Transaction, TransactionReceipt } from '../types';

export const transactionController = {
  async getTransaction(req: Request, res: Response): Promise<void> {
    const hash = req.params.hash as string;
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      res.status(400).json({ success: false, error: 'Invalid transaction hash' });
      return;
    }
    const tx = await blockchainService.getTransactionByHash(hash);
    const response: ApiResponse<Transaction> = { success: true, data: tx };
    res.json(response);
  },

  async getTransactionReceipt(req: Request, res: Response): Promise<void> {
    const hash = req.params.hash as string;
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      res.status(400).json({ success: false, error: 'Invalid transaction hash' });
      return;
    }
    const receipt = await blockchainService.getTransactionReceipt(hash);
    const response: ApiResponse<TransactionReceipt> = { success: true, data: receipt };
    res.json(response);
  },
};
