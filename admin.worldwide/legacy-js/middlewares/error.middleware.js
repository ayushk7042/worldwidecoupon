const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  // CORS headers are set by the cors() middleware; re-setting them here with a
  // hardcoded origin used to break error responses for the real frontend.
  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
