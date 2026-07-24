const User = require("../models/User");
const ApiError = require("../utils/ApiError");

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

  return user;
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const userResponse = await User.findById(user._id);
  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

module.exports = { registerUser, loginUser };
