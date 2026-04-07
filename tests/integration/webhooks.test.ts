import request from 'supertest';
import '../../tests/mocks/prisma';
import { prismaMock } from '../../tests/mocks/prisma';
import { buildTestApp } from '../helpers/testApp';
import { makeUserToken, fakeWebhook } from '../helpers/factories';

const app = buildTestApp();
const token = makeUserToken();
const authHeader = `Bearer ${token}`;

describe('POST /api/v1/webhooks', () => {
  it('registers a webhook and returns 201 with a secret', async () => {
    prismaMock.webhook.create.mockResolvedValue({
      ...fakeWebhook,
      secret: 'wh-secret-abc',
    });

    const response = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', authHeader)
      .send({ url: 'https://example.com/webhook' });

    expect(response.status).toBe(201);
    expect(response.body.data.secret).toBeTruthy();
    expect(response.body.data.url).toBe('https://example.com/webhook');
  });

  it('returns 400 when url is missing', async () => {
    const response = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', authHeader)
      .send({});

    expect(response.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post('/api/v1/webhooks')
      .send({ url: 'https://example.com/webhook' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/webhooks', () => {
  it('returns list of webhooks (secret omitted)', async () => {
    prismaMock.webhook.findMany.mockResolvedValue([fakeWebhook]);

    const response = await request(app)
      .get('/api/v1/webhooks')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    // Secret must not be returned on list
    expect(response.body.data[0].secret).toBeUndefined();
  });
});

describe('DELETE /api/v1/webhooks/:id', () => {
  it('soft-deletes a webhook (isActive = false)', async () => {
    prismaMock.webhook.findUnique.mockResolvedValue(fakeWebhook);
    prismaMock.webhook.update.mockResolvedValue({ ...fakeWebhook, isActive: false });

    const response = await request(app)
      .delete('/api/v1/webhooks/wh-1')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
  });

  it('returns 404 when webhook does not exist', async () => {
    prismaMock.webhook.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/v1/webhooks/nonexistent')
      .set('Authorization', authHeader);

    expect(response.status).toBe(404);
  });
});
