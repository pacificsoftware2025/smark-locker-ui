import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';
import { validateDropoffPayload, validatePinPayload } from '../middleware/validate.js';

const router = Router();

// Drop-off order creation (when customer taps Save & Unlock)
router.post('/dropoff', validateDropoffPayload, ordersController.handleDropoff);

// Claim PIN verification (when customer inputs PIN on Pickup screen)
router.post('/verify-pin', validatePinPayload, ordersController.handleVerifyPin);

// Check order status
router.get('/:id', ordersController.handleGetOrder);

export default router;
