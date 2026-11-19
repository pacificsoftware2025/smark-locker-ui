import { pool } from '../config/db.js';

async function resetDatabase() {
  console.log('[Reset DB] Connecting to PostgreSQL on Render...');
  try {
    // 1. Truncate orders
    console.log('[Reset DB] Truncating orders table...');
    await pool.query('TRUNCATE TABLE orders CASCADE;');

    // 2. Reset all compartments to available and clear active order links
    console.log('[Reset DB] Resetting all 16 locker compartments to available...');
    await pool.query(`
      UPDATE locker_compartments
      SET status = 'available', current_order_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE station_id = 'CMH-01';
    `);

    // 3. Verify counts
    const orderCountRes = await pool.query('SELECT COUNT(*) FROM orders;');
    const compRes = await pool.query(`
      SELECT 
        size, 
        COUNT(*) AS total, 
        COUNT(*) FILTER (WHERE status = 'available') AS available 
      FROM locker_compartments 
      WHERE station_id = 'CMH-01' 
      GROUP BY size 
      ORDER BY size;
    `);

    console.log('[Reset DB] SUCCESS!');
    console.log(`- Total orders in database: ${orderCountRes.rows[0].count}`);
    console.log('- Compartments status:');
    compRes.rows.forEach(r => console.log(`  * ${r.size}: ${r.available}/${r.total} available`));

    await pool.end();
  } catch (err) {
    console.error('[Reset DB Error]', err);
    await pool.end();
    process.exit(1);
  }
}

resetDatabase();
