import { Router } from 'express';
import * as stationsController from '../controllers/stations.controller.js';

const router = Router();

// Save and synchronize locker station settings and door sizes to database
router.post('/sync', stationsController.handleSyncSettings);

// Live compartment availability for kiosk display
router.get('/:id/availability', stationsController.handleGetAvailability);

// Live full compartment telemetry for Operator Dashboard
router.get('/:id/compartments', stationsController.handleGetCompartments);

export default router;
