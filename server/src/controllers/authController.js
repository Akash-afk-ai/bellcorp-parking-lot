const { sendSuccess, sendError } = require('../utils/response');
const { AppError } = require('../utils/AppError');
const { registerUser, loginUser } = require('../services/authService');

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    return sendSuccess(res, 201, { user });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(500, 'Registration failed'));
  }
}

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    return sendSuccess(res, 200, result);
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(500, 'Login failed'));
  }
}

module.exports = { register, login };
