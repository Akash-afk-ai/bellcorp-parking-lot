function sendSuccess(res, statusCode = 200, payload = {}) {
  return res.status(statusCode).json({ success: true, ...payload });
}

function sendError(res, statusCode = 500, message = 'Something went wrong') {
  return res.status(statusCode).json({ success: false, message });
}

module.exports = { sendSuccess, sendError };
