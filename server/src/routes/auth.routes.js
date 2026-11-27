import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleListOperators,
  handleRegisterRider,
  handleLoginRider,
  handleGetRiderMe,
  handleListRiders,
} from '../controllers/auth.controller.js';

// ==============================================================================
// AUTHENTICATION ROUTES: /api/auth
// ==============================================================================
const router = Router();

// Operator Authentication & Directory
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/me', handleGetMe);
router.get('/operators', handleListOperators);

// Rider / Delivery Driver Authentication & Directory
router.post('/rider/register', handleRegisterRider);
router.post('/rider/login', handleLoginRider);
router.get('/rider/me', handleGetRiderMe);
router.get('/riders', handleListRiders);

export default router;
