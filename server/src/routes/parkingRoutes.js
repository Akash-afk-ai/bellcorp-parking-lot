const express = require('express');
const { availability, park, exit, active, history } = require('../controllers/parkingController');
const { validate } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/authMiddleware');
const { parkingLimiter } = require('../middleware/rateLimiter');
const { parkSchema, exitSchema } = require('../validators/parkingValidator');

const router = express.Router();

router.get('/availability', authenticateToken, availability);
router.get('/active', authenticateToken, active);
router.get('/history', authenticateToken, history);
router.post('/park', authenticateToken, parkingLimiter, validate(parkSchema), park);
router.post('/exit', authenticateToken, parkingLimiter, validate(exitSchema), exit);

module.exports = router;
