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
