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
