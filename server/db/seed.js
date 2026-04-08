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
