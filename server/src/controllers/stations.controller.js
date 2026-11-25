import * as lockerService from '../services/lockerService.js';

// ==============================================================================
// CONTROLLER: Stations & Locker Compartments
// ==============================================================================

// GET /api/stations (Fleet stations list for dashboard)
export async function handleGetAllStations(req, res, next) {
  try {
    const operatorId = req.query.operatorId || req.query.operator_id || null;
    const stations = await lockerService.getAllLockerStations(operatorId);
    return res.status(200).json({
      success: true,
      stations: stations,
    });
  } catch (err) {
    next(err);
  }
}

const MACHINE_ID_REGEX = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;

function isValidMachineId(id) {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  if (clean.includes('@') || clean.includes(' ') || clean.includes('.')) return false;
  return clean.length >= 3 && clean.length <= 30 && MACHINE_ID_REGEX.test(clean);
}

// POST /api/stations/pair-request (Operator initiates remote pairing)
export async function handlePairRequest(req, res, next) {
  try {
    const { stationId, stationName, address, branchTag, totalDoors, operatorId, operatorName } = req.body;

    if (!stationId || !isValidMachineId(stationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stationId format. Must be an alphanumeric hardware code (e.g. SLL-12901 or CMH-01), not an email address.',
      });
    }

    const result = await lockerService.requestStationPairing({
      stationId,
      stationName,
      address,
      branchTag,
      totalDoors,
      operatorId,
      operatorName,
    });

    return res.status(200).json({
      success: true,
      message: 'Pairing request broadcasted to hardware terminal',
      data: result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// GET /api/stations/:stationId/pairing-status (Polled by kiosk & dashboard)
export async function handleGetPairingStatus(req, res, next) {
  try {
    const { stationId } = req.params;

    if (!stationId || !isValidMachineId(stationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stationId format. Must be an alphanumeric hardware code (e.g. SLL-12901 or CMH-01).',
      });
    }

    const statusData = await lockerService.getStationPairingStatus(stationId);
    const comps = await lockerService.getStationCompartments(stationId);
    const realDoorCount = (Array.isArray(comps) && comps.length > 0)
      ? comps.length
      : (Number(statusData.total_compartments) || 16);

    return res.status(200).json({
      success: true,
      stationId: stationId,
      bindingStatus: statusData.binding_status || 'UNBOUND',
      pairingCode: statusData.pairing_code || null,
      pairingRequestedAt: statusData.pairing_requested_at || null,
      stationName: statusData.name || null,
      address: statusData.address || null,
      total_compartments: realDoorCount,
      totalDoors: realDoorCount,
      exists: statusData.exists !== false,
      operatorName: statusData.operator_name || statusData.operatorName || null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/stations/pair-confirm (Kiosk technician taps Approve)
export async function handlePairConfirm(req, res, next) {
  try {
    const { stationId, pairingCode } = req.body;

    if (!stationId) {
      return res.status(400).json({
        success: false,
        message: 'stationId is required to confirm pairing',
      });
    }

    const result = await lockerService.confirmStationPairing(stationId, pairingCode);

    return res.status(200).json({
      success: true,
      message: 'Hardware kiosk successfully paired and provisioned',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stations/:id/availability
export async function handleGetAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const availability = await lockerService.getStationAvailability(id);

    return res.status(200).json({
      success: true,
      stationId: id,
      availability: availability,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stations/:id/compartments
export async function handleGetCompartments(req, res, next) {
  try {
    const { id } = req.params;
    const compartments = await lockerService.getStationCompartments(id);

    return res.status(200).json({
      success: true,
      stationId: id,
      compartments: compartments,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/stations/sync
export async function handleSyncSettings(req, res, next) {
  try {
    const { stationId, stationName, locationTag, totalDoors, doorSizes } = req.body;

    if (!stationId) {
      return res.status(400).json({
        success: false,
        message: 'stationId is required to save locker settings',
      });
    }

    const result = await lockerService.syncStationSettings({
      stationId,
      stationName,
      locationTag,
      totalDoors,
      doorSizes,
    });

    return res.status(200).json({
      success: true,
      message: `Station ${stationId} and ${result.compartments.length} compartment door sizes saved to database.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
