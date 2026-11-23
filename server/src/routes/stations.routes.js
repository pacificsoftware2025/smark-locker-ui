import { Router } from 'express';
import * as stationsController from '../controllers/stations.controller.js';

const router = Router();

// Fleet locker stations list for operator dashboard
router.get('/', stationsController.handleGetAllStations);

// Pairing & binding lifecycle routes
router.post('/pair-request', stationsController.handlePairRequest);
router.get('/:stationId/pairing-status', stationsController.handleGetPairingStatus);
router.post('/pair-confirm', stationsController.handlePairConfirm);

// Save and synchronize locker station settings and door sizes to database
router.post('/sync', stationsController.handleSyncSettings);

// Live compartment availability for kiosk display
router.get('/:id/availability', stationsController.handleGetAvailability);

// Live full compartment telemetry for Operator Dashboard
router.get('/:id/compartments', stationsController.handleGetCompartments);

export default router;
