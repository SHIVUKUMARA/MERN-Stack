const cacheService = require("../../services/cache.service");
const cacheKey = require("../cacheKey");

// Invalidate Single User Cache
const invalidateUser = async (userId) => {
  return cacheService.del(cacheKey.user(userId));
};

// Invalidate Users list Cache
const invalidateUserLists = async () => {
  const registryKey = cacheKey.userListRegistry();
  const keys = await cacheService.smembers(registryKey);

  if (!keys.length) {
    return;
  }
  const commands = keys.map((key) => ({
    operation: "del",
    args: [key],
  }));

  commands.push({
    operation: "del",
    args: [registryKey],
  });

  await cacheService.pipeline(commands);
};

module.exports = { invalidateUser, invalidateUserLists };
