const { parkSchema, exitSchema } = require('./parkingValidator');

describe('parking validators', () => {
  test('requires owner and phone for parking', () => {
    const result = parkSchema.validate({ vehicleNumber: 'KA01AB1234', vehicleType: 'CAR' });
    expect(result.error).toBeDefined();
  });

  test('accepts exit by ticket or vehicle number', () => {
    expect(exitSchema.validate({ ticketNumber: 'BELL-123' }).error).toBeUndefined();
    expect(exitSchema.validate({ vehicleNumber: 'KA01AB1234' }).error).toBeUndefined();
    expect(exitSchema.validate({}).error).toBeDefined();
  });
});
