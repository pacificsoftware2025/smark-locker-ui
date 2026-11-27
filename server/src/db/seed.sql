-- ==============================================================================
-- INITIAL SEED DATA: Station CMH-01 with 16 Compartments
-- ==============================================================================

-- Insert Station CMH-01
INSERT INTO locker_stations (id, name, address, total_compartments, status)
VALUES ('CMH-01', 'Central Mall Hub', 'Ground Floor, Central Mall, Metro Manila', 16, 'online')
ON CONFLICT (id) DO NOTHING;

-- Insert 16 Compartments:
-- Boxes 01-04: Small (5kg)
-- Boxes 05-12: Medium (7kg)
-- Boxes 13-16: Large (9kg)
INSERT INTO locker_compartments (station_id, box_number, size, status)
VALUES
  ('CMH-01', '01', 'small', 'available'),
  ('CMH-01', '02', 'small', 'available'),
  ('CMH-01', '03', 'small', 'available'),
  ('CMH-01', '04', 'small', 'available'),
  ('CMH-01', '05', 'medium', 'available'),
  ('CMH-01', '06', 'medium', 'available'),
  ('CMH-01', '07', 'medium', 'available'),
  ('CMH-01', '08', 'medium', 'available'),
  ('CMH-01', '09', 'medium', 'available'),
  ('CMH-01', '10', 'medium', 'available'),
  ('CMH-01', '11', 'medium', 'available'),
  ('CMH-01', '12', 'medium', 'available'),
  ('CMH-01', '13', 'large', 'available'),
  ('CMH-01', '14', 'large', 'available'),
  ('CMH-01', '15', 'large', 'available'),
  ('CMH-01', '16', 'large', 'available')
ON CONFLICT (station_id, box_number) DO NOTHING;

-- Insert Default Operator: Elena Rostova
INSERT INTO operators (name, email, phone, password_hash, status)
VALUES ('Elena Rostova', 'elena@smartlocker.ph', '+639195553322', 'operator123', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert Default Rider: Marco Valdes
INSERT INTO riders (name, email, phone, password_hash, vehicle_plate, assigned_route, status)
VALUES ('Marco Valdes', 'marco@smartlocker.ph', '+639185557788', 'rider123', 'Van #04 (Route Metro)', 'Metro Central Route', 'active')
ON CONFLICT (email) DO NOTHING;
