// ==============================================================================
// MIDDLEWARE: Global Error Handler
// ==============================================================================

export function errorHandler(err, req, res, next) {
  console.error('[Server Error]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
}
