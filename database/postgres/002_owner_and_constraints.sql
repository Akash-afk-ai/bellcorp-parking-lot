-- Safe migration for databases created before owner and phone fields existed.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ticket_per_vehicle
  ON parking_tickets (vehicle_id)
  WHERE status = 'ACTIVE';