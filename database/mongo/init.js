// MongoDB init script for audit / event logging.
// Run this file with mongosh, not with Node.js.
/* global db, print */

const database = db.getSiblingDB('bellcorp_parking');

if (!database.getCollectionNames().includes('audit_logs')) {
     database.createCollection('audit_logs');
}

database.audit_logs.createIndex({ timestamp: -1 });
database.audit_logs.createIndex({ event_type: 1 });
database.audit_logs.createIndex({ ticket_id: 1 });
database.audit_logs.createIndex({ vehicle_number: 1 });

print('MongoDB audit collection initialized');
