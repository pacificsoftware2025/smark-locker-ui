import { NativeModules } from 'react-native';
import { ENV } from '../config/env';

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
      return result; // "SUCCESS"
    } catch (hardwareError) {
      console.error('Serial hardware error:', hardwareError.message);
      throw hardwareError;
    }
  }

  // Development / Simulator fallback:
  console.log(`[DEV MODE] Simulated opening Locker: Board ${boardId}, Door ${doorNumber}`);
  return 'SUCCESS';
}
