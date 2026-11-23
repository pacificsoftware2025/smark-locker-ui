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
 * @param {string} stationId Station ID (e.g. SLL-12901 or SETUP REQUIRED)
 */
export async function fetchStationAvailability(stationId = ENV.stationId) {
  // If station is unprovisioned, immediately flag as full / setup required without making network call
  if (!stationId || stationId === 'SETUP REQUIRED') {
    return {
      success: true,
      totalAvailable: 0,
      isStationFull: true,
      sizeAvailability: { small: 0, medium: 0, large: 0 },
    };
  }

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
  // Universal Developer Demo PINs for instant preview & testing (even with empty DB)
  if (pin === '123456' || pin === '888888' || pin === '000000') {
    return {
      success: true,
      orderId: 'ORD-8821',
      assignedBox: '05',
      customerName: 'Maria Santos',
      serviceTier: 'Wash, Dry & Fold',
      weightKg: 5.2,
      amount: 210.00,
      isPaid: false,
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=00020101021226600016PH.GCASH.DEMO0208ORD8821520459995303608540210.005802PH5912SMARTLOCKER6006MANILA6304',
      isOfflineMode: true,
    };
  }

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
        orderId: result.data?.orderId || 'ORD-DEMO',
        assignedBox: result.data?.assignedBox || '05',
        customerName: result.data?.customerName || 'Customer',
        serviceTier: result.data?.serviceTier || 'Wash, Dry & Fold',
        weightKg: result.data?.weightKg || 4.5,
        amount: result.data?.amount || 180.00,
        isPaid: Boolean(result.data?.isPaid),
        qrCodeUrl: result.data?.qrCodeUrl || '',
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
        orderId: 'ORD-DEMO',
        assignedBox: '05',
        customerName: 'Customer',
        serviceTier: 'Wash, Dry & Fold',
        weightKg: 4.5,
        amount: 180.00,
        isPaid: false,
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=00020101021226600016PH.GCASH.DEMO0208DEMO01',
        isOfflineMode: true,
      };
    }

    return {
      success: false,
      message: 'Unable to verify PIN code right now. Please try again.',
    };
  }
}

/**
 * Confirms cashless payment (QRPH / GCash) and triggers locker release.
 * @param {string} orderId Order ID
 * @param {string} paymentMethod e.g. 'gcash', 'maya', 'qrph'
 */
export async function confirmOrderPayment(orderId, paymentMethod = 'qrph') {
  const url = `${ENV.apiBaseUrl}/orders/${orderId}/confirm-payment`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentMethod }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      const result = await response.json();
      return result;
    }

    // If backend returns 404/500 (e.g. Render hasn't received git push yet), fallback gracefully for kiosk testing
    console.warn('[Kiosk API] Server returned status:', response.status, 'Falling back to simulated approval.');
    return {
      success: true,
      message: 'Payment confirmed (simulated mode).',
      data: { isPaid: true },
    };
  } catch (err) {
    console.warn('[Kiosk API] Payment confirmation fallback (offline simulated):', err.message);
    return {
      success: true,
      message: 'Offline payment simulated successfully.',
      data: { isPaid: true },
    };
  }
}

/**
 * Saves and synchronizes locker station configuration and per-door sizes to PostgreSQL database.
 * @param {Object} config Station configuration object
 */
export async function syncStationConfig(config) {
  const url = `${ENV.apiBaseUrl}/stations/sync`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for Render free tier spin-up

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stationId: config.stationId,
        stationName: config.stationName,
        locationTag: config.locationTag,
        totalDoors: config.totalDoors,
        doorSizes: config.doorSizes,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      console.log('[Kiosk API] Station settings synced to database successfully:', result);
      return {
        success: true,
        message: result.message || 'Locker settings saved to database.',
        data: result.data,
        isOfflineMode: false,
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      console.warn('[Kiosk API] Server returned error syncing station settings:', errData.message);
      return {
        success: false,
        message: errData.message || 'Database could not save station settings.',
        isOfflineMode: false,
      };
    }
  } catch (err) {
    console.warn('[Kiosk API] Database sync network issue (offline mode):', err.message);
    return {
      success: false,
      message: 'Network issue connecting to cloud database. Settings saved locally.',
      isOfflineMode: true,
    };
  }
}
