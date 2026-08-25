require('dotenv').config();

const requiredEnv = ['PORT', 'JWT_SECRET', 'DATABASE_URL', 'MONGODB_URI', 'REDIS_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  env: {
    PORT: Number(process.env.PORT),
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
};
