const crypto = require("crypto");

const hash = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

module.exports = hash;
