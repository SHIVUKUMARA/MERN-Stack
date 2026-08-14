const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redisClient, waitForRedis } = require("../../database/redis");

// const createRateLimiter = ({
//   windowMs,
//   max,
//   message,
//   statusCode = 429,
//   skip,
// }) => {
//   return rateLimit({
//     windowMs,
//     max,
//     standardHeaders: true,
//     legacyHeaders: false,
//     skip, // to avoid rate limiting on health checks
//     message: {
//       status: false,
//       statusCode,
//       message,
//     },
//   });
// };

const createRateLimiter = ({
  windowMs,
  max,
  message,
  prefix,
  statusCode = 429,
  skip,
}) => {
  return rateLimit({
    windowMs,
    limit: max,

    store: new RedisStore({
      sendCommand: async (...args) => {
        await waitForRedis();
        return redisClient.sendCommand(args);
      },
      prefix,
    }),

    standardHeaders: true,
    legacyHeaders: false,
    skip,

    message: {
      status: false,
      statusCode,
      message,
    },
  });
};

module.exports = createRateLimiter;
