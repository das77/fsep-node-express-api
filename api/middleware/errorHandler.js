// 404 for routes no router matched.
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

// Centralized error handler: services attach err.status; anything
// without one is treated as an unexpected 500.
function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message ?? 'Internal Server Error' });
}

module.exports = { notFoundHandler, errorHandler };
