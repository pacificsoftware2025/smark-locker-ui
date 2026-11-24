import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleListOperators,
} from '../controllers/auth.controller.js';

// ==============================================================================
// AUTHENTICATION ROUTES: /api/auth
// ==============================================================================
const router = Router();

// Operator Registration
router.post('/register', handleRegister);

// Operator Login
router.post('/login', handleLogin);

// Current Operator Session Validation
router.get('/me', handleGetMe);

// List All Operators (Fleet Management)
router.get('/operators', handleListOperators);

export default router;
