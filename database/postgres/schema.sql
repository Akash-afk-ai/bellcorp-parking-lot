-- Bellcorp Parking Lot PostgreSQL Schema
-- This schema is the source of truth for parking slots, vehicles, users, and tickets.
-- All slot allocation must happen inside PostgreSQL transactions with row-level locking.
-- For example, use "SELECT ... FOR UPDATE" on available slot rows before updating status.
-- This prevents two simultaneous requests from taking the last available slot.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_slots (
  id SERIAL PRIMARY KEY,
  slot_number INTEGER NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'CAR', 'TRUCK')),
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vehicle_type, slot_number)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_number VARCHAR(30) NOT NULL UNIQUE,
  vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'CAR', 'TRUCK')),
  owner_name VARCHAR(100),
  phone_number VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  slot_id INTEGER NOT NULL REFERENCES parking_slots(id) ON DELETE RESTRICT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  fare NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_slots_vehicle_type
  ON parking_slots (vehicle_type, status);

CREATE INDEX IF NOT EXISTS idx_parking_tickets_status
  ON parking_tickets (status, created_at);

CREATE INDEX IF NOT EXISTS idx_parking_tickets_vehicle_id
  ON parking_tickets (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_number
  ON vehicles (vehicle_number);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ticket_per_vehicle
  ON parking_tickets (vehicle_id)
  WHERE status = 'ACTIVE';

-- Seed fixed slots based on the assignment requirement.
INSERT INTO parking_slots (slot_number, vehicle_type, status)
VALUES
  (1, 'BIKE', 'AVAILABLE'),
  (2, 'BIKE', 'AVAILABLE'),
  (3, 'BIKE', 'AVAILABLE'),
  (4, 'BIKE', 'AVAILABLE'),
  (5, 'BIKE', 'AVAILABLE'),
  (1, 'CAR', 'AVAILABLE'),
  (2, 'CAR', 'AVAILABLE'),
  (3, 'CAR', 'AVAILABLE'),
  (4, 'CAR', 'AVAILABLE'),
  (5, 'CAR', 'AVAILABLE'),
  (1, 'TRUCK', 'AVAILABLE'),
  (2, 'TRUCK', 'AVAILABLE')
ON CONFLICT (vehicle_type, slot_number) DO NOTHING;
