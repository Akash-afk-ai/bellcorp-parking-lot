const Joi = require('joi');

const vehicleTypeValues = ['BIKE', 'CAR', 'TRUCK'];

const parkSchema = Joi.object({
  vehicleNumber: Joi.string().trim().min(3).max(30).required().pattern(/^[A-Z0-9-\s]+$/i).messages({
    'string.pattern.base': 'Vehicle number contains invalid characters.',
  }),
  vehicleType: Joi.string().trim().uppercase().valid(...vehicleTypeValues).required(),
  ownerName: Joi.string().trim().min(2).max(100).required(),
  phoneNumber: Joi.string().trim().pattern(/^\+?[0-9\s-]{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number is invalid.',
  }),
});

const exitSchema = Joi.object({
  ticketNumber: Joi.string().trim(),
  vehicleNumber: Joi.string().trim().min(3).max(30),
}).or('ticketNumber', 'vehicleNumber');

module.exports = { parkSchema, exitSchema };
