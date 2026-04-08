const request = require('supertest');
const app = require('../index');
const { query, pool } = require('../db');

let typeId;

beforeAll(async () => {
  const res = await query(
    `INSERT INTO plant_types (name, emoji, thirst_factor, water_amount_per_cm, fertilize_every, is_custom)
     VALUES ('Test Plant', '🌱', 1.0, 10, 28, true) RETURNING id`
  );
  typeId = res.rows[0].id;
});

afterAll(async () => {
  await query('DELETE FROM plants WHERE name LIKE $1', ['Test%']);
  await query('DELETE FROM plant_types WHERE is_custom = true');
  await pool.end();
});

const validPlant = () => ({
  name: 'Test Pothos',
  plant_type_id: typeId,
  window_orientation: 'E',
  window_distance: 'medium',
  height_cm: 40,
});

describe('POST /api/plants', () => {
  test('creates a plant and returns computed fields', async () => {
    const res = await request(app).post('/api/plants').send(validPlant());
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Pothos');
    expect(res.body.water_interval_days).toBeGreaterThan(0);
    expect(res.body.water_amount_ml).toBe(400); // 10 * 40
    expect(res.body.overdue_water).toBe(true); // never watered
  });

  test('rejects missing required fields', async () => {
    const res = await request(app).post('/api/plants').send({ name: 'Bad' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/plants', () => {
  test('returns list with computed fields', async () => {
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('overdue_water');
      expect(res.body[0]).toHaveProperty('water_amount_ml');
      expect(res.body[0]).toHaveProperty('next_water_date');
    }
  });
});

describe('PUT /api/plants/:id', () => {
  test('updates plant fields', async () => {
    const create = await request(app).post('/api/plants').send(validPlant());
    const id = create.body.id;
    const res = await request(app).put(`/api/plants/${id}`).send({ height_cm: 60, notes: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.height_cm).toBe(60);
    expect(res.body.notes).toBe('Updated');
  });
});

describe('DELETE /api/plants/:id', () => {
  test('deletes a plant', async () => {
    const create = await request(app).post('/api/plants').send(validPlant());
    const id = create.body.id;
    const res = await request(app).delete(`/api/plants/${id}`);
    expect(res.status).toBe(204);
    const get = await request(app).get(`/api/plants/${id}`);
    expect(get.status).toBe(404);
  });
});

describe('POST /api/plants/:id/water and water-batch', () => {
  test('logs watering for single plant', async () => {
    const create = await request(app).post('/api/plants').send(validPlant());
    const id = create.body.id;
    const res = await request(app).post(`/api/plants/${id}/water`);
    expect(res.status).toBe(200);
    expect(res.body.logged_at).toBeTruthy();
  });

  test('water-batch logs watering for multiple plants', async () => {
    const p1 = await request(app).post('/api/plants').send(validPlant());
    const p2 = await request(app).post('/api/plants').send({ ...validPlant(), name: 'Test Monstera' });
    const res = await request(app).post('/api/plants/water-batch').send({ plant_ids: [p1.body.id, p2.body.id] });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
  });
});
