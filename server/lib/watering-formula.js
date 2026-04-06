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
