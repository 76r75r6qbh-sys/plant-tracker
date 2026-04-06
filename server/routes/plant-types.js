const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM plant_types ORDER BY is_custom, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, emoji, thirst_factor, water_amount_per_cm, fertilize_every } = req.body;
  if (!name || thirst_factor == null || water_amount_per_cm == null) {
    return res.status(400).json({ error: 'name, thirst_factor, and water_amount_per_cm are required' });
  }
  try {
    const result = await query(
      `INSERT INTO plant_types (name, emoji, thirst_factor, water_amount_per_cm, fertilize_every, is_custom)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [name, emoji || '🪴', thirst_factor, water_amount_per_cm, fertilize_every || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
