const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const config = require("../config/env");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new ApiError(401, "Unauthorized access, Please login again");
  }
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized access, Please login again");
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(401, "User no longer Exist !!!");
  }

  if (
    user.passwordChangedAt &&
    decoded.iat * 1000 < user.passwordChangedAt.getTime()
  ) {
    throw new ApiError(401, "Password changed. Please login again.");
  }

  if (user.isDeleted) {
    throw new ApiError(
      403,
      "Your Account has been deleted, Please contact the administrator.",
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact the administrator.",
    );
  }

  req.user = user;
  next();
});

module.exports = { protect };
