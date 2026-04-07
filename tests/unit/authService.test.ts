import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';
import bcrypt from 'bcryptjs';
import { authService } from '../../src/services/authService';

describe('authService', () => {
  describe('register', () => {
    it('creates a new user and returns a JWT token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // no existing user
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        createdAt: new Date('2026-01-01'),
        passwordHash: 'hash',
      });

      const result = await authService.register({ email: 'test@example.com', password: 'password123' });

      expect(result.token).toBeTruthy();
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws when the email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing', email: 'dupe@example.com' });

      await expect(
        authService.register({ email: 'dupe@example.com', password: 'password123' })
      ).rejects.toThrow('already exists');
    });
  });

  describe('login', () => {
    it('returns a token when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        createdAt: new Date(),
      });

      const result = await authService.login({ email: 'user@example.com', password: 'correct-password' });

      expect(result.token).toBeTruthy();
      expect(result.user.id).toBe('user-1');
    });

    it('throws when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'pw' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws when the password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        createdAt: new Date(),
      });

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong-password' })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
