import { getNativeMachineConfig, saveNativeMachineConfig } from '../native/LockerBridge';
import { ENV } from '../config/env';

const STORAGE_KEY = 'SMART_LOCKER_STATION_CONFIG';
const TERMINAL_HARDWARE_ID_KEY = 'SMART_LOCKER_TERMINAL_HARDWARE_ID';

/**
 * Returns or generates a persistent hardware terminal ID (e.g. SLL-12901) for this kiosk.
 */
export function getTerminalHardwareId() {
  if (typeof window !== 'undefined' && window.localStorage) {
    let existing = window.localStorage.getItem(TERMINAL_HARDWARE_ID_KEY);
    if (!existing) {
      existing = `SLL-${Math.floor(10000 + Math.random() * 90000)}`;
      window.localStorage.setItem(TERMINAL_HARDWARE_ID_KEY, existing);
    }
    return existing;
  }
  return 'SLL-12901';
}

/**
 * Universal Storage Helper for Kiosk Machine Identity:
 * Checks localStorage (web) or Android SharedPreferences (native APK).
 */
export async function loadMachineConfig() {
  // 1. Try Native Android SharedPreferences first (Native APK on Android tablet)
  try {
    const nativeConfig = await getNativeMachineConfig();
    if (nativeConfig && nativeConfig.stationId) {
      let doorSizes = null;
      let locationTag = 'Level 1, Main Entrance';
      return {
        stationId: nativeConfig.stationId,
        stationName: nativeConfig.stationName || ENV.stationName,
        totalDoors: Number(nativeConfig.totalDoors || 16),
        locationTag: locationTag,
        doorSizes: doorSizes,
        bindingStatus: nativeConfig.stationId !== 'SETUP REQUIRED' ? 'BOUND_ACTIVE' : 'UNBOUND',
      };
    }
  } catch (err) {
    // Native lookup fails gracefully on web
  }

  // 2. Try browser localStorage (Web / Vite preview)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.stationId) {
          return {
            stationId: parsed.stationId,
            hardwareId: parsed.hardwareId || getTerminalHardwareId(),
            stationName: parsed.stationName || ENV.stationName,
            totalDoors: Number(parsed.totalDoors || 16),
            locationTag: parsed.locationTag || 'Level 1, Main Entrance',
            doorSizes: parsed.doorSizes || null,
            bindingStatus: parsed.bindingStatus || (parsed.stationId && parsed.stationId !== 'SETUP REQUIRED' ? 'BOUND_ACTIVE' : 'UNBOUND'),
            operatorName: parsed.operatorName || 'Carlos Test',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] localStorage lookup failed:', err);
  }

  // 3. Fallback to .env defaults
  const hardwareId = getTerminalHardwareId();
  return {
    stationId: ENV.stationId || 'SETUP REQUIRED',
    hardwareId: hardwareId,
    stationName: ENV.stationName || 'Unprovisioned Locker Station',
    totalDoors: 16,
    locationTag: 'Level 1, Main Entrance',
    doorSizes: null,
    bindingStatus: 'UNBOUND',
  };
}

/**
 * Persists station configuration to both Native SharedPreferences and localStorage.
 */
export async function saveMachineConfig(config) {
  const stationId = config.stationId || 'SETUP REQUIRED';
  const stationName = config.stationName || 'Unprovisioned Locker Station';
  const totalDoors = Number(config.totalDoors || 16);
  const locationTag = config.locationTag || 'Level 1, Main Entrance';
  const doorSizes = config.doorSizes || null;
  const bindingStatus = config.bindingStatus || (stationId !== 'SETUP REQUIRED' ? 'BOUND_ACTIVE' : 'UNBOUND');
  const operatorName = config.operatorName || 'Carlos Test';

  // 1. Save to Android Native
  try {
    await saveNativeMachineConfig(stationId, stationName, totalDoors);
  } catch (err) {
    console.warn('[Storage] Could not write to native SharedPreferences:', err);
  }

  // 2. Save to browser localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stationId, stationName, totalDoors, locationTag, doorSizes, bindingStatus, operatorName })
      );
    }
  } catch (err) {
    console.warn('[Storage] Could not write to localStorage:', err);
  }

  return { stationId, stationName, totalDoors, locationTag, doorSizes, bindingStatus, operatorName };
}
