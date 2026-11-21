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
      weight_kg: 5.2,
      amount: 210.00,
      is_paid: false,
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

  // If already paid, mark order completed and release compartment immediately
  if (order.is_paid) {
    await query(`UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [order.id]);
    if (order.pickup_box_number) {
      await markCompartmentAvailable(order.station_id, order.pickup_box_number);
    }
  }

  return order;
}

// Confirms customer cashless payment (QRPH / GCash) and releases compartment
export async function confirmOrderPayment(orderId, paymentMethod = 'qrph', reference = null) {
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new Error('Order not found');
  }
  const order = orderResult.rows[0];

  const payRef = reference || `PAY-${Date.now().toString().slice(-6)}`;

  // Mark order paid and completed
  const updatedOrder = await query(
    `UPDATE orders 
     SET is_paid = TRUE, 
         payment_reference = $1, 
         status = 'completed', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING *`,
    [payRef, orderId]
  );

  // Release compartment for new customer drop-offs
  if (order.pickup_box_number) {
    await markCompartmentAvailable(order.station_id, order.pickup_box_number);
  }

  // Record permanent audit ledger in dedicated payments table (for Operator KPIs & Analytics)
  const payAmount = order.amount ? parseFloat(order.amount) : 180.00;
  try {
    await query(
      `INSERT INTO payments (order_id, station_id, amount, payment_method, payment_provider, reference_number, status, paid_at)
       VALUES ($1, $2, $3, $4, 'paymongo', $5, 'paid', CURRENT_TIMESTAMP)`,
      [orderId, order.station_id || 'CMH-01', payAmount, paymentMethod || 'gcash', payRef]
    );
  } catch (err) {
    console.warn('[OrderService] Warning inserting to payments table:', err.message);
  }

  return updatedOrder.rows[0];
}

// Fetches financial analytics & KPIs for Operator Dashboard
export async function getPaymentAnalytics(stationId) {
  let whereClause = '';
  const params = [];

  if (stationId) {
    whereClause = ' WHERE station_id = $1 ';
    params.push(stationId);
  }

  // 1. Total revenue & transaction counts
  const summarySql = `
    SELECT 
      COALESCE(SUM(amount), 0) AS total_revenue,
      COUNT(*) AS total_transactions,
      COALESCE(ROUND(AVG(amount), 2), 0) AS average_order_value
    FROM payments
    ${whereClause};
  `;
  const summaryRes = await query(summarySql, params);

  // 2. Breakdown by payment method (GCash vs Maya vs QRPH)
  const methodsSql = `
    SELECT 
      payment_method,
      COUNT(*) AS count,
      COALESCE(SUM(amount), 0) AS total
    FROM payments
    ${whereClause}
    GROUP BY payment_method;
  `;
  const methodsRes = await query(methodsSql, params);

  // 3. Recent 10 confirmed payments
  const recentSql = `
    SELECT p.*, o.customer_name, o.service_tier
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    ${whereClause ? whereClause.replace('station_id', 'p.station_id') : ''}
    ORDER BY p.paid_at DESC
    LIMIT 10;
  `;
  const recentRes = await query(recentSql, params);

  return {
    summary: summaryRes.rows[0] || { total_revenue: 0, total_transactions: 0, average_order_value: 0 },
    byMethod: methodsRes.rows,
    recentPayments: recentRes.rows,
  };
}

// Fetches order by ID
export async function getOrderById(orderId) {
  const sql = `SELECT * FROM orders WHERE id = $1 LIMIT 1;`;
  const result = await query(sql, [orderId]);
  return result.rows[0] || null;
}

// Lists all orders with optional status filter for Operator Dashboard
export async function listOrders(statusFilter) {
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (statusFilter) {
    sql += ' WHERE status = $1';
    params.push(statusFilter);
  }
  sql += ' ORDER BY created_at DESC LIMIT 50;';
  const result = await query(sql, params);
  return result.rows;
}

// Driver collects dirty laundry from locker compartment
export async function collectOrderByDriver(orderId) {
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new Error('Order not found');
  }
  const order = orderResult.rows[0];

  // Update order status to in_transit
  const updatedOrder = await query(
    `UPDATE orders SET status = 'in_transit', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [orderId]
  );

  // Free the dropoff compartment in locker
  await markCompartmentAvailable(order.station_id, order.dropoff_box_number);

  return updatedOrder.rows[0];
}

// Facility updates laundry weight & price, marks in_wash
export async function updateOrderIntake(orderId, weightKg, amount) {
  const updated = await query(
    `UPDATE orders 
     SET status = 'in_wash', 
         weight_kg = $1, 
         amount = $2, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3 
     RETURNING *`,
    [weightKg, amount, orderId]
  );
  return updated.rows[0];
}

// Driver delivers clean laundry back to a locker compartment
export async function deliverCleanOrder(orderId, stationId, boxNumber) {
  // Generate 6-digit claim PIN
  const claimPin = Math.floor(100000 + Math.random() * 900000).toString();

  // Mark order ready_for_pickup
  const updatedOrder = await query(
    `UPDATE orders 
     SET status = 'ready_for_pickup', 
         pickup_box_number = $1, 
         compartment_number = $1,
         claim_pin = $2, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3 
     RETURNING *`,
    [boxNumber, claimPin, orderId]
  );

  // Mark compartment occupied
  await markCompartmentOccupied(stationId, boxNumber, orderId);

  return updatedOrder.rows[0];
}
