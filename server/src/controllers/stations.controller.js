import * as lockerService from '../services/lockerService.js';

// ==============================================================================
// CONTROLLER: Stations & Locker Compartments
// ==============================================================================

// GET /api/stations (Fleet stations list for dashboard)
export async function handleGetAllStations(req, res, next) {
  try {
    const stations = await lockerService.getAllLockerStations();
    return res.status(200).json({
      success: true,
      stations: stations,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/stations/pair-request (Operator initiates remote pairing)
export async function handlePairRequest(req, res, next) {
  try {
    const { stationId, stationName, address, branchTag } = req.body;

    if (!stationId) {
      return res.status(400).json({
        success: false,
        message: 'stationId is required to initiate pairing',
      });
    }

    const result = await lockerService.requestStationPairing({
      stationId,
      stationName,
      address,
      branchTag,
    });

    return res.status(200).json({
      success: true,
      message: 'Pairing request broadcasted to hardware terminal',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stations/:stationId/pairing-status (Polled by kiosk & dashboard)
export async function handleGetPairingStatus(req, res, next) {
  try {
    const { stationId } = req.params;

    if (!stationId) {
      return res.status(400).json({
        success: false,
        message: 'stationId is required',
      });
    }

    const statusData = await lockerService.getStationPairingStatus(stationId);

    return res.status(200).json({
      success: true,
      stationId: stationId,
      bindingStatus: statusData.binding_status || 'UNBOUND',
      pairingCode: statusData.pairing_code || null,
      pairingRequestedAt: statusData.pairing_requested_at || null,
      stationName: statusData.name || null,
      address: statusData.address || null,
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
