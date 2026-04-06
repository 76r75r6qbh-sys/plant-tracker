require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./index');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await query(sql);
  }
  await pool.end();
  console.log('Migrations complete.');
}

migrate().catch(err => { console.error(err); process.exit(1); });
