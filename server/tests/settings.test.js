const request = require('supertest');
const app = require('../index');
const { pool } = require('../db');

afterAll(() => pool.end());

describe('GET /api/settings', () => {
  test('returns settings object', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.notification_time).toBe('08:00');
  });
});

describe('PUT /api/settings/:key', () => {
  afterEach(async () => {
    await request(app).put('/api/settings/notification_time').send({ value: '08:00' });
  });

  test('updates notification_time', async () => {
    const res = await request(app).put('/api/settings/notification_time').send({ value: '09:30' });
    expect(res.status).toBe(200);
    expect(res.body.value).toBe('09:30');
  });

  test('rejects missing value', async () => {
    const res = await request(app).put('/api/settings/notification_time').send({});
    expect(res.status).toBe(400);
  });
});
