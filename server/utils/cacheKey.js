const stableStringify = require("./stableStringify");
const hash = require("./hash");

const user = (userId) => `user:${userId}`;

const userList = (query) => {
  const serializedQuery = stableStringify(query);
  const queryHash = hash(serializedQuery);

  return `users:list:${queryHash}`;
};

const userListRegistry = () => "users:cache:keys";

module.exports = { user, userList, userListRegistry };
