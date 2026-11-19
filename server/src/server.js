import { app } from './app.js';
import { ENV } from './config/env.js';

const PORT = ENV.port;

app.listen(PORT, () => {
  console.log(`==============================================`);
  console.log(`Smart Locker API server running on port ${PORT}`);
  console.log(`Environment: ${ENV.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`==============================================`);
});
