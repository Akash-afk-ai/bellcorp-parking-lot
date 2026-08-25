function calculateFareFromDuration(durationMs) {
  const hours = durationMs / (1000 * 60 * 60);

  if (hours <= 3) {
    return 30;
  }

  if (hours > 3 && hours <= 6) {
    return 85;
  }

  return 120;
}

module.exports = { calculateFareFromDuration };
