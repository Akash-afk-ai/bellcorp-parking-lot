const { sendSuccess, sendError } = require('../utils/response');
const { AppError } = require('../utils/AppError');
const {
  getAvailability,
  parkVehicle,
  exitVehicle,
  getActiveTickets,
  getHistory,
} = require('../services/parkingService');

async function availability(req, res, next) {
  try {
    const data = await getAvailability();
    return sendSuccess(res, 200, { availability: data });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(500, 'Unable to fetch availability'));
  }
}

async function park(req, res, next) {
  try {
    const ticket = await parkVehicle({ ...req.body, userId: req.user.userId });
    return sendSuccess(res, 201, { ticket });
  } catch (error) {
    return next(error || new AppError(500, 'Parking failed'));
  }
}

async function exit(req, res, next) {
  try {
    const result = await exitVehicle({ ...req.body, userId: req.user.userId });
    return sendSuccess(res, 200, { exit: result });
  } catch (error) {
    return next(error || new AppError(500, 'Exit failed'));
  }
}

async function active(req, res, next) {
  try {
    const tickets = await getActiveTickets();
    return sendSuccess(res, 200, { tickets });
  } catch (error) {
    return next(error || new AppError(500, 'Unable to fetch active tickets'));
  }
}

async function history(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await getHistory({ page, limit });
    return sendSuccess(res, 200, { history: data });
  } catch (error) {
    return next(error || new AppError(500, 'Unable to fetch history'));
  }
}

module.exports = { availability, park, exit, active, history };
