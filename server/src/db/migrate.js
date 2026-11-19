import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('[Database Migration] Connecting to PostgreSQL on Render...');

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

    console.log('[Database Migration] Applying schema.sql...');
    await pool.query(schemaSql);
    console.log('[Database Migration] Schema applied successfully.');

    console.log('[Database Migration] Applying seed.sql...');
    await pool.query(seedSql);
    console.log('[Database Migration] Seed data applied successfully.');

    // Query compartments count to verify
    const verifyRes = await pool.query('SELECT COUNT(*) FROM locker_compartments;');
    console.log(`[Database Migration] Verified! Total compartments in database: ${verifyRes.rows[0].count}`);

    await pool.end();
    console.log('[Database Migration] Done.');
  } catch (err) {
    console.error('[Database Migration Error]', err);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
