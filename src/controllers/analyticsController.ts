import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { ApiResponse } from '../types';
import { PaymentSummary, DailyVolume } from '../services/analyticsService';

export const analyticsController = {
  async getSummary(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const summary = await analyticsService.getSummary(userId);
    const apiResponse: ApiResponse<PaymentSummary> = { success: true, data: summary };
    response.status(200).json(apiResponse);
  },

  async getDailyVolume(request: Request, response: Response): Promise<void> {
    const userId = request.user!.userId;
    const days = Math.min(90, Math.max(1, parseInt(String(request.query.days ?? '30'), 10) || 30));
    const volume = await analyticsService.getDailyVolume(userId, days);
    const apiResponse: ApiResponse<DailyVolume[]> = { success: true, data: volume };
    response.status(200).json(apiResponse);
  },
};
