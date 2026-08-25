const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized: missing token'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new AppError(401, 'Unauthorized: invalid token'));
  }
}

module.exports = { authenticateToken };
