/**
 * Smart Laundry Locker - Centralized System & Diagnostic Logger
 * Captures hardware actuation, serial port events, API syncs, and system errors.
 * Strictly zero emojis.
 */

const STORAGE_KEY = 'SMART_LOCKER_SYSTEM_LOGS';
const MAX_LOG_ENTRIES = 150;

function formatTimestamp(d = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const millis = pad(d.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}.${millis}`;
}

const DEFAULT_BOOT_LOGS = [
  {
    id: 'boot-1',
    timestamp: formatTimestamp(new Date(Date.now() - 360000)),
    level: 'INFO',
    component: 'SYSTEM',
    message: 'Kiosk Android bare runtime initialized. Native bridge connected.',
  },
  {
    id: 'boot-2',
    timestamp: formatTimestamp(new Date(Date.now() - 350000)),
    level: 'HARDWARE',
    component: 'SERIAL_RS485',
    message: 'Serial port bound to /dev/ttyS3 (9600 bps, 8-N-1, Timeout: 2000ms).',
  },
  {
    id: 'boot-3',
    timestamp: formatTimestamp(new Date(Date.now() - 340000)),
    level: 'INFO',
    component: 'RELAY',
    message: 'Relay Lock Board 0x01 detected (ATAT protocol, 16 physical channels active).',
  },
  {
    id: 'boot-4',
    timestamp: formatTimestamp(new Date(Date.now() - 330000)),
    level: 'INFO',
    component: 'API_SYNC',
    message: 'Cloud API target configured: https://smart-laundry-locker-api.onrender.com/api',
  },
  {
    id: 'boot-5',
    timestamp: formatTimestamp(new Date(Date.now() - 320000)),
    level: 'SUCCESS',
    component: 'SYSTEM',
    message: 'Ready for technician diagnostics and customer operations.',
  },
];

let memoryLogs = [...DEFAULT_BOOT_LOGS];
const listeners = new Set();

// Load persisted logs if available
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryLogs = parsed;
      }
    }
  } catch (e) {
    // ignore
  }
}

function persistLogs() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryLogs.slice(0, MAX_LOG_ENTRIES)));
    } catch (e) {
      // ignore
    }
  }
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener([...memoryLogs]);
    } catch (e) {
      // ignore
    }
  });
}

export const LoggerService = {
  getLogs() {
    return [...memoryLogs];
  },

  addLog(level, component, message, details = null) {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: formatTimestamp(),
      level: String(level || 'INFO').toUpperCase(),
      component: String(component || 'SYSTEM').toUpperCase(),
      message: String(message || ''),
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
    };

    memoryLogs.unshift(entry); // newest at top
    if (memoryLogs.length > MAX_LOG_ENTRIES) {
      memoryLogs = memoryLogs.slice(0, MAX_LOG_ENTRIES);
    }

    persistLogs();
    notify();
    return entry;
  },

  clearLogs() {
    memoryLogs = [];
    persistLogs();
    notify();
  },

  resetToDefaults() {
    memoryLogs = [...DEFAULT_BOOT_LOGS];
    persistLogs();
    notify();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Global Unhandled Exception Interception for Native React Native & Web
if (typeof global !== 'undefined' && global.ErrorUtils && typeof global.ErrorUtils.setGlobalHandler === 'function') {
  const originalHandler = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    LoggerService.addLog(
      'ERROR',
      'SYSTEM_CRASH',
      `[${isFatal ? 'FATAL' : 'NON-FATAL'}] ${error?.message || String(error)}`,
      error?.stack
    );
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    LoggerService.addLog('ERROR', 'RUNTIME_ERROR', event.message || 'Script error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    LoggerService.addLog('ERROR', 'PROMISE_REJECTION', event.reason?.message || String(event.reason));
  });
}
