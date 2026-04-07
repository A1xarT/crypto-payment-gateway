import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService';
import { ApiResponse } from '../types';
import { AuthResult } from '../services/authService';
import { config } from '../config';
import { JwtPayload } from '../middleware/authenticate';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authController = {
  async register(request: Request, response: Response): Promise<void> {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      response.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }
    if (!isValidEmail(email)) {
      response.status(400).json({ success: false, error: 'Invalid email address' });
      return;
    }
    if (password.length < 8) {
      response.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    try {
      const result = await authService.register({ email, password });
      const apiResponse: ApiResponse<AuthResult> = { success: true, data: result };
      response.status(201).json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = message.includes('already exists') ? 409 : 500;
      response.status(statusCode).json({ success: false, error: message });
    }
  },

  async logout(request: Request, response: Response): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(400).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      if (payload.jti && payload.exp) {
        await authService.logout(payload.jti, payload.userId, new Date(payload.exp * 1000));
      }
    } catch {
      // Token is already invalid — still return 200, logout is idempotent
    }

    response.json({ success: true, data: { message: 'Logged out successfully' } });
  },

  async login(request: Request, response: Response): Promise<void> {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      response.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    try {
      const result = await authService.login({ email, password });
      const apiResponse: ApiResponse<AuthResult> = { success: true, data: result };
      response.json(apiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      const statusCode = message.includes('Invalid email or password') ? 401 : 500;
      response.status(statusCode).json({ success: false, error: message });
    }
  },
};
