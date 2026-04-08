require('dotenv').config();
const webpush = require('web-push');
const { query } = require('../db');

webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushToAll(title, body) {
  const result = await query('SELECT * FROM push_subscriptions');
  const payload = JSON.stringify({ title, body });
  const results = await Promise.allSettled(
    result.rows.map(async (sub) => {
      const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        if (err.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
        throw err;
      }
    })
  );
  return results;
}

module.exports = { sendPushToAll, webpush };
