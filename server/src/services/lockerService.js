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

// Finds and reserves the first available compartment matching the requested size
export async function allocateCompartment(stationId, loadSize) {
  const targetSize = mapSizeCategory(loadSize);

  // 1. Try to find an available box of the exact requested size
  let sql = `
    SELECT box_number, size 
    FROM locker_compartments
    WHERE station_id = $1 AND size = $2 AND status = 'available'
    ORDER BY box_number ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;
  let result = await query(sql, [stationId, targetSize]);

  // 2. Fallback: if exact size full and customer asked for small/medium, try larger
  if (result.rows.length === 0 && targetSize !== 'large') {
    sql = `
      SELECT box_number, size 
      FROM locker_compartments
      WHERE station_id = $1 AND status = 'available'
      ORDER BY box_number ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;
    result = await query(sql, [stationId]);
  }

  if (result.rows.length === 0) {
    throw new Error('No available locker compartments at this station.');
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
