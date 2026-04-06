# Plant Tracker — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

A mobile-first PWA for tracking houseplant care (watering and fertilizing). Single-household, no authentication. The app computes watering schedules automatically based on plant species, window orientation, distance to window, and the current month (tuned for Dutch light levels). Water amounts are computed from species characteristics and plant height.

---

## Architecture

**Approach:** Monolith — Express serves both the REST API and the built React app as static files. A dynamic cron job inside Express fires browser push notifications at a user-configured time each day.

```
plant-tracker/
├── client/                  # React (Vite)
│   ├── src/
│   │   ├── pages/           # Home, PlantDetail, AddPlant, Settings
│   │   ├── components/
│   │   └── sw.js            # Service worker (Web Push)
├── server/                  # Express
│   ├── routes/              # plants, plant-types, care-logs, push, settings
│   ├── db/                  # PostgreSQL queries (pg)
│   └── cron.js              # Dynamic scheduler for push notifications
├── docker-compose.yml
└── package.json             # Root scripts to run both
```

In development, Vite runs on its own port and proxies `/api` calls to Express. In production, Express serves `client/dist`.

---

## Screens

Four screens, bottom tab bar navigation (Home · Plants · ➕ · Settings):

| Screen | Purpose |
|---|---|
| **Home — Task List** | Today's tasks (water/fertilize), overdue highlighted at top, "Water all (N)" batch button when 2+ plants due |
| **Plant Detail** | Plant info, computed schedule, care history log, edit/delete |
| **Add Plant** | 2-step form: (1) pick species from curated list or add custom, (2) nickname, height, window orientation, distance — shows live computed interval and amount |
| **Settings** | Push notification enable/disable, notification time picker |

---

## Watering Formula

Watering interval and amount are computed at runtime — never stored.

**Interval (days):**
```
interval = round(base_orientation × season_multiplier × distance_multiplier × thirst_factor)
           capped between 2 and 30 days
```

**Base interval by window orientation** (summer baseline, <50 cm):

| Orientation | Base (days) |
|---|---|
| South | 5 |
| SE / SW | 6 |
| East / West | 7 |
| NE / NW | 9 |
| North | 11 |

**Seasonal multiplier (Netherlands, ~52°N):**

| Month | Multiplier |
|---|---|
| July | 0.85 |
| June / August | 0.90 |
| May | 1.00 |
| April / September | 1.20 / 1.10 |
| March / October | 1.50 / 1.40 |
| February / November | 2.00 / 1.80 |
| January / December | 2.20 / 2.30 |

**Distance multiplier:**

| Distance | Multiplier |
|---|---|
| < 50 cm | 1.0 |
| 50–150 cm | 1.3 |
| 150–300 cm | 1.7 |
| > 300 cm | 2.2 |

**Water amount (ml):**
```
amount = water_amount_per_cm × height_cm
```

---

## Plant Types

39 curated species + custom plant option. Each species defines:

- `thirst_factor` — interval multiplier (0.7 = very thirsty, 2.2 = very drought-tolerant)
- `water_amount_per_cm` — ml per cm of plant height
- `fertilize_every` — default days between fertilizing

### Palms
| Species | Thirst | ml/cm | Fertilize |
|---|---|---|---|
| Areca Palm | 0.80 | 12 | 21d |
| Kentia Palm | 1.00 | 10 | 28d |
| Parlour Palm | 0.90 | 10 | 28d |
| Phoenix Palm | 0.80 | 11 | 21d |
| Lady Palm | 0.90 | 9 | 28d |
| Bamboo Palm | 0.85 | 11 | 21d |

### Tropical & Statement
| Species | Thirst | ml/cm | Fertilize |
|---|---|---|---|
| Strelitzia (Bird of Paradise) | 0.85 | 13 | 14d |
| Monstera Deliciosa | 0.90 | 10 | 28d |
| Monkey Mask (Monstera Adansonii) | 0.90 | 9 | 28d |
| Ficus Lyrata (Fiddle Leaf Fig) | 0.85 | 11 | 21d |
| Ficus Benjamina | 0.90 | 9 | 21d |
| Anthurium | 0.85 | 10 | 14d |
| Calathea | 0.70 | 11 | 21d |
| Peace Lily | 0.70 | 12 | 28d |
| Philodendron | 0.90 | 9 | 28d |
| Orchid | 1.10 | 6 | 14d |

### Easy & Low-Maintenance
| Species | Thirst | ml/cm | Fertilize |
|---|---|---|---|
| Pothos | 0.90 | 8 | 28d |
| Spider Plant | 1.00 | 7 | 28d |
| Snake Plant (Sansevieria) | 1.60 | 5 | 42d |
| ZZ Plant | 1.70 | 5 | 42d |
| Rubber Plant (Ficus Elastica) | 1.00 | 9 | 28d |
| Dracaena | 1.20 | 7 | 35d |
| Chinese Evergreen (Aglaonema) | 1.10 | 8 | 28d |
| Cast Iron Plant | 1.50 | 6 | 42d |
| Yucca | 1.60 | 6 | 42d |

### Cacti & Succulents
| Species | Thirst | ml/cm | Fertilize |
|---|---|---|---|
| Cactus (globular) | 2.00 | 3 | 60d |
| Column Cactus (Cereus) | 2.00 | 3 | 60d |
| Barrel Cactus | 2.20 | 2 | 90d |
| Opuntia (Prickly Pear) | 2.10 | 3 | 60d |
| Christmas Cactus | 1.10 | 6 | 28d |
| Succulent (mixed) | 1.80 | 4 | 60d |
| Aloe Vera | 1.70 | 4 | 60d |
| Haworthia | 1.60 | 4 | 60d |

### Other
| Species | Thirst | ml/cm | Fertilize |
|---|---|---|---|
| Olive Tree | 1.30 | 7 | 28d |
| Boston Fern | 0.70 | 12 | 21d |
| Croton | 0.80 | 10 | 21d |
| Begonia | 0.80 | 9 | 14d |
| Begonia Maculata | 0.80 | 10 | 14d |
| Dieffenbachia | 0.90 | 9 | 21d |

---

## Data Model

```sql
plant_types
  id                   serial primary key
  name                 text not null
  emoji                text default '🪴'
  thirst_factor        numeric not null
  water_amount_per_cm  numeric not null
  fertilize_every      integer
  is_custom            boolean default false

plants
  id                   serial primary key
  name                 text not null
  plant_type_id        integer references plant_types(id)
  window_orientation   text not null   -- N/NE/E/SE/S/SW/W/NW
  window_distance      text not null   -- close/medium/far/very_far
  height_cm            integer not null
  last_watered_at      timestamptz
  last_fertilized_at   timestamptz
  notes                text
  created_at           timestamptz default now()

care_logs
  id        serial primary key
  plant_id  integer references plants(id) on delete cascade
  type      text not null               -- 'water' | 'fertilize'
  logged_at timestamptz default now()
  notes     text

push_subscriptions
  id         serial primary key
  endpoint   text unique not null
  p256dh     text not null
  auth       text not null
  created_at timestamptz default now()

settings
  key    text primary key               -- 'notification_time'
  value  text not null                  -- '08:00'
```

---

## API Endpoints

```
GET    /api/plant-types                list all species
POST   /api/plant-types                create custom species

GET    /api/plants                     list plants with computed next_water_date,
                                       next_fertilize_date, water_amount_ml,
                                       overdue_water, overdue_fertilize flags
POST   /api/plants                     add plant
GET    /api/plants/:id                 plant detail + care history
PUT    /api/plants/:id                 update plant
DELETE /api/plants/:id                 delete plant

POST   /api/plants/:id/water           log watering
POST   /api/plants/:id/fertilize       log fertilizing
POST   /api/plants/water-batch         { plant_ids: [...] } — batch water
POST   /api/plants/fertilize-batch     { plant_ids: [...] } — batch fertilize
                                       (batch routes must be declared before /:id routes in Express)

POST   /api/push/subscribe             save push subscription
DELETE /api/push/subscribe             unsubscribe
POST   /api/push/test                  send test notification

GET    /api/settings                   get all settings
PUT    /api/settings/:key              update a setting
```

`GET /api/plants` computes and returns `next_water_date`, `next_fertilize_date`, `water_amount_ml`, `overdue_water`, and `overdue_fertilize` server-side so the frontend never needs the formula.

---

## Push Notifications

- **Library:** `web-push` (server), service worker with Web Push API (client)
- **Schedule:** dynamic cron — on startup and on `notification_time` change, the old cron task is cancelled and a new one created for the configured time
- **Content:** grouped — _"3 plants need attention today: Areca Palm, Monkey Mask, Strelitzia"_
- **Cleanup:** subscriptions returning HTTP 410 are deleted automatically
- **Permission:** requested in Settings on user action, never on app load

---

## Testing

- **Backend:** Jest + Supertest against a test PostgreSQL database. Cover watering formula, batch logging, push subscription lifecycle, dynamic cron scheduling.
- **Frontend:** Vitest + React Testing Library. Cover task list rendering, "Water all" button visibility, add-plant form flow.
- **No E2E tests** — unit + integration coverage is sufficient for this scope.
