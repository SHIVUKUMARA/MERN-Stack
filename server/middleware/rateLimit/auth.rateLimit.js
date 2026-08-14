const config = require("../../config/env");
const createRateLimiter = require("./createRateLimiter");

// Login rate limit
const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: "rate-limit:login",
  message: "Too many login attempts. Please try again later.",
});

// Refresh token rate limit
const refreshTokenRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: "rate-limit:refresh-token",
  message: "Too many refresh token requests. Please try again later.",
});

// Forgot password rate limit
const forgotPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: "rate-limit:forgot-password",
  message: "Too many password reset requests. Please try again later.",
});

// Reset password rate limit
const resetPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: "rate-limit:reset-password",
  message: "Too many password reset attempts. Please try again later.",
});

module.exports = {
  loginRateLimit,
  refreshTokenRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
};
