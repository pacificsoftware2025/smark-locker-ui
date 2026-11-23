import { query } from '../config/db.js';

// ==============================================================================
// SERVICE: Locker Compartment Operations
// ==============================================================================

// Maps customer load size selection to locker compartment sizes
function mapSizeCategory(loadSize) {
  const normalized = (loadSize || '').toLowerCase();
  if (normalized.includes('large') || normalized.includes('9kg')) return 'large';
  if (normalized.includes('small') || normalized.includes('5kg')) return 'small';
  return 'medium'; // default to medium (7kg)
}

// Fetches live box availability counts for a station
export async function getStationAvailability(stationId) {
  const sql = `
    SELECT 
      size,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'available') AS available
    FROM locker_compartments
    WHERE station_id = $1
    GROUP BY size;
  `;
  const result = await query(sql, [stationId]);
  return result.rows;
}

// Finds and reserves the first available compartment matching the exact requested size
export async function allocateCompartment(stationId, loadSize) {
  const targetSize = mapSizeCategory(loadSize);

  // Find an available box of the exact requested size
  const sql = `
    SELECT box_number, size 
    FROM locker_compartments
    WHERE station_id = $1 AND size = $2 AND status = 'available'
    ORDER BY box_number ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;
  const result = await query(sql, [stationId, targetSize]);

  if (result.rows.length === 0) {
    throw new Error(`No available ${targetSize} locker compartments at this station.`);
  }

  return result.rows[0];
}

// Marks a compartment occupied by an order
export async function markCompartmentOccupied(stationId, boxNumber, orderId) {
  const sql = `
    UPDATE locker_compartments
    SET status = 'occupied', current_order_id = $1, updated_at = CURRENT_TIMESTAMP
    WHERE station_id = $2 AND box_number = $3
    RETURNING *;
  `;
  const result = await query(sql, [orderId, stationId, boxNumber]);
  return result.rows[0];
}

// Marks a compartment available when customer completes pickup
export async function markCompartmentAvailable(stationId, boxNumber) {
  const sql = `
    UPDATE locker_compartments
    SET status = 'available', current_order_id = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE station_id = $1 AND box_number = $2
    RETURNING *;
  `;
  const result = await query(sql, [stationId, boxNumber]);
  return result.rows[0];
}

// Fetches live full compartment status and active order details for Operator telemetry
export async function getStationCompartments(stationId) {
  const sql = `
    SELECT 
      c.box_number,
      c.size,
      c.status,
      c.current_order_id,
      o.customer_name,
      o.customer_phone,
      o.service_tier,
      o.service_size,
      o.created_at AS dropped_time
    FROM locker_compartments c
    LEFT JOIN orders o ON c.current_order_id = o.id
    WHERE c.station_id = $1
    ORDER BY c.box_number ASC;
  `;
  const result = await query(sql, [stationId]);
  return result.rows;
}

// Upserts station profile and synchronizes physical compartment door sizes in PostgreSQL database
export async function syncStationSettings({ stationId, stationName, locationTag, totalDoors, doorSizes }) {
  const normStationId = String(stationId).trim().toUpperCase();
  const normName = String(stationName || 'Smart Laundry Locker').trim();
  const normAddress = String(locationTag || 'Main Entrance').trim();
  const normDoors = Number(totalDoors) || 16;

  // 1. Upsert locker_stations table
  const stationSql = `
    INSERT INTO locker_stations (id, name, address, total_compartments, status, updated_at)
    VALUES ($1, $2, $3, $4, 'online', CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      total_compartments = EXCLUDED.total_compartments,
      status = 'online',
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const stationRes = await query(stationSql, [normStationId, normName, normAddress, normDoors]);

  // 2. Upsert locker_compartments for each door (from 1 to totalDoors)
  const compartments = [];
  for (let i = 1; i <= normDoors; i++) {
    const boxNum = i < 10 ? `0${i}` : `${i}`;
    let size = (doorSizes && doorSizes[i]) ? String(doorSizes[i]).toLowerCase() : 'medium';
    if (!['small', 'medium', 'large'].includes(size)) {
      size = 'medium';
    }

    const compSql = `
      INSERT INTO locker_compartments (station_id, box_number, size, status, updated_at)
      VALUES ($1, $2, $3, 'available', CURRENT_TIMESTAMP)
      ON CONFLICT (station_id, box_number) DO UPDATE SET
        size = EXCLUDED.size,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const compRes = await query(compSql, [normStationId, boxNum, size]);
    compartments.push(compRes.rows[0]);
  }

  return {
    station: stationRes.rows[0],
    compartments: compartments,
  };
}
