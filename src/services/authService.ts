import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: input.email, passwordHash },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: false, jti: crypto.randomUUID() },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return { token, user: { id: user.id, email: user.email, createdAt: user.createdAt } };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin, jti: crypto.randomUUID() },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return { token, user: { id: user.id, email: user.email, createdAt: user.createdAt } };
  },

  // Adds the token's jti to the blacklist so it cannot be used again.
  async logout(jti: string, userId: string, expiresAt: Date): Promise<void> {
    await prisma.revokedToken.upsert({
      where: { jti },
      update: {},
      create: { jti, userId, expiresAt },
    });
  },

  async isTokenRevoked(jti: string): Promise<boolean> {
    const record = await prisma.revokedToken.findUnique({ where: { jti } });
    return record !== null;
  },

  // Prune expired tokens — call periodically (e.g. daily cron or on startup)
  async pruneExpiredTokens(): Promise<void> {
    await prisma.revokedToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  },
};
