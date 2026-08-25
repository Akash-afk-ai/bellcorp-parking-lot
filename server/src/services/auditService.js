const { mongoClient } = require('../config/db');

async function logAuditEvent({
  eventType,
  userId = null,
  ticketId = null,
  vehicleNumber = null,
  vehicleType = null,
  metadata = {},
}) {
  try {
    const db = mongoClient.db();
    await db.collection('audit_logs').insertOne({
      event_type: eventType,
      user_id: userId,
      ticket_id: ticketId,
      vehicle_number: vehicleNumber,
      vehicle_type: vehicleType,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error('MongoDB audit logging failed:', error.message);
  }
}

module.exports = { logAuditEvent };
