import request from 'supertest';
import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';
import { buildTestApp } from '../helpers/testApp';
import bcrypt from 'bcryptjs';

const app = buildTestApp();

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with token on success', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      createdAt: new Date(),
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
  });

  it('returns 409 when email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing', email: 'dupe@example.com' });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('returns 400 when email is missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'password123' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: '123' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with token on valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      createdAt: new Date(),
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTruthy();
  });

  it('returns 401 on wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      createdAt: new Date(),
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
  });

  it('returns 401 when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password' });

    expect(response.status).toBe(401);
  });
});
