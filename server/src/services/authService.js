import crypto from 'crypto';
import { query } from '../config/db.js';

// ==============================================================================
// AUTHENTICATION & OPERATOR SERVICE: authService.js
// Handles all database transactions, password cryptography, and session tokens.
// ==============================================================================

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a random salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 * Supports legacy/seed plain passwords and upgrades them on login.
 */
export function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash) return false;
  // Fallback for seed plain text
  if (!storedPasswordHash.includes(':')) {
    return password === storedPasswordHash;
  }
  const [salt, originalHash] = storedPasswordHash.split(':');
  if (!salt || !originalHash) return false;

  const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hashToVerify, 'hex'));
}

/**
 * Generates an opaque session authentication token.
 */
export function generateSessionToken(operatorId) {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `sll_op_${operatorId}_${Date.now()}_${randomHex}`;
}

/**
 * Registers a new operator account in the database.
 * Throws an Error with code 'CONFLICT' if email already exists.
 */
export async function registerOperator({ name, email, phone, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone ? phone.trim() : null;

  // 1. Check if email already exists
  const existingCheck = await query(
    'SELECT id FROM operators WHERE LOWER(email) = $1',
    [normalizedEmail]
  );
  if (existingCheck.rows.length > 0) {
    const error = new Error('An operator with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password securely
  const passwordHash = hashPassword(password);

  // 3. Insert new operator (locker_station_id is null on registration)
  const insertResult = await query(
    `INSERT INTO operators (name, email, phone, password_hash, locker_station_id, status)
     VALUES ($1, $2, $3, $4, NULL, 'active')
     RETURNING id, name, email, phone, locker_station_id, status, created_at, updated_at`,
    [cleanName, normalizedEmail, cleanPhone, passwordHash]
  );

  const newOperator = insertResult.rows[0];
  const token = generateSessionToken(newOperator.id);

  return {
    operator: {
      id: newOperator.id,
      name: newOperator.name,
      email: newOperator.email,
      phone: newOperator.phone,
      lockerStationId: newOperator.locker_station_id,
      status: newOperator.status,
      createdAt: newOperator.created_at,
    },
    token,
  };
}

/**
 * Authenticates an operator by email and password.
 * Throws an Error with code 'UNAUTHORIZED' or 'FORBIDDEN' on failures.
 */
export async function authenticateOperator(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Query operator by email
  const opResult = await query(
    `SELECT id, name, email, phone, password_hash, locker_station_id, status, last_login_at
     FROM operators
     WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );

  if (opResult.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const operator = opResult.rows[0];

  // 2. Check account status
  if (operator.status !== 'active') {
    const error = new Error(`Account is ${operator.status}. Please contact system administrator.`);
    error.statusCode = 403;
    throw error;
  }

  // 3. Verify password
  const isPasswordValid = verifyPassword(password, operator.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 4. Upgrade plaintext password if legacy seed
  if (!operator.password_hash.includes(':')) {
    const newHash = hashPassword(password);
    await query('UPDATE operators SET password_hash = $1 WHERE id = $2', [newHash, operator.id]);
  }

  // 5. Update last_login_at
  const now = new Date();
  await query('UPDATE operators SET last_login_at = $1 WHERE id = $2', [now, operator.id]);

  const token = generateSessionToken(operator.id);

  return {
    operator: {
      id: operator.id,
      name: operator.name,
      email: operator.email,
      phone: operator.phone,
      lockerStationId: operator.locker_station_id,
      status: operator.status,
      lastLoginAt: now,
    },
    token,
  };
}

/**
 * Retrieves a single operator by primary key ID.
 */
export async function getOperatorById(operatorId) {
  const opResult = await query(
    `SELECT id, name, email, phone, locker_station_id, status, last_login_at, created_at
     FROM operators WHERE id = $1`,
    [operatorId]
  );

  if (opResult.rows.length === 0) {
    return null;
  }

  const op = opResult.rows[0];
  return {
    id: op.id,
    name: op.name,
    email: op.email,
    phone: op.phone,
    lockerStationId: op.locker_station_id,
    status: op.status,
    lastLoginAt: op.last_login_at,
    createdAt: op.created_at,
  };
}

/**
 * Lists all operators for fleet directory.
 */
export async function getAllOperators() {
  const result = await query(
    `SELECT id, name, email, phone, locker_station_id, status, last_login_at, created_at
     FROM operators
     ORDER BY id ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    lockerStationId: row.locker_station_id,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }));
}

// ==============================================================================
// RIDER / DRIVER AUTHENTICATION & ACCOUNT SERVICE
// ==============================================================================

let ridersTableEnsured = false;

/**
 * Ensures the `riders` table exists in PostgreSQL automatically on first Rider auth request.
 */
export async function ensureRidersTable() {
  if (ridersTableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS riders (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      vehicle_plate VARCHAR(100) DEFAULT 'Assigned Fleet Van',
      assigned_route VARCHAR(150) DEFAULT 'Metro Central Route',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_riders_email ON riders(email);`);
  ridersTableEnsured = true;
}

/**
 * Generates an opaque session authentication token for a Rider (`sll_rd_<id>_...`).
 */
export function generateRiderSessionToken(riderId) {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `sll_rd_${riderId}_${Date.now()}_${randomHex}`;
}

/**
 * Registers a new rider / delivery driver account in PostgreSQL.
 */
export async function registerRider({ name, email, phone, password, vehiclePlate, assignedRoute }) {
  await ensureRidersTable();

  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;
  const cleanPlate = vehiclePlate && vehiclePlate.trim() !== '' ? vehiclePlate.trim() : 'Assigned Fleet Van';
  const cleanRoute = assignedRoute && assignedRoute.trim() !== '' ? assignedRoute.trim() : 'Metro Central Route';

  // 1. Check duplicate email
  const existingCheck = await query(
    'SELECT id FROM riders WHERE LOWER(email) = $1',
    [normalizedEmail]
  );
  if (existingCheck.rows.length > 0) {
    const error = new Error('A rider account with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password with PBKDF2 SHA-512
  const passwordHash = hashPassword(password);

  // 3. Insert new rider record
  const insertResult = await query(
    `INSERT INTO riders (name, email, phone, password_hash, vehicle_plate, assigned_route, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING id, name, email, phone, vehicle_plate, assigned_route, status, created_at, updated_at`,
    [cleanName, normalizedEmail, cleanPhone, passwordHash, cleanPlate, cleanRoute]
  );

  const newRider = insertResult.rows[0];
  const token = generateRiderSessionToken(newRider.id);

  return {
    rider: {
      id: newRider.id,
      name: newRider.name,
      email: newRider.email,
      phone: newRider.phone,
      vehiclePlate: newRider.vehicle_plate,
      assignedRoute: newRider.assigned_route,
      status: newRider.status,
      createdAt: newRider.created_at,
    },
    token,
  };
}

/**
 * Authenticates a rider by email and password.
 */
export async function authenticateRider(email, password) {
  await ensureRidersTable();

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Query rider by email
  const riderResult = await query(
    `SELECT id, name, email, phone, password_hash, vehicle_plate, assigned_route, status, last_login_at
     FROM riders
     WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );

  if (riderResult.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const rider = riderResult.rows[0];

  // 2. Check active account status
  if (rider.status !== 'active') {
    const error = new Error(`Rider account is ${rider.status}. Please contact system administrator.`);
    error.statusCode = 403;
    throw error;
  }

  // 3. Verify password
  const isPasswordValid = verifyPassword(password, rider.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 4. Upgrade legacy seed plaintext password to PBKDF2 hash on first login
  if (!rider.password_hash.includes(':')) {
    const newHash = hashPassword(password);
    await query('UPDATE riders SET password_hash = $1 WHERE id = $2', [newHash, rider.id]);
  }

  // 5. Record login timestamp
  const now = new Date();
  await query('UPDATE riders SET last_login_at = $1, updated_at = $1 WHERE id = $2', [now, rider.id]);

  const token = generateRiderSessionToken(rider.id);

  return {
    rider: {
      id: rider.id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      vehiclePlate: rider.vehicle_plate,
      assignedRoute: rider.assigned_route,
      status: rider.status,
      lastLoginAt: now,
    },
    token,
  };
}

/**
 * Retrieves a single rider profile by primary key ID.
 */
export async function getRiderById(riderId) {
  await ensureRidersTable();

  const result = await query(
    `SELECT id, name, email, phone, vehicle_plate, assigned_route, status, last_login_at, created_at
     FROM riders WHERE id = $1`,
    [riderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const r = result.rows[0];
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    vehiclePlate: r.vehicle_plate,
    assignedRoute: r.assigned_route,
    status: r.status,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  };
}

/**
 * Lists all registered riders for fleet management.
 */
export async function getAllRiders() {
  await ensureRidersTable();

  const result = await query(
    `SELECT id, name, email, phone, vehicle_plate, assigned_route, status, last_login_at, created_at
     FROM riders
     ORDER BY id ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    vehiclePlate: row.vehicle_plate,
    assignedRoute: row.assigned_route,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }));
}
