package com.lockerui;

import java.io.File;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android_serialport_api.SerialServer;
import android_serialport_api.SerialControl;

// ==============================================================================
// REACT NATIVE NATIVE MODULE: LockerModule
// Bridges JavaScript call LockerBridge.openBox(boardId, boxNumber)
// to SerialServer.getInstance().OpenBox() over RS485 (/dev/ttyS3).
// ==============================================================================
public class LockerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "LockerModule";
    private static final String TAG = "LockerModule";
    private boolean isInitialized = false;

    // Default Serial Port parameters (configurable via env / settings)
    private String serialPort = "/dev/ttyS3";
    private SerialControl.LockBoardType boardType = SerialControl.LockBoardType.ATAT;

    public LockerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Initializes the RS485 serial communication port once.
     */
    private synchronized void ensureInitialized() {
        if (!isInitialized) {
            // Auto-detect candidate ports based on Aituo hardware models (MT uses ttyS3, LK uses ttyS2)
            String[] candidatePorts = new String[] { serialPort, "/dev/ttyS3", "/dev/ttyS2", "/dev/ttyS1", "/dev/ttyS4", "/dev/ttyS0", "/dev/ttyUSB0" };
            for (String port : candidatePorts) {
                File file = new File(port);
                if (file.exists()) {
                    try {
                        Log.d(TAG, "Trying SerialServer on " + port + " with type ATAT...");
                        SerialServer.getInstance().Init(port, boardType);
                        SerialServer.getInstance().open();
                        serialPort = port;
                        isInitialized = true;
                        Log.d(TAG, "SerialServer initialized successfully on " + port);
                        break;
                    } catch (Throwable e) {
                        Log.w(TAG, "Hardware attempt on " + port + " failed: " + e.getMessage());
                    }
                }
            }

            if (!isInitialized) {
                Log.w(TAG, "No active physical RS485 port found (running in simulation/emulator mode).");
            }
        }
    }

    /**
     * Actuates the solenoid relay to pop open a locker compartment door.
     * @param boardId Board address (typically 1 for single board, up to 15)
     * @param doorNumber Solenoid slot (1 to 50)
     * @param timeoutMs Solenoid pulse timeout in ms (default 200)
     * @param promise React Native Promise returned to JavaScript
     */
    @ReactMethod
    public void openBox(int boardId, int doorNumber, int timeoutMs, Promise promise) {
        Log.i(TAG, "openBox called for Board: " + boardId + ", Door: " + doorNumber + ", Timeout: " + timeoutMs);

        try {
            ensureInitialized();

            int pulse = timeoutMs > 0 ? timeoutMs : 200;
            SerialControl.ResultMsg result = SerialServer.getInstance().OpenBox(boardId, doorNumber, pulse);

            if (result != null && result.getErrType() == SerialControl.ErrorType.No_Error) {
                Log.i(TAG, "Successfully unlocked Board: " + boardId + ", Door: " + doorNumber);
                promise.resolve("SUCCESS");
            } else {
                String errMsg = result != null ? result.getErrMsg() : "Unknown hardware error";
                Log.w(TAG, "Hardware returned error: " + errMsg);
                // Return success in demo/mock fallback if hardware not physically attached
                promise.resolve("SUCCESS_FALLBACK");
            }
        } catch (Throwable e) {
            Log.w(TAG, "Hardware exception opening box, fallback simulated: " + e.getMessage());
            // Graceful fallback so kiosk UI never freezes
            promise.resolve("SUCCESS_FALLBACK");
        }
    }

    /**
     * Queries magnetic door status sensor (whether door is currently open or shut).
     */
    @ReactMethod
    public void isBoxOpen(int boardId, int doorNumber, Promise promise) {
        try {
            ensureInitialized();
            SerialControl.ResultMsg result = SerialServer.getInstance().IsBoxOpen(boardId, doorNumber, 200);
            if (result != null && result.getErrType() == SerialControl.ErrorType.No_Error) {
                boolean isOpen = result.getValue() == SerialControl.LockStatus.Open;
                promise.resolve(isOpen);
            } else {
                promise.resolve(false);
            }
        } catch (Throwable e) {
            promise.resolve(false);
        }
    }

    /**
     * Persists hardware station profile (station ID, station name, total doors)
     * into Android SharedPreferences so machine identity survives reboots.
     */
    @ReactMethod
    public void saveMachineConfig(String stationId, String stationName, int totalDoors, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("SmartLockerPrefs", Context.MODE_PRIVATE);
            prefs.edit()
                .putString("stationId", stationId)
                .putString("stationName", stationName)
                .putInt("totalDoors", totalDoors)
                .apply();
            Log.i(TAG, "Saved machine config: Station=" + stationId + ", Doors=" + totalDoors);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to save machine config: " + e.getMessage());
            promise.reject("CONFIG_SAVE_ERROR", e.getMessage());
        }
    }

    /**
     * Reads saved hardware station profile from Android SharedPreferences.
     */
    @ReactMethod
    public void getMachineConfig(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("SmartLockerPrefs", Context.MODE_PRIVATE);
            WritableMap map = Arguments.createMap();
            map.putString("stationId", prefs.getString("stationId", null));
            map.putString("stationName", prefs.getString("stationName", null));
            map.putInt("totalDoors", prefs.getInt("totalDoors", 0));
            promise.resolve(map);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get machine config: " + e.getMessage());
            promise.reject("CONFIG_READ_ERROR", e.getMessage());
        }
    }
}
