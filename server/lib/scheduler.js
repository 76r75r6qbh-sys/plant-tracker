const cron = require('node-cron');
const { query } = require('../db');
const { sendPushToAll } = require('./push');
const { computeInterval } = require('./watering-formula');

let currentTask = null;

async function sendDailyNotification() {
  try {
    const result = await query(`
      SELECT p.name, pt.thirst_factor, pt.fertilize_every,
             p.window_orientation, p.window_distance,
             p.last_watered_at, p.last_fertilized_at, p.created_at
      FROM plants p
      JOIN plant_types pt ON p.plant_type_id = pt.id
    `);

    const now = new Date();
    const dueNames = [];

    for (const row of result.rows) {
      const interval = computeInterval(row.window_orientation, row.window_distance, row.thirst_factor);
      const lastWatered = row.last_watered_at ? new Date(row.last_watered_at) : new Date(row.created_at);
      const nextWater = new Date(lastWatered);
      nextWater.setDate(nextWater.getDate() + interval);

      if (nextWater <= now) {
        dueNames.push(row.name);
        continue;
      }

      if (row.fertilize_every) {
        const lastFertilized = row.last_fertilized_at ? new Date(row.last_fertilized_at) : new Date(row.created_at);
        const nextFertilize = new Date(lastFertilized);
        nextFertilize.setDate(nextFertilize.getDate() + row.fertilize_every);
        if (nextFertilize <= now && !dueNames.includes(row.name)) dueNames.push(row.name);
      }
    }

    if (dueNames.length === 0) return;

    const body = dueNames.length === 1
      ? `${dueNames[0]} needs attention today.`
      : `${dueNames.slice(0, -1).join(', ')} and ${dueNames[dueNames.length - 1]} need attention today.`;

    await sendPushToAll('🌿 Plant Care Reminder', body);
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

function reschedule(timeString) {
  const [hour, minute] = timeString.split(':');
  const cronExpr = `${minute} ${hour} * * *`;

  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  if (!cron.validate(cronExpr)) {
    console.error(`Invalid cron expression: ${cronExpr}`);
    return;
  }

  currentTask = cron.schedule(cronExpr, sendDailyNotification, { timezone: 'Europe/Amsterdam' });
  console.log(`Notification scheduled for ${timeString} Amsterdam time`);
}

async function initScheduler() {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'notification_time'");
    const time = result.rows[0]?.value || '08:00';
    reschedule(time);
  } catch (err) {
    console.error('Failed to init scheduler:', err.message);
    reschedule('08:00');
  }
}

module.exports = { initScheduler, reschedule, sendDailyNotification };
