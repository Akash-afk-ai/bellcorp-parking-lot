const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { connectDatabases } = require('./config/db');
const { env } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

(async () => {
  try {
    await connectDatabases();
    app.listen(env.PORT, () => {
      console.log(`Bellcorp parking server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error.message);
    process.exit(1);
  }
})();

module.exports = app;
