const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { sendEmail } = require("../utils/email");
const crypto = require("crypto");

const registerUser = async (userData) => {
  const { firstName, lastName, email, password } = userData;

  // check if email already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  // create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
  });

  const userResponse = await User.findById(user._id);

  return userResponse;
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isDeleted) {
    throw new ApiError(
      403,
      "Your account has been deleted, Please contact the administrator",
    );
  }

  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated.");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  const userResponse = await User.findById(user._id);
  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Unauthorized access, Please login again");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
  } catch (error) {
    throw new ApiError(401, "Unauthorized access, Please login again");
  }

  const user = await User.findById(decoded.userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "User not found !!!");
  }

  if (user.refreshToken !== refreshToken) {
    throw new ApiError(401, "Refresh Token is invalid");
  }

  const tokens = await generateTokens(user);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(
    userId,
    {
      refreshToken: null,
    },
    {
      returnDocument: "after",
    },
  );
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user || user.isDeleted || !user.isActive) {
    return;
  }

  // Generate the token
  const resetToken = user.generatePasswordResetToken();

  // save hashed token and expiry
  await user.save({ validateBeforeSave: false });

  // building reset url
  const resetUrl = `http://localhost:5000/api/auth/reset-password?token=${resetToken}`;

  // sending email
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `<h2>Reset your password</h2>\n\n<p>Click the link below to reset your password</p>\n\n<a href="${resetUrl}">Reset Password</a>\n\n<p>This link will expire in 10 minutes</p>\n\n<p>Ignore this email if you did not request a password reset</p>`,
  });
};

const resetPassword = async (token, password) => {
  // hash the token received from the frontend
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // find matching user
  const user = await User.findOne({
    passwordResetToken: hashedToken,
  }).select("+passwordResetToken +passwordResetExpires +refreshToken");

  if (!user) {
    throw new ApiError(400, "Link is invalid or has expired");
  }
  // check if token has expired
  if (user.passwordResetExpires < Date.now()) {
    throw new ApiError(400, "Reset link has expired");
  }

  // update password
  user.password = password;
  // password changes timestamp
  user.passwordChangedAt = Date.now();
  // Logout from all devices
  user.refreshToken = null;
  // Remove the reset token or link
  user.passwordResetToken = null;
  user.passwordResetExpires = null;

  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
};
