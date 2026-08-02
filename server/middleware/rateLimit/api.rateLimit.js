const config = require("../../config/env");
const createRateLimiter = require("./createRateLimiter");

module.exports = createRateLimiter({
  windowMs: config.authRateLimitWindow,
  max: config.authRateLimitMaxRequests,
  message:
    "Too many authentication attempts. Please try again after 15 minutes.",
});
