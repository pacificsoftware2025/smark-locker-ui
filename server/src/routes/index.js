import { Router } from 'express';
import ordersRouter from './orders.routes.js';
import stationsRouter from './stations.routes.js';
import authRouter from './auth.routes.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'smart-locker-api', timestamp: new Date().toISOString() });
});

// Mount modules
apiRouter.use('/auth', authRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/stations', stationsRouter);

export default apiRouter;
