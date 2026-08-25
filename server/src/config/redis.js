const { redisClient } = require('./db');

async function getCachedAvailability(key) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get failed:', error.message);
    return null;
  }
}

async function setCachedAvailability(key, data, ttlSeconds = 60) {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set failed:', error.message);
  }
}

async function invalidateAvailabilityKeys(keys) {
  try {
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis invalidation failed:', error.message);
  }
}

module.exports = { getCachedAvailability, setCachedAvailability, invalidateAvailabilityKeys };
