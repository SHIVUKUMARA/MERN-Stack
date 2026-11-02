const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
// const { sendEmail } = require("../utils/email");
const { redisClient, waitForRedis } = require("../database/redis");
const { enqueueEmailDelivery, JOB_PRIORITY } = require("./queue.service");
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

  // Enqueue welcome email using MongoDB-backed idempotency.
  await enqueueEmailDelivery(
    {
      to: user.email,
      subject: "Welcome to our platform!",
      html: `
      <h2>Welcome, ${firstName}!</h2>
      <p>Your account has been created successfully.</p>
      <p>We're happy to have you with us.</p>
    `,
    },
    `welcome-${user._id}`,
    {
      delay: 10_000,
    },
    JOB_PRIORITY.NORMAL,
  );

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

  await waitForRedis();

  const lockKey = `lock:password-reset:${user._id}`;
  const lockToken = crypto.randomUUID();
  const lockTtlSeconds = 30;

  const acquired = await redisClient.set(lockKey, lockToken, {
    NX: true,
    EX: lockTtlSeconds,
  });

  if (acquired !== "OK") {
    return;
  }

  try {
    // Generate and save the reset token.
    const resetToken = user.generatePasswordResetToken();

    await user.save({ validateBeforeSave: false });

    const resetUrl = `http://localhost:5000/api/auth/reset-password?token=${resetToken}`;

    // Generate a unique idempotency key for this reset operation.
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const idempotencyKey = `password-reset-${user._id}-${tokenHash}`;

    await enqueueEmailDelivery(
      {
        to: user.email,
        subject: "Reset your password",
        html: `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password.</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>Ignore this email if you did not request a password reset.</p>
    `,
      },
      idempotencyKey,
      {},
  JOB_PRIORITY.CRITICAL,
    );
  } finally {
    // Release only if this request still owns the lock.
    await redisClient.eval(
      `if redis.call("GET", KEYS[1]) == ARGV[1] then
         return redis.call("DEL", KEYS[1])
       else
         return 0
       end`,
      {
        keys: [lockKey],
        arguments: [lockToken],
      },
    );
  }
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
