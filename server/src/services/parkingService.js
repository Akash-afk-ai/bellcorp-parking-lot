const { pool } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { generateTicketNumber } = require('../utils/ticketGenerator');
const { calculateFareFromDuration } = require('../utils/fareCalculator');
const { logAuditEvent } = require('./auditService');
const { getCachedAvailability, setCachedAvailability, invalidateAvailabilityKeys } = require('../config/redis');

const AVAILABILITY_CACHE_KEY = 'parking:availability';

async function getAvailability() {
  const cached = await getCachedAvailability(AVAILABILITY_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const result = await pool.query(
    `SELECT vehicle_type, COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available_slots
     FROM parking_slots
     GROUP BY vehicle_type`
  );

  const data = {
    BIKE: 0,
    CAR: 0,
    TRUCK: 0,
  };

  result.rows.forEach((row) => {
    data[row.vehicle_type] = Number(row.available_slots || 0);
  });

  await setCachedAvailability(AVAILABILITY_CACHE_KEY, data);
  return data;
}

async function parkVehicle({ vehicleNumber, vehicleType, ownerName, phoneNumber, userId = null }) {
  const normalizedVehicleNumber = vehicleNumber.trim();
  const normalizedType = vehicleType.trim().toUpperCase();
  const normalizedOwnerName = ownerName.trim();
  const normalizedPhoneNumber = phoneNumber.trim();

  if (!normalizedVehicleNumber) {
    throw new AppError(400, 'Vehicle number is required');
  }

  const validTypes = ['BIKE', 'CAR', 'TRUCK'];
  if (!validTypes.includes(normalizedType)) {
    throw new AppError(400, 'Invalid vehicle type');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingVehicle = await client.query(
      `SELECT id, vehicle_number, vehicle_type
       FROM vehicles
       WHERE vehicle_number = $1
       FOR UPDATE`,
      [normalizedVehicleNumber]
    );

    let vehicleId;
    if (existingVehicle.rowCount > 0) {
      if (existingVehicle.rows[0].vehicle_type !== normalizedType) {
        throw new AppError(409, 'Vehicle number is already registered with a different vehicle type');
      }

      const activeTicket = await client.query(
        `SELECT id FROM parking_tickets
         WHERE vehicle_id = $1 AND status = 'ACTIVE'`,
        [existingVehicle.rows[0].id]
      );

      if (activeTicket.rowCount > 0) {
        throw new AppError(409, 'Vehicle already parked');
      }

      vehicleId = existingVehicle.rows[0].id;
      await client.query(
        `UPDATE vehicles SET owner_name = $1, phone_number = $2 WHERE id = $3`,
        [normalizedOwnerName, normalizedPhoneNumber, vehicleId]
      );
    } else {
      const newVehicle = await client.query(
        `INSERT INTO vehicles (vehicle_number, vehicle_type, owner_name, phone_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [normalizedVehicleNumber, normalizedType, normalizedOwnerName, normalizedPhoneNumber]
      );
      vehicleId = newVehicle.rows[0].id;
    }

    // Critical concurrency-safe slot allocation.
    // PostgreSQL is the final source of truth. We lock the available slot rows before
    // updating them so that two simultaneous requests cannot both select the same last slot.
    const slotResult = await client.query(
      `SELECT id, slot_number
       FROM parking_slots
       WHERE vehicle_type = $1 AND status = 'AVAILABLE'
       ORDER BY slot_number
       LIMIT 1
       FOR UPDATE`,
      [normalizedType]
    );

    if (slotResult.rowCount === 0) {
      throw new AppError(409, 'Parking Full');
    }

    const slot = slotResult.rows[0];
    const ticketNumber = generateTicketNumber();
    const entryTime = new Date();

    const ticketResult = await client.query(
      `INSERT INTO parking_tickets (ticket_number, vehicle_id, slot_id, entry_time, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, ticket_number, slot_id, entry_time`,
      [ticketNumber, vehicleId, slot.id, entryTime]
    );

    await client.query(
      `UPDATE parking_slots
       SET status = 'OCCUPIED', updated_at = NOW()
       WHERE id = $1`,
      [slot.id]
    );

    await client.query('COMMIT');
    await invalidateAvailabilityKeys([AVAILABILITY_CACHE_KEY]);

    const response = {
      ticketNumber: ticketResult.rows[0].ticket_number,
      vehicleNumber: normalizedVehicleNumber,
      vehicleType: normalizedType,
      ownerName: normalizedOwnerName,
      phoneNumber: normalizedPhoneNumber,
      slotNumber: slot.slot_number,
      entryTime: entryTime.toISOString(),
    };

    await logAuditEvent({
      eventType: 'VEHICLE_PARKED',
      userId,
      vehicleNumber: normalizedVehicleNumber,
      vehicleType: normalizedType,
      ticketId: ticketResult.rows[0].id,
      metadata: { slotNumber: slot.slot_number },
    });

    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'Parking Full') {
      await logAuditEvent({
        eventType: 'PARKING_FULL',
        userId,
        vehicleNumber: normalizedVehicleNumber,
        vehicleType: normalizedType,
      });
    }
    if (error.code === '23505') {
      throw new AppError(409, 'Vehicle already parked');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Parking failed');
  } finally {
    client.release();
  }
}

async function exitVehicle({ ticketNumber, vehicleNumber, userId = null }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const identifier = ticketNumber ? ticketNumber.trim() : vehicleNumber.trim();
    const ticketResult = await client.query(
      `SELECT t.id, t.ticket_number, t.entry_time, t.status, v.vehicle_number, v.vehicle_type, v.owner_name, v.phone_number, s.id AS slot_id, s.slot_number
       FROM parking_tickets t
       JOIN vehicles v ON v.id = t.vehicle_id
       JOIN parking_slots s ON s.id = t.slot_id
       WHERE ${ticketNumber ? 't.ticket_number' : 'v.vehicle_number'} = $1
       FOR UPDATE`,
      [identifier]
    );

    if (ticketResult.rowCount === 0) {
      throw new AppError(404, 'Ticket not found');
    }

    const ticket = ticketResult.rows[0];
    if (ticket.status === 'COMPLETED') {
      throw new AppError(409, 'Vehicle already exited');
    }

    const exitTime = new Date();
    const durationMs = exitTime.getTime() - new Date(ticket.entry_time).getTime();
    const fare = calculateFareFromDuration(durationMs);

    await client.query(
      `UPDATE parking_tickets
       SET exit_time = $1, status = 'COMPLETED', fare = $2, updated_at = NOW()
       WHERE id = $3`,
      [exitTime, fare, ticket.id]
    );

    await client.query(
      `UPDATE parking_slots
       SET status = 'AVAILABLE', updated_at = NOW()
       WHERE id = $1`,
      [ticket.slot_id]
    );

    await client.query('COMMIT');
    await invalidateAvailabilityKeys([AVAILABILITY_CACHE_KEY]);

    const response = {
      ticketNumber: ticket.ticket_number,
      vehicleNumber: ticket.vehicle_number,
      vehicleType: ticket.vehicle_type,
      ownerName: ticket.owner_name,
      phoneNumber: ticket.phone_number,
      slotNumber: ticket.slot_number,
      entryTime: new Date(ticket.entry_time).toISOString(),
      exitTime: exitTime.toISOString(),
      durationHours: (durationMs / (1000 * 60 * 60)).toFixed(2),
      fare,
    };

    await logAuditEvent({
      eventType: 'VEHICLE_EXITED',
      userId,
      vehicleNumber: ticket.vehicle_number,
      vehicleType: ticket.vehicle_type,
      ticketId: ticket.id,
      metadata: { slotNumber: ticket.slot_number, fare },
    });

    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Exit failed');
  } finally {
    client.release();
  }
}

async function getActiveTickets() {
  const result = await pool.query(
    `SELECT t.ticket_number, v.vehicle_number, v.vehicle_type, v.owner_name, v.phone_number, s.slot_number, t.entry_time, t.status
     FROM parking_tickets t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN parking_slots s ON s.id = t.slot_id
     WHERE t.status = 'ACTIVE'
     ORDER BY t.entry_time DESC`
  );

  return result.rows;
}

async function getHistory({ page = 1, limit = 20 }) {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Math.min(Number(limit) > 0 ? Number(limit) : 20, 100);
  const offset = (safePage - 1) * safeLimit;

  const totalResult = await pool.query('SELECT COUNT(*) AS total FROM parking_tickets WHERE status = $1', ['COMPLETED']);
  const rowsResult = await pool.query(
    `SELECT t.ticket_number, v.vehicle_number, v.vehicle_type, v.owner_name, v.phone_number, s.slot_number, t.entry_time, t.exit_time, t.fare, t.status
     FROM parking_tickets t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN parking_slots s ON s.id = t.slot_id
     WHERE t.status = 'COMPLETED'
     ORDER BY t.exit_time DESC
     LIMIT $1 OFFSET $2`,
    [safeLimit, offset]
  );

  return {
    total: Number(totalResult.rows[0].total || 0),
    page: safePage,
    limit: safeLimit,
    records: rowsResult.rows,
  };
}

module.exports = { getAvailability, parkVehicle, exitVehicle, getActiveTickets, getHistory };
