const logger = require("../logger/index");
const ApiError = require("../utils/ApiError");
const env = require("../config/env");

const errorHandler = (err, req, res, next) => {
  /* 
  That first err parameter tells Express: "This middleware handles errors." 
  */
  const statusCode = err.statusCode || 500;

  // log every error
  logger.error({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  // ApiError (Our custom errors)
  if (err instanceof ApiError) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Unexpected errors
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",

    // show stack only in development
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
