import * as lockerService from '../services/lockerService.js';

// ==============================================================================
// CONTROLLER: Stations & Locker Compartments
// ==============================================================================

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
