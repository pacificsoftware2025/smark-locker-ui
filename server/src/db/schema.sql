-- ==============================================================================
-- POSTGRESQL DATABASE SCHEMA: Smart Locker Kiosk & Laundry System
-- Compatible with Render Managed PostgreSQL
-- ==============================================================================

-- 1. Locker Stations (Physical Hubs)
CREATE TABLE IF NOT EXISTS locker_stations (
  id VARCHAR(50) PRIMARY KEY,                    -- e.g. 'CMH-01' or 'SLL-12901'
  name VARCHAR(150) NOT NULL,                    -- 'Central Mall Hub'
  address TEXT,
  total_compartments INT DEFAULT 16,
  status VARCHAR(20) DEFAULT 'online',           -- 'online', 'offline', 'maintenance'
  binding_status VARCHAR(30) DEFAULT 'BOUND_ACTIVE', -- 'UNBOUND', 'PENDING_CONFIRMATION', 'BOUND_ACTIVE'
  pairing_code VARCHAR(10),                      -- 6-digit verification key
  pairing_requested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration helpers for locker_stations
ALTER TABLE locker_stations ADD COLUMN IF NOT EXISTS binding_status VARCHAR(30) DEFAULT 'BOUND_ACTIVE';
ALTER TABLE locker_stations ADD COLUMN IF NOT EXISTS pairing_code VARCHAR(10);
ALTER TABLE locker_stations ADD COLUMN IF NOT EXISTS pairing_requested_at TIMESTAMP WITH TIME ZONE;

-- 2. Locker Compartments (Physical Solenoid Door Slots)
CREATE TABLE IF NOT EXISTS locker_compartments (
  id SERIAL PRIMARY KEY,
  station_id VARCHAR(50) NOT NULL REFERENCES locker_stations(id) ON DELETE CASCADE,
  box_number VARCHAR(10) NOT NULL,               -- '01', '02', ..., '16'
  size VARCHAR(20) NOT NULL DEFAULT 'medium',     -- 'small', 'medium', 'large'
  status VARCHAR(20) NOT NULL DEFAULT 'available',-- 'available', 'occupied', 'maintenance'
  current_order_id VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_station_box UNIQUE (station_id, box_number)
);

-- 3. Laundry Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,                    -- e.g. 'ORD-1001'
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,          -- e.g. '+639171234567'
  station_id VARCHAR(50) NOT NULL REFERENCES locker_stations(id),
  compartment_number VARCHAR(10) NOT NULL,      -- e.g. '03'
  dropoff_box_number VARCHAR(10) NOT NULL,
  pickup_box_number VARCHAR(10),
  service_tier VARCHAR(100) NOT NULL,           -- 'Wash Only', 'Wash & Dry', 'Wash, Dry & Fold'
  service_size VARCHAR(50) NOT NULL,            -- 'Small', 'Medium', 'Large'
  temperature VARCHAR(20) DEFAULT 'Cold',
  fabric_softener BOOLEAN DEFAULT TRUE,
  special_instructions TEXT,
  status VARCHAR(30) DEFAULT 'dropped_off',     -- 'dropped_off', 'in_transit', 'in_wash', 'ready_for_pickup', 'completed', 'cancelled'
  claim_pin VARCHAR(10),                        -- 6-digit PIN generated when placed in pickup locker
  weight_kg NUMERIC(5,2),                       -- Measured weight at laundry facility
  amount NUMERIC(10,2),                         -- Billed price in PHP
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration helpers for existing tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

-- 4. Dedicated Payments & Financial Audit Ledger (For Operator Analytics & KPIs)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id VARCHAR(50) NOT NULL REFERENCES locker_stations(id),
  amount NUMERIC(10,2) NOT NULL,               -- e.g. 210.00 PHP
  payment_method VARCHAR(50) DEFAULT 'gcash',  -- 'gcash', 'maya', 'qrph', 'cash'
  payment_provider VARCHAR(50) DEFAULT 'paymongo',
  reference_number VARCHAR(100) NOT NULL,       -- Transaction / OR number
  status VARCHAR(20) DEFAULT 'paid',            -- 'paid', 'refunded', 'failed'
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_compartments_station_status ON locker_compartments(station_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_claim_pin ON orders(claim_pin);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_station_id ON payments(station_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- 5. Operators Table (Central Office & Branch Staff)
CREATE TABLE IF NOT EXISTS operators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  locker_station_id VARCHAR(50) REFERENCES locker_stations(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_station ON operators(locker_station_id);
