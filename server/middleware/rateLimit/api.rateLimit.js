const createRateLimiter = require("./createRateLimiter");

const getUsersRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: "rate-limit:users-list",
  message: "Too many user list requests. Please try again later.",
});

const getUserByIdRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  prefix: "rate-limit:user-details",
  message: "Too many user detail requests. Please try again later.",
});

module.exports = {
  getUsersRateLimit,
  getUserByIdRateLimit,
};
