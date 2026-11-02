const ApiError = require("../utils/ApiError");

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  next();
};

module.exports = { requireAdmin };
