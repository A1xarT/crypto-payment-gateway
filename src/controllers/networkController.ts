import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { ApiResponse, NetworkStats } from '../types';

export const networkController = {
  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await blockchainService.getNetworkStats();
    const response: ApiResponse<NetworkStats> = { success: true, data: stats };
    res.json(response);
  },
};
