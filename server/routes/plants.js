const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { computeInterval, computeAmount } = require('../lib/watering-formula');

function enrichPlant(row) {
  const interval = computeInterval(row.window_orientation, row.window_distance, row.thirst_factor);
  const amountMl = computeAmount(row.water_amount_per_cm, row.height_cm);
  const now = new Date();

  // If never watered, plant is immediately overdue
  let nextWaterDate;
  if (!row.last_watered_at) {
    nextWaterDate = new Date(row.created_at); // set to created_at so overdue_water = true
  } else {
    const lastWatered = new Date(row.last_watered_at);
    nextWaterDate = new Date(lastWatered);
    nextWaterDate.setDate(nextWaterDate.getDate() + interval);
  }

  let nextFertilizeDate = null;
  if (row.fertilize_every) {
    const lastFertilized = row.last_fertilized_at ? new Date(row.last_fertilized_at) : new Date(row.created_at);
    nextFertilizeDate = new Date(lastFertilized);
    nextFertilizeDate.setDate(nextFertilizeDate.getDate() + row.fertilize_every);
  }

  return {
    id: row.id,
    name: row.name,
    type_name: row.type_name,
    type_emoji: row.type_emoji,
    plant_type_id: row.plant_type_id,
    window_orientation: row.window_orientation,
    window_distance: row.window_distance,
    height_cm: row.height_cm,
    notes: row.notes,
    last_watered_at: row.last_watered_at,
    last_fertilized_at: row.last_fertilized_at,
    water_interval_days: interval,
    water_amount_ml: amountMl,
    next_water_date: nextWaterDate.toISOString(),
    next_fertilize_date: nextFertilizeDate ? nextFertilizeDate.toISOString() : null,
    overdue_water: nextWaterDate <= now,
    overdue_fertilize: nextFertilizeDate ? nextFertilizeDate <= now : false,
    created_at: row.created_at,
  };
}

const PLANT_JOIN = `
  SELECT p.*, pt.name AS type_name, pt.emoji AS type_emoji,
         pt.thirst_factor, pt.water_amount_per_cm, pt.fertilize_every
  FROM plants p
  JOIN plant_types pt ON p.plant_type_id = pt.id
`;

// Batch routes BEFORE /:id routes
router.post('/water-batch', async (req, res) => {
  const { plant_ids } = req.body;
  if (!Array.isArray(plant_ids) || plant_ids.length === 0) {
    return res.status(400).json({ error: 'plant_ids must be a non-empty array' });
  }
  try {
    await query('BEGIN');
    const now = new Date().toISOString();
    for (const id of plant_ids) {
      await query('UPDATE plants SET last_watered_at = $1 WHERE id = $2', [now, id]);
      await query("INSERT INTO care_logs (plant_id, type) VALUES ($1, 'water')", [id]);
    }
    await query('COMMIT');
    res.json({ updated: plant_ids.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

router.post('/fertilize-batch', async (req, res) => {
  const { plant_ids } = req.body;
  if (!Array.isArray(plant_ids) || plant_ids.length === 0) {
    return res.status(400).json({ error: 'plant_ids must be a non-empty array' });
  }
  try {
    await query('BEGIN');
    const now = new Date().toISOString();
    for (const id of plant_ids) {
      await query('UPDATE plants SET last_fertilized_at = $1 WHERE id = $2', [now, id]);
      await query("INSERT INTO care_logs (plant_id, type) VALUES ($1, 'fertilize')", [id]);
    }
    await query('COMMIT');
    res.json({ updated: plant_ids.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await query(PLANT_JOIN + ' ORDER BY p.created_at ASC');
    res.json(result.rows.map(enrichPlant));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, plant_type_id, window_orientation, window_distance, height_cm, notes } = req.body;
  if (!name || !plant_type_id || !window_orientation || !window_distance || !height_cm) {
    return res.status(400).json({ error: 'name, plant_type_id, window_orientation, window_distance, height_cm are required' });
  }
  try {
    const insert = await query(
      `INSERT INTO plants (name, plant_type_id, window_orientation, window_distance, height_cm, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, plant_type_id, window_orientation, window_distance, height_cm, notes || null]
    );
    const id = insert.rows[0].id;
    const result = await query(PLANT_JOIN + ' WHERE p.id = $1', [id]);
    res.status(201).json(enrichPlant(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const plantResult = await query(PLANT_JOIN + ' WHERE p.id = $1', [req.params.id]);
    if (plantResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const logsResult = await query(
      'SELECT * FROM care_logs WHERE plant_id = $1 ORDER BY logged_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ ...enrichPlant(plantResult.rows[0]), care_logs: logsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, plant_type_id, window_orientation, window_distance, height_cm, notes } = req.body;
  try {
    await query(
      `UPDATE plants SET
        name = COALESCE($1, name),
        plant_type_id = COALESCE($2, plant_type_id),
        window_orientation = COALESCE($3, window_orientation),
        window_distance = COALESCE($4, window_distance),
        height_cm = COALESCE($5, height_cm),
        notes = COALESCE($6, notes)
       WHERE id = $7`,
      [name, plant_type_id, window_orientation, window_distance, height_cm, notes, req.params.id]
    );
    const result = await query(PLANT_JOIN + ' WHERE p.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(enrichPlant(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM plants WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/water', async (req, res) => {
  try {
    const now = new Date().toISOString();
    await query('UPDATE plants SET last_watered_at = $1 WHERE id = $2', [now, req.params.id]);
    await query("INSERT INTO care_logs (plant_id, type) VALUES ($1, 'water')", [req.params.id]);
    res.json({ logged_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/fertilize', async (req, res) => {
  try {
    const now = new Date().toISOString();
    await query('UPDATE plants SET last_fertilized_at = $1 WHERE id = $2', [now, req.params.id]);
    await query("INSERT INTO care_logs (plant_id, type) VALUES ($1, 'fertilize')", [req.params.id]);
    res.json({ logged_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
