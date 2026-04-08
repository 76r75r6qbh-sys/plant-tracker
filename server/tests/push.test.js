const request = require('supertest');
const app = require('../index');
const { query, pool } = require('../db');

afterAll(async () => {
  await query("DELETE FROM push_subscriptions WHERE endpoint LIKE 'https://test%'");
  await pool.end();
});

const testSub = {
  endpoint: 'https://test.pushservice.com/test-endpoint',
  keys: { p256dh: 'dGVzdHB1YmxpY2tleQ==', auth: 'dGVzdGF1dGg=' },
};

describe('POST /api/push/subscribe', () => {
  test('saves a subscription', async () => {
    const res = await request(app).post('/api/push/subscribe').send(testSub);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/push/subscribe').send({ endpoint: 'https://test.com' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/push/subscribe', () => {
  test('removes a subscription', async () => {
    await request(app).post('/api/push/subscribe').send(testSub);
    const res = await request(app).delete('/api/push/subscribe').send({ endpoint: testSub.endpoint });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/push/vapid-public-key', () => {
  test('returns VAPID public key', async () => {
    const res = await request(app).get('/api/push/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.key).toBeTruthy();
  });
});
