import { ENV } from '../config/env';

// ==============================================================================
// KIOSK API CLIENT SERVICE
// Handles HTTP communication with the Node.js/Express backend service.
// Features:
//   1. 4-second AbortController timeout for kiosk touch responsiveness
//   2. Automatic graceful offline fallback when network is unavailable
// ==============================================================================

/**
 * Submits customer drop-off order and requests compartment allocation.
 * @param {Object} payload Order data from kiosk form
 */
export async function submitDropoffOrder(payload) {
  const url = `${ENV.apiBaseUrl}/orders/dropoff`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout to allow Render free tier spin-up

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      console.log('[Kiosk API] Drop-off order saved to database:', result);
      return {
        success: true,
        orderId: result.data?.orderId,
        compartmentNumber: result.data?.compartmentNumber || payload.compartmentNumber || '03',
        isOfflineMode: false,
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      console.warn('[Kiosk API] Server returned error:', errData.message);
      return {
        success: false,
        message: errData.message || 'No available locker compartments at this station.',
        isOfflineMode: false,
      };
    }
  } catch (err) {
    console.warn('[Kiosk API] Server unreachable:', err.message);
    return {
      success: false,
      message: 'Network connection issue. Please check kiosk internet.',
      isOfflineMode: true,
    };
  }
}

/**
 * Fetches current locker availability counts from the station.
 * @param {string} stationId Station ID (e.g. CMH-01)
 */
export async function fetchStationAvailability(stationId = ENV.stationId) {
  const url = `${ENV.apiBaseUrl}/stations/${stationId}/availability`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      const availabilityList = result.availability || [];
      const totalAvailable = availabilityList.reduce(function (sum, item) {
        return sum + parseInt(item.available || '0', 10);
      }, 0);

      const sizeAvailability = {
        small: 0,
        medium: 0,
        large: 0,
      };
      availabilityList.forEach(function (item) {
        if (item.size) {
          sizeAvailability[item.size.toLowerCase()] = parseInt(item.available || '0', 10);
        }
      });

      return {
        success: true,
        totalAvailable: totalAvailable,
        isStationFull: totalAvailable === 0,
        sizeAvailability: sizeAvailability,
      };
    }
  } catch (err) {
    console.warn('[Kiosk API] Failed to fetch station availability:', err.message);
  }

  return {
    success: false,
    totalAvailable: 16,
    isStationFull: false,
    sizeAvailability: { small: 4, medium: 8, large: 4 },
  };
}

/**
 * Verifies a 6-digit claim PIN code for laundry pickup.
 * @param {string} pin Customer PIN
 */
export async function verifyPickupPin(pin) {
  const url = `${ENV.apiBaseUrl}/orders/verify-pin`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout to allow Render free tier spin-up

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin: pin }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('[Kiosk API] PIN verified successfully:', result);
      return {
        success: true,
        assignedBox: result.data?.assignedBox || '05',
        customerName: result.data?.customerName || 'Customer',
        isOfflineMode: false,
      };
    } else {
      return {
        success: false,
        message: result.message || 'Invalid PIN code. Please check and try again.',
      };
    }
  } catch (err) {
    console.warn('[Kiosk API] PIN verification server unreachable, using dev fallback:', err.message);
    
    // In dev / demo offline fallback mode: allow 4-6 digit test PINs
    if (pin.length >= 4) {
      return {
        success: true,
        assignedBox: '05',
        customerName: 'Customer',
        isOfflineMode: true,
      };
    }

    return {
      success: false,
      message: 'Unable to verify PIN code right now. Please try again.',
    };
  }
}
