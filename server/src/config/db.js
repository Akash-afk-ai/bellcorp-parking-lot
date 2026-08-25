const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const redis = require('redis');

require('./env');

const { env } = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const mongoClient = new MongoClient(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
});

const redisClient = redis.createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

async function connectDatabases() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected successfully');

    await mongoClient.connect();
    console.log('MongoDB connected successfully');

    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

async function disconnectDatabases() {
  try {
    await pool.end();
    await mongoClient.close();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    console.log('All database connections closed');
  } catch (error) {
    console.error('Error while closing database connections:', error.message);
  }
}

module.exports = {
  pool,
  mongoClient,
  redisClient,
  connectDatabases,
  disconnectDatabases,
};
