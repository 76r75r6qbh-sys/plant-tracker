const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:key', async (req, res) => {
  const { value } = req.body;
  if (value == null) return res.status(400).json({ error: 'value is required' });
  try {
    const result = await query(
      'UPDATE settings SET value = $1 WHERE key = $2 RETURNING *',
      [value, req.params.key]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Setting not found' });
    const { reschedule } = require('../lib/scheduler');
    if (req.params.key === 'notification_time') reschedule(value);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
