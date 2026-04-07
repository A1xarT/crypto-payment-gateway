import { Request, Response } from 'express';
import { apiKeyService } from '../services/apiKeyService';
import { ApiResponse } from '../types';

export const apiKeyController = {
  async generateKeyPair(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { name, mode } = request.body as { name?: unknown; mode?: unknown };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      response.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    if (mode !== undefined && mode !== 'live' && mode !== 'test') {
      response.status(400).json({ success: false, error: 'mode must be "live" or "test"' });
      return;
    }

    const keyPair = await apiKeyService.generateKeyPair(userId, name.trim(), (mode as 'live' | 'test') ?? 'live');

    const apiResponse: ApiResponse<typeof keyPair> = { success: true, data: keyPair };
    response.status(201).json(apiResponse);
  },

  async listKeys(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const keys = await apiKeyService.listKeys(userId);
    const apiResponse: ApiResponse<typeof keys> = { success: true, data: keys };
    response.status(200).json(apiResponse);
  },

  async revokeKey(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const found = await apiKeyService.revokeKey(id, userId);

    if (!found) {
      response.status(404).json({ success: false, error: 'API key not found' });
      return;
    }

    response.status(200).json({ success: true, data: { id } });
  },
};
