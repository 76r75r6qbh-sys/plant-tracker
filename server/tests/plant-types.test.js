const request = require('supertest');
const app = require('../index');
const { query, pool } = require('../db');

afterAll(async () => { await pool.end(); });

describe('GET /api/plant-types', () => {
  test('returns array of plant types', async () => {
    const res = await request(app).get('/api/plant-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      emoji: expect.any(String),
    });
  });
});

describe('POST /api/plant-types', () => {
  afterEach(async () => {
    await query("DELETE FROM plant_types WHERE is_custom = true");
  });

  test('creates a custom plant type', async () => {
    const res = await request(app).post('/api/plant-types').send({
      name: 'Test Custom Plant',
      emoji: '🌱',
      thirst_factor: 1.2,
      water_amount_per_cm: 8,
      fertilize_every: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Custom Plant');
    expect(res.body.is_custom).toBe(true);
  });

  test('rejects missing required fields', async () => {
    const res = await request(app).post('/api/plant-types').send({ name: 'Bad' });
    expect(res.status).toBe(400);
  });
});
