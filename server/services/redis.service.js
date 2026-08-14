const { redisClient } = require("../database/redis");

// ====================================
// SET
// ====================================
const set = async (key, value, options = {}) => {
  const serializedValue =
    typeof value === "string" ? value : JSON.stringify(value);
  return redisClient.set(key, serializedValue, options);
};

// ====================================
// GET
// ====================================
const get = async (key) => {
  const value = await redisClient.get(key);

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// ====================================
// DEL
// ====================================
const del = async (key) => {
  return redisClient.del(key);
};

// ====================================
// EXISTS
// ====================================
const exists = async (key) => {
  return redisClient.exists(key);
};

// ====================================
// EXPIRE
// ====================================
const expire = async (key, seconds) => {
  return redisClient.expire(key, seconds);
};

// ====================================
// TTL
// ====================================
const ttl = async (key) => {
  return redisClient.ttl(key);
};

// ==========================================================
// Redis Set Operations
// ==========================================================
const sadd = async (key, value) => {
  return await redisClient.sAdd(key, value);
};

const smembers = async (key) => {
  return await redisClient.sMembers(key);
};

const srem = async (key, value) => {
  return await redisClient.sRem(key, value);
};

const scard = async (key) => {
  return await redisClient.sCard(key);
};

// ===========================
// Pipeline
// ===========================
const pipeline = async (commands) => {
  const multi = redisClient.multi();

  for (const command of commands) {
    const { operation, args } = command;
    multi[operation](...args);
  }
  return multi.exec();
};

// 50 requests could produce 50 identical MongoDB queries, That's the cache stampede. To avoid we use lock
// ===========================
// set if not exists
// ===========================
const setIfNotExists = async (key, value, options = {}) => {
  return redisClient.set(key, value, { NX: true, ...options });
};

// Release lock
const releaseLock = async (key, token) => {
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  return redisClient.eval(script, {
    keys: [key],
    arguments: [token],
  });
};

module.exports = {
  set,
  get,
  del,
  exists,
  expire,
  ttl,
  sadd,
  smembers,
  srem,
  scard,
  pipeline,
  setIfNotExists,
  releaseLock,
};

/* Why this service exists
We're creating an abstraction so the rest of your application doesn't need to know that we're using the redis npm package.
For example, later a user service can simply do: await redisService.set(key, user);
instead of: await redisClient.set(key, JSON.stringify(user));

This gives us one central place to handle:serialization, Redis commands, Redis-specific behavior */
