const rateLimit = require("express-rate-limit");

const createRateLimiter = ({ windowMs, max, message, statusCode = 429 }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: false,
      statusCode,
      message,
    },
  });
};

module.exports = createRateLimiter;
