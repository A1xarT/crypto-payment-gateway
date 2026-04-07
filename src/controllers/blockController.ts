import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { ApiResponse, Block } from '../types';

export const blockController = {
  async getLatestBlock(_req: Request, res: Response): Promise<void> {
    const block = await blockchainService.getBlockByNumber('latest');
    const response: ApiResponse<Block> = { success: true, data: block };
    res.json(response);
  },

  async getBlockByNumber(req: Request, res: Response): Promise<void> {
    const blockNumber = parseInt(req.params.number as string, 10);
    if (isNaN(blockNumber) || blockNumber < 0) {
      res.status(400).json({ success: false, error: 'Invalid block number' });
      return;
    }
    const block = await blockchainService.getBlockByNumber(blockNumber);
    const response: ApiResponse<Block> = { success: true, data: block };
    res.json(response);
  },

  async getBlockByHash(req: Request, res: Response): Promise<void> {
    const hash = req.params.hash as string;
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      res.status(400).json({ success: false, error: 'Invalid block hash' });
      return;
    }
    const block = await blockchainService.getBlockByHash(hash);
    const response: ApiResponse<Block> = { success: true, data: block };
    res.json(response);
  },
};
