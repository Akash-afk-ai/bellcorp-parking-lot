const { calculateFareFromDuration } = require('./fareCalculator');

describe('calculateFareFromDuration', () => {
  test('charges 30 for up to 3 hours', () => {
    expect(calculateFareFromDuration(3 * 60 * 60 * 1000)).toBe(30);
  });

  test('charges 85 for more than 3 and up to 6 hours', () => {
    expect(calculateFareFromDuration(3 * 60 * 60 * 1000 + 1)).toBe(85);
    expect(calculateFareFromDuration(6 * 60 * 60 * 1000)).toBe(85);
  });

  test('charges 120 for more than 6 hours', () => {
    expect(calculateFareFromDuration(6 * 60 * 60 * 1000 + 1)).toBe(120);
  });
});
