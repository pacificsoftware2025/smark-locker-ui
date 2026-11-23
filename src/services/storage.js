import { getNativeMachineConfig, saveNativeMachineConfig } from '../native/LockerBridge';
import { ENV } from '../config/env';

const STORAGE_KEY = 'SMART_LOCKER_STATION_CONFIG';

/**
 * Universal Storage Helper for Kiosk Machine Identity:
 * Checks localStorage (web) or Android SharedPreferences (native APK).
 */
export async function loadMachineConfig() {
  // 1. Try Native Android SharedPreferences first
  try {
    const nativeConfig = await getNativeMachineConfig();
    if (nativeConfig && nativeConfig.stationId) {
      let doorSizes = null;
      let locationTag = 'Level 1, Main Entrance';
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          doorSizes = parsed.doorSizes || null;
          locationTag = parsed.locationTag || locationTag;
        }
      }
      return {
        stationId: nativeConfig.stationId,
        stationName: nativeConfig.stationName || ENV.stationName,
        totalDoors: Number(nativeConfig.totalDoors || 16),
        locationTag: locationTag,
        doorSizes: doorSizes,
      };
    }
  } catch (err) {
    console.warn('[Storage] Native config lookup failed:', err);
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
            stationName: parsed.stationName || ENV.stationName,
            totalDoors: Number(parsed.totalDoors || 16),
            locationTag: parsed.locationTag || 'Level 1, Main Entrance',
            doorSizes: parsed.doorSizes || null,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] localStorage lookup failed:', err);
  }

  // 3. Fallback to .env defaults
  return {
    stationId: ENV.stationId || 'SETUP REQUIRED',
    stationName: ENV.stationName || 'Unprovisioned Locker Station',
    totalDoors: 16,
    locationTag: 'Level 1, Main Entrance',
    doorSizes: null,
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
        JSON.stringify({ stationId, stationName, totalDoors, locationTag, doorSizes })
      );
    }
  } catch (err) {
    console.warn('[Storage] Could not write to localStorage:', err);
  }

  return { stationId, stationName, totalDoors, locationTag, doorSizes };
}
