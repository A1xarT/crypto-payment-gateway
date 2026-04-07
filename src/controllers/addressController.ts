import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { ApiResponse, AddressInfo } from '../types';

export const addressController = {
  async getAddressInfo(req: Request, res: Response): Promise<void> {
    const address = req.params.address as string;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      res.status(400).json({ success: false, error: 'Invalid Ethereum address' });
      return;
    }
    const info = await blockchainService.getAddressInfo(address);
    const response: ApiResponse<AddressInfo> = { success: true, data: info };
    res.json(response);
  },
};
