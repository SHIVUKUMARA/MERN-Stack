const { createClient } = require("redis");
const env = require("../config/env");

const waitForRedis = async () => {
  if (redisClient.isReady) {
    return;
  }

  if (!redisClient.isOpen) {
    await connectRedis();
  }

  if (!redisClient.isReady) {
    throw new Error("Redis is not ready");
  }
};

const redisClient = createClient({
  // creates the Redis client using: redis://redis:6379
  url: env.redisUrl,
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error.message);
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis connected");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
  console.log("Redis connection closed");
});

const connectRedis = async () => {
  try {
    // prevents us from accidentally trying to establish another connection if the client is already open. we maintain one reusable Redis client.
    if (redisClient.isOpen) {
      return;
    }
    await redisClient.connect(); // actually establishes the connection.
    console.log("==========================");
    console.log("Redis connected");
    console.log("==========================");
  } catch (error) {
    console.error("Redis connection failed");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = {
  waitForRedis,
  redisClient,
  connectRedis,
};
