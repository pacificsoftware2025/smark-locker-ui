import { NativeModules } from 'react-native';
import { ENV } from '../config/env';
import { LoggerService } from '../services/logger';

// ==============================================================================
// HARDWARE NATIVE BRIDGE HELPER (GEMINI.md Rule 2 & 3)
// In Vanilla JS: Like calling an async fetch('/api/open-box') or Web Worker.
// In React Native: Calls our Android Java module LockerModule.java via NativeModules.
// ==============================================================================

const { LockerModule } = NativeModules;

export async function openLockerDoor(boardId, doorNumber, timeoutMs = ENV.serialTimeoutMs) {
  // If running inside the compiled Android APK on the physical tablet:
  if (LockerModule && typeof LockerModule.openBox === 'function') {
    try {
      const result = await LockerModule.openBox(boardId, doorNumber, timeoutMs);
      LoggerService.addLog('SUCCESS', 'RELAY', `Hardware openBox: Board ${boardId}, Door #${doorNumber} (${result}).`);
      return result; // "SUCCESS"
    } catch (hardwareError) {
      console.error('Serial hardware error:', hardwareError.message);
      LoggerService.addLog('ERROR', 'SERIAL_RS485', `RS485 openBox error: Board ${boardId}, Door #${doorNumber}: ${hardwareError.message}`);
      throw hardwareError;
    }
  }

  // Development / Simulator fallback:
  console.log(`[DEV MODE] Simulated opening Locker: Board ${boardId}, Door ${doorNumber}`);
  LoggerService.addLog('HARDWARE', 'RELAY', `[SIMULATION] openBox: Board ${boardId}, Door #${doorNumber} (Simulated 200ms pulse).`);
  return 'SUCCESS';
}

/**
 * Reads sensor status of an individual door.
 */
export async function isLockerBoxOpen(boardId, doorNumber) {
  if (LockerModule && typeof LockerModule.isBoxOpen === 'function') {
    try {
      return await LockerModule.isBoxOpen(boardId, doorNumber);
    } catch (err) {
      console.warn('Hardware sensor read error:', err.message);
      return false;
    }
  }
  return false;
}

/**
 * Saves machine configuration to Android SharedPreferences.
 */
export async function saveNativeMachineConfig(stationId, stationName, totalDoors) {
  if (LockerModule && typeof LockerModule.saveMachineConfig === 'function') {
    try {
      return await LockerModule.saveMachineConfig(stationId, stationName, totalDoors);
    } catch (err) {
      console.warn('Failed to save native config:', err.message);
    }
  }
  return false;
}

/**
 * Reads machine configuration from Android SharedPreferences.
 */
export async function getNativeMachineConfig() {
  if (LockerModule && typeof LockerModule.getMachineConfig === 'function') {
    try {
      const config = await LockerModule.getMachineConfig();
      if (config && config.stationId) {
        return config;
      }
    } catch (err) {
      console.warn('Failed to read native config:', err.message);
    }
  }
  return null;
}
