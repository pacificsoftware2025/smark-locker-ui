import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

// PostgreSQL connection pool configuration
// Supports Render SSL connections automatically
const poolConfig = {
  connectionString: ENV.databaseUrl,
};

if (ENV.databaseUrl && !ENV.databaseUrl.includes('localhost')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(poolConfig);

// Helper query function for clean SQL execution
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (ENV.nodeEnv === 'development') {
    console.log('[DB Query]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}
