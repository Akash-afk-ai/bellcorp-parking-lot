const Joi = require('joi');

const vehicleTypeValues = ['BIKE', 'CAR', 'TRUCK'];

const parkSchema = Joi.object({
  vehicleNumber: Joi.string().trim().required().pattern(/^[A-Z0-9-\s]+$/i).messages({
    'string.pattern.base': 'Vehicle number contains invalid characters.',
  }),
  vehicleType: Joi.string().trim().uppercase().valid(...vehicleTypeValues).required(),
});

const exitSchema = Joi.object({
  ticketNumber: Joi.string().trim().required(),
});

module.exports = { parkSchema, exitSchema };
