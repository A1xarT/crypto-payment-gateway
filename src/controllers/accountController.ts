import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { ApiResponse } from '../types';

export interface AccountResult {
  id: string;
  email: string;
  payoutAddress: string | null;
  createdAt: string;
}

export const accountController = {
  async getAccount(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, payoutAddress: true, createdAt: true },
    });

    if (!user) {
      response.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const result: AccountResult = {
      id: user.id,
      email: user.email,
      payoutAddress: user.payoutAddress,
      createdAt: user.createdAt.toISOString(),
    };

    const apiResponse: ApiResponse<AccountResult> = { success: true, data: result };
    response.status(200).json(apiResponse);
  },

  async setPayoutAddress(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { payoutAddress } = request.body as { payoutAddress?: unknown };

    if (!payoutAddress || typeof payoutAddress !== 'string') {
      response.status(400).json({ success: false, error: 'payoutAddress is required' });
      return;
    }

    if (!ethers.isAddress(payoutAddress)) {
      response.status(400).json({ success: false, error: 'payoutAddress must be a valid Ethereum address' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { payoutAddress: ethers.getAddress(payoutAddress) }, // normalize to checksum format
      select: { id: true, email: true, payoutAddress: true, createdAt: true },
    });

    const result: AccountResult = {
      id: user.id,
      email: user.email,
      payoutAddress: user.payoutAddress,
      createdAt: user.createdAt.toISOString(),
    };

    const apiResponse: ApiResponse<AccountResult> = { success: true, data: result };
    response.status(200).json(apiResponse);
  },
};
