const { computeInterval, computeAmount } = require('../lib/watering-formula');

describe('computeInterval', () => {
  test('south window, close, July → 3 days', () => {
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
    expect(computeInterval('S', 'close', 0.10, jul)).toBe(2);
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
