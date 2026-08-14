const crypto = require("crypto");
const redisService = require("./redis.service");
const logger = require("../logger");

// =================================
// String
// =================================
// Get Cached Value
const get = async (key) => {
  try {
    return await redisService.get(key);
  } catch (error) {
    logger.error(`Redis cache GET failed for key: ${key}`);
    logger.error(error);
    return null;
  }
};

// Set Cached Value
const set = async (key, value, ttlSeconds) => {
  try {
    const options = {};

    if (ttlSeconds !== undefined) {
      options.EX = ttlSeconds;
    }
    return await redisService.set(key, value, options);
  } catch (error) {
    logger.error(`Redis cache SET failed for key: ${key}`);
    logger.error(error);
    return null;
  }
};

// Delete Cached Value
const del = async (key) => {
  try {
    return await redisService.del(key);
  } catch (error) {
    logger.error(`Redis cache DEL failed for key: ${key}`);
    logger.error(error);
    return null;
  }
};

// Check if Cached Value Exists
const exists = async (key) => {
  try {
    return await redisService.exists(key);
  } catch (error) {
    logger.error(`Redis cache EXISTS failed for key: ${key}`);
    logger.error(error);
    return null;
  }
};

// Get or Set
const getOrSet = async (key, callback, ttlSeconds) => {
  const cachedValue = await get(key);

  // Cache HIT
  if (cachedValue !== null) {
    return cachedValue;
  }

  const lockKey = `lock:${key}`;
  let lockToken = crypto.randomUUID();
  const lockTtl = 10;

  let lockAcquired = await setIfNotExists(lockKey, lockToken, lockTtl);

  // Another request is rebuilding this cache
  if (!lockAcquired) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cachedResult = await get(key);

      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    // Lock may have expired, try once more
    const retryToken = crypto.randomUUID();

    lockAcquired = await setIfNotExists(lockKey, retryToken, lockTtl);

    if (lockAcquired) {
      lockToken = retryToken;
    } else {
      // Final cache check
      const finalCachedResult = await get(key);

      if (finalCachedResult !== null) {
        return finalCachedResult;
      }

      // Extremely unlikely fallback
      return await callback();
    }
  }

  try {
    const value = await callback();

    if (value !== null && value !== undefined) {
      await set(key, value, ttlSeconds);
    }

    return value;
  } finally {
    if (lockAcquired) {
      await releaseLock(lockKey, lockToken);
    }
  }
};

// =================================
// Set
// =================================
const sadd = async (key, value) => {
  try {
    return await redisService.sadd(key, value);
  } catch (error) {
    logger.error(`Redis cache SADD failed for key: ${key}`);
    logger.error(error);

    return null;
  }
};

const smembers = async (key) => {
  try {
    return await redisService.smembers(key);
  } catch (error) {
    logger.error(`Redis cache SMEMBERS failed for key: ${key}`);
    logger.error(error);

    return [];
  }
};

const srem = async (key, value) => {
  try {
    return await redisService.srem(key, value);
  } catch (error) {
    logger.error(`Redis cache SREM failed for key: ${key}`);
    logger.error(error);

    return null;
  }
};

const scard = async (key) => {
  try {
    return await redisService.scard(key);
  } catch (error) {
    logger.error(`Redis cache SCARD failed for key: ${key}`);
    logger.error(error);

    return 0;
  }
};

// Pipeline
const pipeline = async (commands) => {
  try {
    return await redisService.pipeline(commands);
  } catch (error) {
    logger.error("Redis cache PIPELINE failed");
    logger.error(error);

    return null;
  }
};

// cache stampede problem solution
const setIfNotExists = async (key, value, ttlSeconds) => {
  try {
    const options = {};
    if (ttlSeconds !== undefined) {
      options.EX = ttlSeconds;
    }
    return await redisService.setIfNotExists(key, value, options);
  } catch (error) {
    logger.error(`Redis cache SET IF NOT EXISTS failed for key: ${key}`);
    logger.error(error);
    return null;
  }
};

// Release lock
const releaseLock = async (key, token) => {
  try {
    return await redisService.releaseLock(key, token);
  } catch (error) {
    logger.error(`Redis cache RELEASE LOCK failed for key: ${key}`);
    logger.error(error);

    return null;
  }
};

module.exports = {
  get,
  set,
  del,
  exists,
  getOrSet,
  sadd,
  smembers,
  srem,
  scard,
  pipeline,
  setIfNotExists,
  releaseLock,
};

/*             getOrSet()
                  │
                  ▼
            Check Redis
             /       \
         Present    Absent
            │          │
            ▼          ▼
       return data   execute function
                         │
                         ▼
                    MongoDB query
                         │
                         ▼
                    save to Redis
                         │
                         ▼
                     return data 
*/

// Cache-aside or lazy caching
/* 
                Request
                   │
                   ▼
             cacheService
                   │
                   ▼
              Redis GET
              /       \
            HIT       MISS
             │          │
             ▼          ▼
          Return     MongoDB
                        │
                        ▼
                    Redis SET
                        │
                        ▼
                      Return 
*/
