const config = require("../../config/env");
const createRateLimiter = require("./createRateLimiter");

module.exports = createRateLimiter({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMaxRequests,
  message: "Too many requests. Please try again later.",
});
