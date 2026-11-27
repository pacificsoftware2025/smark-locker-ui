import * as authService from '../services/authService.js';

// ==============================================================================
// AUTHENTICATION CONTROLLER: auth.controller.js
// Handles HTTP request validation and delegates all business logic to authService.
// Zero raw SQL queries in this file.
// ==============================================================================

/**
 * POST /api/auth/register
 * Handles operator registration HTTP request.
 */
export async function handleRegister(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const result = await authService.registerOperator({
      name,
      email,
      phone,
      password,
    });

    return res.status(201).json({
      success: true,
      message: 'Operator registered successfully',
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Handles operator login HTTP request.
 */
export async function handleLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await authService.authenticateOperator(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Retrieves current operator profile from session token.
 */
export async function handleGetMe(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let operatorId = null;

    if (authHeader && authHeader.startsWith('Bearer sll_op_')) {
      const parts = authHeader.replace('Bearer ', '').split('_');
      operatorId = parseInt(parts[2], 10);
    } else if (req.query.id) {
      operatorId = parseInt(req.query.id, 10);
    }

    if (!operatorId || isNaN(operatorId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized session' });
    }

    const operator = await authService.getOperatorById(operatorId);

    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }

    return res.status(200).json({
      success: true,
      operator,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/operators
 * Lists all registered operators for central management.
 */
export async function handleListOperators(req, res, next) {
  try {
    const operators = await authService.getAllOperators();

    return res.status(200).json({
      success: true,
      operators,
    });
  } catch (err) {
    next(err);
  }
}

// ==============================================================================
// RIDER / DRIVER AUTHENTICATION HANDLERS
// ==============================================================================

/**
 * POST /api/auth/rider/register
 * Registers a new Rider / Delivery Driver account.
 */
export async function handleRegisterRider(req, res, next) {
  try {
    const { name, email, phone, password, vehiclePlate, assignedRoute } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const result = await authService.registerRider({
      name,
      email,
      phone,
      password,
      vehiclePlate,
      assignedRoute,
    });

    return res.status(201).json({
      success: true,
      message: 'Rider registered successfully',
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/auth/rider/login
 * Authenticates a Rider / Delivery Driver by email and password.
 */
export async function handleLoginRider(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await authService.authenticateRider(email, password);

    return res.status(200).json({
      success: true,
      message: 'Rider login successful',
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/auth/rider/me
 * Retrieves current Rider profile from `Bearer sll_rd_<id>_...` session token.
 */
export async function handleGetRiderMe(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let riderId = null;

    if (authHeader && authHeader.startsWith('Bearer sll_rd_')) {
      const parts = authHeader.replace('Bearer ', '').split('_');
      riderId = parseInt(parts[2], 10);
    } else if (req.query.id) {
      riderId = parseInt(req.query.id, 10);
    }

    if (!riderId || isNaN(riderId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized rider session' });
    }

    const rider = await authService.getRiderById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    return res.status(200).json({
      success: true,
      rider,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/riders
 * Lists all registered riders for fleet management.
 */
export async function handleListRiders(req, res, next) {
  try {
    const riders = await authService.getAllRiders();

    return res.status(200).json({
      success: true,
      riders,
    });
  } catch (err) {
    next(err);
  }
}
