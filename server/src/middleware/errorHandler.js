const { sendError } = require('../utils/response');

function notFoundHandler(req, res) {
  return sendError(res, 404, 'Route not found');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', message);
  }

  return sendError(res, statusCode, message);
}

module.exports = { notFoundHandler, errorHandler };
