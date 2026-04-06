# Plant Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA for tracking houseplant watering and fertilizing, with auto-computed schedules based on plant species, light conditions, and Dutch seasonal patterns.

**Architecture:** Express monolith serves both the REST API and the built React (Vite) app as static files. PostgreSQL stores plants, care logs, push subscriptions, and settings. A dynamic cron job inside Express fires grouped browser push notifications at a user-configurable time each day.

**Tech Stack:** Node.js 18+ (CommonJS), Express 4, PostgreSQL 15, `pg`, `node-cron`, `web-push` | React 18, Vite, React Router v6 | Jest + Supertest (backend), Vitest + React Testing Library (frontend)

---

## File Map

```
plant-tracker/
├── docker-compose.yml
├── package.json                          # root: scripts to run client + server together
├── .env.example
│
├── server/
│   ├── package.json
│   ├── jest.config.js
│   ├── index.js                          # Express app: mounts routes, serves client/dist
│   ├── db/
│   │   ├── index.js                      # pg Pool, query helper
│   │   ├── migrate.js                    # reads + runs SQL migration files in order
│   │   ├── seed.js                       # inserts 39 plant_types rows (idempotent)
│   │   └── migrations/
│   │       └── 001_initial.sql           # all 5 tables + default settings row
│   ├── lib/
│   │   ├── watering-formula.js           # computeInterval(), computeAmount()
│   │   ├── scheduler.js                  # dynamic node-cron job, reschedule on settings change
│   │   └── push.js                       # sendPushToAll(title, body) using web-push
│   ├── routes/
│   │   ├── plant-types.js               # GET /api/plant-types, POST /api/plant-types
│   │   ├── plants.js                    # CRUD + water/fertilize/batch endpoints
│   │   ├── push.js                      # subscribe/unsubscribe/test
│   │   └── settings.js                  # GET /api/settings, PUT /api/settings/:key
│   └── tests/
│       ├── watering-formula.test.js
│       ├── plant-types.test.js
│       ├── plants.test.js
│       └── push.test.js
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                       # BrowserRouter + routes
        ├── api/
        │   └── client.js                 # fetch wrapper: get/post/put/del helpers
        ├── components/
        │   ├── BottomNav.jsx
        │   └── TaskCard.jsx
        ├── pages/
        │   ├── Home.jsx                  # task list + water-all/fertilize-all buttons
        │   ├── Plants.jsx                # full plant list (all plants, not just due)
        │   ├── AddPlant.jsx              # 2-step form
        │   ├── PlantDetail.jsx           # detail + care history + edit/delete
        │   └── Settings.jsx             # push toggle + time picker
        ├── public/
        │   └── sw.js                    # service worker: push event → showNotification
        └── tests/
            ├── Home.test.jsx
            └── AddPlant.test.jsx
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `package.json`
- Create: `.env.example`
- Create: `server/package.json`
- Create: `client/package.json`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: '3.9'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: planttracker
      POSTGRES_USER: planttracker
      POSTGRES_PASSWORD: planttracker
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgres://planttracker:planttracker@db:5432/planttracker
      PORT: 3000
    depends_on:
      - db
volumes:
  pgdata:
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "plant-tracker",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "build": "npm run build --prefix client",
    "start": "npm start --prefix server",
    "migrate": "npm run migrate --prefix server",
    "seed": "npm run seed --prefix server",
    "test": "npm test --prefix server && npm test --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker
PORT=3000
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=mailto:you@example.com
```

- [ ] **Step 4: Create `server/package.json`**

```json
{
  "name": "plant-tracker-server",
  "private": true,
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js",
    "migrate": "node db/migrate.js",
    "seed": "node db/seed.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "node-cron": "^3.0.3",
    "web-push": "^3.6.7",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

- [ ] **Step 5: Create `client/package.json`**

```json
{
  "name": "plant-tracker-client",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0",
    "vitest": "^1.3.0",
    "@testing-library/react": "^14.2.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
npm install --prefix server
npm install --prefix client
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml package.json .env.example server/package.json client/package.json
git commit -m "feat: project scaffolding"
```

---

## Task 2: Database Connection

**Files:**
- Create: `server/db/index.js`

- [ ] **Step 1: Write the test**

Create `server/tests/db.test.js`:

```javascript
const { query } = require('../db');

test('database connection works', async () => {
  const result = await query('SELECT 1 + 1 AS sum');
  expect(result.rows[0].sum).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest tests/db.test.js --runInBand
```

Expected: FAIL — `Cannot find module '../db'`

- [ ] **Step 3: Create `server/db/index.js`**

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
```

- [ ] **Step 4: Create `server/jest.config.js`**

```javascript
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
};
```

- [ ] **Step 5: Start the database**

```bash
docker-compose up -d db
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/db.test.js --runInBand
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/db/index.js server/jest.config.js server/tests/db.test.js
git commit -m "feat: database connection with pg Pool"
```

---

## Task 3: Database Schema

**Files:**
- Create: `server/db/migrations/001_initial.sql`
- Create: `server/db/migrate.js`

- [ ] **Step 1: Create `server/db/migrations/001_initial.sql`**

```sql
CREATE TABLE IF NOT EXISTS plant_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '🪴',
  thirst_factor NUMERIC NOT NULL,
  water_amount_per_cm NUMERIC NOT NULL,
  fertilize_every INTEGER,
  is_custom BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS plants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plant_type_id INTEGER REFERENCES plant_types(id),
  window_orientation TEXT NOT NULL CHECK (window_orientation IN ('N','NE','E','SE','S','SW','W','NW')),
  window_distance TEXT NOT NULL CHECK (window_distance IN ('close','medium','far','very_far')),
  height_cm INTEGER NOT NULL,
  last_watered_at TIMESTAMPTZ,
  last_fertilized_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_logs (
  id SERIAL PRIMARY KEY,
  plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('water','fertilize')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('notification_time', '08:00')
  ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Create `server/db/migrate.js`**

```javascript
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
```

- [ ] **Step 3: Run migration**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker node db/migrate.js
```

Expected:
```
Running migration: 001_initial.sql
Migrations complete.
```

- [ ] **Step 4: Verify tables exist**

```bash
docker exec -it plant-tracker-db-1 psql -U planttracker -d planttracker -c '\dt'
```

Expected: List shows `plant_types`, `plants`, `care_logs`, `push_subscriptions`, `settings`.

- [ ] **Step 5: Commit**

```bash
git add server/db/migrations/ server/db/migrate.js
git commit -m "feat: database schema migration"
```

---

## Task 4: Plant Types Seed Data

**Files:**
- Create: `server/db/seed.js`

- [ ] **Step 1: Create `server/db/seed.js`**

```javascript
require('dotenv').config();
const { query, pool } = require('./index');

const PLANT_TYPES = [
  // Palms
  { name: 'Areca Palm',   emoji: '🌴', thirst: 0.80, mlPerCm: 12, fertilize: 21 },
  { name: 'Kentia Palm',  emoji: '🌿', thirst: 1.00, mlPerCm: 10, fertilize: 28 },
  { name: 'Parlour Palm', emoji: '🌴', thirst: 0.90, mlPerCm: 10, fertilize: 28 },
  { name: 'Phoenix Palm', emoji: '🌴', thirst: 0.80, mlPerCm: 11, fertilize: 21 },
  { name: 'Lady Palm',    emoji: '🌴', thirst: 0.90, mlPerCm:  9, fertilize: 28 },
  { name: 'Bamboo Palm',  emoji: '🌴', thirst: 0.85, mlPerCm: 11, fertilize: 21 },
  // Tropical & Statement
  { name: 'Strelitzia (Bird of Paradise)',       emoji: '🌺', thirst: 0.85, mlPerCm: 13, fertilize: 14 },
  { name: 'Monstera Deliciosa',                  emoji: '🌿', thirst: 0.90, mlPerCm: 10, fertilize: 28 },
  { name: 'Monkey Mask (Monstera Adansonii)',    emoji: '🐒', thirst: 0.90, mlPerCm:  9, fertilize: 28 },
  { name: 'Ficus Lyrata (Fiddle Leaf Fig)',      emoji: '🌳', thirst: 0.85, mlPerCm: 11, fertilize: 21 },
  { name: 'Ficus Benjamina',                     emoji: '🌳', thirst: 0.90, mlPerCm:  9, fertilize: 21 },
  { name: 'Anthurium',                           emoji: '🌸', thirst: 0.85, mlPerCm: 10, fertilize: 14 },
  { name: 'Calathea',                            emoji: '🌾', thirst: 0.70, mlPerCm: 11, fertilize: 21 },
  { name: 'Peace Lily',                          emoji: '🌸', thirst: 0.70, mlPerCm: 12, fertilize: 28 },
  { name: 'Philodendron',                        emoji: '🍃', thirst: 0.90, mlPerCm:  9, fertilize: 28 },
  { name: 'Orchid',                              emoji: '🌺', thirst: 1.10, mlPerCm:  6, fertilize: 14 },
  // Easy & Low-Maintenance
  { name: 'Pothos',                          emoji: '🪴', thirst: 0.90, mlPerCm: 8, fertilize: 28 },
  { name: 'Spider Plant',                    emoji: '🪴', thirst: 1.00, mlPerCm: 7, fertilize: 28 },
  { name: 'Snake Plant (Sansevieria)',       emoji: '🌱', thirst: 1.60, mlPerCm: 5, fertilize: 42 },
  { name: 'ZZ Plant',                        emoji: '🌿', thirst: 1.70, mlPerCm: 5, fertilize: 42 },
  { name: 'Rubber Plant (Ficus Elastica)',   emoji: '🌳', thirst: 1.00, mlPerCm: 9, fertilize: 28 },
  { name: 'Dracaena',                        emoji: '🌿', thirst: 1.20, mlPerCm: 7, fertilize: 35 },
  { name: 'Chinese Evergreen (Aglaonema)',   emoji: '🌿', thirst: 1.10, mlPerCm: 8, fertilize: 28 },
  { name: 'Cast Iron Plant',                 emoji: '🌱', thirst: 1.50, mlPerCm: 6, fertilize: 42 },
  { name: 'Yucca',                           emoji: '🌿', thirst: 1.60, mlPerCm: 6, fertilize: 42 },
  // Cacti & Succulents
  { name: 'Cactus (globular)',   emoji: '🌵', thirst: 2.00, mlPerCm: 3, fertilize: 60  },
  { name: 'Column Cactus',       emoji: '🌵', thirst: 2.00, mlPerCm: 3, fertilize: 60  },
  { name: 'Barrel Cactus',       emoji: '🌵', thirst: 2.20, mlPerCm: 2, fertilize: 90  },
  { name: 'Opuntia',             emoji: '🌵', thirst: 2.10, mlPerCm: 3, fertilize: 60  },
  { name: 'Christmas Cactus',    emoji: '🌸', thirst: 1.10, mlPerCm: 6, fertilize: 28  },
  { name: 'Succulent (mixed)',   emoji: '🪨', thirst: 1.80, mlPerCm: 4, fertilize: 60  },
  { name: 'Aloe Vera',           emoji: '🌵', thirst: 1.70, mlPerCm: 4, fertilize: 60  },
  { name: 'Haworthia',           emoji: '🌿', thirst: 1.60, mlPerCm: 4, fertilize: 60  },
  // Other
  { name: 'Olive Tree',        emoji: '🌳', thirst: 1.30, mlPerCm:  7, fertilize: 28 },
  { name: 'Boston Fern',       emoji: '🌿', thirst: 0.70, mlPerCm: 12, fertilize: 21 },
  { name: 'Croton',            emoji: '🍀', thirst: 0.80, mlPerCm: 10, fertilize: 21 },
  { name: 'Begonia',           emoji: '🌸', thirst: 0.80, mlPerCm:  9, fertilize: 14 },
  { name: 'Begonia Maculata',  emoji: '🌸', thirst: 0.80, mlPerCm: 10, fertilize: 14 },
  { name: 'Dieffenbachia',     emoji: '🌿', thirst: 0.90, mlPerCm:  9, fertilize: 21 },
];

async function seed() {
  for (const t of PLANT_TYPES) {
    await query(
      `INSERT INTO plant_types (name, emoji, thirst_factor, water_amount_per_cm, fertilize_every)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [t.name, t.emoji, t.thirst, t.mlPerCm, t.fertilize]
    );
  }
  await pool.end();
  console.log(`Seeded ${PLANT_TYPES.length} plant types.`);
}

seed().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run seed**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker node db/seed.js
```

Expected: `Seeded 39 plant types.`

- [ ] **Step 3: Verify**

```bash
docker exec -it plant-tracker-db-1 psql -U planttracker -d planttracker -c 'SELECT COUNT(*) FROM plant_types;'
```

Expected: `count = 39`

- [ ] **Step 4: Commit**

```bash
git add server/db/seed.js server/db/migrations/
git commit -m "feat: seed 39 plant types"
```

---

## Task 5: Watering Formula (TDD)

**Files:**
- Create: `server/lib/watering-formula.js`
- Create: `server/tests/watering-formula.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/tests/watering-formula.test.js`:

```javascript
const { computeInterval, computeAmount } = require('../lib/watering-formula');

describe('computeInterval', () => {
  test('south window, close, July → 4 days', () => {
    const july = new Date('2025-07-15');
    expect(computeInterval('S', 'close', 0.80, july)).toBe(3); // 5 * 0.85 * 1.0 * 0.80 = 3.4 → 3
  });

  test('south window, close, January → 11 days', () => {
    const jan = new Date('2025-01-15');
    expect(computeInterval('S', 'close', 1.00, jan)).toBe(11); // 5 * 2.2 * 1.0 * 1.0 = 11
  });

  test('east window, medium, April → 11 days', () => {
    const apr = new Date('2025-04-15');
    expect(computeInterval('E', 'medium', 1.00, apr)).toBe(11); // 7 * 1.2 * 1.3 * 1.0 = 10.92 → 11
  });

  test('north window, very_far, January with cactus → capped at 30', () => {
    const jan = new Date('2025-01-15');
    expect(computeInterval('N', 'very_far', 2.00, jan)).toBe(30); // 11 * 2.2 * 2.2 * 2.0 = 106 → capped
  });

  test('minimum is 2 days', () => {
    const jul = new Date('2025-07-15');
    expect(computeInterval('S', 'close', 0.10, jul)).toBe(2); // very thirsty → rounds below 2 → clamped
  });

  test('defaults date to today', () => {
    const result = computeInterval('S', 'close', 1.00);
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(30);
  });
});

describe('computeAmount', () => {
  test('areca palm 80cm → 960ml', () => {
    expect(computeAmount(12, 80)).toBe(960);
  });

  test('cactus 20cm → 60ml', () => {
    expect(computeAmount(3, 20)).toBe(60);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx jest tests/watering-formula.test.js
```

Expected: FAIL — `Cannot find module '../lib/watering-formula'`

- [ ] **Step 3: Create `server/lib/watering-formula.js`**

```javascript
const BASE_INTERVALS = { S: 5, SE: 6, SW: 6, E: 7, W: 7, NE: 9, NW: 9, N: 11 };

const SEASON_MULTIPLIERS = {
  1: 2.2, 2: 2.0, 3: 1.5, 4: 1.2,  5: 1.0,  6: 0.9,
  7: 0.85, 8: 0.9, 9: 1.1, 10: 1.4, 11: 1.8, 12: 2.3,
};

const DISTANCE_MULTIPLIERS = { close: 1.0, medium: 1.3, far: 1.7, very_far: 2.2 };

function computeInterval(orientation, distance, thirstFactor, date = new Date()) {
  const month = date.getMonth() + 1;
  const raw = Math.round(
    BASE_INTERVALS[orientation] *
    SEASON_MULTIPLIERS[month] *
    DISTANCE_MULTIPLIERS[distance] *
    Number(thirstFactor)
  );
  return Math.min(Math.max(raw, 2), 30);
}

function computeAmount(waterAmountPerCm, heightCm) {
  return Math.round(Number(waterAmountPerCm) * heightCm);
}

module.exports = { computeInterval, computeAmount, BASE_INTERVALS, SEASON_MULTIPLIERS, DISTANCE_MULTIPLIERS };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/watering-formula.test.js
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/watering-formula.js server/tests/watering-formula.test.js
git commit -m "feat: watering interval and amount formula (TDD)"
```

---

## Task 6: Express App Entry Point

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Create `server/index.js`**

```javascript
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

// Routes (batch routes declared before /:id routes)
app.use('/api/plant-types', require('./routes/plant-types'));
app.use('/api/plants',      require('./routes/plants'));
app.use('/api/push',        require('./routes/push'));
app.use('/api/settings',    require('./routes/settings'));

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
```

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: Express app entry point"
```

---

## Task 7: Plant Types API

**Files:**
- Create: `server/routes/plant-types.js`
- Create: `server/tests/plant-types.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/tests/plant-types.test.js`:

```javascript
const request = require('supertest');
const app = require('../index');
const { query } = require('../db');

afterAll(async () => {
  const { pool } = require('../db');
  await pool.end();
});

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
      thirst_factor: expect.anything(),
      water_amount_per_cm: expect.anything(),
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/plant-types.test.js
```

Expected: FAIL — routes not found yet

- [ ] **Step 3: Create `server/routes/plant-types.js`**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/plant-types.test.js
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/plant-types.js server/tests/plant-types.test.js
git commit -m "feat: plant types CRUD API (TDD)"
```

---

## Task 8: Plants CRUD API

**Files:**
- Create: `server/routes/plants.js`
- Create: `server/tests/plants.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/tests/plants.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/plants.test.js
```

Expected: FAIL

- [ ] **Step 3: Create `server/routes/plants.js`**

```javascript
const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { computeInterval, computeAmount } = require('../lib/watering-formula');

// Helper: enrich a raw DB row with computed fields
function enrichPlant(row) {
  const interval = computeInterval(row.window_orientation, row.window_distance, row.thirst_factor);
  const amountMl = computeAmount(row.water_amount_per_cm, row.height_cm);
  const now = new Date();

  const lastWatered = row.last_watered_at ? new Date(row.last_watered_at) : new Date(row.created_at);
  const nextWaterDate = new Date(lastWatered);
  nextWaterDate.setDate(nextWaterDate.getDate() + interval);

  let nextFertilizeDate = null;
  let overdueWater = false;
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

// IMPORTANT: batch routes declared before /:id routes
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/plants.test.js
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/plants.js server/tests/plants.test.js
git commit -m "feat: plants CRUD and care actions API (TDD)"
```

---

## Task 9: Settings API

**Files:**
- Create: `server/routes/settings.js`

- [ ] **Step 1: Create scheduler stub** (full implementation in Task 10)

Create `server/lib/scheduler.js`:

```javascript
function reschedule(timeString) {
  // stub — implemented in Task 10
  console.log(`Scheduler stub: would reschedule to ${timeString}`);
}

async function initScheduler() {}

module.exports = { initScheduler, reschedule };
```

- [ ] **Step 2: Write the failing tests**

Add to `server/tests/plants.test.js` or create `server/tests/settings.test.js`:

```javascript
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
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/settings.test.js
```

Expected: FAIL

- [ ] **Step 4: Create `server/routes/settings.js`**

```javascript
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
    // Notify scheduler of change
    const { reschedule } = require('../lib/scheduler');
    if (req.params.key === 'notification_time') reschedule(value);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest tests/settings.test.js
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add server/routes/settings.js server/tests/settings.test.js server/lib/scheduler.js
git commit -m "feat: settings API with scheduler stub"
```

---

## Task 10: Push Notifications + Dynamic Scheduler

**Files:**
- Create: `server/lib/push.js`
- Create: `server/lib/scheduler.js`
- Create: `server/routes/push.js`
- Create: `server/tests/push.test.js`

- [ ] **Step 1: Generate VAPID keys**

```bash
cd server && node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2));"
```

Copy the output. Add to your `.env` file:
```
VAPID_PUBLIC_KEY=<paste publicKey>
VAPID_PRIVATE_KEY=<paste privateKey>
VAPID_MAILTO=mailto:you@example.com
```

- [ ] **Step 2: Create `server/lib/push.js`**

```javascript
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
  const subscriptions = result.rows;
  const payload = JSON.stringify({ title, body });
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
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
```

- [ ] **Step 3: Create `server/lib/scheduler.js`**

```javascript
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
  // timeString format: 'HH:MM'
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
```

- [ ] **Step 4: Call `initScheduler` from `server/index.js`**

Add after the routes section in `server/index.js`:

```javascript
// Start notification scheduler
const { initScheduler } = require('./lib/scheduler');
initScheduler();
```

- [ ] **Step 5: Create `server/routes/push.js`**

```javascript
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
```

- [ ] **Step 6: Write push API tests**

Create `server/tests/push.test.js`:

```javascript
const request = require('supertest');
const app = require('../index');
const { query, pool } = require('../db');

afterAll(async () => {
  await query("DELETE FROM push_subscriptions WHERE endpoint LIKE 'https://test%'");
  await pool.end();
});

const testSub = {
  endpoint: 'https://test.pushservice.com/test-endpoint',
  keys: { p256dh: 'dGVzdHB1YmxpY2tleQ==', auth: 'dGVzdGF1dGg=' },
};

describe('POST /api/push/subscribe', () => {
  test('saves a subscription', async () => {
    const res = await request(app).post('/api/push/subscribe').send(testSub);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/push/subscribe').send({ endpoint: 'https://test.com' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/push/subscribe', () => {
  test('removes a subscription', async () => {
    await request(app).post('/api/push/subscribe').send(testSub);
    const res = await request(app).delete('/api/push/subscribe').send({ endpoint: testSub.endpoint });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/push/vapid-public-key', () => {
  test('returns VAPID public key', async () => {
    const res = await request(app).get('/api/push/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.key).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run all server tests**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest --runInBand
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add server/lib/ server/routes/push.js server/tests/push.test.js server/index.js
git commit -m "feat: push notifications, VAPID, dynamic scheduler"
```

---

## Task 11: React + Vite Client Setup

**Files:**
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`

- [ ] **Step 1: Create `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#2e7d32" />
    <link rel="manifest" href="/manifest.json" />
    <title>PlantCare</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; background: #f9fbe7; color: #212121; }
      #root { max-width: 480px; margin: 0 auto; min-height: 100vh; position: relative; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `client/vite.config.js`**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
});
```

- [ ] **Step 3: Create `client/src/tests/setup.js`**

```javascript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Create `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

- [ ] **Step 5: Create `client/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Plants from './pages/Plants';
import AddPlant from './pages/AddPlant';
import PlantDetail from './pages/PlantDetail';
import Settings from './pages/Settings';

const pageStyle = {
  padding: '16px 16px 80px',
  minHeight: '100vh',
};

export default function App() {
  return (
    <BrowserRouter>
      <div style={pageStyle}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/add" element={<AddPlant />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Create `client/public/manifest.json`**

```json
{
  "name": "PlantCare",
  "short_name": "PlantCare",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fbe7",
  "theme_color": "#2e7d32",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 7: Create placeholder icons**

```bash
# Create minimal valid 1x1 PNG files as placeholders (replace with real icons later)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > client/public/icon-192.png
cp client/public/icon-192.png client/public/icon-512.png
```

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: React + Vite client scaffold"
```

---

## Task 12: API Client

**Files:**
- Create: `client/src/api/client.js`

- [ ] **Step 1: Create `client/src/api/client.js`**

```javascript
const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getPlants:          ()           => request('GET',    '/plants'),
  getPlant:           (id)         => request('GET',    `/plants/${id}`),
  createPlant:        (body)       => request('POST',   '/plants', body),
  updatePlant:        (id, body)   => request('PUT',    `/plants/${id}`, body),
  deletePlant:        (id)         => request('DELETE', `/plants/${id}`),
  waterPlant:         (id)         => request('POST',   `/plants/${id}/water`),
  fertilizePlant:     (id)         => request('POST',   `/plants/${id}/fertilize`),
  waterBatch:         (ids)        => request('POST',   '/plants/water-batch',       { plant_ids: ids }),
  fertilizeBatch:     (ids)        => request('POST',   '/plants/fertilize-batch',   { plant_ids: ids }),

  getPlantTypes:      ()           => request('GET',    '/plant-types'),
  createPlantType:    (body)       => request('POST',   '/plant-types', body),

  getSettings:        ()           => request('GET',    '/settings'),
  updateSetting:      (key, value) => request('PUT',    `/settings/${key}`, { value }),

  getVapidKey:        ()           => request('GET',    '/push/vapid-public-key'),
  subscribe:          (sub)        => request('POST',   '/push/subscribe',  sub),
  unsubscribe:        (endpoint)   => request('DELETE', '/push/subscribe',  { endpoint }),
  testPush:           ()           => request('POST',   '/push/test'),
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/
git commit -m "feat: API client fetch wrapper"
```

---

## Task 13: BottomNav + TaskCard Components

**Files:**
- Create: `client/src/components/BottomNav.jsx`
- Create: `client/src/components/TaskCard.jsx`

- [ ] **Step 1: Create `client/src/components/BottomNav.jsx`**

```jsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/home',     label: 'Today',    icon: '🏠' },
  { to: '/plants',   label: 'Plants',   icon: '🌿' },
  { to: '/plants/add', label: 'Add',    icon: '➕' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const navStyle = {
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 480, background: 'white',
  borderTop: '1px solid #e0e0e0', display: 'flex',
  boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
};

const tabStyle = (isActive) => ({
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '10px 0 6px', textDecoration: 'none',
  color: isActive ? '#2e7d32' : '#888', fontSize: 11, fontWeight: isActive ? 600 : 400,
});

export default function BottomNav() {
  return (
    <nav style={navStyle}>
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} style={({ isActive }) => tabStyle(isActive)}>
          <span style={{ fontSize: 22 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create `client/src/components/TaskCard.jsx`**

```jsx
const urgencyColor = (plant) => {
  if (plant.overdue_water || plant.overdue_fertilize) return '#fff3e0';
  return '#f5f5f5';
};

export default function TaskCard({ plant, onWater, onFertilize }) {
  const needsWater = plant.overdue_water;
  const needsFertilize = plant.overdue_fertilize;

  return (
    <div style={{
      background: urgencyColor(plant), borderRadius: 10, padding: '12px 14px',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 28 }}>{plant.type_emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{plant.name}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          {needsWater && <span>💧 Water now · {plant.water_amount_ml}ml</span>}
          {needsWater && needsFertilize && <span> · </span>}
          {needsFertilize && <span>🌿 Fertilize now</span>}
          {!needsWater && !needsFertilize && (
            <span style={{ color: '#aaa' }}>
              💧 Next in {daysUntil(plant.next_water_date)}d
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {needsWater && (
          <button onClick={() => onWater(plant.id)} style={btnStyle('#2e7d32')}>Water</button>
        )}
        {needsFertilize && (
          <button onClick={() => onFertilize(plant.id)} style={btnStyle('#e65100')}>Feed</button>
        )}
      </div>
    </div>
  );
}

function daysUntil(isoDate) {
  const diff = new Date(isoDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function btnStyle(bg) {
  return {
    background: bg, color: 'white', border: 'none', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/
git commit -m "feat: BottomNav and TaskCard components"
```

---

## Task 14: Home Page

**Files:**
- Create: `client/src/pages/Home.jsx`
- Create: `client/src/tests/Home.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/tests/Home.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { api } from '../api/client';
import { vi } from 'vitest';

vi.mock('../api/client');

const makePlant = (overrides = {}) => ({
  id: 1, name: 'Test Pothos', type_emoji: '🪴', type_name: 'Pothos',
  water_amount_ml: 320, overdue_water: true, overdue_fertilize: false,
  next_water_date: new Date().toISOString(),
  next_fertilize_date: null,
  ...overrides,
});

test('shows "Nothing due today" when no plants are overdue', async () => {
  api.getPlants.mockResolvedValue([makePlant({ overdue_water: false })]);
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/nothing due today/i)).toBeInTheDocument());
});

test('shows due plants and Water All button when 2+ plants need watering', async () => {
  api.getPlants.mockResolvedValue([
    makePlant({ id: 1, name: 'Pothos' }),
    makePlant({ id: 2, name: 'Monstera' }),
  ]);
  api.waterBatch.mockResolvedValue({ updated: 2 });
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/water all/i)).toBeInTheDocument());
});

test('does not show Water All button when only 1 plant needs watering', async () => {
  api.getPlants.mockResolvedValue([makePlant({ id: 1, name: 'Pothos' })]);
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText(/water all/i)).not.toBeInTheDocument());
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/tests/Home.test.jsx
```

Expected: FAIL — `Cannot find module '../pages/Home'`

- [ ] **Step 3: Create `client/src/pages/Home.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import TaskCard from '../components/TaskCard';

const headerStyle = { fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 4 };
const subtitleStyle = { fontSize: 13, color: '#888', marginBottom: 16 };
const batchBtnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8,
  padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  marginBottom: 8, width: '100%',
});
const emptyStyle = {
  textAlign: 'center', color: '#aaa', marginTop: 48, fontSize: 15,
};

export default function Home() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlants(await api.getPlants()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dueWater     = plants.filter(p => p.overdue_water);
  const dueFertilize = plants.filter(p => p.overdue_fertilize);
  const allDue       = plants.filter(p => p.overdue_water || p.overdue_fertilize);

  const handleWater     = async (id) => { await api.waterPlant(id);     load(); };
  const handleFertilize = async (id) => { await api.fertilizePlant(id); load(); };
  const handleWaterAll  = async ()   => { await api.waterBatch(dueWater.map(p => p.id));         load(); };
  const handleFeedAll   = async ()   => { await api.fertilizeBatch(dueFertilize.map(p => p.id)); load(); };

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;

  return (
    <div>
      <h1 style={headerStyle}>🌿 Today</h1>
      <p style={subtitleStyle}>{new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {dueWater.length >= 2 && (
        <button style={batchBtnStyle('#2e7d32')} onClick={handleWaterAll}>
          💧 Water all ({dueWater.length})
        </button>
      )}
      {dueFertilize.length >= 2 && (
        <button style={batchBtnStyle('#e65100')} onClick={handleFeedAll}>
          🌿 Feed all ({dueFertilize.length})
        </button>
      )}

      {allDue.length === 0 ? (
        <p style={emptyStyle}>✅ Nothing due today</p>
      ) : (
        allDue.map(plant => (
          <TaskCard key={plant.id} plant={plant} onWater={handleWater} onFertilize={handleFertilize} />
        ))
      )}

      {plants.filter(p => !p.overdue_water && !p.overdue_fertilize).length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: '#aaa', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Upcoming</h2>
          {plants.filter(p => !p.overdue_water && !p.overdue_fertilize).map(plant => (
            <TaskCard key={plant.id} plant={plant} onWater={handleWater} onFertilize={handleFertilize} />
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd client && npx vitest run src/tests/Home.test.jsx
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Home.jsx client/src/tests/Home.test.jsx
git commit -m "feat: Home page with task list and batch water/feed (TDD)"
```

---

## Task 15: Plants List Page

**Files:**
- Create: `client/src/pages/Plants.jsx`

- [ ] **Step 1: Create `client/src/pages/Plants.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlants().then(setPlants).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 16 }}>🪴 My Plants</h1>
      {plants.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>
          No plants yet. <Link to="/plants/add" style={{ color: '#2e7d32' }}>Add one!</Link>
        </p>
      )}
      {plants.map(plant => (
        <Link key={plant.id} to={`/plants/${plant.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'white', borderRadius: 10, padding: '12px 14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            <span style={{ fontSize: 28 }}>{plant.type_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#212121' }}>{plant.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                💧 Every {plant.water_interval_days}d · {plant.water_amount_ml}ml
              </div>
            </div>
            {(plant.overdue_water || plant.overdue_fertilize) && (
              <span style={{ background: '#e65100', color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>Due</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Plants.jsx
git commit -m "feat: Plants list page"
```

---

## Task 16: Add Plant Page (2-step form)

**Files:**
- Create: `client/src/pages/AddPlant.jsx`
- Create: `client/src/tests/AddPlant.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/tests/AddPlant.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddPlant from '../pages/AddPlant';
import { api } from '../api/client';
import { vi } from 'vitest';

vi.mock('../api/client');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockTypes = [
  { id: 1, name: 'Pothos', emoji: '🪴', thirst_factor: 0.9, water_amount_per_cm: 8, fertilize_every: 28 },
  { id: 2, name: 'Cactus (globular)', emoji: '🌵', thirst_factor: 2.0, water_amount_per_cm: 3, fertilize_every: 60 },
];

test('step 1 shows plant type list', async () => {
  api.getPlantTypes.mockResolvedValue(mockTypes);
  render(<MemoryRouter><AddPlant /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Pothos')).toBeInTheDocument());
  expect(screen.getByText('Cactus (globular)')).toBeInTheDocument();
});

test('selecting a plant type advances to step 2', async () => {
  api.getPlantTypes.mockResolvedValue(mockTypes);
  render(<MemoryRouter><AddPlant /></MemoryRouter>);
  await waitFor(() => screen.getByText('Pothos'));
  fireEvent.click(screen.getByText('Pothos'));
  expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
});

test('step 2 shows computed interval preview', async () => {
  api.getPlantTypes.mockResolvedValue(mockTypes);
  render(<MemoryRouter><AddPlant /></MemoryRouter>);
  await waitFor(() => screen.getByText('Pothos'));
  fireEvent.click(screen.getByText('Pothos'));

  await userEvent.type(screen.getByLabelText(/height/i), '40');
  fireEvent.click(screen.getByText('E'));
  fireEvent.click(screen.getByText('<50 cm'));

  await waitFor(() => expect(screen.getByText(/water every/i)).toBeInTheDocument());
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/tests/AddPlant.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create `client/src/pages/AddPlant.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const ORIENTATIONS = ['N','NE','E','SE','S','SW','W','NW'];
const DISTANCES = [
  { key: 'close',    label: '<50 cm' },
  { key: 'medium',   label: '50–150 cm' },
  { key: 'far',      label: '150–300 cm' },
  { key: 'very_far', label: '>300 cm' },
];

const BASE = { S:5, SE:6, SW:6, E:7, W:7, NE:9, NW:9, N:11 };
const SEASON = { 1:2.2,2:2.0,3:1.5,4:1.2,5:1.0,6:0.9,7:0.85,8:0.9,9:1.1,10:1.4,11:1.8,12:2.3 };
const DIST   = { close:1.0, medium:1.3, far:1.7, very_far:2.2 };

function previewInterval(orientation, distance, thirstFactor) {
  if (!orientation || !distance || !thirstFactor) return null;
  const month = new Date().getMonth() + 1;
  const raw = Math.round(BASE[orientation] * SEASON[month] * DIST[distance] * Number(thirstFactor));
  return Math.min(Math.max(raw, 2), 30);
}

export default function AddPlant() {
  const navigate = useNavigate();
  const [plantTypes, setPlantTypes] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', height_cm: '', window_orientation: '', window_distance: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getPlantTypes().then(setPlantTypes); }, []);

  const filtered = plantTypes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const interval = previewInterval(form.window_orientation, form.window_distance, selectedType?.thirst_factor);
  const amount   = selectedType && form.height_cm ? Math.round(selectedType.water_amount_per_cm * Number(form.height_cm)) : null;

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.height_cm || !form.window_orientation || !form.window_distance) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      await api.createPlant({
        name: form.name,
        plant_type_id: selectedType.id,
        window_orientation: form.window_orientation,
        window_distance: form.window_distance,
        height_cm: Number(form.height_cm),
        notes: form.notes || null,
      });
      navigate('/plants');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, marginTop: 4 };
  const labelStyle = { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };
  const chipStyle  = (active) => ({
    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
    background: active ? '#2e7d32' : '#f5f5f5', color: active ? 'white' : '#333',
  });

  if (step === 1) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32', marginBottom: 12 }}>Choose Plant Type</h1>
        <input
          placeholder="🔍 Search plants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        {filtered.map(type => (
          <div key={type.id} onClick={() => { setSelectedType(type); setStep(2); }}
            style={{ background: 'white', borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: 24 }}>{type.emoji}</span>
            <span style={{ fontWeight: 500 }}>{type.name}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
        ← Back
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32', marginBottom: 4 }}>
        {selectedType.emoji} {selectedType.name}
      </h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Fill in your plant's details</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="nickname">Nickname *</label>
          <input id="nickname" aria-label="nickname" value={form.name} onChange={set('name')} style={inputStyle} placeholder="e.g. Living room Pothos" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="height">Height (cm) *</label>
          <input id="height" aria-label="height" type="number" min="1" value={form.height_cm} onChange={set('height_cm')} style={inputStyle} placeholder="e.g. 45" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={labelStyle}>Window orientation *</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {ORIENTATIONS.map(o => (
              <button type="button" key={o} onClick={() => setForm(f => ({ ...f, window_orientation: o }))} style={chipStyle(form.window_orientation === o)}>{o}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={labelStyle}>Distance to window *</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {DISTANCES.map(d => (
              <button type="button" key={d.key} onClick={() => setForm(f => ({ ...f, window_distance: d.key }))} style={chipStyle(form.window_distance === d.key)}>{d.label}</button>
            ))}
          </div>
        </div>

        {interval && amount && (
          <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2e7d32' }}>
            💧 Water every <strong>{interval} days</strong> · <strong>{amount} ml</strong>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="notes">Notes (optional)</label>
          <input id="notes" value={form.notes} onChange={set('notes')} style={inputStyle} placeholder="Any special care notes" />
        </div>

        {error && <p style={{ color: '#c62828', marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={saving} style={{ ...chipStyle(true), width: '100%', padding: '14px', fontSize: 16 }}>
          {saving ? 'Adding...' : 'Add Plant'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd client && npx vitest run src/tests/AddPlant.test.jsx
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AddPlant.jsx client/src/tests/AddPlant.test.jsx
git commit -m "feat: Add Plant 2-step form with live schedule preview (TDD)"
```

---

## Task 17: Plant Detail Page

**Files:**
- Create: `client/src/pages/PlantDetail.jsx`

- [ ] **Step 1: Create `client/src/pages/PlantDetail.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const labelStyle = { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 };
const valueStyle = { fontSize: 15, color: '#212121', marginTop: 2, marginBottom: 12 };
const btnStyle   = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 8,
});

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.getPlant(id).then(setPlant).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleWater     = async () => { await api.waterPlant(id);     load(); };
  const handleFertilize = async () => { await api.fertilizePlant(id); load(); };
  const handleDelete    = async () => {
    if (!confirm(`Delete ${plant.name}?`)) return;
    await api.deletePlant(id);
    navigate('/plants');
  };

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;
  if (!plant)  return <p style={{ color: '#c62828', marginTop: 32 }}>Plant not found.</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 40 }}>{plant.type_emoji}</span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32' }}>{plant.name}</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{plant.type_name}</p>
        </div>
      </div>

      {plant.overdue_water && <button style={btnStyle('#2e7d32')} onClick={handleWater}>💧 Water now ({plant.water_amount_ml} ml)</button>}
      {plant.overdue_fertilize && <button style={btnStyle('#e65100')} onClick={handleFertilize}>🌿 Fertilize now</button>}

      <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <p style={labelStyle}>Schedule</p>
        <p style={valueStyle}>💧 Every {plant.water_interval_days} days · {plant.water_amount_ml} ml</p>
        {plant.next_fertilize_date && <p style={valueStyle}>🌿 Fertilize every {Math.round((new Date(plant.next_fertilize_date) - new Date(plant.last_fertilized_at || plant.created_at)) / 86400000)} days</p>}

        <p style={labelStyle}>Window</p>
        <p style={valueStyle}>{plant.window_orientation} · {plant.window_distance.replace('_', ' ')}</p>

        <p style={labelStyle}>Height</p>
        <p style={valueStyle}>{plant.height_cm} cm</p>

        {plant.notes && <><p style={labelStyle}>Notes</p><p style={valueStyle}>{plant.notes}</p></>}
      </div>

      <h2 style={{ fontSize: 14, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Care History</h2>
      {plant.care_logs.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>No care logged yet.</p>
      ) : (
        plant.care_logs.map(log => (
          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
            <span>{log.type === 'water' ? '💧 Watered' : '🌿 Fertilized'}</span>
            <span style={{ color: '#aaa' }}>{new Date(log.logged_at).toLocaleDateString('nl-NL')}</span>
          </div>
        ))
      )}

      <button onClick={handleDelete} style={{ ...btnStyle('#c62828'), marginTop: 24 }}>Delete plant</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/PlantDetail.jsx
git commit -m "feat: Plant Detail page with care history and actions"
```

---

## Task 18: Settings Page + Service Worker

**Files:**
- Create: `client/src/pages/Settings.jsx`
- Create: `client/public/sw.js`

- [ ] **Step 1: Create `client/public/sw.js`**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'PlantCare', body: 'Time to check your plants!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
```

- [ ] **Step 2: Create `client/src/pages/Settings.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';

const labelStyle = { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' };
const cardStyle  = { background: 'white', borderRadius: 10, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' };
const btnStyle   = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 8,
});

async function subscribeToPush(vapidKey) {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export default function Settings() {
  const [settings, setSettings]       = useState({ notification_time: '08:00' });
  const [subscribed, setSubscribed]   = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [status, setStatus]           = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings);
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported) {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
      );
    }
  }, []);

  const handleTimeChange = async (e) => {
    const value = e.target.value;
    setSettings(s => ({ ...s, notification_time: value }));
    await api.updateSetting('notification_time', value);
    setStatus('Saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleSubscribe = async () => {
    try {
      const { key } = await api.getVapidKey();
      const sub = await subscribeToPush(key);
      await api.subscribe({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) } });
      setSubscribed(true);
      setStatus('Notifications enabled!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  };

  const handleUnsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.unsubscribe(sub.endpoint);
    }
    setSubscribed(false);
    setStatus('Notifications disabled.');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleTestPush = async () => {
    try {
      await api.testPush();
      setStatus('Test notification sent!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 20 }}>⚙️ Settings</h1>

      <div style={cardStyle}>
        <label style={labelStyle}>Notification time</label>
        <input
          type="time"
          value={settings.notification_time}
          onChange={handleTimeChange}
          style={{ fontSize: 18, border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', width: '100%' }}
        />
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Push notifications</label>
        {!pushSupported ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>Not supported in this browser.</p>
        ) : subscribed ? (
          <>
            <p style={{ fontSize: 13, color: '#2e7d32', marginBottom: 12 }}>✅ Notifications are enabled</p>
            <button style={btnStyle('#e65100')} onClick={handleUnsubscribe}>Disable notifications</button>
            <button style={{ ...btnStyle('#1565c0'), marginTop: 4 }} onClick={handleTestPush}>Send test notification</button>
          </>
        ) : (
          <button style={btnStyle('#2e7d32')} onClick={handleSubscribe}>Enable notifications</button>
        )}
      </div>

      {status && <p style={{ color: '#2e7d32', fontWeight: 600, textAlign: 'center' }}>{status}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Settings.jsx client/public/sw.js
git commit -m "feat: Settings page with push notification toggle and time picker"
```

---

## Task 19: Run Full Test Suite + Smoke Test

- [ ] **Step 1: Run all backend tests**

```bash
cd server && DATABASE_URL=postgres://planttracker:planttracker@localhost:5432/planttracker npx jest --runInBand
```

Expected: All PASS

- [ ] **Step 2: Run all frontend tests**

```bash
cd client && npx vitest run
```

Expected: All PASS

- [ ] **Step 3: Start the app and smoke test**

```bash
npm run dev
```

Open http://localhost:5173 in browser. Verify:
- Home screen loads and shows "Nothing due today"
- Can navigate to Add Plant, choose a type, fill in details, see computed schedule preview, submit
- Plant appears in Plants list and Home screen
- Tapping Water logs the action and removes from today's list
- Settings page shows notification time picker and push enable button

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final smoke test pass"
```

---

## Task 20: Docker Production Build

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install root deps
COPY package.json ./
RUN npm install

# Build client
COPY client/package.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# Install server deps
COPY server/package.json ./server/
RUN npm install --prefix server
COPY server/ ./server/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Build and test Docker image**

```bash
docker build -t plant-tracker .
docker run --rm -e DATABASE_URL=postgres://planttracker:planttracker@host.docker.internal:5432/planttracker -e PORT=3000 -p 3000:3000 plant-tracker
```

Open http://localhost:3000 — should serve the full app.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: production Dockerfile"
```
