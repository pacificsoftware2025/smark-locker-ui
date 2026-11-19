import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Standard Middlewares
app.use(cors({ origin: ENV.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Locker Kiosk API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      dropoff: 'POST /api/orders/dropoff',
      verifyPin: 'POST /api/orders/verify-pin',
      availability: 'GET /api/stations/:id/availability',
    },
  });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);
