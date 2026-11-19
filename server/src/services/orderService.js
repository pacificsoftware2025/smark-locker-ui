import { query } from '../config/db.js';
import { ENV } from '../config/env.js';
import { allocateCompartment, markCompartmentOccupied, markCompartmentAvailable } from './lockerService.js';

// In-memory fallback for local development when PostgreSQL is not yet connected
const inMemoryOrders = [];

// ==============================================================================
// SERVICE: Order Management & Pin Verification
// ==============================================================================

// Helper: Generates unique order id (e.g. ORD-78291)
function generateOrderId() {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${randomSuffix}`;
}

// Creates customer dropoff order and occupies compartment
export async function createDropoffOrder(data) {
  const {
    customerName,
    contactNumber,
    stationId,
    serviceTier,
    serviceSize,
    temperature,
    fabricSoftener,
    specialInstructions,
    compartmentNumber,
  } = data;

  // Always dynamically allocate the next available locker from database matching load size
  const allocated = await allocateCompartment(stationId, serviceSize);
  const assignedBox = allocated.box_number;

  const orderId = generateOrderId();

  // If no PostgreSQL database is connected, use in-memory store for local testing
  if (!ENV.databaseUrl) {
    console.log('[OrderService Dev] No DATABASE_URL set. Saving order to in-memory store.');
    const devOrder = {
      id: orderId,
      customer_name: customerName.trim(),
      customer_phone: contactNumber.trim(),
      station_id: stationId,
      compartment_number: assignedBox,
      dropoff_box_number: assignedBox,
      service_tier: serviceTier,
      service_size: serviceSize,
      temperature: temperature || 'Cold',
      fabric_softener: fabricSoftener !== undefined ? fabricSoftener : true,
      special_instructions: specialInstructions || 'Standard care',
      status: 'dropped_off',
      claim_pin: '842019',
    };
    inMemoryOrders.push(devOrder);
    return devOrder;
  }

  const insertSql = `
    INSERT INTO orders (
      id,
      customer_name,
      customer_phone,
      station_id,
      compartment_number,
      dropoff_box_number,
      service_tier,
      service_size,
      temperature,
      fabric_softener,
      special_instructions,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'dropped_off')
    RETURNING *;
  `;

  const orderResult = await query(insertSql, [
    orderId,
    customerName.trim(),
    contactNumber.trim(),
    stationId,
    assignedBox,
    assignedBox,
    serviceTier,
    serviceSize,
    temperature || 'Cold',
    fabricSoftener !== undefined ? fabricSoftener : true,
    specialInstructions || 'Standard care',
  ]);

  // Mark the compartment occupied
  await markCompartmentOccupied(stationId, assignedBox, orderId);

  return orderResult.rows[0];
}

// Verifies a 6-digit Claim PIN for customer pickup
export async function verifyClaimPin(pin) {
  const cleanPin = pin.trim();

  // If no PostgreSQL database is connected, use in-memory store for local testing
  if (!ENV.databaseUrl) {
    console.log('[OrderService Dev] Verifying PIN via in-memory store:', cleanPin);
    const matched = inMemoryOrders.find(o => o.claim_pin === cleanPin) || {
      id: 'ORD-DEMO',
      customer_name: 'Maria Santos',
      pickup_box_number: '05',
      compartment_number: '05',
      service_tier: 'Wash, Dry & Fold',
      status: 'ready_for_pickup',
    };
    return matched;
  }

  const sql = `
    SELECT * 
    FROM orders
    WHERE claim_pin = $1 AND status = 'ready_for_pickup'
    LIMIT 1;
  `;
  const result = await query(sql, [cleanPin]);

  if (result.rows.length === 0) {
    return null;
  }

  const order = result.rows[0];

  // Mark order completed and release compartment
  await query(`UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [order.id]);
  if (order.pickup_box_number) {
    await markCompartmentAvailable(order.station_id, order.pickup_box_number);
  }

  return order;
}

// Fetches order by ID
export async function getOrderById(orderId) {
  const sql = `SELECT * FROM orders WHERE id = $1 LIMIT 1;`;
  const result = await query(sql, [orderId]);
  return result.rows[0] || null;
}
