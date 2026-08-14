const authRateLimits = require("./auth.rateLimit");
const apiRateLimit = require("./api.rateLimit");

module.exports = {
  ...authRateLimits,
  ...apiRateLimit,
};
