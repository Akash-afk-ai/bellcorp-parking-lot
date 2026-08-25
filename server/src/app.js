const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { connectDatabases, disconnectDatabases } = require('./config/db');
const { env } = require('./config/env');

const app = express();
let server;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabases();
    server = app.listen(env.PORT, () => {
      console.log(`Bellcorp parking server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await disconnectDatabases();
      process.exit(0);
    });
  } else {
    await disconnectDatabases();
    process.exit(0);
  }
}

if (require.main === module) {
  startServer();
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
