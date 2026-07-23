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

module.exports = { registerUser };
