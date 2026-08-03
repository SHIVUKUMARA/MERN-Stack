const ms = require("ms");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} = require("../services/auth.service");
const config = require("../config/env");

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully"));
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);

  res.cookie("refreshToken", refreshToken, {
    //This protects the refresh token from many XSS attacks.If: httpOnly: false, JavaScript can read it.
    httpOnly: true,
    // secure: config.nodeEnv === "production", in Development--- http://localhost:5000, If: "secure: true" the browser will not send the cookie because the connection isn't HTTPS.So during development: "secure: false",In production--- https://api.example.com, Now: "secure: true" This tells the browser: Only send this cookie over HTTPS.
    secure: config.nodeEnv == "production",
    // It controls when the browser is allowed to send the cookie. if "strict"- only same site request, if "lax" - any request, if "none" - always send cookies across the site
    sameSite: "lax",
    maxAge: ms(config.jwtRefreshExpiresIn),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, "Login Successful"));
});

const refreshToken = asyncHandler(async (req, res) => {
  const cookieRefreshToken = req.cookies.refreshToken;

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshAccessToken(cookieRefreshToken);

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    maxAge: ms(config.jwtRefreshExpiresIn),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Access Token refreshed successfully",
      ),
    );
});

const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user._id);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  });

  return res.status(200).json(new ApiResponse(200, null, "Logout Successful"));
});

const forgotPasswordController = asyncHandler(async (req, res) => {
  await forgotPassword(req.body.email);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Email sent successfully"));
});

const resetPasswordController = asyncHandler(async (req, res) => {
  await resetPassword(req.body.token, req.body.password);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset Successfully"));
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword: forgotPasswordController,
  resetPassword: resetPasswordController,
};
