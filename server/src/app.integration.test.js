const request = require('supertest');
const app = require('./app');
const { pool, connectDatabases, disconnectDatabases } = require('./config/db');

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('parking API integration', () => {
  let token;
  const testVehicles = new Set();

  beforeAll(async () => {
    await connectDatabases();
    const email = `integration-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'Integration User', email, password: 'Pass@123' }).expect(201);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Pass@123' }).expect(200);
    token = login.body.token;
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM parking_tickets WHERE vehicle_id IN (SELECT id FROM vehicles WHERE vehicle_number = ANY($1))', [Array.from(testVehicles)]);
      await client.query('DELETE FROM vehicles WHERE vehicle_number = ANY($1)', [Array.from(testVehicles)]);
      await client.query("UPDATE parking_slots SET status = 'AVAILABLE' WHERE vehicle_type = 'CAR'");
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await disconnectDatabases();
    }
  });

  test('rejects unauthorized parking requests', async () => {
    await request(app).post('/api/parking/park').send({ vehicleNumber: 'KA01ZZ9999', vehicleType: 'CAR', ownerName: 'Test User', phoneNumber: '9876543210' }).expect(401);
  });

  test('parks and exits by vehicle number with persisted owner details', async () => {
    const vehicleNumber = `KA${Date.now().toString().slice(-2)}AB1001`;
    testVehicles.add(vehicleNumber);
    const parked = await request(app).post('/api/parking/park').set('Authorization', `Bearer ${token}`).send({ vehicleNumber, vehicleType: 'CAR', ownerName: 'Akash', phoneNumber: '9876543210' }).expect(201);
    expect(parked.body.ticket.ownerName).toBe('Akash');
    expect(parked.body.ticket.phoneNumber).toBe('9876543210');
    const exited = await request(app).post('/api/parking/exit').set('Authorization', `Bearer ${token}`).send({ vehicleNumber }).expect(200);
    expect(exited.body.exit.ownerName).toBe('Akash');
    expect(exited.body.exit.fare).toBe(30);
  });

  test('rejects duplicate active vehicle and supports history pagination', async () => {
    const vehicleNumber = `KA${Date.now().toString().slice(-2)}AB1002`;
    testVehicles.add(vehicleNumber);
    const body = { vehicleNumber, vehicleType: 'CAR', ownerName: 'Test Owner', phoneNumber: '9876543210' };
    const parked = await request(app).post('/api/parking/park').set('Authorization', `Bearer ${token}`).send(body).expect(201);
    await request(app).post('/api/parking/park').set('Authorization', `Bearer ${token}`).send(body).expect(409);
    await request(app).post('/api/parking/exit').set('Authorization', `Bearer ${token}`).send({ ticketNumber: parked.body.ticket.ticketNumber }).expect(200);
    const history = await request(app).get('/api/parking/history?limit=1000').set('Authorization', `Bearer ${token}`).expect(200);
    expect(history.body.history.limit).toBe(100);
  });

  test('allows only one concurrent request for the final car slot', async () => {
    const client = await pool.connect();
    await client.query("UPDATE parking_slots SET status = 'OCCUPIED' WHERE vehicle_type = 'CAR'");
    await client.query("UPDATE parking_slots SET status = 'AVAILABLE' WHERE id = (SELECT id FROM parking_slots WHERE vehicle_type = 'CAR' ORDER BY slot_number LIMIT 1)");
    client.release();

    const first = `KA${Date.now().toString().slice(-2)}CC2001`;
    const second = `KA${Date.now().toString().slice(-2)}CC2002`;
    testVehicles.add(first); testVehicles.add(second);
    const makeRequest = (vehicleNumber) => request(app).post('/api/parking/park').set('Authorization', `Bearer ${token}`).send({ vehicleNumber, vehicleType: 'CAR', ownerName: 'Race User', phoneNumber: '9876543210' });
    const results = await Promise.all([makeRequest(first), makeRequest(second)]);
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409 && result.body.message === 'Parking Full')).toHaveLength(1);
  });
});
