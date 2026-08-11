const rateLimit = require("express-rate-limit");

const createRateLimiter = ({
  windowMs,
  max,
  message,
  statusCode = 429,
  skip,
}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip, // to avoid rate limiting on health checks
    message: {
      status: false,
      statusCode,
      message,
    },
  });
};

module.exports = createRateLimiter;
