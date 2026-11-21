import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';
import { validateDropoffPayload, validatePinPayload } from '../middleware/validate.js';

const router = Router();

// List all orders with optional ?status= query (for Operator & Driver)
router.get('/', ordersController.handleListOrders);

// Drop-off order creation (when customer taps Save & Unlock)
router.post('/dropoff', validateDropoffPayload, ordersController.handleDropoff);

// Claim PIN verification (when customer inputs PIN on Pickup screen)
router.post('/verify-pin', validatePinPayload, ordersController.handleVerifyPin);

// Cashless payment confirmation (QRPH / GCash) to unlock compartment
router.post('/:id/confirm-payment', ordersController.handleConfirmPayment);

// Financial analytics & KPIs for Operator Dashboard (Revenue, Breakdown, Recent)
router.get('/analytics/payments', ordersController.handleGetPaymentAnalytics);

// Check order status
router.get('/:id', ordersController.handleGetOrder);

// Rider collects dirty laundry from locker compartment
router.post('/:id/collect', ordersController.handleDriverCollect);

// Facility operator updates laundry weight & price, marks in_wash
router.post('/:id/intake', ordersController.handleOrderIntake);

// Rider delivers clean laundry back to locker compartment
router.post('/:id/deliver', ordersController.handleDriverDeliver);

export default router;
