const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendPushToAll } = require('../lib/push');

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh, and keys.auth are required' });
  }
  try {
    await query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
      [endpoint, keys.p256dh, keys.auth]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  try {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    await sendPushToAll('🌿 Test Notification', 'Push notifications are working!');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
