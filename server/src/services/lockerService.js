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
  const normStationId = String(stationId).trim().toUpperCase();
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
  let result = await query(sql, [normStationId]);

  // Check if station has total_compartments defined in locker_stations
  try {
    const stationQuery = await query('SELECT total_compartments FROM locker_stations WHERE id = $1', [normStationId]);
    if (stationQuery.rows && stationQuery.rows[0]) {
      const configuredDoors = Number(stationQuery.rows[0].total_compartments) || 16;

      // If no compartment rows exist yet, populate configuredDoors compartments
      if (!result.rows || result.rows.length === 0) {
        for (let i = 1; i <= configuredDoors; i++) {
          const boxNum = i < 10 ? `0${i}` : `${i}`;
          let size = 'medium';
          if (i <= 4) size = 'small';
          else if (i > 12) size = 'large';
          await query(
            `INSERT INTO locker_compartments (station_id, box_number, size, status, updated_at)
             VALUES ($1, $2, $3, 'available', CURRENT_TIMESTAMP)
             ON CONFLICT (station_id, box_number) DO NOTHING;`,
            [normStationId, boxNum, size]
          );
        }
        result = await query(sql, [normStationId]);
      } else if (result.rows.length > configuredDoors) {
        // If extra empty compartments exist beyond configured capacity, remove them
        await query(
          `DELETE FROM locker_compartments WHERE station_id = $1 AND CAST(box_number AS INT) > $2 AND current_order_id IS NULL`,
          [normStationId, configuredDoors]
        );
        result = await query(sql, [normStationId]);
      }
    }
  } catch (err) {
    console.warn('[LockerService] getStationCompartments sync warning:', err.message);
  }

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

// ==============================================================================
// LAUNDRY LOCKER BINDING & PAIRING HANDSHAKE METHODS
// ==============================================================================

// 1. Operator requests remote pairing from web dashboard to physical kiosk
export async function requestStationPairing({ stationId, stationName, address, branchTag }) {
  if (!stationId) {
    const err = new Error('Machine stationId is required for binding request.');
    err.statusCode = 400;
    throw err;
  }

  const normStationId = String(stationId).trim().toUpperCase();
  if (normStationId.includes('@') || normStationId.includes(' ') || normStationId.includes('.')) {
    const err = new Error('Invalid stationId format. Must be an alphanumeric hardware code (e.g. SLL-12901 or CMH-01).');
    err.statusCode = 400;
    throw err;
  }

  const displayName = String(stationName || `Station ${normStationId}`).trim();
  const displayAddress = String(address || branchTag || 'Provisioned Branch Location').trim();

  // Detect real capacity if kiosk already created compartments or station exists
  let initialDoors = 16;
  try {
    const compCountRes = await query(
      'SELECT COUNT(*) FROM locker_compartments WHERE station_id = $1',
      [normStationId]
    );
    if (compCountRes.rows && Number(compCountRes.rows[0].count) > 0) {
      initialDoors = Number(compCountRes.rows[0].count);
    }
  } catch (err) {
    // fallback to 16
  }

  // Generate 6-digit pairing verification code
  const pairingCode = String(Math.floor(100000 + Math.random() * 900000));

  const sql = `
    INSERT INTO locker_stations (
      id, name, address, total_compartments, status, binding_status, pairing_code, pairing_requested_at, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, 'online', 'PENDING_CONFIRMATION', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      total_compartments = CASE 
        WHEN locker_stations.total_compartments IS NOT NULL AND locker_stations.total_compartments != 16 
        THEN locker_stations.total_compartments 
        ELSE EXCLUDED.total_compartments 
      END,
      binding_status = 'PENDING_CONFIRMATION',
      pairing_code = EXCLUDED.pairing_code,
      pairing_requested_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  try {
    const res = await query(sql, [normStationId, displayName, displayAddress, initialDoors, pairingCode]);
    if (res.rows && res.rows[0]) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn('[LockerService] requestStationPairing DB error:', err.message);
    throw err;
  }

  return {
    id: normStationId,
    name: displayName,
    address: displayAddress,
    binding_status: 'PENDING_CONFIRMATION',
    pairing_code: pairingCode,
    pairing_requested_at: new Date().toISOString(),
  };
}

// 2. Kiosk checks pairing status (polled by kiosk in SETUP REQUIRED state)
export async function getStationPairingStatus(stationId) {
  if (!stationId) {
    throw new Error('Station ID is required to query pairing status.');
  }
  const normStationId = String(stationId).trim().toUpperCase();

  try {
    const sql = `
      SELECT id, name, address, total_compartments, status, binding_status, pairing_code, pairing_requested_at, updated_at
      FROM locker_stations
      WHERE id = $1;
    `;
    const res = await query(sql, [normStationId]);
    if (res.rows && res.rows.length > 0) {
      return {
        ...res.rows[0],
        exists: true,
      };
    }
  } catch (err) {
    console.warn('[LockerService] getStationPairingStatus DB error:', err.message);
  }

  return {
    id: normStationId,
    exists: false,
    binding_status: 'UNREGISTERED',
    pairing_code: null,
    pairing_requested_at: null,
  };
}

// 3. Kiosk technician approves pairing on touchscreen
export async function confirmStationPairing(stationId, pairingCode) {
  if (!stationId) {
    throw new Error('Station ID is required to confirm pairing.');
  }
  const normStationId = String(stationId).trim().toUpperCase();

  try {
    const sql = `
      UPDATE locker_stations
      SET 
        binding_status = 'BOUND_ACTIVE',
        pairing_code = NULL,
        status = 'online',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [normStationId]);

    // Ensure compartments exist for the newly bound station according to its configured capacity
    const totalComps = (res.rows && res.rows[0] && res.rows[0].total_compartments)
      ? Number(res.rows[0].total_compartments)
      : 16;

    for (let i = 1; i <= totalComps; i++) {
      const boxNum = i < 10 ? `0${i}` : `${i}`;
      let size = 'medium';
      if (i <= 4) size = 'small';
      else if (i > 12) size = 'large';

      const compSql = `
        INSERT INTO locker_compartments (station_id, box_number, size, status, updated_at)
        VALUES ($1, $2, $3, 'available', CURRENT_TIMESTAMP)
        ON CONFLICT (station_id, box_number) DO NOTHING;
      `;
      await query(compSql, [normStationId, boxNum, size]);
    }

    if (res.rows && res.rows[0]) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn('[LockerService] confirmStationPairing DB error:', err.message);
    throw err;
  }

  return {
    id: normStationId,
    binding_status: 'BOUND_ACTIVE',
    status: 'online',
  };
}

// 4. Returns all registered fleet locker stations for Operator views
export async function getAllLockerStations() {
  try {
    const sql = `
      SELECT id, name, address, total_compartments, status, binding_status, pairing_code, pairing_requested_at, created_at, updated_at
      FROM locker_stations
      ORDER BY updated_at DESC;
    `;
    const res = await query(sql, []);
    if (res.rows) {
      return res.rows;
    }
  } catch (err) {
    console.warn('[LockerService] getAllLockerStations DB error:', err.message);
  }
  return [];
}
