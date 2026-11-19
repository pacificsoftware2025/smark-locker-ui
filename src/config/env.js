// ==============================================================================
// APP CONFIGURATION & ENVIRONMENT LOADER (GEMINI.md Rule 1, 2 & 3)
// Centralizes all confidential, environment, and hardware configurations.
//
// In Vanilla JS / Express analogy:
//   const config = {
//     apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api',
//     stationId: process.env.LOCKER_STATION_ID || 'CMH-01'
//   };
// ==============================================================================

export const ENV = {
  // 1. Backend Express API Endpoint
  apiBaseUrl: (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) || 'http://localhost:5000/api',

  // 2. Kiosk Station Identity
  stationId: (typeof process !== 'undefined' && process.env && process.env.LOCKER_STATION_ID) || 'CMH-01',
  stationName: (typeof process !== 'undefined' && process.env && process.env.LOCKER_STATION_NAME) || 'Central Mall Depot',

  // 3. Android RS485 Serial Port Hardware Settings
  serialPort: (typeof process !== 'undefined' && process.env && process.env.SERIAL_PORT) || '/dev/ttyS3',
  serialBaudRate: Number((typeof process !== 'undefined' && process.env && process.env.SERIAL_BAUD_RATE) || 9600),
  serialTimeoutMs: Number((typeof process !== 'undefined' && process.env && process.env.SERIAL_TIMEOUT_MS) || 3000),

  // 4. Kiosk Safety Timers (in seconds)
  sessionIdleTimeout: Number((typeof process !== 'undefined' && process.env && process.env.SESSION_IDLE_TIMEOUT) || 60),
  doorOpenTimeout: Number((typeof process !== 'undefined' && process.env && process.env.DOOR_OPEN_TIMEOUT) || 30),

  // 5. Customer Service & Support Hotline
  supportHotline: (typeof process !== 'undefined' && process.env && process.env.SUPPORT_HOTLINE) || '(02) 8923-4567',
};
